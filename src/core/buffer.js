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

var _ = require("canal-js-utils/misc");
var log = require("canal-js-utils/log");
var assert = require("canal-js-utils/assert");
var { BufferedRanges } = require("./ranges");
var { Observable, Subject } = require("canal-js-utils/rx");
var { combineLatest, defer, empty, from, just, merge, timer } = Observable;
var { first, on } = require("canal-js-utils/rx-ext");

var { ArraySet } = require("../utils/collections");
var { IndexHandler, OutOfIndexError } = require("./index-handler");

var BufferingQueue = require("./buffering-queue.js");

var BITRATE_REBUFFERING_RATIO = 1.5;

var GC_GAP_CALM  = 240;
var GC_GAP_BEEFY = 30;

function Buffer({
  sourceBuffer, // SourceBuffer object
  adaptation,   // Adaptation buffered
  pipeline,     // Segment pipeline
  adapters,     // { representations, bufferSizes } observables
  timings,      // Timings observable
  seekings      // Seekings observable
}) {

  var bufferingQueue = new BufferingQueue(sourceBuffer);

  var bufferType = adaptation.type;
  var isAVBuffer = (
    bufferType == "audio" ||
    bufferType == "video"
  );

  var outOfIndexStream = new Subject();

  // safety level (low and high water mark) size of buffer that won't
  // be flushed when switching representation for smooth transitions
  // and avoiding buffer underflows
  var LOW_WATER_MARK_PAD  = bufferType == "video" ? 4 : 1;
  var HIGH_WATER_MARK_PAD = bufferType == "video" ? 6 : 1;

  var { representations, bufferSizes } = adapters;
  var ranges = new BufferedRanges();

  var updateEnd = merge(
    on(sourceBuffer, "update"),
    on(sourceBuffer, "error").map((evt) => {
      if (evt.target && evt.target.error) {
        throw evt.target.error;
      } else {
        var errMessage = "buffer: error event";
        log.error(errMessage, evt);
        throw new Error(errMessage);
      }
    })
  ).share();

  // prevents unceasing add/remove event listeners by sharing an
  // open updateEnd stream (hackish)
  var mutedUpdateEnd = updateEnd
    .ignoreElements()
    .startWith(true);

  // Buffer garbage collector algorithm. Tries to free up some part of
  // the ranges that are distant from the current playing time.
  // See: https://w3c.github.io/media-source/#sourcebuffer-prepare-append
  function selectGCedRanges({ts, buffered}, gcGap) {
    var innerRange  = buffered.getRange(ts);
    var outerRanges = buffered.getOuterRanges(ts);

    var cleanedupRanges = [];

    cleanedupRanges.push.apply(cleanedupRanges, outerRanges);

    // try to clean up some space in the current range
    if (innerRange) {
      log.debug("buffer: gc removing part of inner range", cleanedupRanges);
      if (ts - gcGap > innerRange.start) {
        cleanedupRanges.push({ start: innerRange.start, end: ts - gcGap });
      }
    }

    return cleanedupRanges;
  }

  function bufferGarbageCollector() {
    log.warn("buffer: running garbage collector");
    return timings.take(1).flatMap((timing) => {
      var cleanedupRanges = selectGCedRanges(timing, GC_GAP_CALM);

      // more aggressive GC if we could not find any range to clean
      if (cleanedupRanges.length === 0) {
        cleanedupRanges = selectGCedRanges(timing, GC_GAP_BEEFY);
      }

      log.debug("buffer: gc cleaning", cleanedupRanges);
      return from(cleanedupRanges
        .map(arg => bufferingQueue.removeBuffer(arg)))
        .concatAll();
    });
  }

  function createRepresentationBuffer(representation) {
    var segmentIndex = new IndexHandler(adaptation, representation);
    var queuedSegments = new ArraySet();

    function filterAlreadyLoaded(segment) {
      // if this segment is already in the pipeline
      var isInQueue = queuedSegments.test(segment.id);
      if (isInQueue)
        return false;

      // segment without time info are usually init segments or some
      // kind of metadata segment that we never filter out
      if (segment.init || segment.time == null)
        return true;

      var time = segmentIndex.scale(segment.time);
      var duration = segmentIndex.scale(segment.duration);

      var range = ranges.hasRange(time, duration);
      if (range) {
        return range.bitrate * BITRATE_REBUFFERING_RATIO < representation.bitrate;
      } else {
        return true;
      }
    }

    function getSegmentsListToInject(buffered, timing, bufferSize, withInitSegment) {
      var segments = [];

      if (withInitSegment) {
        log.debug("add init segment", bufferType);
        segments.push(segmentIndex.getInitSegment());
      }

      if (timing.readyState === 0) {
        return segments;
      }

      var timestamp = timing.ts;

      // wanted buffer size calculates the actual size of the buffer
      // we want to ensure, taking into account the duration and the
      // potential live gap.
      var endDiff = (timing.duration || Infinity) - timestamp;
      var wantedBufferSize = Math.max(0,
        Math.min(bufferSize, timing.liveGap, endDiff));

      // the ts padding is the actual time gap that we want to apply
      // to our current timestamp in order to calculate the list of
      // segments to inject.
      var timestampPadding;
      var bufferGap = buffered.getGap(timestamp);
      if (bufferGap > LOW_WATER_MARK_PAD && bufferGap < Infinity) {
        timestampPadding = Math.min(bufferGap, HIGH_WATER_MARK_PAD);
      } else {
        timestampPadding = 0;
      }

      // in case the current buffered range has the same bitrate as
      // the requested representation, we can a optimistically discard
      // all the already buffered data by using the
      var currentRange = ranges.getRange(timestamp);
      if (currentRange && currentRange.bitrate === representation.bitrate) {
        var rangeEndGap = Math.floor(currentRange.end - timestamp);
        if (rangeEndGap > timestampPadding)
          timestampPadding = rangeEndGap;
      }

      // given the current timestamp and the previously calculated
      // time gap and wanted buffer size, we can retrieve the list of
      // segments to inject in our pipelines.
      var mediaSegments = segmentIndex.getSegments(timestamp, timestampPadding, wantedBufferSize);

      return segments.concat(mediaSegments);
    }

    var segmentsPipeline = combineLatest(
      timings,
      bufferSizes,
      mutedUpdateEnd,
      (timing, bufferSize) => ({ timing, bufferSize })
    )
      .flatMap(({ timing, bufferSize }) => {
        const cleanedupRanges = selectGCedRanges({
          ts: timing.ts,
          buffered: new BufferedRanges(sourceBuffer.buffered),
        }, 5);
        return from(cleanedupRanges
          .map((arg) => bufferingQueue.removeBuffer(arg)))
          .concatAll()
          .ignoreElements()
          .concat(just({ timing, bufferSize }))
          // .do(() => {
          //   if (sourceBuffer.buffered.length) {
          //     console.log(
          //       sourceBuffer.buffered.length,
          //       sourceBuffer.buffered.start(0),
          //       sourceBuffer.buffered.end(0))
          //   }
          // })
      })
      .flatMap(({ timing, bufferSize }, count) => {
        var nativeBufferedRanges = new BufferedRanges(sourceBuffer.buffered);

        // makes sure our own buffered ranges representation stay in
        // sync with the native one
        if (isAVBuffer) {
          if (!ranges.equals(nativeBufferedRanges)) {
            log.debug("intersect new buffer", bufferType);
            ranges.intersect(nativeBufferedRanges);
          }
        }

        var injectedSegments;
        try {
          // filter out already loaded and already queued segments
          var withInitSegment = (count === 0);
          injectedSegments = getSegmentsListToInject(nativeBufferedRanges, timing, bufferSize, withInitSegment);
          injectedSegments = _.filter(injectedSegments, filterAlreadyLoaded);
        }
        catch(err) {
          // catch OutOfIndexError errors thrown by when we try to
          // access to non available segments. Reinject this error
          // into the main buffer observable so that it can be treated
          // upstream
          if (err instanceof OutOfIndexError) {
            outOfIndexStream.onNext({ type: "out-of-index", value: err });
            return empty();
          }
          else {
            throw err;
          }

          // unreachable
          assert(false);
        }

        return from(_.map(injectedSegments, segment => {
          // queue all segments injected in the observable
          queuedSegments.add(segment.id);

          return {
            adaptation,
            representation,
            segment,
          };
        }));
      })
      .concatMap(pipeline)
      .concatMap((infos) => {
        var blob = infos.parsed.blob;
        return bufferingQueue.appendBuffer(blob)
          .catch((err) => {
            // launch our garbage collector and retry on
            // QuotaExceededError
            if (err.name == "QuotaExceededError") {
              return bufferGarbageCollector().flatMap(
                () => bufferingQueue.appendBuffer(blob));
            }
            else {
              throw err;
            }
          })
          .map(infos);
      })
      .map((infos) => {
        var { segment, parsed } = infos;
        queuedSegments.remove(segment.id);

        // change the timescale if one has been extracted from the
        // parsed segment (SegmentBase)
        var timescale = parsed.timescale;
        if (timescale) {
          segmentIndex.setTimescale(timescale);
        }

        var { nextSegments, currentSegment } = parsed;
        // added segments are values parsed from the segment metadata
        // that should be added to the segmentIndex.
        var addedSegments;
        if (nextSegments) {
          addedSegments = segmentIndex.insertNewSegments(nextSegments, currentSegment);
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
          type: "segment",
          value: _.extend({ addedSegments }, infos),
        };
      });

    return merge(segmentsPipeline, outOfIndexStream).catch(err => {
      if (err.code !== 412)
        throw err;

      // 412 Precondition Failed request errors do not cause the
      // buffer to stop but are re-emitted in the stream as
      // "precondition-failed" type. They should be handled re-
      // adapting the live-gap that the player is holding
      return just({ type: "precondition-failed", value: err })
        .concat(timer(2000))
        .concat(createRepresentationBuffer(representation));
    });
  }

  return combineLatest(representations, seekings, _.identity)
    .flatMapLatest(createRepresentationBuffer);
}

module.exports = Buffer;
