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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../log");
var array_find_index_1 = require("../../utils/array_find_index");
var types_1 = require("./types");
/**
 * Update oldPeriod attributes with the one from newPeriod (e.g. when updating
 * the Manifest).
 * @param {Object} oldPeriod
 * @param {Object} newPeriod
 * @param {number} updateType
 * @returns {Object}
 */
function updatePeriodInPlace(oldPeriod, newPeriod, updateType) {
    var e_1, _a;
    var res = {
        updatedAdaptations: [],
        removedAdaptations: [],
        addedAdaptations: [],
    };
    oldPeriod.start = newPeriod.start;
    oldPeriod.end = newPeriod.end;
    oldPeriod.duration = newPeriod.duration;
    oldPeriod.streamEvents = newPeriod.streamEvents;
    var oldAdaptations = oldPeriod.getAdaptations();
    var newAdaptations = newPeriod.getAdaptations();
    var _loop_1 = function (j) {
        var _b;
        var oldAdaptation = oldAdaptations[j];
        var newAdaptationIdx = (0, array_find_index_1.default)(newAdaptations, function (a) { return a.id === oldAdaptation.id; });
        if (newAdaptationIdx === -1) {
            log_1.default.warn('Manifest: Adaptation "' + oldAdaptations[j].id + '" not found when merging.');
            var _c = __read(oldAdaptations.splice(j, 1), 1), removed = _c[0];
            j--;
            res.removedAdaptations.push({
                id: removed.id,
                trackType: removed.type,
            });
        }
        else {
            var _d = __read(newAdaptations.splice(newAdaptationIdx, 1), 1), newAdaptation = _d[0];
            var updatedRepresentations = [];
            var addedRepresentations = [];
            var removedRepresentations = [];
            res.updatedAdaptations.push({
                adaptation: oldAdaptation.id,
                trackType: oldAdaptation.type,
                updatedRepresentations: updatedRepresentations,
                addedRepresentations: addedRepresentations,
                removedRepresentations: removedRepresentations,
            });
            var oldRepresentations = oldAdaptation.representations;
            var newRepresentations = newAdaptation.representations.slice();
            var _loop_2 = function (k) {
                var oldRepresentation = oldRepresentations[k];
                var newRepresentationIdx = (0, array_find_index_1.default)(newRepresentations, function (representation) { return representation.id === oldRepresentation.id; });
                if (newRepresentationIdx === -1) {
                    log_1.default.warn("Manifest: Representation \"".concat(oldRepresentations[k].id, "\" ") +
                        "not found when merging.");
                    var _e = __read(oldRepresentations.splice(k, 1), 1), removed = _e[0];
                    k--;
                    removedRepresentations.push(removed.id);
                }
                else {
                    var _f = __read(newRepresentations.splice(newRepresentationIdx, 1), 1), newRepresentation = _f[0];
                    updatedRepresentations.push(oldRepresentation.getMetadataSnapshot());
                    oldRepresentation.cdnMetadata = newRepresentation.cdnMetadata;
                    if (updateType === types_1.MANIFEST_UPDATE_TYPE.Full) {
                        oldRepresentation.index._replace(newRepresentation.index);
                    }
                    else {
                        oldRepresentation.index._update(newRepresentation.index);
                    }
                }
                out_k_1 = k;
            };
            var out_k_1;
            for (var k = 0; k < oldRepresentations.length; k++) {
                _loop_2(k);
                k = out_k_1;
            }
            if (newRepresentations.length > 0) {
                log_1.default.warn("Manifest: ".concat(newRepresentations.length, " new Representations ") +
                    "found when merging.");
                (_b = oldAdaptation.representations).push.apply(_b, __spreadArray([], __read(newRepresentations), false));
                addedRepresentations.push.apply(addedRepresentations, __spreadArray([], __read(newRepresentations.map(function (r) { return r.getMetadataSnapshot(); })), false));
            }
        }
        out_j_1 = j;
    };
    var out_j_1;
    for (var j = 0; j < oldAdaptations.length; j++) {
        _loop_1(j);
        j = out_j_1;
    }
    if (newAdaptations.length > 0) {
        log_1.default.warn("Manifest: ".concat(newAdaptations.length, " new Adaptations ") + "found when merging.");
        try {
            for (var newAdaptations_1 = __values(newAdaptations), newAdaptations_1_1 = newAdaptations_1.next(); !newAdaptations_1_1.done; newAdaptations_1_1 = newAdaptations_1.next()) {
                var adap = newAdaptations_1_1.value;
                var prevAdaps = oldPeriod.adaptations[adap.type];
                if (prevAdaps === undefined) {
                    oldPeriod.adaptations[adap.type] = [adap];
                }
                else {
                    prevAdaps.push(adap);
                }
                res.addedAdaptations.push(adap.getMetadataSnapshot());
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (newAdaptations_1_1 && !newAdaptations_1_1.done && (_a = newAdaptations_1.return)) _a.call(newAdaptations_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return res;
}
exports.default = updatePeriodInPlace;
