/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import objectAssign from "object-assign";

import config from "../../config.js";
import log from "../../utils/log";
import { SimpleSet } from "../../utils/collections";
import { getLeftSizeOfRange } from "../../utils/ranges.js";
import {
  MediaError,
  ErrorTypes,
  IndexError,
} from "../../errors";

import SegmentBookkeeper from "./segment_bookkeeper.js";
import QueuedSourceBuffer from "./queued-source-buffer.js";
import launchGarbageCollector from "./gc.js";
import cleanBuffer from "./cleanBuffer.js";

const BITRATE_REBUFFERING_RATIO = config.BITRATE_REBUFFERING_RATIO;

/**
 * Manage a single buffer:
 *   - load the right segments through the downloader on normal playback /
 *     seeking / as the adaptation chosen changes
 *   - add those to the sourceBuffer
 *   - clean up if too much segments have been loaded
 *
 * TODO too many parameters?
 * @param {Object} opt
 * @param {SourceBuffer} opt.sourceBuffer
 * @param {Function} opt.downloader
 * @param {Observable} opt.switch$
 * @param {Observable} opt.clock
 * @param {Number} opt.wantedBufferAhead
 * @param {Number} opt.maxBufferBehind
 * @param {Number} opt.maxBufferAhead
 * @param {string} opt.bufferType
 * @param {Boolean} opt.isLive
 * @returns {Observable}
 */
function Buffer({
  sourceBuffer,
  downloader,
  switch$,
  clock$,
  wantedBufferAhead,
  maxBufferBehind,
  maxBufferAhead,

  // XXX Remove that from here
  bufferType,   // Buffer type (audio, video, text, image)
  isLive,
}) {

  /**
   * Saved state of an init segment to give to the downloader.
   * TODO Re-think that mess for a Buffer refacto.
   */
  let initSegmentInfos = null;

  // will be used to emit messages to the calling function
  const messageSubject = new Subject();

  // safety level (low and high water mark) size of buffer that won't
  // be flushed when switching representation for smooth transitions
  // and avoiding buffer underflows
  const LOW_WATER_MARK_PAD  = bufferType == "video" ? 4 : 1;
  const HIGH_WATER_MARK_PAD = bufferType == "video" ? 6 : 1;

  const bookkeeper = new SegmentBookkeeper();
  const bufferingQueue = new QueuedSourceBuffer(sourceBuffer);

  /**
   * Returns every segments currently wanted.
   * @param {Object} adaptation - The adaptation concerned (audio/video...)
   * @param {Object} representation - The representation of the chosen adaptation
   * @param {BufferedRanges} buffered - The BufferedRanges of the corresponding
   * sourceBuffer
   * @param {Object} timing - The last item emitted from clock$
   * @param {Number} bufferGoal - The last item emitted from wantedBufferAhead
   * @param {Number} bufferSize - The last item emitted from bufferSize$
   * @param {Boolean} withInitSegment - Whether we're dealing with an init segment.
   * @returns {Array.<Segment>}
   * @throws IndexError - Throws if the current timestamp is considered out
   * of bounds.
   */
  function getSegmentsListToInject(
    representation,
    buffered,
    timing,
    bufferGoal,
    withInitSegment
  ) {
    let initSegment = null;

    if (withInitSegment) {
      log.debug("add init segment", bufferType);
      initSegment = representation.index.getInitSegment();
    }

    if (timing.readyState === 0) {
      return initSegment ? [initSegment] : [];
    }

    const timestamp = timing.currentTime + timing.timeOffset;

    // wantedBufferSize calculates the size of the buffer we want to ensure,
    // taking into account the min between: the set max buffer size, the
    // duration and the live gap.
    const endDiff = (timing.duration || Infinity) - timestamp;
    const wantedBufferSize = Math.max(0, timing.liveGap == null ?
      Math.min(bufferGoal, endDiff) :
      Math.min(bufferGoal, timing.liveGap, endDiff)
    );

    // the ts padding is the time offset that we want to apply to our current
    // timestamp in order to calculate the starting point of the list of
    // segments to inject.
    let timestampPadding;
    const bufferGap = getLeftSizeOfRange(buffered, timestamp);
    if (bufferGap > LOW_WATER_MARK_PAD && bufferGap < Infinity) {
      timestampPadding = Math.min(bufferGap, HIGH_WATER_MARK_PAD);
    } else {
      timestampPadding = 0;
    }

    const from = timestamp + timestampPadding;
    const to = timestamp + wantedBufferSize;
    const duration = to - from;
    const shouldRefresh = representation.index
        .shouldRefresh(timestamp, from, timestamp + wantedBufferSize);
    if (shouldRefresh) {
      const error = new IndexError(
        "OUT_OF_INDEX_ERROR", representation.index.getType(), false);
      messageSubject.next({ type: "out-of-index", value: error });
    }

    // given the current timestamp and the previously calculated time gap and
    // wanted buffer size, we can retrieve the list of segments to inject in
    // our pipelines.
    const mediaSegments =
      representation.index.getSegments(from, duration);

    if (initSegment) {
      mediaSegments.unshift(initSegment);
    }

    return mediaSegments;
  }

  function createRepresentationBuffer(representation) {
    log.info("bitrate", bufferType, representation.bitrate);

    const queuedSegments = new SimpleSet();

    /**
     * Returns true if it considers that the segment given should be loaded.
     * @param {Segment} segment
     * @param {Number} bitrate
     * @returns {Boolean}
     */
    function segmentFilter(segment) {
      // if this segment is already in the pipeline
      const isInQueue = queuedSegments.test(segment.id);
      if (isInQueue) {
        return false;
      }

      // segment without time info are usually init segments or some
      // kind of metadata segment that we never filter out
      if (segment.isInit || segment.time < 0) {
        return true;
      }

      const { time, duration, timescale } = segment;
      const currentSegment =
        bookkeeper.hasCompleteSegment(time, duration, timescale);

      // only re-load comparatively-poor bitrates.
      return !currentSegment ||
        (currentSegment.bitrate * BITRATE_REBUFFERING_RATIO) <
        representation.bitrate;
    }

    /**
     * Append buffer to the bufferingQueue.
     * If it leads to a QuotaExceededError, try to run our custom range
     * _garbage collector_.
     * @returns {Observable}
     */
    function appendDataInBuffer(pipelineData) {
      const { segment, parsed } = pipelineData;
      const { segmentData, nextSegments, segmentInfos } = parsed;

      if (segment.isInit) {
        initSegmentInfos = segmentInfos;
      }

      // If we have informations about subsequent segments, add them to the
      // index.
      // TODO do that higher up?
      const addedSegments = nextSegments ?
        representation.index._addSegments(nextSegments, segmentInfos) : [];

      /**
       * Validate the segment downloaded:
       *   - remove from the queued segment to re-allow its download
       *   - insert it in the bufferedRanges object
       */
      const validateSegment = () => {
        // Note: we should also clean when canceled/errored
        // (TODO do it when canceled?)
        queuedSegments.remove(segment.id);

        if (!segment.isInit) {
          const { time, duration, timescale } = segmentInfos ?
            segmentInfos : segment;

          // current segment timings informations are used to update
          // bufferedRanges informations
          bookkeeper.insert(
            segment,
            time / timescale, // start
            (time + duration) / timescale, // end
            representation.bitrate
          );
        }
      };

      const appendSegment = () =>
        bufferingQueue.appendBuffer(segmentData)
          .do(validateSegment);

      return appendSegment()
        .catch((error) => {
          if (error.name != "QuotaExceededError") {
            queuedSegments.remove(segment.id);
            throw new MediaError("BUFFER_APPEND_ERROR", error, true);
          }

          return launchGarbageCollector(clock$, bufferingQueue)
            .mergeMap(appendSegment)
            .catch((error) => {
              queuedSegments.remove(segment.id);
              throw new MediaError("BUFFER_FULL_ERROR", error, true);
            });
        }).map(() => ({
          type: "pipeline",
          value: objectAssign({ bufferType, addedSegments }, pipelineData),
        }));
    }

    /**
     * Get list of segment to injects.
     * @param {Array} combineLatestResult
     * @param {Number} injectCount
     * @returns {Observable|Array.<Segment>}
     */
    function getNeededSegments(timing, bufferGoal, injectCount) {
      const buffered = bufferingQueue.getBuffered();
      bookkeeper.addBufferedInfos(buffered);

      // send a message downstream when bumping on an explicit
      // discontinuity announced in the segment index.
      if (timing.stalled) {
        if (isLive) {
          const discontinuity =
            representation.index.checkDiscontinuity(timing.currentTime);
          if (discontinuity > 0) {
            messageSubject.next({
              type: "index-discontinuity",
              value: { ts: discontinuity + 1 },
            });
          }
        }
      }

      let injectedSegments;

      // filter out already loaded and already queued segments
      const withInitSegment = (injectCount === 0);
      injectedSegments = getSegmentsListToInject(
        representation,
        buffered,
        timing,
        bufferGoal,
        withInitSegment);

      injectedSegments = injectedSegments.filter(segmentFilter);

      // queue all segments injected in the observable
      for (let i = 0; i < injectedSegments.length; i++) {
        queuedSegments.add(injectedSegments[i].id);
      }

      return Observable.of(...injectedSegments);
    }

    const loadNeededSegments = segment => {
      return downloader({ segment, representation, init: initSegmentInfos })
        .map((args) => objectAssign({ segment }, args));
    };

    const onClockTick = ([
      timing, wantedBufferAhead, maxBufferBehind, maxBufferAhead,
    ], i) => {
      const bufferGoal = Math.min(wantedBufferAhead, maxBufferAhead);
      const loadNeeded$ = getNeededSegments(timing, bufferGoal, i)
        .concatMap(loadNeededSegments);
      const clean$ = cleanBuffer(
        bufferingQueue, timing.currentTime, maxBufferBehind, maxBufferAhead);
      return Observable.merge(loadNeeded$, clean$);
    };

    const segmentsPipeline = Observable.combineLatest(
      clock$,
      wantedBufferAhead,
      maxBufferBehind,
      maxBufferAhead,
    )
      .mergeMap(onClockTick)
      .concatMap(appendDataInBuffer);

    return Observable.merge(segmentsPipeline, messageSubject).catch((error) => {
      // For live adaptations, handle 412 errors as precondition-
      // failed errors, ie: we are requesting for segments before they
      // exist
      const isPreconditionFailedError = (
        isLive &&
        error.type == ErrorTypes.NETWORK_ERROR &&
        error.isHttpError(412)
      );

      if (!isPreconditionFailedError) {
        throw error;
      }

      // 412 Precondition Failed request errors do not cause the
      // buffer to stop but are re-emitted in the stream as
      // "precondition-failed" type. They should be handled re-
      // adapting the live-gap that the player is holding
      return Observable.of({ type: "precondition-failed", value: error })
        .concat(Observable.timer(2000))
        .concat(createRepresentationBuffer(representation));
    })
      .startWith({
        type: "representationChange",
        value: {
          type: bufferType,
          representation,
        },
      });
  }

  return switch$
    .switchMap(createRepresentationBuffer)
    .finally(() => bufferingQueue.dispose());
}

function EmptyBuffer({ bufferType }) {
  return Observable.of({
    type: "representationChange",
    value: {
      type: bufferType,
      representation: null,
    },
  });
}

export {
  Buffer,
  EmptyBuffer,
};
