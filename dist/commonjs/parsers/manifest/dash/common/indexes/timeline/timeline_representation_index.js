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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastRequestableSegmentInfo = exports.isSegmentStillAvailable = void 0;
var config_1 = require("../../../../../../config");
var errors_1 = require("../../../../../../errors");
var log_1 = require("../../../../../../log");
var assert_1 = require("../../../../../../utils/assert");
var is_null_or_undefined_1 = require("../../../../../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../../../../../utils/monotonic_timestamp");
var clear_timeline_from_position_1 = require("../../../../utils/clear_timeline_from_position");
var index_helpers_1 = require("../../../../utils/index_helpers");
var update_segment_timeline_1 = require("../../../../utils/update_segment_timeline");
var get_init_segment_1 = require("../get_init_segment");
var get_segments_from_timeline_1 = require("../get_segments_from_timeline");
var tokens_1 = require("../tokens");
var utils_1 = require("../utils");
var construct_timeline_from_elements_1 = require("./construct_timeline_from_elements");
var construct_timeline_from_previous_timeline_1 = require("./construct_timeline_from_previous_timeline");
/**
 * `IRepresentationIndex` implementation for a DASH `SegmentTimeline` segment
 * indexing scheme.
 * @class TimelineRepresentationIndex
 */
var TimelineRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function TimelineRepresentationIndex(index, context) {
        var _a, _b, _c, _d, _e;
        if (!TimelineRepresentationIndex.isTimelineIndexArgument(index)) {
            throw new Error("The given index is not compatible with a " + "TimelineRepresentationIndex.");
        }
        var availabilityTimeComplete = context.availabilityTimeComplete, availabilityTimeOffset = context.availabilityTimeOffset, manifestBoundsCalculator = context.manifestBoundsCalculator, isDynamic = context.isDynamic, isLastPeriod = context.isLastPeriod, representationId = context.representationId, representationBitrate = context.representationBitrate, periodStart = context.periodStart, periodEnd = context.periodEnd, isEMSGWhitelisted = context.isEMSGWhitelisted;
        var timescale = (_a = index.timescale) !== null && _a !== void 0 ? _a : 1;
        var presentationTimeOffset = (_b = index.presentationTimeOffset) !== null && _b !== void 0 ? _b : 0;
        var scaledStart = periodStart * timescale;
        var indexTimeOffset = presentationTimeOffset - scaledStart;
        this._manifestBoundsCalculator = manifestBoundsCalculator;
        this._isEMSGWhitelisted = isEMSGWhitelisted;
        this._isLastPeriod = isLastPeriod;
        this._lastUpdate = (_c = context.receivedTime) !== null && _c !== void 0 ? _c : (0, monotonic_timestamp_1.default)();
        this._unsafelyBaseOnPreviousIndex = null;
        if (context.unsafelyBaseOnPreviousRepresentation !== null &&
            context.unsafelyBaseOnPreviousRepresentation.index instanceof
                TimelineRepresentationIndex) {
            // avoid too much nested references, to keep memory down
            context.unsafelyBaseOnPreviousRepresentation.index._unsafelyBaseOnPreviousIndex =
                null;
            this._unsafelyBaseOnPreviousIndex =
                context.unsafelyBaseOnPreviousRepresentation.index;
        }
        this._isDynamic = isDynamic;
        this._parseTimeline = (_d = index.timelineParser) !== null && _d !== void 0 ? _d : null;
        var initializationUrl = ((_e = index.initialization) === null || _e === void 0 ? void 0 : _e.media) === undefined
            ? null
            : (0, tokens_1.constructRepresentationUrl)(index.initialization.media, representationId, representationBitrate);
        var segmentUrlTemplate = index.media === undefined
            ? null
            : (0, tokens_1.constructRepresentationUrl)(index.media, representationId, representationBitrate);
        var actualAvailabilityTimeOffset;
        // Technically, it seems (although it is not clear) that an MPD may contain
        // future segments and it's the job of a player to not request segments later
        // than the time at which they should be available.
        // In practice, we don't do that for various reasons: precision issues,
        // various DASH spec interpretations by packagers and players...
        //
        // So as a compromise, if nothing in the MPD indicates that future segments
        // may be announced (see code below), we will act as if ALL segments in this
        // TimelineRepresentationIndex are requestable
        if (availabilityTimeOffset === undefined && availabilityTimeComplete === undefined) {
            actualAvailabilityTimeOffset = Infinity; // Meaning: we can request
            // everything in the index
        }
        else {
            actualAvailabilityTimeOffset = availabilityTimeOffset !== null && availabilityTimeOffset !== void 0 ? availabilityTimeOffset : 0;
        }
        this._index = {
            availabilityTimeComplete: availabilityTimeComplete !== null && availabilityTimeComplete !== void 0 ? availabilityTimeComplete : true,
            availabilityTimeOffset: actualAvailabilityTimeOffset,
            indexRange: index.indexRange,
            indexTimeOffset: indexTimeOffset,
            initialization: (0, is_null_or_undefined_1.default)(index.initialization)
                ? undefined
                : {
                    url: initializationUrl,
                    range: index.initialization.range,
                },
            segmentUrlTemplate: segmentUrlTemplate,
            startNumber: index.startNumber,
            endNumber: index.endNumber,
            timeline: index.timeline === undefined
                ? null
                : updateTimelineFromEndNumber(index.timeline, index.startNumber, index.endNumber),
            timescale: timescale,
        };
        this._scaledPeriodStart = (0, index_helpers_1.toIndexTime)(periodStart, this._index);
        this._scaledPeriodEnd =
            periodEnd === undefined ? undefined : (0, index_helpers_1.toIndexTime)(periodEnd, this._index);
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    TimelineRepresentationIndex.prototype.getInitSegment = function () {
        return (0, get_init_segment_1.default)(this._index, this._isEMSGWhitelisted);
    };
    /**
     * Asks for segments to download for a given time range.
     * @param {Number} from - Beginning of the time wanted, in seconds
     * @param {Number} duration - duration wanted, in seconds
     * @returns {Array.<Object>}
     */
    TimelineRepresentationIndex.prototype.getSegments = function (from, duration) {
        this._refreshTimeline(); // clear timeline if needed
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        return (0, get_segments_from_timeline_1.default)(this._index, from, duration, this._manifestBoundsCalculator, this._scaledPeriodEnd, this._isEMSGWhitelisted);
    };
    /**
     * Returns true if the index should be refreshed.
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.shouldRefresh = function () {
        // DASH Manifest based on a SegmentTimeline should have minimumUpdatePeriod
        // attribute which should be sufficient to know when to refresh it.
        return false;
    };
    /**
     * Returns the starting time, in seconds, of the earliest segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    TimelineRepresentationIndex.prototype.getFirstAvailablePosition = function () {
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var timeline = this._index.timeline;
        return timeline.length === 0
            ? null
            : (0, index_helpers_1.fromIndexTime)(Math.max(this._scaledPeriodStart, timeline[0].start), this._index);
    };
    /**
     * Returns the ending time, in seconds, of the last segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    TimelineRepresentationIndex.prototype.getLastAvailablePosition = function () {
        var _a;
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var lastReqSegInfo = getLastRequestableSegmentInfo(
        // Needed typecast for TypeScript
        this._index, this._manifestBoundsCalculator, this._scaledPeriodEnd);
        if (lastReqSegInfo === null) {
            return null;
        }
        var lastScaledPosition = Math.min(lastReqSegInfo.end, (_a = this._scaledPeriodEnd) !== null && _a !== void 0 ? _a : Infinity);
        return (0, index_helpers_1.fromIndexTime)(lastScaledPosition, this._index);
    };
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    TimelineRepresentationIndex.prototype.getEnd = function () {
        var _a;
        if (this._isDynamic && !this._isLastPeriod) {
            return undefined;
        }
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        if (this._index.timeline.length <= 0) {
            return null;
        }
        var lastSegment = this._index.timeline[this._index.timeline.length - 1];
        var lastTime = Math.min((0, index_helpers_1.getIndexSegmentEnd)(lastSegment, null, this._scaledPeriodEnd), (_a = this._scaledPeriodEnd) !== null && _a !== void 0 ? _a : Infinity);
        return (0, index_helpers_1.fromIndexTime)(lastTime, this._index);
    };
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     * @param {number} start
     * @param {number} end
     * @returns {boolean|undefined}
     */
    TimelineRepresentationIndex.prototype.awaitSegmentBetween = function (start, end) {
        var _a, _b;
        (0, assert_1.default)(start <= end);
        if (!this._isDynamic) {
            return false; // No segment will be newly available in the future
        }
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var _c = this._index, timescale = _c.timescale, timeline = _c.timeline;
        var segmentTimeRounding = (0, utils_1.getSegmentTimeRoundingError)(timescale);
        var scaledWantedEnd = (0, index_helpers_1.toIndexTime)(end, this._index);
        var lastReqSegInfo = getLastRequestableSegmentInfo(
        // Needed typecast for TypeScript
        this._index, this._manifestBoundsCalculator, this._scaledPeriodEnd);
        if (lastReqSegInfo !== null) {
            var lastReqSegmentEnd = Math.min(lastReqSegInfo.end, (_a = this._scaledPeriodEnd) !== null && _a !== void 0 ? _a : Infinity);
            var roundedReqSegmentEnd = lastReqSegmentEnd + segmentTimeRounding;
            if (roundedReqSegmentEnd >=
                Math.min(scaledWantedEnd, (_b = this._scaledPeriodEnd) !== null && _b !== void 0 ? _b : Infinity)) {
                return false; // everything up to that point is already requestable
            }
        }
        var scaledWantedStart = (0, index_helpers_1.toIndexTime)(start, this._index);
        if (timeline.length > 0 &&
            lastReqSegInfo !== null &&
            !lastReqSegInfo.isLastOfTimeline) {
            // There are some future segments already anounced in the MPD
            var lastSegment = timeline[timeline.length - 1];
            var lastSegmentEnd = (0, index_helpers_1.getIndexSegmentEnd)(lastSegment, null, this._scaledPeriodEnd);
            var roundedLastSegEnd = lastSegmentEnd + segmentTimeRounding;
            if (scaledWantedStart < roundedLastSegEnd + segmentTimeRounding) {
                return true; // The MPD's timeline already contains one such element,
                // It is just not requestable yet
            }
        }
        if (!this._isLastPeriod) {
            // Let's consider - perhaps wrongly, that Periods which aren't the last
            // one have all of their segments announced.
            return false;
        }
        if (this._scaledPeriodEnd === undefined) {
            return scaledWantedEnd + segmentTimeRounding > this._scaledPeriodStart
                ? undefined // There may be future segments at this point
                : false; // Before the current Period
        }
        // `true` if within the boundaries of this Period. `false` otherwise.
        return (scaledWantedStart - segmentTimeRounding < this._scaledPeriodEnd &&
            scaledWantedEnd + segmentTimeRounding > this._scaledPeriodStart);
    };
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * Returns false if it is not available anymore.
     * Returns undefined if we cannot know whether it is still available or not.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    TimelineRepresentationIndex.prototype.isSegmentStillAvailable = function (segment) {
        if (segment.isInit) {
            return true;
        }
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        return isSegmentStillAvailable(segment, 
        // Needed typecast for TypeScript
        this._index, this._manifestBoundsCalculator, this._scaledPeriodEnd);
    };
    /**
     * Checks if the time given is in a discontinuity. That is:
     *   - We're on the upper bound of the current range (end of the range - time
     *     is inferior to the timescale)
     *   - The next range starts after the end of the current range.
     * @param {Number} time
     * @returns {Number|null}
     */
    TimelineRepresentationIndex.prototype.checkDiscontinuity = function (time) {
        this._refreshTimeline();
        var timeline = this._index.timeline;
        if (timeline === null) {
            timeline = this._getTimeline();
            this._index.timeline = timeline;
        }
        return (0, index_helpers_1.checkDiscontinuity)({
            timeline: timeline,
            timescale: this._index.timescale,
            indexTimeOffset: this._index.indexTimeOffset,
        }, time, this._scaledPeriodEnd);
    };
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.canBeOutOfSyncError = function (error) {
        if (!this._isDynamic) {
            return false;
        }
        return error instanceof errors_1.NetworkError && error.isHttpError(404);
    };
    /**
     * Replace this RepresentationIndex with one from a new version of the
     * Manifest.
     * @param {Object} newIndex
     */
    TimelineRepresentationIndex.prototype._replace = function (newIndex) {
        this._parseTimeline = newIndex._parseTimeline;
        this._index = newIndex._index;
        this._isDynamic = newIndex._isDynamic;
        this._scaledPeriodStart = newIndex._scaledPeriodStart;
        this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
        this._lastUpdate = newIndex._lastUpdate;
        this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
        this._isLastPeriod = newIndex._isLastPeriod;
    };
    /**
     * Update this RepresentationIndex with a shorter version of it coming from a
     * new version of the MPD.
     * @param {Object} newIndex
     */
    TimelineRepresentationIndex.prototype._update = function (newIndex) {
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        if (newIndex._index.timeline === null) {
            newIndex._index.timeline = newIndex._getTimeline();
        }
        var hasReplaced = (0, update_segment_timeline_1.default)(this._index.timeline, newIndex._index.timeline);
        if (hasReplaced) {
            this._index.startNumber = newIndex._index.startNumber;
        }
        this._index.availabilityTimeOffset = newIndex._index.availabilityTimeOffset;
        this._index.availabilityTimeComplete = newIndex._index.availabilityTimeComplete;
        this._index.endNumber = newIndex._index.endNumber;
        this._isDynamic = newIndex._isDynamic;
        this._scaledPeriodStart = newIndex._scaledPeriodStart;
        this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
        this._lastUpdate = newIndex._lastUpdate;
        this._isLastPeriod = newIndex._isLastPeriod;
    };
    /**
     * Returns `false` if this RepresentationIndex currently contains its last
     * segment.
     * Returns `true` if it's still pending.
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.isStillAwaitingFutureSegments = function () {
        var _a;
        if (!this._isDynamic) {
            return false;
        }
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var timeline = this._index.timeline;
        if (timeline.length === 0) {
            // No segment announced in this Period
            if (this._scaledPeriodEnd !== undefined) {
                var liveEdge = this._manifestBoundsCalculator.getEstimatedLiveEdge();
                if (liveEdge !== undefined &&
                    (0, index_helpers_1.toIndexTime)(liveEdge, this._index) > this._scaledPeriodEnd) {
                    // This Period is over, we're not awaiting anything
                    return false;
                }
            }
            // Let's just consider that we're awaiting only for when this is the last Period.
            return this._isLastPeriod;
        }
        var segmentTimeRounding = (0, utils_1.getSegmentTimeRoundingError)(this._index.timescale);
        var lastReqSegInfo = getLastRequestableSegmentInfo(
        // Needed typecast for TypeScript
        this._index, this._manifestBoundsCalculator, this._scaledPeriodEnd);
        if (lastReqSegInfo !== null && !lastReqSegInfo.isLastOfTimeline) {
            // There might be non-yet requestable segments in the manifest
            var lastReqSegmentEnd = Math.min(lastReqSegInfo.end, (_a = this._scaledPeriodEnd) !== null && _a !== void 0 ? _a : Infinity);
            if (this._scaledPeriodEnd !== undefined &&
                lastReqSegmentEnd + segmentTimeRounding >= this._scaledPeriodEnd) {
                // The last requestable segment ends after the end of the Period anyway
                return false;
            }
            return true; // There are not-yet requestable segments
        }
        if (!this._isLastPeriod) {
            // This index is not linked to the current last Period in the MPD, in
            // which case it is inferred that all segments have been announced.
            //
            // Note that this condition might break very very rare use cases where old
            // Periods are still being generated, yet it should fix more cases than it
            // breaks.
            return false;
        }
        if (this._scaledPeriodEnd === undefined) {
            // This is the last Period of a dynamic content whose end is unknown.
            // Just return true.
            return true;
        }
        var lastSegment = timeline[timeline.length - 1];
        var lastSegmentEnd = (0, index_helpers_1.getIndexSegmentEnd)(lastSegment, null, this._scaledPeriodEnd);
        // We're awaiting future segments only if the current end is before the end
        // of the Period
        return lastSegmentEnd + segmentTimeRounding < this._scaledPeriodEnd;
    };
    /**
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.isInitialized = function () {
        return true;
    };
    TimelineRepresentationIndex.prototype.initialize = function () {
        log_1.default.error("A `TimelineRepresentationIndex` does not need to be initialized");
    };
    TimelineRepresentationIndex.prototype.addPredictedSegments = function () {
        log_1.default.warn("Cannot add predicted segments to a `TimelineRepresentationIndex`");
    };
    /**
     * Returns `true` if the given object can be used as an "index" argument to
     * create a new `TimelineRepresentationIndex`.
     * @param {Object} index
     * @returns {boolean}
     */
    TimelineRepresentationIndex.isTimelineIndexArgument = function (index) {
        return typeof index.timelineParser === "function" || Array.isArray(index.timeline);
    };
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to timeshifting.
     */
    TimelineRepresentationIndex.prototype._refreshTimeline = function () {
        var _a, _b;
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        if (!this._isDynamic) {
            return;
        }
        var firstPosition = this._manifestBoundsCalculator.getEstimatedMinimumSegmentTime(((_b = (_a = this._index.timeline[0]) === null || _a === void 0 ? void 0 : _a.duration) !== null && _b !== void 0 ? _b : 0) / this._index.timescale);
        if ((0, is_null_or_undefined_1.default)(firstPosition)) {
            return; // we don't know yet
        }
        var scaledFirstPosition = (0, index_helpers_1.toIndexTime)(firstPosition, this._index);
        var nbEltsRemoved = (0, clear_timeline_from_position_1.default)(this._index.timeline, scaledFirstPosition);
        if (this._index.startNumber !== undefined) {
            this._index.startNumber += nbEltsRemoved;
        }
        else if (this._index.endNumber !== undefined) {
            this._index.startNumber = nbEltsRemoved + 1;
        }
    };
    /**
     * Allows to generate the "timeline" for this RepresentationIndex.
     * Call this function when the timeline is unknown.
     * This function was added to only perform that task lazily, i.e. only when
     * first needed.
     * After calling it, every now unneeded variable will be freed from memory.
     * This means that calling _getTimeline more than once will just return an
     * empty array.
     *
     * /!\ Please note that this structure should follow the exact same structure
     * than a SegmentTimeline element in the corresponding MPD.
     * This means:
     *   - It should have the same amount of elements in its array than there was
     *     `<S>` elements in the SegmentTimeline.
     *   - Each of those same elements should have the same start time, the same
     *     duration and the same repeat counter than what could be deduced from
     *     the SegmentTimeline.
     * This is needed to be able to run parsing optimization when refreshing the
     * MPD. Not doing so could lead to the RxPlayer not being able to play the
     * stream anymore.
     * @returns {Array.<Object>}
     */
    TimelineRepresentationIndex.prototype._getTimeline = function () {
        if (this._parseTimeline === null) {
            if (this._index.timeline !== null) {
                return this._index.timeline;
            }
            log_1.default.error("DASH: Timeline already lazily parsed.");
            return [];
        }
        var newElements = this._parseTimeline();
        this._parseTimeline = null; // Free memory
        var MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY = config_1.default.getCurrent().MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY;
        if (this._unsafelyBaseOnPreviousIndex === null ||
            newElements.length < MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY) {
            // Just completely parse the current timeline
            return updateTimelineFromEndNumber((0, construct_timeline_from_elements_1.default)(newElements), this._index.startNumber, this._index.endNumber);
        }
        // Construct previously parsed timeline if not already done
        var prevTimeline;
        if (this._unsafelyBaseOnPreviousIndex._index.timeline === null) {
            prevTimeline = this._unsafelyBaseOnPreviousIndex._getTimeline();
            this._unsafelyBaseOnPreviousIndex._index.timeline = prevTimeline;
        }
        else {
            prevTimeline = this._unsafelyBaseOnPreviousIndex._index.timeline;
        }
        this._unsafelyBaseOnPreviousIndex = null; // Free memory
        return updateTimelineFromEndNumber((0, construct_timeline_from_previous_timeline_1.default)(newElements, prevTimeline), this._index.startNumber, this._index.endNumber);
    };
    return TimelineRepresentationIndex;
}());
exports.default = TimelineRepresentationIndex;
/**
 * Take the original SegmentTimeline's parsed timeline and, if an `endNumber` is
 * specified, filter segments which possess a number superior to that number.
 *
 * This should only be useful in only rare and broken MPDs, but we aim to
 * respect the specification even in those cases.
 *
 * @param {Array.<Object>} timeline
 * @param {number|undefined} startNumber
 * @param {Array.<Object>} endNumber
 * @returns {number|undefined}
 */
function updateTimelineFromEndNumber(timeline, startNumber, endNumber) {
    if (endNumber === undefined) {
        return timeline;
    }
    var currNumber = startNumber !== null && startNumber !== void 0 ? startNumber : 1;
    for (var idx = 0; idx < timeline.length; idx++) {
        var seg = timeline[idx];
        currNumber += seg.repeatCount + 1;
        if (currNumber > endNumber) {
            if (currNumber === endNumber + 1) {
                return timeline.slice(0, idx + 1);
            }
            else {
                var newTimeline = timeline.slice(0, idx);
                var lastElt = __assign({}, seg);
                var beginningNumber = currNumber - seg.repeatCount - 1;
                lastElt.repeatCount = Math.max(0, endNumber - beginningNumber);
                newTimeline.push(lastElt);
                return newTimeline;
            }
        }
    }
    return timeline;
}
/**
 * Returns true if a Segment returned by the corresponding index is still
 * considered available.
 * Returns false if it is not available anymore.
 * Returns undefined if we cannot know whether it is still available or not.
 * /!\ We do not check the mediaURLs of the segment.
 * @param {Object} segment
 * @param {Object} index
 * @param {Object} manifestBoundsCalculator
 * @param {number|undefined} scaledPeriodEnd
 * @returns {Boolean|undefined}
 */
function isSegmentStillAvailable(segment, index, manifestBoundsCalculator, scaledPeriodEnd) {
    var lastReqSegInfo = getLastRequestableSegmentInfo(index, manifestBoundsCalculator, scaledPeriodEnd);
    if (lastReqSegInfo === null) {
        return false;
    }
    for (var i = 0; i < index.timeline.length; i++) {
        if (lastReqSegInfo.timelineIdx < i) {
            return false;
        }
        var tSegment = index.timeline[i];
        var tSegmentTime = (tSegment.start - index.indexTimeOffset) / index.timescale;
        if (tSegmentTime > segment.time) {
            return false; // We went over it without finding it
        }
        else if (tSegmentTime === segment.time) {
            if (tSegment.range === undefined) {
                return segment.range === undefined;
            }
            return (!(0, is_null_or_undefined_1.default)(segment.range) &&
                tSegment.range[0] === segment.range[0] &&
                tSegment.range[1] === segment.range[1]);
        }
        else {
            // tSegment.start < segment.time
            if (tSegment.repeatCount >= 0 && tSegment.duration !== undefined) {
                var timeDiff = tSegmentTime - tSegment.start;
                var repeat = timeDiff / tSegment.duration - 1;
                return repeat % 1 === 0 && repeat <= lastReqSegInfo.newRepeatCount;
            }
        }
    }
    return false;
}
exports.isSegmentStillAvailable = isSegmentStillAvailable;
/**
 * Returns from the given RepresentationIndex information on the last segment
 * that may be requested currently.
 *
 * Returns `null` if there's no such segment.
 * @param {Object} index
 * @param {Object} manifestBoundsCalculator
 * @param {number|undefined} scaledPeriodEnd
 * @returns {number|null}
 */
function getLastRequestableSegmentInfo(index, manifestBoundsCalculator, scaledPeriodEnd) {
    if (index.timeline.length <= 0) {
        return null;
    }
    if (index.availabilityTimeOffset === Infinity) {
        // availabilityTimeOffset to Infinity == Everything is requestable in the timeline.
        var lastIndex = index.timeline.length - 1;
        var lastElem = index.timeline[lastIndex];
        return {
            isLastOfTimeline: true,
            timelineIdx: lastIndex,
            newRepeatCount: lastElem.repeatCount,
            end: (0, index_helpers_1.getIndexSegmentEnd)(lastElem, null, scaledPeriodEnd),
        };
    }
    var adjustedMaxSeconds = manifestBoundsCalculator.getEstimatedMaximumPosition(index.availabilityTimeOffset);
    if (adjustedMaxSeconds === undefined) {
        var lastIndex = index.timeline.length - 1;
        var lastElem = index.timeline[lastIndex];
        return {
            isLastOfTimeline: true,
            timelineIdx: lastIndex,
            newRepeatCount: lastElem.repeatCount,
            end: (0, index_helpers_1.getIndexSegmentEnd)(lastElem, null, scaledPeriodEnd),
        };
    }
    for (var i = index.timeline.length - 1; i >= index.timeline.length; i--) {
        var element = index.timeline[i];
        var endOfFirstOccurence = element.start + element.duration;
        if ((0, index_helpers_1.fromIndexTime)(endOfFirstOccurence, index) <= adjustedMaxSeconds) {
            var endTime = (0, index_helpers_1.getIndexSegmentEnd)(element, index.timeline[i + 1], scaledPeriodEnd);
            if ((0, index_helpers_1.fromIndexTime)(endTime, index) <= adjustedMaxSeconds) {
                return {
                    isLastOfTimeline: i === index.timeline.length - 1,
                    timelineIdx: i,
                    newRepeatCount: element.repeatCount,
                    end: endOfFirstOccurence,
                };
            }
            else {
                // We have to find the right repeatCount
                var maxIndexTime = (0, index_helpers_1.toIndexTime)(adjustedMaxSeconds, index);
                var diffToSegStart = maxIndexTime - element.start;
                var nbOfSegs = Math.floor(diffToSegStart / element.duration);
                (0, assert_1.default)(nbOfSegs >= 1);
                return {
                    isLastOfTimeline: false,
                    timelineIdx: i,
                    newRepeatCount: nbOfSegs - 1,
                    end: element.start + nbOfSegs * element.duration,
                };
            }
        }
    }
    return null;
}
exports.getLastRequestableSegmentInfo = getLastRequestableSegmentInfo;
