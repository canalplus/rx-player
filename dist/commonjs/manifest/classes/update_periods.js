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
exports.updatePeriods = exports.replacePeriods = void 0;
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var array_find_index_1 = require("../../utils/array_find_index");
var object_assign_1 = require("../../utils/object_assign");
var types_1 = require("./types");
var update_period_in_place_1 = require("./update_period_in_place");
/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 * @returns {Object}
 */
function replacePeriods(oldPeriods, newPeriods) {
    var _a, _b, _c, _d;
    var res = {
        updatedPeriods: [],
        addedPeriods: [],
        removedPeriods: [],
    };
    var firstUnhandledPeriodIdx = 0;
    for (var i = 0; i < newPeriods.length; i++) {
        var newPeriod = newPeriods[i];
        var j = firstUnhandledPeriodIdx;
        var oldPeriod = oldPeriods[j];
        while (oldPeriod !== undefined && oldPeriod.id !== newPeriod.id) {
            j++;
            oldPeriod = oldPeriods[j];
        }
        if (oldPeriod !== undefined) {
            var result = (0, update_period_in_place_1.default)(oldPeriod, newPeriod, types_1.MANIFEST_UPDATE_TYPE.Full);
            res.updatedPeriods.push({
                period: {
                    id: oldPeriod.id,
                    start: oldPeriod.start,
                    end: oldPeriod.end,
                    duration: oldPeriod.duration,
                    streamEvents: oldPeriod.streamEvents,
                },
                result: result,
            });
            var periodsToInclude = newPeriods.slice(firstUnhandledPeriodIdx, i);
            var nbrOfPeriodsToRemove = j - firstUnhandledPeriodIdx;
            var removed = oldPeriods.splice.apply(oldPeriods, __spreadArray([firstUnhandledPeriodIdx,
                nbrOfPeriodsToRemove], __read(periodsToInclude), false));
            (_a = res.removedPeriods).push.apply(_a, __spreadArray([], __read(removed.map(function (p) { return ({
                id: p.id,
                start: p.start,
                end: p.end,
            }); })), false));
            (_b = res.addedPeriods).push.apply(_b, __spreadArray([], __read(periodsToInclude.map(function (p) { return p.getMetadataSnapshot(); })), false));
            firstUnhandledPeriodIdx = i + 1;
        }
    }
    if (firstUnhandledPeriodIdx > oldPeriods.length) {
        log_1.default.error("Manifest: error when updating Periods");
        return res;
    }
    if (firstUnhandledPeriodIdx < oldPeriods.length) {
        var removed = oldPeriods.splice(firstUnhandledPeriodIdx, oldPeriods.length - firstUnhandledPeriodIdx);
        (_c = res.removedPeriods).push.apply(_c, __spreadArray([], __read(removed.map(function (p) { return ({
            id: p.id,
            start: p.start,
            end: p.end,
        }); })), false));
    }
    var remainingNewPeriods = newPeriods.slice(firstUnhandledPeriodIdx, newPeriods.length);
    if (remainingNewPeriods.length > 0) {
        oldPeriods.push.apply(oldPeriods, __spreadArray([], __read(remainingNewPeriods), false));
        (_d = res.addedPeriods).push.apply(_d, __spreadArray([], __read(remainingNewPeriods.map(function (p) { return p.getMetadataSnapshot(); })), false));
    }
    return res;
}
exports.replacePeriods = replacePeriods;
/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 * @returns {Object}
 */
function updatePeriods(oldPeriods, newPeriods) {
    var _a, _b, _c, _d, _e;
    var res = {
        updatedPeriods: [],
        addedPeriods: [],
        removedPeriods: [],
    };
    if (oldPeriods.length === 0) {
        oldPeriods.splice.apply(oldPeriods, __spreadArray([0, 0], __read(newPeriods), false));
        (_a = res.addedPeriods).push.apply(_a, __spreadArray([], __read(newPeriods.map(function (p) { return p.getMetadataSnapshot(); })), false));
        return res;
    }
    if (newPeriods.length === 0) {
        return res;
    }
    var oldLastPeriod = oldPeriods[oldPeriods.length - 1];
    if (oldLastPeriod.start < newPeriods[0].start) {
        if (oldLastPeriod.end !== newPeriods[0].start) {
            throw new errors_1.MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: not enough data");
        }
        oldPeriods.push.apply(oldPeriods, __spreadArray([], __read(newPeriods), false));
        (_b = res.addedPeriods).push.apply(_b, __spreadArray([], __read(newPeriods.map(function (p) { return p.getMetadataSnapshot(); })), false));
        return res;
    }
    /** Index, in `oldPeriods` of the first element of `newPeriods` */
    var indexOfNewFirstPeriod = (0, array_find_index_1.default)(oldPeriods, function (_a) {
        var id = _a.id;
        return id === newPeriods[0].id;
    });
    if (indexOfNewFirstPeriod < 0) {
        throw new errors_1.MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: incoherent data");
    }
    // The first updated Period can only be a partial part
    var updateRes = (0, update_period_in_place_1.default)(oldPeriods[indexOfNewFirstPeriod], newPeriods[0], types_1.MANIFEST_UPDATE_TYPE.Partial);
    res.updatedPeriods.push({
        period: (0, object_assign_1.default)(oldPeriods[indexOfNewFirstPeriod].getMetadataSnapshot(), {
            adaptations: undefined,
        }),
        result: updateRes,
    });
    // Search each consecutive elements of `newPeriods` - after the initial one already
    // processed - in `oldPeriods`, removing and adding unfound Periods in the process
    var prevIndexOfNewPeriod = indexOfNewFirstPeriod + 1;
    for (var i = 1; i < newPeriods.length; i++) {
        var newPeriod = newPeriods[i];
        var indexOfNewPeriod = -1;
        for (var j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
            if (newPeriod.id === oldPeriods[j].id) {
                indexOfNewPeriod = j;
                break; // end the loop
            }
        }
        if (indexOfNewPeriod < 0) {
            // Next element of `newPeriods` not found: insert it
            var toRemoveUntil = -1;
            for (var j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
                if (newPeriod.start < oldPeriods[j].start) {
                    toRemoveUntil = j;
                    break; // end the loop
                }
            }
            var nbElementsToRemove = toRemoveUntil - prevIndexOfNewPeriod;
            var removed = oldPeriods.splice(prevIndexOfNewPeriod, nbElementsToRemove, newPeriod);
            res.addedPeriods.push(newPeriod.getMetadataSnapshot());
            (_c = res.removedPeriods).push.apply(_c, __spreadArray([], __read(removed.map(function (p) { return ({
                id: p.id,
                start: p.start,
                end: p.end,
            }); })), false));
        }
        else {
            if (indexOfNewPeriod > prevIndexOfNewPeriod) {
                // Some old periods were not found: remove
                log_1.default.warn("Manifest: old Periods not found in new when updating, removing");
                var removed = oldPeriods.splice(prevIndexOfNewPeriod, indexOfNewPeriod - prevIndexOfNewPeriod);
                (_d = res.removedPeriods).push.apply(_d, __spreadArray([], __read(removed.map(function (p) { return ({
                    id: p.id,
                    start: p.start,
                    end: p.end,
                }); })), false));
                indexOfNewPeriod = prevIndexOfNewPeriod;
            }
            // Later Periods can be fully replaced
            var result = (0, update_period_in_place_1.default)(oldPeriods[indexOfNewPeriod], newPeriod, types_1.MANIFEST_UPDATE_TYPE.Full);
            res.updatedPeriods.push({
                period: (0, object_assign_1.default)(oldPeriods[indexOfNewPeriod].getMetadataSnapshot(), {
                    adaptations: undefined,
                }),
                result: result,
            });
        }
        prevIndexOfNewPeriod++;
    }
    if (prevIndexOfNewPeriod < oldPeriods.length) {
        log_1.default.warn("Manifest: Ending Periods not found in new when updating, removing");
        var removed = oldPeriods.splice(prevIndexOfNewPeriod, oldPeriods.length - prevIndexOfNewPeriod);
        (_e = res.removedPeriods).push.apply(_e, __spreadArray([], __read(removed.map(function (p) { return ({
            id: p.id,
            start: p.start,
            end: p.end,
        }); })), false));
    }
    return res;
}
exports.updatePeriods = updatePeriods;
