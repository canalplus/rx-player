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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import config from "../../config";
import {
  ErrorTypes,
  IndexError,
  MediaError,
} from "../../errors";
import { SimpleSet } from "../../utils/collections";
import log from "../../utils/log";
import { getLeftSizeOfRange } from "../../utils/ranges";

import Representation from "../../manifest/representation";
import Segment from "../../manifest/segment";
import { SupportedBufferTypes } from "../types";

import cleanBuffer from "./cleanBuffer";
import launchGarbageCollector from "./gc";
import QueuedSourceBuffer from "./queued-source-buffer";
import SegmentBookkeeper from "./segment_bookkeeper";

import {
  BufferEvent,
  IBufferArguments,
  IBufferClockTick,
  IBufferSegmentInfos,
  IDownloaderResponse
} from "./types";

const { BITRATE_REBUFFERING_RATIO } = config;

/**
 * Calculate start and end timestamps of the wanted buffer.
 * @param {TimeRanges} buffered - TimeRanges coming from the concerned
 * SourceBuffer
 * @param {Object} clock
 * @param {Number} bufferGoal
 * @param {Object} paddings
 * @param {Number} paddings.low
 * @param {Number} paddings.high
 * @returns {Object} - Start and end timestamps, in seconds, under an object
 * form with two properties:
 *   - start {Number}
 *   - end {Number}
 */
function getWantedBufferRange(
  buffered : TimeRanges,
  clock : IBufferClockTick,
  bufferGoal : number,
  paddings : {
    low : number;
    high : number;
  }
) : {
  start : number;
  end : number;
} {
  const { low: lowPadding, high: highPadding } = paddings;
  const timestamp = clock.currentTime + clock.timeOffset;

  // wantedBufferSize calculates the size of the buffer we want to ensure,
  // taking into account the min between: the set max buffer size, the
  // duration and the live gap.
  const endDiff = (clock.duration || Infinity) - timestamp;
  const wantedBufferSize = Math.max(0, clock.liveGap == null ?
    Math.min(bufferGoal, endDiff) :
    Math.min(bufferGoal, clock.liveGap, endDiff)
  );

  const bufferGap = getLeftSizeOfRange(buffered, timestamp);

  // the ts padding is the time offset that we want to apply to our current
  // timestamp in order to calculate the starting point of the list of
  // segments to inject.
  const timestampPadding = bufferGap > lowPadding && bufferGap < Infinity ?
    Math.min(bufferGap, highPadding) : 0;

  return {
    start: timestamp + timestampPadding,
    end: timestamp + wantedBufferSize,
  };
}

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
 * @param {Observable} opt.wantedBufferAhead
 * @param {Observable} opt.maxBufferBehind
 * @param {Observable} opt.maxBufferAhead
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

  // TODO Remove that from here
  bufferType,   // Buffer type (audio, video, text, image)
  isLive,
} : IBufferArguments) : Observable<BufferEvent> {

  /**
   * Saved state of an init segment to give to the downloader.
   * TODO Re-think that mess for a Buffer refacto.
   */
  let initSegmentInfos : IBufferSegmentInfos|null = null;

  // will be used to emit messages to the calling function
  const messageSubject : Subject<BufferEvent> = new Subject();

  // safety level (low and high water mark) size of buffer that won't
  // be flushed when switching representation for smooth transitions
  // and avoiding buffer underflows
  const LOW_PADDING  = bufferType === "video" ? 4 : 1;
  const HIGH_PADDING = bufferType === "video" ? 6 : 1;

  const bookkeeper = new SegmentBookkeeper();
  const bufferingQueue = new QueuedSourceBuffer(sourceBuffer);

  /**
   * Returns every segments currently wanted.
   * @param {Object} adaptation - The adaptation concerned (audio/video...)
   * @param {Object} representation - The representation of the chosen
   * adaptation
   * @param {BufferedRanges} buffered - The BufferedRanges of the corresponding
   * sourceBuffer
   * @param {Object} timing - The last item emitted from clock$
   * @param {Number} bufferGoal - The last item emitted from wantedBufferAhead
   * @param {Number} bufferSize - The last item emitted from bufferSize$
   * @param {Boolean} needsInitSegment - Whether we're dealing with an init
   * segment.
   * @returns {Array.<Segment>}
   * @throws IndexError - Throws if the current timestamp is considered out
   * of bounds.
   */
  function getSegmentsListToInject(
    representation : Representation,
    range : {
      start : number;
      end : number;
    },
    timing : IBufferClockTick,
    needsInitSegment : boolean
  ) : Segment[] {
    let initSegment : Segment|null = null;

    if (needsInitSegment) {
      log.debug("add init segment", bufferType);
      initSegment = representation.index.getInitSegment();
    }

    if (timing.readyState === 0) {
      return initSegment ? [initSegment] : [];
    }

    const { start, end } = range;
    const duration = end - start;

    const segments = bookkeeper.inventory.map(s => s.segment);
    const shouldRefresh = representation.index.shouldRefresh(segments, start, end);
    if (shouldRefresh) {
      const error = new IndexError(
        "OUT_OF_INDEX_ERROR", representation.index.getType(), false);
      messageSubject.next({
        type: "out-of-index",
        value: error,
      });
    }

    // given the current timestamp and the previously calculated time gap and
    // wanted buffer size, we can retrieve the list of segments to inject in
    // our pipelines.
    const mediaSegments = representation.index.getSegments(start, duration);

    if (initSegment) {
      mediaSegments.unshift(initSegment);
    }

    return mediaSegments;
  }

  function createRepresentationBuffer(
    representation : Representation
  ) : Observable<BufferEvent> {
    log.info("bitrate", bufferType, representation.bitrate);

    const queuedSegments = new SimpleSet();

    /**
     * Returns true if it considers that the segment given should be loaded.
     * @param {Segment} segment
     * @param {Object} wantedRange
     * @returns {Boolean}
     */
    function segmentFilter(
      segment : Segment,
      wantedRange : {
        start : number;
        end : number;
      }
    ) : boolean {
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
      if (!duration) {
        return true;
      }

      const currentSegment =
        bookkeeper.hasPlayableSegment(wantedRange, time, duration, timescale);

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
    function appendDataInBuffer(
      pipelineData : {
        segment : Segment;
        parsed : {
          segmentData : any;
          segmentInfos : IBufferSegmentInfos;
        };
      }
    ) : Observable<BufferEvent> {
      const { segment, parsed } = pipelineData;
      const { segmentData, segmentInfos } = parsed;

      if (segment.isInit) {
        initSegmentInfos = segmentInfos;
      }

      /**
       * Validate the segment downloaded:
       *   - remove from the queued segment to re-allow its download
       *   - insert it in the bufferedRanges object
       */
      function validateSegment() {
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
            duration != null ? (time + duration) / timescale : undefined, // end
            representation.bitrate
          );
        }
      }

      /**
       * Append data in the SourceBuffer if we have it.
       * Emit when done.
       * @returns {Observable}
       */
      function appendSegment() : Observable<any> {
        const append$ = segmentData != null ?
          bufferingQueue.appendBuffer(segmentData) : Observable.of(null);

        return append$.do(validateSegment);
      }

      return appendSegment()
        .catch((error : Error) => {
          if (!error || error.name !== "QuotaExceededError") {
            queuedSegments.remove(segment.id);
            throw new MediaError("BUFFER_APPEND_ERROR", error, true);
          }

          return launchGarbageCollector(clock$, bufferingQueue)
            .mergeMap(appendSegment)
            .catch((error2 : Error) => {
              queuedSegments.remove(segment.id);
              throw new MediaError("BUFFER_FULL_ERROR", error2, true);
            });
        }).map(() => ({
          type: "pipeline" as "pipeline",
          value: objectAssign({ bufferType }, pipelineData),
        }));
    }

    /**
     * Get list of segment to injects.
     * @param {Object} timing
     * @param {number} bufferGoal
     * @param {boolean} needsInitSegment
     * @returns {Observable|Array.<Segment>}
     */
    function getNeededSegments(
      timing : IBufferClockTick,
      bufferGoal : number,
      needsInitSegment : boolean
    ) : Observable<Segment> {
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

      const wantedRange = getWantedBufferRange(buffered, timing, bufferGoal, {
        low: LOW_PADDING,
        high: HIGH_PADDING,
      });
      log.debug("calculating segments for wanted range", wantedRange);

      const neededSegments = getSegmentsListToInject(
        representation,
        wantedRange,
        timing,
        needsInitSegment
      ).filter((segment) => segmentFilter(segment, wantedRange));
      log.debug("segments needed:", !!neededSegments.length, neededSegments);

      // queue all segments injected in the observable
      for (let i = 0; i < neededSegments.length; i++) {
        queuedSegments.add(neededSegments[i].id);
      }

      return Observable.of(...neededSegments);
    }

    /**
     * @param {Object} segment
     * @returns {Observable}
     */
    function loadNeededSegments(
      segment : Segment
    ) : Observable<{ segment : Segment } & IDownloaderResponse> {
      return downloader({ segment, representation, init: initSegmentInfos })
        .map((args) => objectAssign({ segment }, args));
    }

    /**
     * Check and load needed segments.
     * @param {Object} timing
     * @param {number} _wantedBufferAhead
     * @param {number} _maxBufferAhead
     * @param {Boolean} needsInitSegment
     * @returns {Observable}
     */
    function checkNeededSegments(
      timing : IBufferClockTick,
      _wantedBufferAhead : number,
      _maxBufferAhead : number,
      needsInitSegment : boolean
    ) : Observable<{ segment : Segment } & IDownloaderResponse> {
      const bufferGoal = Math.min(_wantedBufferAhead, _maxBufferAhead);
      return getNeededSegments(timing, bufferGoal, needsInitSegment)
        .concatMap(loadNeededSegments);
    }

    /**
     * Check the size of buffer and clean if it goes beyond the limits set by
     * the user.
     * @param {number} currentTime
     * @param {number} _maxBufferBehind
     * @param {number} _maxBufferAhead
     * @returns {Observable}
     */
    function checkBufferSize(
      currentTime : number,
      _maxBufferBehind : number,
      _maxBufferAhead : number
    ) : Observable<never> {
      return cleanBuffer(
        bufferingQueue, currentTime, _maxBufferBehind, _maxBufferAhead);
    }

    const loadNeededSegments$ = Observable
      .combineLatest(clock$, wantedBufferAhead, maxBufferAhead)
      .concatMap((args, i) => checkNeededSegments(args[0], args[1], args[2], !i))
      .concatMap(appendDataInBuffer);

    const clean$ = Observable
      .combineLatest(clock$, maxBufferBehind, maxBufferAhead)
      .mergeMap(args => checkBufferSize(args[0].currentTime, args[1], args[2]));

    return Observable.merge(loadNeededSegments$, clean$, messageSubject)
      .catch((error) => {
        // For live adaptations, handle 412 errors as precondition-
        // failed errors, ie: we are requesting for segments before they
        // exist
        const isPreconditionFailedError = (
          isLive &&
          error.type === ErrorTypes.NETWORK_ERROR &&
          error.isHttpError(412)
        );

        if (!isPreconditionFailedError) {
          throw error;
        }

        // 412 Precondition Failed request errors do not cause the
        // buffer to stop but are re-emitted in the stream as
        // "precondition-failed" type. They should be handled re-
        // adapting the live-gap that the player is holding
        return Observable.of({
          type: "precondition-failed" as "precondition-failed",
          value: error,
        })
          .concat(Observable.timer(2000)
            .mergeMap(() => createRepresentationBuffer(representation)));
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

function EmptyBuffer(
  { bufferType } : { bufferType : SupportedBufferTypes }
) : Observable<BufferEvent> {
  return Observable.of({
    type: "representationChange" as "representationChange",
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
