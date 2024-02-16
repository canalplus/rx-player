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
var log_1 = require("../../../log");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var clear_timeline_from_position_1 = require("../utils/clear_timeline_from_position");
var index_helpers_1 = require("../utils/index_helpers");
var update_segment_timeline_1 = require("../utils/update_segment_timeline");
var add_segment_infos_1 = require("./utils/add_segment_infos");
/**
 * Smooth contents provide the index of segments under a "StreamIndex", the
 * smooth equivalent of an AdaptationSet.
 *
 * This means that multiple "QualityLevel" (smooth's Representation) are going
 * to rely on the exact same list of segments. This also means that all
 * mutations on that timeline (whether it is to evict old segments or to add
 * new ones) should presumably happen for all of them at the same time.
 *
 * The `SharedSmoothSegmentTimeline` is an abstraction over that index of
 * segments whose goal is to explicitely provide a data structure that can be
 * shared to every `RepresentationIndex` linked to Representations being part
 * of the same smooth Adaptation, thus allowing to mutualize any side-effect
 * done to it automatically.
 *
 * @class SharedSmoothSegmentTimeline
 */
var SharedSmoothSegmentTimeline = /** @class */ (function () {
    function SharedSmoothSegmentTimeline(args) {
        var timeline = args.timeline, timescale = args.timescale, timeShiftBufferDepth = args.timeShiftBufferDepth, manifestReceivedTime = args.manifestReceivedTime;
        this.timeline = timeline;
        this.timescale = timescale;
        var estimatedReceivedTime = manifestReceivedTime !== null && manifestReceivedTime !== void 0 ? manifestReceivedTime : (0, monotonic_timestamp_1.default)();
        this.validityTime = estimatedReceivedTime;
        this._timeShiftBufferDepth = timeShiftBufferDepth;
        if (timeline.length !== 0) {
            var lastItem = timeline[timeline.length - 1];
            var scaledEnd = (0, index_helpers_1.getIndexSegmentEnd)(lastItem, null);
            this._initialScaledLastPosition = scaledEnd;
        }
    }
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to the timeshift window
     */
    SharedSmoothSegmentTimeline.prototype.refresh = function () {
        // clean segments before time shift buffer depth
        if (this._initialScaledLastPosition === undefined) {
            return;
        }
        var timeShiftBufferDepth = this._timeShiftBufferDepth;
        var timeSinceLastRealUpdate = ((0, monotonic_timestamp_1.default)() - this.validityTime) / 1000;
        var lastPositionEstimate = timeSinceLastRealUpdate + this._initialScaledLastPosition / this.timescale;
        if (timeShiftBufferDepth !== undefined) {
            var minimumPosition = (lastPositionEstimate - timeShiftBufferDepth) * this.timescale;
            (0, clear_timeline_from_position_1.default)(this.timeline, minimumPosition);
        }
    };
    /**
     * Replace this SharedSmoothSegmentTimeline by a newly downloaded one.
     * Check if the old timeline had more information about new segments and re-add
     * them if that's the case.
     * @param {Object} newSmoothTimeline
     */
    SharedSmoothSegmentTimeline.prototype.replace = function (newSmoothTimeline) {
        var oldTimeline = this.timeline;
        var newTimeline = newSmoothTimeline.timeline;
        var oldTimescale = this.timescale;
        var newTimescale = newSmoothTimeline.timescale;
        this._initialScaledLastPosition = newSmoothTimeline._initialScaledLastPosition;
        this.validityTime = newSmoothTimeline.validityTime;
        if (oldTimeline.length === 0 ||
            newTimeline.length === 0 ||
            oldTimescale !== newTimescale) {
            return; // don't take risk, if something is off, take the new one
        }
        var lastOldTimelineElement = oldTimeline[oldTimeline.length - 1];
        var lastNewTimelineElement = newTimeline[newTimeline.length - 1];
        var newEnd = (0, index_helpers_1.getIndexSegmentEnd)(lastNewTimelineElement, null);
        if ((0, index_helpers_1.getIndexSegmentEnd)(lastOldTimelineElement, null) <= newEnd) {
            return;
        }
        for (var i = 0; i < oldTimeline.length; i++) {
            var oldTimelineRange = oldTimeline[i];
            var oldEnd = (0, index_helpers_1.getIndexSegmentEnd)(oldTimelineRange, null);
            if (oldEnd === newEnd) {
                // just add the supplementary segments
                this.timeline = this.timeline.concat(oldTimeline.slice(i + 1));
                return;
            }
            if (oldEnd > newEnd) {
                // adjust repeatCount + add supplementary segments
                if (oldTimelineRange.duration !== lastNewTimelineElement.duration) {
                    return;
                }
                var rangeDuration = newEnd - oldTimelineRange.start;
                if (rangeDuration === 0) {
                    log_1.default.warn("Smooth Parser: a discontinuity detected in the previous manifest" +
                        " has been resolved.");
                    this.timeline = this.timeline.concat(oldTimeline.slice(i));
                    return;
                }
                if (rangeDuration < 0 || rangeDuration % oldTimelineRange.duration !== 0) {
                    return;
                }
                var repeatWithOld = rangeDuration / oldTimelineRange.duration - 1;
                var relativeRepeat = oldTimelineRange.repeatCount - repeatWithOld;
                if (relativeRepeat < 0) {
                    return;
                }
                lastNewTimelineElement.repeatCount += relativeRepeat;
                var supplementarySegments = oldTimeline.slice(i + 1);
                this.timeline = this.timeline.concat(supplementarySegments);
                return;
            }
        }
    };
    /**
     * Update the current SharedSmoothSegmentTimeline with a new, partial, version.
     * This method might be use to only add information about new segments.
     * @param {Object} newSmoothTimeline
     */
    SharedSmoothSegmentTimeline.prototype.update = function (newSmoothTimeline) {
        (0, update_segment_timeline_1.default)(this.timeline, newSmoothTimeline.timeline);
        this._initialScaledLastPosition = newSmoothTimeline._initialScaledLastPosition;
        this.validityTime = newSmoothTimeline.validityTime;
    };
    /**
     * Add segments to a `SharedSmoothSegmentTimeline` that were predicted to come
     * after `currentSegment`.
     * @param {Array.<Object>} nextSegments - The segment information parsed.
     * @param {Object} segment - Information on the segment which contained that
     * new segment information.
     */
    SharedSmoothSegmentTimeline.prototype.addPredictedSegments = function (nextSegments, currentSegment) {
        var _a;
        if (((_a = currentSegment.privateInfos) === null || _a === void 0 ? void 0 : _a.smoothMediaSegment) === undefined) {
            log_1.default.warn("Smooth Parser: should only encounter SmoothRepresentationIndex");
            return;
        }
        this.refresh();
        for (var i = 0; i < nextSegments.length; i++) {
            (0, add_segment_infos_1.default)(this.timeline, this.timescale, nextSegments[i], currentSegment.privateInfos.smoothMediaSegment);
        }
    };
    return SharedSmoothSegmentTimeline;
}());
exports.default = SharedSmoothSegmentTimeline;
