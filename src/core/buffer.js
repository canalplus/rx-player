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
var { BufferedRanges, bufferedToArray, getGap } = require("./ranges");
var { Observable, Subject } = require("canal-js-utils/rx");
var { combineLatest, defer, empty, from, just, merge, timer } = Observable;
var { first, on } = require("canal-js-utils/rx-ext");

var { ArraySet } = require("../utils/collections");
var { IndexHandler, OutOfIndexError } = require("./index-handler");

var BITRATE_REBUFFERING_RATIO = 1.5;

function Buffer({
  sourceBuffer, // SourceBuffer object
  adaptation,   // Adaptation buffered
  pipeline,     // Segment pipeline
  adapters,     // { representations, bufferSizes } observables
  timings,      // Timings observable
  seekings      // Seekings observable
}) {

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

  function getTsPadding(gap) {
    if (gap > LOW_WATER_MARK_PAD && gap < Infinity) {
      return Math.min(gap, HIGH_WATER_MARK_PAD);
    } else {
      return 0;
    }
  }

  var { representations, bufferSizes } = adapters;
  var ranges = new BufferedRanges();

  var updateEnd = merge(
    on(sourceBuffer, "update"),
    on(sourceBuffer, "error").map((evt) => {
      var errMessage = "buffer: error event";
      log.error(errMessage, evt);
      throw new Error(errMessage);
    })
  ).share();

  // prevents unceasing add/remove event listeners by sharing an
  // open updateEnd stream (hackish)
  var mutedUpdateEnd = updateEnd
    .ignoreElements()
    .startWith(true);

  function appendBuffer(blob) {
    sourceBuffer.appendBuffer(blob);
    return first(updateEnd);
  }

  function lockedAppendBuffer(infos) {
    return defer(() => {
      var blob = infos.parsed.blob;
      if (sourceBuffer.updating) {
        return first(updateEnd).flatMap(() => appendBuffer(blob));
      } else {
        return appendBuffer(blob);
      }
    }).map(infos);
  }

  function createRepresentationBuffer(representation) {
    var segmentIndex = new IndexHandler(representation);
    var currentBitrate = representation.bitrate;

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
        return range.bitrate * BITRATE_REBUFFERING_RATIO < currentBitrate;
      } else {
        return true;
      }
    }

    function getInjectedSegments(timing, bufferSize, withInitSegment) {
      var segments = [];

      if (withInitSegment) {
        log.debug("add init segment", bufferType);
        segments.push(segmentIndex.getInitSegment());
      }

      if (timing.readyState > 0) {
        // wanted buffer size calculates the actual size of the
        // buffer we want to ensure, taking into account the
        // duration and the potential live gap.
        var endDiff = (timing.duration || Infinity) - timing.ts;
        var liveGap = (timing.liveGap);
        var wantedBufferSize = Math.max(0, Math.min(bufferSize, liveGap, endDiff));

        // the ts padding is the actual time gap that we want to
        // apply to our current timestamp in order to calculate the
        // list of segments to inject.
        var sourceBufferGap = getGap(timing.ts, sourceBuffer.buffered);
        var tsPadding = getTsPadding(sourceBufferGap);

        var currentRange = ranges.getRange(timing.ts);
        if (currentRange) {
          var rangeEndGap = Math.floor(currentRange.end - timing.ts);
          if (rangeEndGap > tsPadding)
            tsPadding = rangeEndGap;
        }

        // given the current timestamp and the previously calculated
        // time gap and wanted buffer size, we can retrieve the list
        // of segments to inject in our pipelines.
        var mediaSegments = segmentIndex.getSegments(timing.ts, tsPadding, wantedBufferSize);

        segments = segments.concat(mediaSegments);
      }

      // filter out already loaded and already queued segments
      return _.filter(segments, filterAlreadyLoaded);
    }

    var segmentsPipeline = combineLatest(
      timings,
      bufferSizes,
      mutedUpdateEnd,
      (timing, bufferSize) => ({ timing, bufferSize })
    )
      .flatMap(({ timing, bufferSize }, count) => {
        var firstCall = (count === 0);

        if (isAVBuffer && (firstCall || timing.stalled)) {
          // side effect to cleanup & synchronize the buffered ranges
          // object with de native sourceBuffer.buffered ranges in
          // case some part of the stream have been auto-deleted by
          // the browser.
          log.debug("intersect new buffer", bufferType);
          ranges.intersect(bufferedToArray(sourceBuffer.buffered));
        }

        var injectedSegments;
        try {
          injectedSegments = getInjectedSegments(timing, bufferSize, firstCall);
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

          return { adaptation, representation, segment };
        }));
      })
      .concatMap(pipeline)
      .concatMap(lockedAppendBuffer)
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
          ranges.insert(currentBitrate,
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
