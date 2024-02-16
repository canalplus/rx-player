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
var log_1 = require("../../../log");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var DecipherabilityFreezeDetector = /** @class */ (function () {
    function DecipherabilityFreezeDetector(segmentSinksStore) {
        this._segmentSinksStore = segmentSinksStore;
        this._currentFreezeTimestamp = null;
    }
    /**
     * Support of contents with DRM on all the platforms out there is a pain in
     * the *ss considering all the DRM-related bugs there are.
     *
     * We found out a frequent issue which is to be unable to play despite having
     * all the decryption keys to play what is currently buffered.
     * When this happens, re-creating the buffers from scratch, with a reload, is
     * usually sufficient to unlock the situation.
     *
     * Although we prefer providing more targeted fixes or telling to platform
     * developpers to fix their implementation, it's not always possible.
     * We thus resorted to developping an heuristic which detects such situation
     * and reload in that case.
     *
     * @param {Object} observation - The last playback observation produced, it
     * has to be recent (just triggered for example).
     * @returns {boolean} - Returns `true` if it seems to be such kind of
     * decipherability freeze, in which case you should probably reload the
     * content.
     */
    DecipherabilityFreezeDetector.prototype.needToReload = function (observation) {
        var e_1, _a, e_2, _b;
        var readyState = observation.readyState, rebuffering = observation.rebuffering, freezing = observation.freezing;
        var bufferGap = observation.bufferGap !== undefined && isFinite(observation.bufferGap)
            ? observation.bufferGap
            : 0;
        if (bufferGap < 6 || (rebuffering === null && freezing === null) || readyState > 1) {
            this._currentFreezeTimestamp = null;
            return false;
        }
        var now = (0, monotonic_timestamp_1.default)();
        if (this._currentFreezeTimestamp === null) {
            this._currentFreezeTimestamp = now;
        }
        var rebufferingForTooLong = rebuffering !== null && now - rebuffering.timestamp > 4000;
        var frozenForTooLong = freezing !== null && now - freezing.timestamp > 4000;
        if ((rebufferingForTooLong || frozenForTooLong) &&
            (0, monotonic_timestamp_1.default)() - this._currentFreezeTimestamp > 4000) {
            var statusAudio = this._segmentSinksStore.getStatus("audio");
            var statusVideo = this._segmentSinksStore.getStatus("video");
            var hasOnlyDecipherableSegments = true;
            var isClear = true;
            try {
                for (var _c = __values([statusAudio, statusVideo]), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var status_1 = _d.value;
                    if (status_1.type === "initialized") {
                        try {
                            for (var _e = (e_2 = void 0, __values(status_1.value.getLastKnownInventory())), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var segment = _f.value;
                                var representation = segment.infos.representation;
                                if (representation.decipherable === false) {
                                    log_1.default.warn("Init: we have undecipherable segments left in the buffer, reloading");
                                    this._currentFreezeTimestamp = null;
                                    return true;
                                }
                                else if (representation.contentProtections !== undefined) {
                                    isClear = false;
                                    if (representation.decipherable !== true) {
                                        hasOnlyDecipherableSegments = false;
                                    }
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (!isClear && hasOnlyDecipherableSegments) {
                log_1.default.warn("Init: we are frozen despite only having decipherable " +
                    "segments left in the buffer, reloading");
                this._currentFreezeTimestamp = null;
                return true;
            }
        }
        return false;
    };
    return DecipherabilityFreezeDetector;
}());
exports.default = DecipherabilityFreezeDetector;
