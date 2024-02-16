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
var manifest_1 = require("../../../../manifest");
/**
 * Attach trick mode tracks to adaptations by assigning to the trickModeTracks
 * property an array of trick mode track adaptations.
 * @param {Object} adaptations
 * @param {Array.<Object>} trickModeTracks
 * @returns {void}
 */
function attachTrickModeTrack(adaptations, trickModeTracks) {
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
    try {
        for (var trickModeTracks_1 = __values(trickModeTracks), trickModeTracks_1_1 = trickModeTracks_1.next(); !trickModeTracks_1_1.done; trickModeTracks_1_1 = trickModeTracks_1.next()) {
            var track = trickModeTracks_1_1.value;
            var adaptation = track.adaptation, trickModeAttachedAdaptationIds = track.trickModeAttachedAdaptationIds;
            try {
                for (var trickModeAttachedAdaptationIds_1 = (e_2 = void 0, __values(trickModeAttachedAdaptationIds)), trickModeAttachedAdaptationIds_1_1 = trickModeAttachedAdaptationIds_1.next(); !trickModeAttachedAdaptationIds_1_1.done; trickModeAttachedAdaptationIds_1_1 = trickModeAttachedAdaptationIds_1.next()) {
                    var trickModeAttachedAdaptationId = trickModeAttachedAdaptationIds_1_1.value;
                    try {
                        for (var SUPPORTED_ADAPTATIONS_TYPE_1 = (e_3 = void 0, __values(manifest_1.SUPPORTED_ADAPTATIONS_TYPE)), SUPPORTED_ADAPTATIONS_TYPE_1_1 = SUPPORTED_ADAPTATIONS_TYPE_1.next(); !SUPPORTED_ADAPTATIONS_TYPE_1_1.done; SUPPORTED_ADAPTATIONS_TYPE_1_1 = SUPPORTED_ADAPTATIONS_TYPE_1.next()) {
                            var adaptationType = SUPPORTED_ADAPTATIONS_TYPE_1_1.value;
                            var adaptationsByType = adaptations[adaptationType];
                            if (adaptationsByType !== undefined) {
                                try {
                                    for (var adaptationsByType_1 = (e_4 = void 0, __values(adaptationsByType)), adaptationsByType_1_1 = adaptationsByType_1.next(); !adaptationsByType_1_1.done; adaptationsByType_1_1 = adaptationsByType_1.next()) {
                                        var adaptationByType = adaptationsByType_1_1.value;
                                        if (adaptationByType.id === trickModeAttachedAdaptationId) {
                                            if (adaptationByType.trickModeTracks === undefined) {
                                                adaptationByType.trickModeTracks = [];
                                            }
                                            adaptationByType.trickModeTracks.push(adaptation);
                                        }
                                    }
                                }
                                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                                finally {
                                    try {
                                        if (adaptationsByType_1_1 && !adaptationsByType_1_1.done && (_d = adaptationsByType_1.return)) _d.call(adaptationsByType_1);
                                    }
                                    finally { if (e_4) throw e_4.error; }
                                }
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (SUPPORTED_ADAPTATIONS_TYPE_1_1 && !SUPPORTED_ADAPTATIONS_TYPE_1_1.done && (_c = SUPPORTED_ADAPTATIONS_TYPE_1.return)) _c.call(SUPPORTED_ADAPTATIONS_TYPE_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (trickModeAttachedAdaptationIds_1_1 && !trickModeAttachedAdaptationIds_1_1.done && (_b = trickModeAttachedAdaptationIds_1.return)) _b.call(trickModeAttachedAdaptationIds_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (trickModeTracks_1_1 && !trickModeTracks_1_1.done && (_a = trickModeTracks_1.return)) _a.call(trickModeTracks_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
exports.default = attachTrickModeTrack;
