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

import objectAssign from "object-assign";
import config from "../config.js";
import log from "../utils/log";
import { BufferingQueue } from "./buffering-queue";
import { BufferedRanges } from "./ranges";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { combineLatest } from "rxjs/observable/combineLatest";
import { merge } from "rxjs/observable/merge";
import { EmptyObservable } from "rxjs/observable/EmptyObservable";
import { FromObservable } from "rxjs/observable/FromObservable";
import { TimerObservable } from "rxjs/observable/TimerObservable";

import { SimpleSet } from "../../utils/collections";
import {
  MediaError,
  ErrorTypes,
  ErrorCodes,
  IndexError,
} from "../../errors";

const empty = EmptyObservable.create;
const from = FromObservable.create;
const timer = TimerObservable.create;

const BITRATE_REBUFFERING_RATIO = config.BITRATE_REBUFFERING_RATIO;
const GC_GAP_CALM = config.BUFFER_GC_GAPS.CALM;
const GC_GAP_BEEFY = config.BUFFER_GC_GAPS.BEEFY;

/**
 * Manage a single buffer:
 *   - load the right segments through the downloader on normal playback /
 *     seeking / as the adaptation chosen changes
 *   - add those to the sourceBuffer
 *   - clean up if too much segments have been loaded
 * @returns {Observable}
 */
function Buffer({
  sourceBuffer,
  downloader,
  switch$,

  // TODO simplify and rename clock$?
  timings,      // Timings observable

  // XXX Remove that from here
  bufferType,   // Buffer type (audio, video, text, image)
  adaptation,   // Adaptation buffered
  wantedBufferAhead,
  maxBufferBehind,
  maxBufferAhead,
  isLive,
}) {

  // will be used to emit messages to the calling function
  const messageSubject = new Subject();

  // safety level (low and high water mark) size of buffer that won't
  // be flushed when switching representation for smooth transitions
  // and avoiding buffer underflows
  const LOW_WATER_MARK_PAD  = bufferType == "video" ? 4 : 1;
  const HIGH_WATER_MARK_PAD = bufferType == "video" ? 6 : 1;

  const ranges = new BufferedRanges();
  const bufferingQueue = new BufferingQueue(sourceBuffer);

  /**
   * Buffer garbage collector algorithm. Tries to free up some part of
   * the ranges that are distant from the current playing time.
   * See: https://w3c.github.io/media-source/#sourcebuffer-prepare-append
   * @param {Object} timing
   * @param {Number} timing.ts - current timestamp
   * @param {BufferedRanges} timing.buffered - current buffered ranges
   * @param {Number} gcGap - delta gap from current timestamp from which we
   * should consider cleaning up.
   * @returns {Array.<Range>} - Ranges selected for clean up
   */
  function selectGCedRanges(ts, buffered, gcGap) {
    const innerRange  = buffered.getRange(ts);
    const outerRanges = buffered.getOuterRanges(ts);

    const cleanedupRanges = [];

    // start by trying to remove all ranges that do not contain the
    // current time and respect the gcGap
    // respect the gcGap? FIXME?
    for (let i = 0; i < outerRanges.length; i++) {
      const outerRange = outerRanges[i];
      if (ts - gcGap < outerRange.end) {
        cleanedupRanges.push(outerRange);
      }
      else if (ts + gcGap > outerRange.start) {
        cleanedupRanges.push(outerRange);
      }
    }

    // try to clean up some space in the current range
    if (innerRange) {
      log.debug("buffer: gc removing part of inner range", cleanedupRanges);
      if (ts - gcGap > innerRange.start) {
        cleanedupRanges.push({
          start: innerRange.start,
          end: ts - gcGap,
        });
      }

      if (ts + gcGap < innerRange.end) {
        cleanedupRanges.push({
          start: ts + gcGap,
          end: innerRange.end,
        });
      }
    }

    return cleanedupRanges;
  }

  /**
   * Run the garbage collector.
   * Try to clean up buffered ranges from a low gcGap at first.
   * If it does not succeed to clean up space, use a higher gcCap.
   * @returns {Observable}
   */
  function bufferGarbageCollector() {
    log.warn("buffer: running garbage collector");
    return timings.take(1).mergeMap((timing) => {
      let cleanedupRanges = selectGCedRanges(timing.ts, timing.buffered, GC_GAP_CALM);

      // more aggressive GC if we could not find any range to clean
      if (cleanedupRanges.length === 0) {
        cleanedupRanges = selectGCedRanges(timing.ts, timing.buffered, GC_GAP_BEEFY);
      }

      log.debug("buffer: gc cleaning", cleanedupRanges);
      return from(
        cleanedupRanges.map((range) => bufferingQueue.removeBuffer(range))
      ).concatAll();
    });
  }

  /**
   * Returns every segments currently wanted.
   * @param {Object} adaptation - The adaptation concerned (audio/video...)
   * @param {Object} representation - The representation of the chosen adaptation
   * @param {BufferedRanges} buffered - The BufferedRanges of the corresponding
   * sourceBuffer
   * @param {Object} timing - The last item emitted from timings
   * @param {Number} bufferGoal - The last item emitted from wantedBufferAhead
   * @param {Boolean} withInitSegment - Whether we're dealing with an init segment.
   * @returns {Array.<Segment>}
   * @throws IndexError - Throws if the current timestamp is considered out
   * of bounds.
   */
  function getSegmentsListToInject(adaptation,
                                   representation,
                                   buffered,
                                   timing,
                                   bufferGoal,
                                   withInitSegment) {
    let initSegment = null;

    if (withInitSegment) {
      log.debug("add init segment", bufferType);
      initSegment = representation.index.getInitSegment();
    }

    if (timing.readyState === 0) {
      return initSegment ? [initSegment] : [];
    }

    const timestamp = timing.ts;

    // wantedBufferSize calculates the size of the buffer we want to ensure,
    // taking into account the min between: the set max buffer size, the
    // duration and the live gap.
    const endDiff = (timing.duration || Infinity) - timestamp;
    const wantedBufferSize = Math.max(0,
      Math.min(bufferGoal, timing.liveGap, endDiff));

    // the ts padding is the time offset that we want to apply to our current
    // timestamp in order to calculate the starting point of the list of
    // segments to inject.
    let timestampPadding;
    const bufferGap = buffered.getGap(timestamp);
    if (bufferGap > LOW_WATER_MARK_PAD && bufferGap < Infinity) {
      timestampPadding = Math.min(bufferGap, HIGH_WATER_MARK_PAD);
    } else {
      timestampPadding = 0;
    }

    // in case the current buffered range has the same bitrate as the requested
    // representation, we can optimistically discard all the already buffered
    // data by setting the timestampPadding to the current range's gap
    const currentRange = ranges.getRange(timestamp);
    if (currentRange && currentRange.bitrate === representation.bitrate) {
      const rangeEndGap = Math.floor(currentRange.end - timestamp);
      if (rangeEndGap > timestampPadding) {
        timestampPadding = rangeEndGap;
      }
    }

    const from = timestamp + timestampPadding;
    const to = timestamp + wantedBufferSize;
    const duration = to - from;
    if (representation.index.shouldRefresh(timestamp, from, timestamp + wantedBufferSize)) {
      throw new IndexError(
        "OUT_OF_INDEX_ERROR", representation.index.getType(), false);
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
    function filterAlreadyLoaded(segment) {
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

      const time     = segment.time / segment.timescale;
      const duration = segment.duration / segment.timescale;

      const range = ranges.getSegmentRange(time, duration);
      if (range) {
        const segmentBitrate = representation.bitrate;
        // only re-load comparatively-poor bitrates
        return range.bitrate * BITRATE_REBUFFERING_RATIO < segmentBitrate;
      } else {
        return true;
      }
    }

    /**
     * Append buffer to the bufferingQueue.
     * If it leads to a QuotaExceededError, try to run our custom range
     * _garbage collector_.
     * @returns {Observable}
     */
    function appendDataInBuffer(pipelineData) {
      const { segment, parsed } = pipelineData;
      const { segmentData, nextSegments, currentSegment, timescale } = parsed;

      // change the timescale if one has been extracted from the
      // parsed segment (SegmentBase)
      // TODO do that higher up?
      if (timescale) {
        representation.index.setTimescale(timescale);
      }

      // TODO do that higher up?
      const addedSegments = nextSegments ?
        representation.index._addSegments(nextSegments, currentSegment) : [];

      /**
       * Validate the segment downloaded:
       *   - remove from the queued segment to re-allow its download
       *   - insert it in the ranges object
       */
      const validateSegment = () => {
        // Note: we should also clean when canceled/errored
        // (TODO do it when canceled?)
        queuedSegments.remove(segment.id);

        // current segment timings informations are used to update
        // ranges informations
        if (currentSegment) {
          ranges.insert(
            representation.bitrate,
            currentSegment.ts / segment.timescale,
            (currentSegment.ts + currentSegment.d) / segment.timescale
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

          // launch our garbage collector and retry on
          // QuotaExceededError and throw a fatal error if we still have
          // an error.
          return bufferGarbageCollector()
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
      const nativeBufferedRanges = new BufferedRanges(sourceBuffer.buffered);
      if (!ranges.equals(nativeBufferedRanges)) {
        ranges.intersect(nativeBufferedRanges);
      }

      // send a message downstream when bumping on an explicit
      // discontinuity announced in the segment index.
      if (timing.stalled) {
        if (isLive) {
          const discontinuity = representation.index.checkDiscontinuity(timing.ts);
          if (discontinuity > 0) {
            messageSubject.next({
              type: "index-discontinuity",
              value: { ts: discontinuity + 1 },
            });
          }
        }
      }

      let injectedSegments;
      try {
        // filter out already loaded and already queued segments
        const withInitSegment = (injectCount === 0);
        injectedSegments = getSegmentsListToInject(adaptation,
                                                   representation,
                                                   nativeBufferedRanges,
                                                   timing,
                                                   bufferGoal,
                                                   withInitSegment);

        injectedSegments = injectedSegments.filter(filterAlreadyLoaded);
      }
      catch(error) {
        // catch IndexError errors thrown when we try to access to
        // non available segments. Reinject this error into the main
        // buffer observable so that it can be treated upstream
        const isOutOfIndexError = (
          error.type === ErrorTypes.INDEX_ERROR &&
          error.code === ErrorCodes.OUT_OF_INDEX_ERROR
        );

        if (isOutOfIndexError) {
          messageSubject.next({ type: "out-of-index", value: error });
          return empty();
        }

        throw error;
      }

      // queue all segments injected in the observable
      for (let i = 0; i < injectedSegments.length; i++) {
        queuedSegments.add(injectedSegments[i].id);
      }

      return Observable.of(...injectedSegments);
    }

    /**
     * Remove buffer from the browser's memory based on the user's
     * maxBufferAhead / maxBufferBehind settings.
     *
     * Normally, the browser garbage-collect automatically old-added chunks of
     * buffer date when memory is scarce. However, you might want to control
     * the size of memory allocated. This function takes the current position
     * and a "depth" wanted for the buffer, in seconds.
     *
     * Anything older than the depth will be removed from the buffer.
     * @param {Number} position - The current position
     * @param {Number} maxBufferBehind
     * @returns {Observable}
     */
    const cleanBuffer = (position, maxBufferBehind, maxBufferAhead) => {
      if (!isFinite(maxBufferBehind) && !isFinite(maxBufferAhead)) {
        return Observable.empty();
      }

      const buffered = new BufferedRanges(sourceBuffer.buffered);
      const cleanedupRanges = [];
      const innerRange  = buffered.getRange(position);
      const outerRanges = buffered.getOuterRanges(position);


      const collectBufferBehind = () => {
        if (!isFinite(maxBufferBehind)) {
          return ;
        }

        // begin from the oldest
        for (let i = 0; i < outerRanges.length; i++) {
          const outerRange = outerRanges[i];
          if (position - maxBufferBehind >= outerRange.end) {
            cleanedupRanges.push(outerRange);
          }
          else if (
            position >= outerRange.end &&
            position - maxBufferBehind > outerRange.start &&
            position - maxBufferBehind < outerRange.end
          ) {
            cleanedupRanges.push({
              start: outerRange.start,
              end: position - maxBufferBehind,
            });
          }
        }
        if (innerRange) {
          if (position - maxBufferBehind > innerRange.start) {
            cleanedupRanges.push({
              start: innerRange.start,
              end: position - maxBufferBehind,
            });
          }
        }
      };

      const collectBufferAhead = () => {
        if (!isFinite(maxBufferAhead)) {
          return ;
        }

        // begin from the oldest
        for (let i = 0; i < outerRanges.length; i++) {
          const outerRange = outerRanges[i];
          if (position + maxBufferAhead <= outerRange.start) {
            cleanedupRanges.push(outerRange);
          }
          else if (
            position <= outerRange.start &&
            position + maxBufferAhead < outerRange.end &&
            position + maxBufferAhead > outerRange.start
          ) {
            cleanedupRanges.push({
              start: position + maxBufferAhead,
              end: outerRange.end,
            });
          }
        }
        if (innerRange) {
          if (position + maxBufferAhead < innerRange.end) {
            cleanedupRanges.push({
              start: position + maxBufferAhead,
              end: innerRange.end,
            });
          }
        }
      };

      collectBufferBehind();
      collectBufferAhead();
      return from(
        cleanedupRanges.map((range) => bufferingQueue.removeBuffer(range))
      ).concatAll().ignoreElements();
    };

    const loadNeededSegments = segment => {
      return downloader({ segment, representation })
        .map((args) => objectAssign({ segment }, args));
    };

    const onClockTick = ([
      timing, wantedBufferAhead, maxBufferBehind, maxBufferAhead,
    ], i) => {
      const bufferGoal = Math.min(wantedBufferAhead, maxBufferAhead);
      return Observable.merge(
        getNeededSegments(timing, bufferGoal, i)
          .concatMap(loadNeededSegments),
        cleanBuffer(timing.ts, maxBufferBehind, maxBufferAhead)
      );
    };

    const segmentsPipeline = combineLatest(
      timings,
      wantedBufferAhead,
      maxBufferBehind,
      maxBufferAhead,
    )
      .mergeMap(onClockTick)
      .concatMap(appendDataInBuffer);

    return merge(segmentsPipeline, messageSubject).catch((error) => {
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
        .concat(timer(2000))
        .concat(createRepresentationBuffer(representation));
    })
      .startWith({
        type: "buffer",
        value: { bufferType, adaptation, representation },
      });
  }

  return switch$
    .switchMap(createRepresentationBuffer)
    .finally(() => bufferingQueue.dispose());
}

function EmptyBuffer(bufferType) {
  return Observable.of({
    type: "buffer",
    value: {
      bufferType,
      adaptation: null,
      representation: null,
    },
  });
}

export {
  Buffer,
  EmptyBuffer,
};
