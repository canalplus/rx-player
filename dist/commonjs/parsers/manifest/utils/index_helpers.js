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
exports.checkDiscontinuity = exports.getTimescaledRange = exports.fromIndexTime = exports.toIndexTime = exports.getIndexSegmentEnd = exports.calculateRepeat = void 0;
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
/**
 * Calculate the number of times a timeline element repeats based on the next
 * element.
 * @param {Object} element
 * @param {Object|null|undefined} nextElement
 * @param {number|undefined} maxPosition
 * @returns {Number}
 */
function calculateRepeat(element, nextElement, maxPosition) {
    var repeatCount = element.repeatCount;
    if (repeatCount >= 0) {
        return repeatCount;
    }
    // A negative value of the @r attribute of the S element indicates
    // that the duration indicated in @d attribute repeats until the
    // start of the next S element, the end of the Period or until the
    // next MPD update.
    var segmentEnd;
    if (!(0, is_null_or_undefined_1.default)(nextElement)) {
        segmentEnd = nextElement.start;
    }
    else if (maxPosition !== undefined) {
        segmentEnd = maxPosition;
    }
    else {
        segmentEnd = Number.MAX_VALUE;
    }
    return Math.ceil((segmentEnd - element.start) / element.duration) - 1;
}
exports.calculateRepeat = calculateRepeat;
/**
 * Returns end of the segment given, in index time.
 * @param {Object} segment
 * @param {Object|null} [nextSegment]
 * @param {number} maxPosition
 * @returns {Number}
 */
function getIndexSegmentEnd(segment, nextSegment, maxPosition) {
    var start = segment.start, duration = segment.duration;
    if (duration <= 0) {
        return start;
    }
    var repeat = calculateRepeat(segment, nextSegment, maxPosition);
    return start + (repeat + 1) * duration;
}
exports.getIndexSegmentEnd = getIndexSegmentEnd;
/**
 * Convert from `presentationTime`, the time of the segment at the moment it
 * is decoded to `mediaTime`, the original time the segments point at.
 * @param {number} time
 * @param {Object} indexOptions
 * @returns {number}
 */
function toIndexTime(time, indexOptions) {
    var _a;
    return time * indexOptions.timescale + ((_a = indexOptions.indexTimeOffset) !== null && _a !== void 0 ? _a : 0);
}
exports.toIndexTime = toIndexTime;
/**
 * Convert from `mediaTime`, the original time the segments point at to
 * `presentationTime`, the time of the segment at the moment it is decoded.
 * @param {number} time
 * @param {Object} indexOptions
 * @returns {number}
 */
function fromIndexTime(time, indexOptions) {
    var _a;
    return (time - ((_a = indexOptions.indexTimeOffset) !== null && _a !== void 0 ? _a : 0)) / indexOptions.timescale;
}
exports.fromIndexTime = fromIndexTime;
/**
 * @param {Number} start
 * @param {Number} duration
 * @param {Number} timescale
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
function getTimescaledRange(start, duration, timescale) {
    return [start * timescale, (start + duration) * timescale];
}
exports.getTimescaledRange = getTimescaledRange;
/**
 * Get index of the last segment in the timeline starting before/at the given
 * timescaled time.
 * Returns -1 if the given time is lower than the start of the first available
 * segment.
 * @param {Object} timeline
 * @param {Number} timeTScaled
 * @returns {Number}
 */
function getIndexOfLastObjectBefore(timeline, timeTScaled) {
    var low = 0;
    var high = timeline.length;
    while (low < high) {
        var mid = (low + high) >>> 1; // Divide by two + floor
        if (timeline[mid].start <= timeTScaled) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    return low - 1;
}
/**
 * @param {Object} index
 * @param {number} timeSec
 * @param {number} [maxPosition]
 * @returns {number|null}
 */
function checkDiscontinuity(index, timeSec, maxPosition) {
    var timeline = index.timeline;
    var scaledTime = toIndexTime(timeSec, index);
    if (scaledTime < 0) {
        return null;
    }
    var segmentIndex = getIndexOfLastObjectBefore(timeline, scaledTime);
    if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
        return null;
    }
    var timelineItem = timeline[segmentIndex];
    if (timelineItem.duration <= 0) {
        return null;
    }
    var nextTimelineItem = timeline[segmentIndex + 1];
    if (nextTimelineItem === undefined) {
        return null;
    }
    var nextStart = nextTimelineItem.start;
    var segmentEnd = getIndexSegmentEnd(timelineItem, nextTimelineItem, maxPosition);
    return scaledTime >= segmentEnd && scaledTime < nextStart
        ? fromIndexTime(nextStart, index)
        : null;
}
exports.checkDiscontinuity = checkDiscontinuity;
