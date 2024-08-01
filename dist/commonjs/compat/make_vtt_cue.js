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
var log_1 = require("../log");
var global_scope_1 = require("../utils/global_scope");
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
/**
 * Creates a cue using the best platform-specific interface available.
 *
 * @param {Number} startTime
 * @param {Number} endTime
 * @param {string} payload
 * @returns {VTTCue|TextTrackCue|null} Text track cue or null if the parameters
 * were invalid.
 */
function makeCue(startTime, endTime, payload) {
    if (startTime >= endTime) {
        // IE/Edge will throw in this case.
        // See issue #501
        log_1.default.warn("Compat: Invalid cue times: ".concat(startTime, " - ").concat(endTime));
        return null;
    }
    if ((0, is_null_or_undefined_1.default)(global_scope_1.default.VTTCue)) {
        if ((0, is_null_or_undefined_1.default)(global_scope_1.default.TextTrackCue)) {
            throw new Error("VTT cues not supported in your target");
        }
        return new TextTrackCue(startTime, endTime, payload);
    }
    else {
        return new VTTCue(startTime, endTime, payload);
    }
}
exports.default = makeCue;
