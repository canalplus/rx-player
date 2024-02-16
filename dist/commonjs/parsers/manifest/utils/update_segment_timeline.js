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
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var index_helpers_1 = require("./index_helpers");
/**
 * Update a complete array of segments in a given timeline with a [generally]
 * smaller but [generally] newer set of segments.
 *
 * Returns a boolean:
 *   - If set to `true`, the old timeline was emptied and completely replaced by
 *     the content of the newer timeline.
 *     This could happen either if a problem happened while trying to update or
 *     when the update is actually bigger than what it is updating.
 *   - If set to `false`, the older timeline was either updated to add the newer
 *     segments, or untouched.
 *
 * @param {Array.<Object>} oldTimeline
 * @param {Array.<Object>} newTimeline
 * @returns {boolean}
 */
function updateSegmentTimeline(oldTimeline, newTimeline) {
    if (oldTimeline.length === 0) {
        oldTimeline.push.apply(oldTimeline, __spreadArray([], __read(newTimeline), false));
        return true;
    }
    else if (newTimeline.length === 0) {
        return false;
    }
    var prevTimelineLength = oldTimeline.length;
    var newIndexStart = newTimeline[0].start;
    var oldLastElt = oldTimeline[prevTimelineLength - 1];
    var oldIndexEnd = (0, index_helpers_1.getIndexSegmentEnd)(oldLastElt, newTimeline[0]);
    if (oldIndexEnd < newIndexStart) {
        throw new errors_1.MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: not enough data");
    }
    for (var i = prevTimelineLength - 1; i >= 0; i--) {
        var currStart = oldTimeline[i].start;
        if (currStart === newIndexStart) {
            // replace that one and those after it
            var nbEltsToRemove = prevTimelineLength - i;
            oldTimeline.splice.apply(oldTimeline, __spreadArray([i, nbEltsToRemove], __read(newTimeline), false));
            return false;
        }
        else if (currStart < newIndexStart) {
            // first to be before
            var currElt = oldTimeline[i];
            if (currElt.start + currElt.duration > newIndexStart) {
                // The new Manifest overlaps a previous segment (weird)
                // In that improbable case, we'll just completely replace segments
                log_1.default.warn("RepresentationIndex: Manifest update removed all previous segments");
                oldTimeline.splice.apply(oldTimeline, __spreadArray([0, prevTimelineLength], __read(newTimeline), false));
                return true;
            }
            else if (currElt.repeatCount === undefined || currElt.repeatCount <= 0) {
                if (currElt.repeatCount < 0) {
                    currElt.repeatCount =
                        Math.floor((newIndexStart - currElt.start) / currElt.duration) - 1;
                }
                oldTimeline.splice.apply(oldTimeline, __spreadArray([i + 1, prevTimelineLength - (i + 1)], __read(newTimeline), false));
                return false;
            }
            // else, there is a positive repeat we might want to update
            var eltLastTime = currElt.start + currElt.duration * (currElt.repeatCount + 1);
            if (eltLastTime <= newIndexStart) {
                // our new index comes directly after
                // put it after this one
                oldTimeline.splice.apply(oldTimeline, __spreadArray([i + 1, prevTimelineLength - (i + 1)], __read(newTimeline), false));
                return false;
            }
            var newCurrRepeat = (newIndexStart - currElt.start) / currElt.duration - 1;
            if (newCurrRepeat % 1 === 0 && currElt.duration === newTimeline[0].duration) {
                var newRepeatCount = newTimeline[0].repeatCount < 0
                    ? -1 // === maximum possible repeat
                    : newTimeline[0].repeatCount + newCurrRepeat + 1;
                // replace that one and those after it
                oldTimeline.splice.apply(oldTimeline, __spreadArray([i, prevTimelineLength - i], __read(newTimeline), false));
                oldTimeline[i].start = currElt.start;
                oldTimeline[i].repeatCount = newRepeatCount;
                return false;
            }
            log_1.default.warn("RepresentationIndex: Manifest update removed previous segments");
            oldTimeline[i].repeatCount = Math.floor(newCurrRepeat);
            // put it after this one
            oldTimeline.splice.apply(oldTimeline, __spreadArray([i + 1, prevTimelineLength - (i + 1)], __read(newTimeline), false));
            return false;
        }
    }
    // if we got here, it means that every segments in the previous manifest are
    // after the new one. This is unusual.
    // Either the new one has more depth or it's an older one.
    var prevLastElt = oldTimeline[oldTimeline.length - 1];
    var newLastElt = newTimeline[newTimeline.length - 1];
    if (prevLastElt.repeatCount !== undefined && prevLastElt.repeatCount < 0) {
        if (prevLastElt.start > newLastElt.start) {
            log_1.default.warn("RepresentationIndex: The new index is older than the previous one");
            return false;
        }
        else {
            // the new has more depth
            log_1.default.warn('RepresentationIndex: The new index is "bigger" than the previous one');
            oldTimeline.splice.apply(oldTimeline, __spreadArray([0, prevTimelineLength], __read(newTimeline), false));
            return true;
        }
    }
    var prevLastTime = prevLastElt.start + prevLastElt.duration * (prevLastElt.repeatCount + 1);
    var newLastTime = newLastElt.start + newLastElt.duration * (newLastElt.repeatCount + 1);
    if (prevLastTime >= newLastTime) {
        log_1.default.warn("RepresentationIndex: The new index is older than the previous one");
        return false;
    }
    // the new one has more depth. full update
    log_1.default.warn('RepresentationIndex: The new index is "bigger" than the previous one');
    oldTimeline.splice.apply(oldTimeline, __spreadArray([0, prevTimelineLength], __read(newTimeline), false));
    return true;
}
exports.default = updateSegmentTimeline;
