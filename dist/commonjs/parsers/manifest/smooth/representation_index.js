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
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var assert_1 = require("../../../utils/assert");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var index_helpers_1 = require("../utils/index_helpers");
var tokens_1 = require("./utils/tokens");
/**
 * @param {Number} start
 * @param {Number} up
 * @param {Number} duration
 * @returns {Number}
 */
function getSegmentNumber(start, up, duration) {
    var diff = up - start;
    return diff > 0 ? Math.floor(diff / duration) : 0;
}
/**
 * Convert second-based start time and duration to the timescale of the
 * manifest's index.
 * @param {Object} index
 * @param {Number} start
 * @param {Number} duration
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
function normalizeRange(timescale, start, duration) {
    var ts = timescale === undefined || timescale === 0 ? 1 : timescale;
    return { up: start * ts, to: (start + duration) * ts };
}
/**
 * Calculate the number of times a segment repeat based on the next segment.
 * @param {Object} segment
 * @param {Object} nextSegment
 * @returns {Number}
 */
function calculateRepeat(segment, nextSegment) {
    var repeatCount = segment.repeatCount;
    // A negative value of the @r attribute of the S element indicates
    // that the duration indicated in @d attribute repeats until the
    // start of the next S element, the end of the Period or until the
    // next MPD update.
    // TODO Also for SMOOTH????
    if (segment.duration !== undefined && repeatCount < 0) {
        var repeatEnd = nextSegment !== undefined ? nextSegment.start : Infinity;
        repeatCount = Math.ceil((repeatEnd - segment.start) / segment.duration) - 1;
    }
    return repeatCount;
}
/**
 * RepresentationIndex implementation for Smooth Manifests.
 *
 * Allows to interact with the index to create new Segments.
 *
 * @class SmoothRepresentationIndex
 */
var SmoothRepresentationIndex = /** @class */ (function () {
    /**
     * Creates a new `SmoothRepresentationIndex`.
     * @param {Object} index
     * @param {Object} options
     */
    function SmoothRepresentationIndex(options) {
        var isLive = options.isLive, segmentPrivateInfos = options.segmentPrivateInfos, media = options.media, sharedSmoothTimeline = options.sharedSmoothTimeline;
        this._sharedSmoothTimeline = sharedSmoothTimeline;
        this._initSegmentInfos = {
            bitsPerSample: segmentPrivateInfos.bitsPerSample,
            channels: segmentPrivateInfos.channels,
            codecPrivateData: segmentPrivateInfos.codecPrivateData,
            packetSize: segmentPrivateInfos.packetSize,
            samplingRate: segmentPrivateInfos.samplingRate,
            timescale: sharedSmoothTimeline.timescale,
            height: segmentPrivateInfos.height,
            width: segmentPrivateInfos.width,
            protection: segmentPrivateInfos.protection,
        };
        this._isLive = isLive;
        this._media = media;
        if (sharedSmoothTimeline.timeline.length !== 0 && isLive) {
            var timeline = sharedSmoothTimeline.timeline, validityTime = sharedSmoothTimeline.validityTime;
            var lastItem = timeline[timeline.length - 1];
            var scaledEnd = (0, index_helpers_1.getIndexSegmentEnd)(lastItem, null);
            var scaledTimelineValidityTime = (validityTime / 1000) * sharedSmoothTimeline.timescale;
            this._scaledLiveGap = scaledTimelineValidityTime - scaledEnd;
        }
    }
    /**
     * Construct init Segment compatible with a Smooth Manifest.
     * @returns {Object}
     */
    SmoothRepresentationIndex.prototype.getInitSegment = function () {
        return {
            id: "init",
            isInit: true,
            privateInfos: { smoothInitSegment: this._initSegmentInfos },
            url: null,
            time: 0,
            end: 0,
            duration: 0,
            timescale: 1,
            complete: true,
        };
    };
    /**
     * Generate a list of Segments for a particular period of time.
     *
     * @param {Number} from
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    SmoothRepresentationIndex.prototype.getSegments = function (from, dur) {
        this._refreshTimeline();
        var _a = this._sharedSmoothTimeline, timescale = _a.timescale, timeline = _a.timeline;
        var _b = normalizeRange(timescale, from, dur), up = _b.up, to = _b.to;
        var media = this._media;
        var currentNumber;
        var segments = [];
        var timelineLength = timeline.length;
        var maxPosition = this._scaledLiveGap === undefined
            ? undefined
            : ((0, monotonic_timestamp_1.default)() / 1000) * timescale - this._scaledLiveGap;
        for (var i = 0; i < timelineLength; i++) {
            var segmentRange = timeline[i];
            var duration = segmentRange.duration, start = segmentRange.start;
            var repeat = calculateRepeat(segmentRange, timeline[i + 1]);
            var segmentNumberInCurrentRange = getSegmentNumber(start, up, duration);
            var segmentTime = start + segmentNumberInCurrentRange * duration;
            var timeToAddToCheckMaxPosition = duration;
            while (segmentTime < to &&
                segmentNumberInCurrentRange <= repeat &&
                (maxPosition === undefined ||
                    segmentTime + timeToAddToCheckMaxPosition <= maxPosition)) {
                var time = segmentTime;
                var number = currentNumber !== undefined
                    ? currentNumber + segmentNumberInCurrentRange
                    : undefined;
                var segment = {
                    id: String(segmentTime),
                    isInit: false,
                    time: time / timescale,
                    end: (time + duration) / timescale,
                    duration: duration / timescale,
                    timescale: 1,
                    number: number,
                    url: (0, tokens_1.replaceSegmentSmoothTokens)(media, time),
                    complete: true,
                    privateInfos: { smoothMediaSegment: { time: time, duration: duration } },
                };
                segments.push(segment);
                // update segment number and segment time for the next segment
                segmentNumberInCurrentRange++;
                segmentTime = start + segmentNumberInCurrentRange * duration;
            }
            if (segmentTime >= to) {
                // we reached ``to``, we're done
                return segments;
            }
            if (currentNumber !== undefined) {
                currentNumber += repeat + 1;
            }
        }
        return segments;
    };
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * (If we should re-fetch the manifest)
     * @param {Number} up
     * @param {Number} to
     * @returns {Boolean}
     */
    SmoothRepresentationIndex.prototype.shouldRefresh = function (up, to) {
        this._refreshTimeline();
        if (!this._isLive) {
            return false;
        }
        var _a = this._sharedSmoothTimeline, timeline = _a.timeline, timescale = _a.timescale;
        var lastSegmentInCurrentTimeline = timeline[timeline.length - 1];
        if (lastSegmentInCurrentTimeline === undefined) {
            return false;
        }
        var repeat = lastSegmentInCurrentTimeline.repeatCount;
        var endOfLastSegmentInCurrentTimeline = lastSegmentInCurrentTimeline.start +
            (repeat + 1) * lastSegmentInCurrentTimeline.duration;
        if (to * timescale < endOfLastSegmentInCurrentTimeline) {
            return false;
        }
        if (up * timescale >= endOfLastSegmentInCurrentTimeline) {
            return true;
        }
        // ----
        var startOfLastSegmentInCurrentTimeline = lastSegmentInCurrentTimeline.start + repeat * lastSegmentInCurrentTimeline.duration;
        return up * timescale > startOfLastSegmentInCurrentTimeline;
    };
    /**
     * Returns first position available in the index.
     * @returns {Number|null}
     */
    SmoothRepresentationIndex.prototype.getFirstAvailablePosition = function () {
        this._refreshTimeline();
        var _a = this._sharedSmoothTimeline, timeline = _a.timeline, timescale = _a.timescale;
        if (timeline.length === 0) {
            return null;
        }
        return timeline[0].start / timescale;
    };
    /**
     * Returns last position available in the index.
     * @returns {Number}
     */
    SmoothRepresentationIndex.prototype.getLastAvailablePosition = function () {
        this._refreshTimeline();
        var _a = this._sharedSmoothTimeline, timeline = _a.timeline, timescale = _a.timescale;
        if (this._scaledLiveGap === undefined) {
            var lastTimelineElement = timeline[timeline.length - 1];
            return (0, index_helpers_1.getIndexSegmentEnd)(lastTimelineElement, null) / timescale;
        }
        for (var i = timeline.length - 1; i >= 0; i--) {
            var timelineElt = timeline[i];
            var timescaledNow = ((0, monotonic_timestamp_1.default)() / 1000) * timescale;
            var start = timelineElt.start, duration = timelineElt.duration, repeatCount = timelineElt.repeatCount;
            for (var j = repeatCount; j >= 0; j--) {
                var end = start + duration * (j + 1);
                var positionToReach = end;
                if (positionToReach <= timescaledNow - this._scaledLiveGap) {
                    return end / timescale;
                }
            }
        }
        return undefined;
    };
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    SmoothRepresentationIndex.prototype.getEnd = function () {
        if (!this._isLive) {
            return this.getLastAvailablePosition();
        }
        return undefined;
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
    SmoothRepresentationIndex.prototype.awaitSegmentBetween = function (start, end) {
        var _a;
        (0, assert_1.default)(start <= end);
        if (this.isStillAwaitingFutureSegments()) {
            return false;
        }
        var lastAvailablePosition = this.getLastAvailablePosition();
        if (lastAvailablePosition !== undefined && end < lastAvailablePosition) {
            return false;
        }
        return end > ((_a = this.getFirstAvailablePosition()) !== null && _a !== void 0 ? _a : 0) ? undefined : false;
    };
    /**
     * Checks if `timeSec` is in a discontinuity.
     * That is, if there's no segment available for the `timeSec` position.
     * @param {number} timeSec - The time to check if it's in a discontinuity, in
     * seconds.
     * @returns {number | null} - If `null`, no discontinuity is encountered at
     * `time`. If this is a number instead, there is one and that number is the
     * position for which a segment is available in seconds.
     */
    SmoothRepresentationIndex.prototype.checkDiscontinuity = function (timeSec) {
        this._refreshTimeline();
        return (0, index_helpers_1.checkDiscontinuity)(this._sharedSmoothTimeline, timeSec, undefined);
    };
    /**
     * Returns `true` if a Segment returned by this index is still considered
     * available.
     * Returns `false` if it is not available anymore.
     * Returns `undefined` if we cannot know whether it is still available or not.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    SmoothRepresentationIndex.prototype.isSegmentStillAvailable = function (segment) {
        if (segment.isInit) {
            return true;
        }
        this._refreshTimeline();
        var _a = this._sharedSmoothTimeline, timeline = _a.timeline, timescale = _a.timescale;
        for (var i = 0; i < timeline.length; i++) {
            var tSegment = timeline[i];
            var tSegmentTime = tSegment.start / timescale;
            if (tSegmentTime > segment.time) {
                return false; // We went over it without finding it
            }
            else if (tSegmentTime === segment.time) {
                return true;
            }
            else {
                // tSegment.start < segment.time
                if (tSegment.repeatCount >= 0 && tSegment.duration !== undefined) {
                    var timeDiff = tSegmentTime - tSegment.start;
                    var repeat = timeDiff / tSegment.duration - 1;
                    return repeat % 1 === 0 && repeat <= tSegment.repeatCount;
                }
            }
        }
        return false;
    };
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    SmoothRepresentationIndex.prototype.canBeOutOfSyncError = function (error) {
        if (!this._isLive) {
            return false;
        }
        return (error instanceof errors_1.NetworkError && (error.isHttpError(404) || error.isHttpError(412)));
    };
    /**
     * Replace this RepresentationIndex by a newly downloaded one.
     * Check if the old index had more information about new segments and re-add
     * them if that's the case.
     * @param {Object} newIndex
     */
    SmoothRepresentationIndex.prototype._replace = function (newIndex) {
        this._initialScaledLastPosition = newIndex._initialScaledLastPosition;
        this._scaledLiveGap = newIndex._scaledLiveGap;
        this._sharedSmoothTimeline.replace(newIndex._sharedSmoothTimeline);
    };
    /**
     * Update the current index with a new, partial, version.
     * This method might be use to only add information about new segments.
     * @param {Object} newIndex
     */
    SmoothRepresentationIndex.prototype._update = function (newIndex) {
        this._scaledLiveGap = newIndex._scaledLiveGap;
        this._sharedSmoothTimeline.update(newIndex._sharedSmoothTimeline);
    };
    /**
     * Returns `false` if the last segments in this index have already been
     * generated.
     * Returns `true` if the index is still waiting on future segments to be
     * generated.
     *
     * For Smooth, it should only depend on whether the content is a live content
     * or not.
     * TODO What about Smooth live content that finishes at some point?
     * @returns {boolean}
     */
    SmoothRepresentationIndex.prototype.isStillAwaitingFutureSegments = function () {
        return this._isLive;
    };
    /**
     * @returns {Boolean}
     */
    SmoothRepresentationIndex.prototype.isInitialized = function () {
        return true;
    };
    SmoothRepresentationIndex.prototype.initialize = function () {
        log_1.default.error("A `SmoothRepresentationIndex` does not need to be initialized");
    };
    /**
     * Add segments to a `SharedSmoothSegmentTimeline` that were predicted to come
     * after `currentSegment`.
     * @param {Array.<Object>} nextSegments - The segment information parsed.
     * @param {Object} currentSegment - Information on the segment which contained
     * that new segment information.
     */
    SmoothRepresentationIndex.prototype.addPredictedSegments = function (nextSegments, currentSegment) {
        this._sharedSmoothTimeline.addPredictedSegments(nextSegments, currentSegment);
    };
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to the timeshift window
     */
    SmoothRepresentationIndex.prototype._refreshTimeline = function () {
        this._sharedSmoothTimeline.refresh();
    };
    return SmoothRepresentationIndex;
}());
exports.default = SmoothRepresentationIndex;
