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
var index_helpers_1 = require("../../../utils/index_helpers");
var tokens_1 = require("./tokens");
/**
 * For the given start time and duration of a timeline element, calculate how
 * much this element should be repeated to contain the time given.
 * 0 being the same element, 1 being the next one etc.
 * @param {Number} segmentStartTime
 * @param {Number} segmentDuration
 * @param {Number} wantedTime
 * @returns {Number}
 */
function getWantedRepeatIndex(segmentStartTime, segmentDuration, wantedTime) {
    var diff = wantedTime - segmentStartTime;
    return diff > 0 ? Math.floor(diff / segmentDuration) : 0;
}
/**
 * Get a list of Segments for the time range wanted.
 * @param {Object} index - index object, constructed by parsing the manifest.
 * @param {number} from - starting timestamp wanted, in seconds
 * @param {number} durationWanted - duration wanted, in seconds
 * @param {Object} manifestBoundsCalculator
 * @param {number|undefined} scaledPeriodEnd
 * @param {function} isEMSGWhitelisted
 * @returns {Array.<Object>}
 */
function getSegmentsFromTimeline(index, from, durationWanted, manifestBoundsCalculator, scaledPeriodEnd, isEMSGWhitelisted) {
    var _a;
    var maximumTime = manifestBoundsCalculator.getEstimatedMaximumPosition((_a = index.availabilityTimeOffset) !== null && _a !== void 0 ? _a : 0);
    var wantedMaximum = Math.min(from + durationWanted, maximumTime !== null && maximumTime !== void 0 ? maximumTime : Infinity);
    var scaledUp = (0, index_helpers_1.toIndexTime)(from, index);
    var scaledTo = (0, index_helpers_1.toIndexTime)(wantedMaximum, index);
    var timeline = index.timeline, timescale = index.timescale, segmentUrlTemplate = index.segmentUrlTemplate, startNumber = index.startNumber, endNumber = index.endNumber;
    var currentNumber = startNumber !== null && startNumber !== void 0 ? startNumber : 1;
    var segments = [];
    var timelineLength = timeline.length;
    for (var i = 0; i < timelineLength; i++) {
        var timelineItem = timeline[i];
        var duration = timelineItem.duration, start = timelineItem.start, range = timelineItem.range;
        var maxRepeatTime = void 0;
        if (maximumTime === undefined) {
            maxRepeatTime = scaledPeriodEnd;
        }
        else {
            maxRepeatTime = Math.min(maximumTime * timescale, scaledPeriodEnd !== null && scaledPeriodEnd !== void 0 ? scaledPeriodEnd : Infinity);
        }
        var repeat = (0, index_helpers_1.calculateRepeat)(timelineItem, timeline[i + 1], maxRepeatTime);
        var complete = index.availabilityTimeComplete !== false ||
            (i !== timelineLength - 1 && repeat !== 0);
        var segmentNumberInCurrentRange = getWantedRepeatIndex(start, duration, scaledUp);
        var segmentTime = start + segmentNumberInCurrentRange * duration;
        while (segmentTime < scaledTo && segmentNumberInCurrentRange <= repeat) {
            var segmentNumber = currentNumber + segmentNumberInCurrentRange;
            if (endNumber !== undefined && segmentNumber > endNumber) {
                break;
            }
            var detokenizedURL = segmentUrlTemplate === null
                ? null
                : (0, tokens_1.createDashUrlDetokenizer)(segmentTime, segmentNumber)(segmentUrlTemplate);
            var time = segmentTime - index.indexTimeOffset;
            var realDuration = duration;
            if (time < 0) {
                realDuration = duration + time; // Remove from duration the part before `0`
                time = 0;
            }
            var segment = {
                id: String(segmentTime),
                time: time / timescale,
                end: (time + realDuration) / timescale,
                duration: realDuration / timescale,
                isInit: false,
                range: range,
                timescale: 1,
                url: detokenizedURL,
                number: segmentNumber,
                timestampOffset: -(index.indexTimeOffset / timescale),
                complete: complete,
                privateInfos: { isEMSGWhitelisted: isEMSGWhitelisted },
            };
            segments.push(segment);
            // update segment number and segment time for the next segment
            segmentNumberInCurrentRange++;
            segmentTime = start + segmentNumberInCurrentRange * duration;
        }
        if (segmentTime >= scaledTo) {
            // we reached ``scaledTo``, we're done
            return segments;
        }
        currentNumber += repeat + 1;
        if (endNumber !== undefined && currentNumber > endNumber) {
            return segments;
        }
    }
    return segments;
}
exports.default = getSegmentsFromTimeline;
