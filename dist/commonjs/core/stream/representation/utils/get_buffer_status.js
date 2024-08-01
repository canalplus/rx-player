"use strict";
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var segment_sinks_1 = require("../../../segment_sinks");
var check_for_discontinuity_1 = require("./check_for_discontinuity");
var get_needed_segments_1 = require("./get_needed_segments");
var get_segment_priority_1 = require("./get_segment_priority");
/**
 * Checks on the current buffered data for the given type and Period
 * and returns what should be done to fill the buffer according to the buffer
 * goal, the Representation chosen, etc.
 * Also emits discontinuities if found, which are parts of the buffer that won't
 * be filled by any segment, even in the future.
 *
 * @param {Object} content
 * @param {number} initialWantedTime
 * @param {Object} playbackObserver
 * @param {number|undefined} fastSwitchThreshold
 * @param {number} bufferGoal
 * @param {number} maxBufferSize
 * @param {Object} segmentSink
 * @returns {Object}
 */
function getBufferStatus(content, initialWantedTime, playbackObserver, fastSwitchThreshold, bufferGoal, maxBufferSize, segmentSink) {
    var _a, _b, _c;
    var representation = content.representation;
    var isPaused = (_b = (_a = playbackObserver.getIsPaused()) !== null && _a !== void 0 ? _a : playbackObserver.getReference().getValue().paused.pending) !== null && _b !== void 0 ? _b : playbackObserver.getReference().getValue().paused.last;
    var playbackRate = (_c = playbackObserver.getPlaybackRate()) !== null && _c !== void 0 ? _c : playbackObserver.getReference().getValue().speed;
    var askedStart = initialWantedTime;
    if (isPaused === undefined ||
        playbackRate === undefined ||
        isPaused ||
        playbackRate <= 0) {
        askedStart -= 0.1;
    }
    var neededRange = getRangeOfNeededSegments(content, askedStart, bufferGoal);
    var shouldRefreshManifest = representation.index.shouldRefresh(neededRange.start, neededRange.end);
    /**
     * Every segment awaiting an "SignalSegmentComplete" operation, which
     * indicates that a completely-loaded segment is still being pushed to the
     * SegmentSink.
     */
    var segmentsBeingPushed = segmentSink
        .getPendingOperations()
        .filter(function (operation) {
        return operation.type === segment_sinks_1.SegmentSinkOperation.SignalSegmentComplete;
    })
        .map(function (operation) { return operation.value; });
    /** Data on every segments buffered around `neededRange`. */
    var bufferedSegments = segmentSink.getLastKnownInventory();
    var currentPlaybackTime = playbackObserver.getCurrentTime();
    if (currentPlaybackTime === undefined) {
        // We're in a WebWorker, just consider the last known position
        currentPlaybackTime = playbackObserver.getReference().getValue().position.getWanted();
    }
    /** Callback allowing to retrieve a segment's history in the buffer. */
    var getBufferedHistory = segmentSink.getSegmentHistory.bind(segmentSink);
    /** List of segments we will need to download. */
    var _d = (0, get_needed_segments_1.default)({
        content: content,
        bufferedSegments: bufferedSegments,
        currentPlaybackTime: currentPlaybackTime,
        fastSwitchThreshold: fastSwitchThreshold,
        getBufferedHistory: getBufferedHistory,
        neededRange: neededRange,
        segmentsBeingPushed: segmentsBeingPushed,
        maxBufferSize: maxBufferSize,
    }), segmentsToLoad = _d.segmentsToLoad, segmentsOnHold = _d.segmentsOnHold, isBufferFull = _d.isBufferFull;
    var prioritizedNeededSegments = segmentsToLoad.map(function (segment) { return ({
        priority: (0, get_segment_priority_1.default)(segment.time, askedStart),
        segment: segment,
    }); });
    /**
     * `true` if the current `RepresentationStream` has loaded all the
     * needed segments for this Representation until the end of the Period.
     */
    var hasFinishedLoading = representation.index.isInitialized() &&
        !representation.index.isStillAwaitingFutureSegments() &&
        neededRange.hasReachedPeriodEnd &&
        prioritizedNeededSegments.length === 0 &&
        segmentsOnHold.length === 0;
    /**
     * Start time in seconds of the next available not-yet pushed segment.
     * `null` if no segment is wanted for the current wanted range.
     */
    var nextSegmentStart = null;
    if (segmentsBeingPushed.length > 0) {
        nextSegmentStart = Math.min.apply(Math, __spreadArray([], __read(segmentsBeingPushed.map(function (info) { return info.segment.time; })), false));
    }
    if (segmentsOnHold.length > 0) {
        nextSegmentStart =
            nextSegmentStart !== null
                ? Math.min(nextSegmentStart, segmentsOnHold[0].time)
                : segmentsOnHold[0].time;
    }
    if (prioritizedNeededSegments.length > 0) {
        nextSegmentStart =
            nextSegmentStart !== null
                ? Math.min(nextSegmentStart, prioritizedNeededSegments[0].segment.time)
                : prioritizedNeededSegments[0].segment.time;
    }
    var imminentDiscontinuity = (0, check_for_discontinuity_1.default)(content, neededRange, nextSegmentStart, hasFinishedLoading, bufferedSegments);
    return {
        imminentDiscontinuity: imminentDiscontinuity,
        hasFinishedLoading: hasFinishedLoading,
        neededSegments: prioritizedNeededSegments,
        isBufferFull: isBufferFull,
        shouldRefreshManifest: shouldRefreshManifest,
    };
}
exports.default = getBufferStatus;
/**
 * Returns both the time range of segments that should be loaded (from a
 * starting position to an ending position) and whether the end of the Period is
 * reached by that range.
 * @param {Object} content
 * @param {number} initialWantedTime
 * @param {number} bufferGoal
 * @returns {Object}
 */
function getRangeOfNeededSegments(content, initialWantedTime, bufferGoal) {
    var _a;
    var wantedStartPosition;
    var manifest = content.manifest, period = content.period, representation = content.representation;
    var lastIndexPosition = representation.index.getLastAvailablePosition();
    var representationIndex = representation.index;
    // There is an exception for when the current initially wanted time is already
    // after the last position with segments AND when we're playing the absolute
    // last Period in the Manifest.
    // In that case, we want to actually request at least the last segment to
    // avoid ending the last Period - and by extension the content - with a
    // segment which isn't the last one.
    if (!(0, is_null_or_undefined_1.default)(lastIndexPosition) &&
        segment_sinks_1.default.isNative(content.adaptation.type) &&
        initialWantedTime >= lastIndexPosition &&
        representationIndex.isInitialized() &&
        !representationIndex.isStillAwaitingFutureSegments() &&
        isPeriodTheCurrentAndLastOne(manifest, period, initialWantedTime)) {
        wantedStartPosition = lastIndexPosition - 1;
    }
    else {
        wantedStartPosition = initialWantedTime - 0.1;
    }
    var wantedEndPosition = wantedStartPosition + bufferGoal;
    var hasReachedPeriodEnd;
    if (!representation.index.isInitialized() ||
        representation.index.isStillAwaitingFutureSegments() ||
        period.end === undefined) {
        hasReachedPeriodEnd = false;
    }
    else if (lastIndexPosition === undefined) {
        // We do not know the end of this index.
        hasReachedPeriodEnd = wantedEndPosition >= period.end;
    }
    else if (lastIndexPosition === null) {
        // There is no available segment in the index currently.
        hasReachedPeriodEnd = true;
    }
    else {
        // We have a declared end. Check that our range went until the last
        // position available in the index. If that's the case and we're left
        // with no segments after filtering them, it means we already have
        // downloaded the last segments and have nothing left to do: full.
        hasReachedPeriodEnd = wantedEndPosition >= lastIndexPosition;
    }
    return {
        start: Math.max(wantedStartPosition, period.start),
        end: Math.min(wantedEndPosition, (_a = period.end) !== null && _a !== void 0 ? _a : Infinity),
        hasReachedPeriodEnd: hasReachedPeriodEnd,
    };
}
/**
 * Returns `true` if the given Period is both:
 *   - the one being played (the current position is known from `time`)
 *   - the absolute last one in the Manifest (that is, there will never be a
 *     Period after it).
 * @param {Object} manifest
 * @param {Object} period
 * @param {number} time
 * @returns {boolean}
 */
function isPeriodTheCurrentAndLastOne(manifest, period, time) {
    var _a;
    var nextPeriod = manifest.getPeriodAfter(period);
    return (period.containsTime(time, nextPeriod) &&
        manifest.isLastPeriodKnown &&
        period.id === ((_a = manifest.periods[manifest.periods.length - 1]) === null || _a === void 0 ? void 0 : _a.id));
}
