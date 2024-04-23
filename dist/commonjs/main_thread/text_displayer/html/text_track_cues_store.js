"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = require("../../../utils/assert");
var utils_1 = require("./utils");
/**
 * first or last IHTMLCue in a group can have a slighlty different start
 * or end time than the start or end time of the ICuesGroup due to parsing
 * approximation.
 * DELTA_CUES_GROUP defines the tolerance level when comparing the start/end
 * of a IHTMLCue to the start/end of a ICuesGroup.
 * Having this value too high may lead to have unwanted subtitle displayed
 * Having this value too low may lead to have subtitles not displayed
 */
var DELTA_CUES_GROUP = 1e-3;
/**
 * segment_duration / RELATIVE_DELTA_RATIO = relative_delta
 *
 * relative_delta is the tolerance to determine if two segements are the same
 */
var RELATIVE_DELTA_RATIO = 5;
/**
 * Manage a buffer of text track cues.
 * Allows to add, remove and recuperate cues at given times.
 * @class TextTrackCuesStore
 */
var TextTrackCuesStore = /** @class */ (function () {
    function TextTrackCuesStore() {
        this._cuesBuffer = [];
    }
    TextTrackCuesStore.prototype.isEmpty = function () {
        return this._cuesBuffer.length === 0;
    };
    /**
     * Get corresponding cue(s) for the given time.
     * A cue is an object with three properties:
     *   - start {Number}: start time for which the cue should be displayed.
     *   - end {Number}: end time for which the cue should be displayed.
     *   - element {HTMLElement}: The cue to diplay
     *
     * We do not mutate individual cue here.
     * That is, if the ``get`` method returns the same cue's reference than a
     * previous ``get`` call, its properties are guaranteed to have the exact same
     * values than before, if you did not mutate it on your side.
     * The inverse is true, if the values are the same than before, the reference
     * will stay the same (this is useful to easily check if the DOM should be
     * updated, for example).
     *
     * @param {Number} time
     * @returns {Array.<HTMLElement>} - The cues that need to be displayed at that
     * time.
     */
    TextTrackCuesStore.prototype.get = function (time) {
        var cuesBuffer = this._cuesBuffer;
        var ret = [];
        // begins at the end as most of the time the player will ask for the last
        // CuesGroup
        for (var cueIdx = cuesBuffer.length - 1; cueIdx >= 0; cueIdx--) {
            var segment = cuesBuffer[cueIdx];
            if (time < segment.end && time >= segment.start) {
                var cues = segment.cues;
                for (var j = 0; j < cues.length; j++) {
                    if (time >= cues[j].start && time < cues[j].end) {
                        ret.push(cues[j].element);
                    }
                }
                // first or last IHTMLCue in a group can have a slighlty different start
                // or end time than the start or end time of the ICuesGroup due to parsing
                // approximation.
                // Add a tolerance of 1ms to fix this issue
                if (ret.length === 0 && cues.length > 0) {
                    for (var j = 0; j < cues.length; j++) {
                        if ((0, utils_1.areNearlyEqual)(time, cues[j].start, DELTA_CUES_GROUP) ||
                            (0, utils_1.areNearlyEqual)(time, cues[j].end, DELTA_CUES_GROUP)) {
                            ret.push(cues[j].element);
                        }
                    }
                }
                return ret;
            }
        }
        return [];
    };
    /**
     * Remove cue from a certain range of time.
     * @param {Number} from
     * @param {Number} _to
     */
    TextTrackCuesStore.prototype.remove = function (from, _to) {
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            (0, assert_1.default)(from >= 0);
            (0, assert_1.default)(_to >= 0);
            (0, assert_1.default)(_to > from);
        }
        var to = Math.max(from, _to);
        var cuesBuffer = this._cuesBuffer;
        for (var cueIdx = 0; cueIdx < cuesBuffer.length; cueIdx++) {
            if (cuesBuffer[cueIdx].end > from) {
                // this cuesInfos is concerned by the remove
                var startCuesInfos = cuesBuffer[cueIdx];
                if (startCuesInfos.start >= to) {
                    // our cuesInfos is strictly after this interval, we have nothing to do
                    return;
                }
                if (startCuesInfos.end >= to) {
                    // our cuesInfos ends after `to`, we have to keep the end of it
                    if (from <= startCuesInfos.start) {
                        // from -> to only remove the start of startCuesInfos
                        startCuesInfos.cues = (0, utils_1.getCuesAfter)(startCuesInfos.cues, to);
                        startCuesInfos.start = to;
                    }
                    else {
                        // from -> to is in the middle part of startCuesInfos
                        var _a = __read((0, utils_1.removeCuesInfosBetween)(startCuesInfos, from, to), 2), cuesInfos1 = _a[0], cuesInfos2 = _a[1];
                        this._cuesBuffer[cueIdx] = cuesInfos1;
                        cuesBuffer.splice(cueIdx + 1, 0, cuesInfos2);
                    }
                    // No cuesInfos can be concerned after this one, we can quit
                    return;
                }
                // Else remove all part after `from`
                if (startCuesInfos.start >= from) {
                    // all the segment is concerned
                    cuesBuffer.splice(cueIdx, 1);
                    cueIdx--; // one less element, we have to decrement the loop
                }
                else {
                    // only the end is concerned
                    startCuesInfos.cues = (0, utils_1.getCuesBefore)(startCuesInfos.cues, from);
                    startCuesInfos.end = Math.max(from, startCuesInfos.start);
                }
            }
        }
    };
    /**
     * Insert new cues in our text buffer.
     * cues is an array of objects with three properties:
     *   - start {Number}: start time for which the cue should be displayed.
     *   - end {Number}: end time for which the cue should be displayed.
     *   - element {HTMLElement}: The cue to diplay
     *
     * @param {Array.<Object>} cues - CuesGroups, array of objects with the
     * following properties:
     *   - start {Number}: the time at which the cue will start to be displayed
     *   - end {Number}: the time at which the cue will end to be displayed
     *   - cue {HTMLElement}: The cue
     * @param {Number} start - Start time at which the CuesGroup applies.
     * This is different than the start of the first cue to display in it, this
     * has more to do with the time at which the _text segment_ starts.
     * @param {Number} end - End time at which the CuesGroup applies.
     * This is different than the end of the last cue to display in it, this
     * has more to do with the time at which the _text segment_ ends.
     *
     * TODO add securities to ensure that:
     *   - the start of a CuesGroup is inferior or equal to the start of the first
     *     cue in it
     *   - the end of a CuesGroup is superior or equal to the end of the last
     *     cue in it
     * If those requirements are not met, we could delete some cues when adding
     * a CuesGroup before/after. Find a solution.
     */
    TextTrackCuesStore.prototype.insert = function (cues, start, end) {
        var cuesBuffer = this._cuesBuffer;
        var cuesInfosToInsert = { start: start, end: end, cues: cues };
        // it's preferable to have a delta depending on the duration of the segment
        // if the delta is one fifth of the length of the segment:
        // a segment of [0, 2] is the "same" segment as [0, 2.1]
        // but [0, 0.04] is not the "same" segement as [0,04, 0.08]
        var relativeDelta = Math.abs(start - end) / RELATIVE_DELTA_RATIO;
        /**
         * Called when we found the index of the next cue relative to the cue we
         * want to insert (that is a cue starting after its start or at the same
         * time but ending strictly after its end).
         * Will insert the cue at the right place and update the next cue
         * accordingly.
         * @param {number} indexOfNextCue
         */
        function onIndexOfNextCueFound(indexOfNextCue) {
            var nextCue = cuesBuffer[indexOfNextCue];
            if (nextCue === undefined || // no cue
                (0, utils_1.areNearlyEqual)(cuesInfosToInsert.end, nextCue.end, relativeDelta)) {
                // samey end
                //   ours:            |AAAAA|
                //   the current one: |BBBBB|
                //   Result:          |AAAAA|
                cuesBuffer[indexOfNextCue] = cuesInfosToInsert;
            }
            else if (nextCue.start >= cuesInfosToInsert.end) {
                // Either
                //   ours:            |AAAAA|
                //   the current one:         |BBBBBB|
                //   Result:          |AAAAA| |BBBBBB|
                // Or:
                //   ours:            |AAAAA|
                //   the current one:       |BBBBBB|
                //   Result:          |AAAAA|BBBBBB|
                // Add ours before
                cuesBuffer.splice(indexOfNextCue, 0, cuesInfosToInsert);
            }
            else {
                // Either
                //   ours:            |AAAAA|
                //   the current one: |BBBBBBBB|
                //   Result:          |AAAAABBB|
                // Or:
                //   ours:            |AAAAA|
                //   the current one:    |BBBBB|
                //   Result:          |AAAAABBB|
                nextCue.cues = (0, utils_1.getCuesAfter)(nextCue.cues, cuesInfosToInsert.end);
                nextCue.start = cuesInfosToInsert.end;
                cuesBuffer.splice(indexOfNextCue, 0, cuesInfosToInsert);
            }
        }
        for (var cueIdx = 0; cueIdx < cuesBuffer.length; cueIdx++) {
            var cuesInfos = cuesBuffer[cueIdx];
            if (start < cuesInfos.end) {
                if ((0, utils_1.areNearlyEqual)(start, cuesInfos.start, relativeDelta)) {
                    if ((0, utils_1.areNearlyEqual)(end, cuesInfos.end, relativeDelta)) {
                        // exact same segment
                        //   ours:            |AAAAA|
                        //   the current one: |BBBBB|
                        //   Result:          |AAAAA|
                        // Which means:
                        //   1. replace the current cue with ours
                        cuesBuffer[cueIdx] = cuesInfosToInsert;
                        return;
                    }
                    else if (end < cuesInfos.end) {
                        // our cue overlaps with the current one:
                        //   ours:            |AAAAA|
                        //   the current one: |BBBBBBBB|
                        //   Result:          |AAAAABBB|
                        // Which means:
                        //   1. remove some cues at the start of the current one
                        //   2. update start of current one
                        //   3. add ours before the current one
                        cuesInfos.cues = (0, utils_1.getCuesAfter)(cuesInfos.cues, end);
                        cuesInfos.start = end;
                        cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
                        return;
                    }
                    // our cue goes beyond the current one:
                    //   ours:            |AAAAAAA|
                    //   the current one: |BBBB|...
                    //   Result:          |AAAAAAA|
                    // Here we have to delete any cuesInfos which end before ours end,
                    // and see about the following one.
                    do {
                        cuesBuffer.splice(cueIdx, 1);
                        cuesInfos = cuesBuffer[cueIdx];
                    } while (cuesInfos !== undefined && end > cuesInfos.end);
                    onIndexOfNextCueFound(cueIdx);
                    return;
                }
                else if (start < cuesInfos.start) {
                    if (end < cuesInfos.start) {
                        // our cue goes strictly before the current one:
                        //   ours:            |AAAAAAA|
                        //   the current one:           |BBBB|
                        //   Result:          |AAAAAAA| |BBBB|
                        // Which means:
                        //   - add ours before the current one
                        cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
                        return;
                    }
                    else if ((0, utils_1.areNearlyEqual)(end, cuesInfos.start, relativeDelta)) {
                        // our cue goes just before the current one:
                        //   ours:            |AAAAAAA|
                        //   the current one:         |BBBB|
                        //   Result:          |AAAAAAA|BBBB|
                        // Which means:
                        //   - update start time of the current one to be sure
                        //   - add ours before the current one
                        cuesInfos.start = end;
                        cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
                        return;
                    }
                    else if ((0, utils_1.areNearlyEqual)(end, cuesInfos.end, relativeDelta)) {
                        //   ours:            |AAAAAAA|
                        //   the current one:    |BBBB|
                        //   Result:          |AAAAAAA|
                        // Replace
                        cuesBuffer.splice(cueIdx, 1, cuesInfosToInsert);
                        return;
                    }
                    else if (end < cuesInfos.end) {
                        //   ours:            |AAAAAAA|
                        //   the current one:     |BBBBB|
                        //   Result:          |AAAAAAABB|
                        cuesInfos.cues = (0, utils_1.getCuesAfter)(cuesInfos.cues, end);
                        cuesInfos.start = end;
                        cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
                        return;
                    }
                    //   ours:            |AAAAAAA|
                    //   the current one:   |BBB|...
                    //   Result:          |AAAAAAA|...
                    do {
                        cuesBuffer.splice(cueIdx, 1);
                        cuesInfos = cuesBuffer[cueIdx];
                    } while (cuesInfos !== undefined && end > cuesInfos.end);
                    onIndexOfNextCueFound(cueIdx);
                    return;
                }
                // else -> start > cuesInfos.start
                if ((0, utils_1.areNearlyEqual)(cuesInfos.end, end, relativeDelta)) {
                    //   ours:              |AAAAAA|
                    //   the current one: |BBBBBBBB|
                    //   Result:          |BBAAAAAA|
                    cuesInfos.cues = (0, utils_1.getCuesBefore)(cuesInfos.cues, start);
                    cuesInfos.end = start;
                    cuesBuffer.splice(cueIdx + 1, 0, cuesInfosToInsert);
                    return;
                }
                else if (cuesInfos.end > end) {
                    //   ours:              |AAAAAA|
                    //   the current one: |BBBBBBBBBBB|
                    //   Result:          |BBAAAAAABBB|
                    var _a = __read((0, utils_1.removeCuesInfosBetween)(cuesInfos, start, end), 2), cuesInfos1 = _a[0], cuesInfos2 = _a[1];
                    this._cuesBuffer[cueIdx] = cuesInfos1;
                    cuesBuffer.splice(cueIdx + 1, 0, cuesInfosToInsert);
                    cuesBuffer.splice(cueIdx + 2, 0, cuesInfos2);
                    return;
                }
                else {
                    //   ours:              |AAAAAA|
                    //   the current one: |BBBBB|...
                    //   Result:          |BBAAAAAA|...
                    cuesInfos.cues = (0, utils_1.getCuesBefore)(cuesInfos.cues, start);
                    cuesInfos.end = start;
                    var nextCueIdx = cueIdx + 1;
                    cuesInfos = cuesBuffer[nextCueIdx];
                    while (cuesInfos !== undefined && end > cuesInfos.end) {
                        cuesBuffer.splice(nextCueIdx, 1);
                        cuesInfos = cuesBuffer[nextCueIdx];
                    }
                    onIndexOfNextCueFound(nextCueIdx);
                    return;
                }
            }
        }
        if (cuesBuffer.length) {
            var lastCue = cuesBuffer[cuesBuffer.length - 1];
            if ((0, utils_1.areNearlyEqual)(lastCue.end, start, relativeDelta)) {
                // Match the end of the previous cue to the start of the following one
                // if they are close enough. If there is a small gap between two segments
                // it can lead to having no subtitles for a short time, this is noticeable when
                // two successive segments displays the same text, making it diseappear
                // and reappear quickly, which gives the impression of blinking
                //
                //   ours:                   |AAAAA|
                //   the current one: |BBBBB|...
                //   Result:          |BBBBBBBAAAAA|
                lastCue.end = start;
            }
        }
        // no cues group has the end after our current start.
        // These cues should be the last one
        cuesBuffer.push(cuesInfosToInsert);
    };
    return TextTrackCuesStore;
}());
exports.default = TextTrackCuesStore;
