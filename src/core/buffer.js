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

const log = require("../utils/log");
const { BufferingQueue } = require("./buffering-queue");
const { BufferedRanges } = require("./ranges");
const { Observable } = require("rxjs/Observable");
const { Subject } = require("rxjs/Subject");
const { combineLatest } = require("rxjs/observable/combineLatest");
const { merge } = require("rxjs/observable/merge");
const empty = require("rxjs/observable/EmptyObservable").EmptyObservable.create;
const from = require("rxjs/observable/FromObservable").FromObservable.create;
const timer = require("rxjs/observable/TimerObservable").TimerObservable.create;

const { SimpleSet } = require("../utils/collections");
const { IndexHandler } = require("./index-handler");
const {
  MediaError,
  ErrorTypes,
  ErrorCodes,
} = require("../errors");

const BITRATE_REBUFFERING_RATIO = 1.5;

const GC_GAP_CALM  = 240;
const GC_GAP_BEEFY = 30;

function Buffer({
  bufferType,   // Buffer type (audio, video, text)
  sourceBuffer, // SourceBuffer object
  adaptation,   // Adaptation buffered
  pipeline,     // Segment pipeline
  adapters,     // { representations, bufferSizes } observables
  timings,      // Timings observable
  seekings,     // Seekings observable
}) {

  const isAVBuffer = (
    bufferType == "audio" ||
    bufferType == "video"
  );

  const messageSubject = new Subject();

  // safety level (low and high water mark) size of buffer that won't
  // be flushed when switching representation for smooth transitions
  // and avoiding buffer underflows
  const LOW_WATER_MARK_PAD  = bufferType == "video" ? 4 : 1;
  const HIGH_WATER_MARK_PAD = bufferType == "video" ? 6 : 1;

  const { representations, bufferSizes } = adapters;
  const ranges = new BufferedRanges();
  const bufferingQueue = new BufferingQueue(sourceBuffer);

  // Buffer garbage collector algorithm. Tries to free up some part of
  // the ranges that are distant from the current playing time.
  // See: https://w3c.github.io/media-source/#sourcebuffer-prepare-append
  function selectGCedRanges({ts, buffered}, gcGap) {
    const innerRange  = buffered.getRange(ts);
    const outerRanges = buffered.getOuterRanges(ts);

    const cleanedupRanges = [];

    // start by trying to remove all ranges that do not contain the
    // current time and respect the gcGap
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

  function bufferGarbageCollector() {
    log.warn("buffer: running garbage collector");
    return timings.take(1).mergeMap((timing) => {
      let cleanedupRanges = selectGCedRanges(timing, GC_GAP_CALM);

      // more aggressive GC if we could not find any range to clean
      if (cleanedupRanges.length === 0) {
        cleanedupRanges = selectGCedRanges(timing, GC_GAP_BEEFY);
      }

      log.debug("buffer: gc cleaning", cleanedupRanges);
      return from(
        cleanedupRanges.map((range) => bufferingQueue.removeBuffer(range))
      ).concatAll();
    });
  }

  function doAppendBufferOrGC(pipelineData) {
    const segmentData = pipelineData.parsed.segmentData;
    return bufferingQueue.appendBuffer(segmentData)
      .catch((error) => {
        if (error.name != "QuotaExceededError") {
          throw new MediaError("BUFFER_APPEND_ERROR", error, false);
        }

        // launch our garbage collector and retry on
        // QuotaExceededError and throw a fatal error if we still have
        // an error.
        return bufferGarbageCollector()
          .mergeMap(() => bufferingQueue.appendBuffer(segmentData))
          .catch((error) => {
            throw new MediaError("BUFFER_FULL_ERROR", error, true);
          });
      });
  }

  function getSegmentsListToInject(segmentIndex,
                                   adaptation,
                                   representation,
                                   buffered,
                                   timing,
                                   bufferSize,
                                   withInitSegment) {
    let initSegment = null;

    if (withInitSegment) {
      log.debug("add init segment", bufferType);
      initSegment = segmentIndex.getInitSegment();
    }

    if (timing.readyState === 0) {
      return initSegment ? [initSegment] : [];
    }

    const timestamp = timing.ts;

    // wanted buffer size calculates the actual size of the buffer
    // we want to ensure, taking into account the duration and the
    // potential live gap.
    const endDiff = (timing.duration || Infinity) - timestamp;
    const wantedBufferSize = Math.max(0,
      Math.min(bufferSize, timing.liveGap, endDiff));

    // the ts padding is the actual time gap that we want to apply
    // to our current timestamp in order to calculate the list of
    // segments to inject.
    let timestampPadding;
    const bufferGap = buffered.getGap(timestamp);
    if (bufferGap > LOW_WATER_MARK_PAD && bufferGap < Infinity) {
      timestampPadding = Math.min(bufferGap, HIGH_WATER_MARK_PAD);
    } else {
      timestampPadding = 0;
    }

    // in case the current buffered range has the same bitrate as
    // the requested representation, we can a optimistically discard
    // all the already buffered data by using the
    const currentRange = ranges.getRange(timestamp);
    if (currentRange && currentRange.bitrate === representation.bitrate) {
      const rangeEndGap = Math.floor(currentRange.end - timestamp);
      if (rangeEndGap > timestampPadding) {
        timestampPadding = rangeEndGap;
      }
    }

    // given the current timestamp and the previously calculated
    // time gap and wanted buffer size, we can retrieve the list of
    // segments to inject in our pipelines.
    const mediaSegments = segmentIndex.getSegments(timestamp,
                                                   timestampPadding,
                                                   wantedBufferSize);

    if (initSegment) {
      mediaSegments.unshift(initSegment);
    }

    return mediaSegments;
  }

  function createRepresentationBuffer(representation) {
    log.info("bitrate", bufferType, representation.bitrate);

    const segmentIndex = new IndexHandler(adaptation, representation);
    const queuedSegments = new SimpleSet();

    function filterAlreadyLoaded(segment) {
      // if this segment is already in the pipeline
      const isInQueue = queuedSegments.test(segment.getId());
      if (isInQueue) {
        return false;
      }

      // segment without time info are usually init segments or some
      // kind of metadata segment that we never filter out
      if (segment.isInitSegment() || segment.getTime() < 0) {
        return true;
      }

      const time     = segmentIndex.scale(segment.getTime());
      const duration = segmentIndex.scale(segment.getDuration());

      const range = ranges.hasRange(time, duration);
      if (range) {
        return range.bitrate * BITRATE_REBUFFERING_RATIO < segment.getRepresentation().bitrate;
      } else {
        return true;
      }
    }

    function doInjectSegments([timing, bufferSize], injectCount) {
      const nativeBufferedRanges = new BufferedRanges(sourceBuffer.buffered);

      // makes sure our own buffered ranges representation stay in
      // sync with the native one
      if (isAVBuffer) {
        if (!ranges.equals(nativeBufferedRanges)) {
          log.debug("intersect new buffer", bufferType);
          ranges.intersect(nativeBufferedRanges);
        }
      }

      // send a message downstream when bumping on an explicit
      // discontinuity announced in the segment index.
      if (timing.stalled) {
        const discontinuity = segmentIndex.checkDiscontinuity(timing.ts);
        if (discontinuity) {
          messageSubject.next({ type: "index-discontinuity", value: discontinuity });
        }
      }

      let injectedSegments;
      try {
        // filter out already loaded and already queued segments
        const withInitSegment = (injectCount === 0);
        injectedSegments = getSegmentsListToInject(segmentIndex,
                                                   adaptation,
                                                   representation,
                                                   nativeBufferedRanges,
                                                   timing,
                                                   bufferSize,
                                                   withInitSegment);

        injectedSegments = injectedSegments.filter(filterAlreadyLoaded);
      }
      catch(error) {
        // catch IndexError errors thrown by when we try to access to
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
        queuedSegments.add(injectedSegments[i].getId());
      }

      return injectedSegments;
    }

    function doUnqueueAndUpdateRanges(pipelineData) {
      const { segment, parsed } = pipelineData;
      queuedSegments.remove(segment.getId());

      // change the timescale if one has been extracted from the
      // parsed segment (SegmentBase)
      const timescale = parsed.timescale;
      if (timescale) {
        segmentIndex.setTimescale(timescale);
      }

      const { nextSegments, currentSegment } = parsed;
      // added segments are values parsed from the segment metadata
      // that should be added to the segmentIndex.
      let addedSegments;
      if (nextSegments) {
        addedSegments = segmentIndex.insertNewSegments(nextSegments,
                                                       currentSegment);
      } else {
        addedSegments = [];
      }

      // current segment timings informations are used to update
      // ranges informations
      if (currentSegment) {
        ranges.insert(representation.bitrate,
          segmentIndex.scale(currentSegment.ts),
          segmentIndex.scale(currentSegment.ts + currentSegment.d));
      }

      return {
        type: "pipeline",
        value: Object.assign({ bufferType, addedSegments }, pipelineData),
      };
    }

    const segmentsPipeline = combineLatest(
      timings,
      bufferSizes
    )
      .mergeMap(doInjectSegments)
      .concatMap((segment) => pipeline({ segment }))
      .concatMap(
        doAppendBufferOrGC,
        doUnqueueAndUpdateRanges
      );

    return merge(segmentsPipeline, messageSubject).catch((error) => {
      // For live adaptations, handle 412 errors as precondition-
      // failed errors, ie: we are requesting for segments before they
      // exist
      const isPreconditionFailedError = (
        adaptation.isLive &&
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

  return combineLatest(representations, seekings, (rep) => rep)
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

module.exports = {
  Buffer,
  EmptyBuffer,
};
