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
Object.defineProperty(exports, "__esModule", { value: true });
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var parse_timestamp_1 = require("./parse_timestamp");
/**
 * Parse cue block into a cue object which contains:
 *   - start {number}: the start of the cue as a timestamp in seconds
 *   - end {number}: the end of the cue as a timestamp in seconds
 *   - payload {Array.<string>}: the payload of the cue
 * @param {Array.<string>} cueLines
 * @param {Number} timeOffset
 * @returns {Object}
 */
function parseCueBlock(cueLines, timeOffset) {
    var _a, _b;
    if (cueLines.length === 0) {
        return null;
    }
    var startTimeString;
    var endTimeString;
    var payload = [];
    // normally in srt, the timing is at second position.
    // We still authorize to put it in the first position for resilience
    if ((0, is_non_empty_string_1.default)(cueLines[1]) && cueLines[1].indexOf("-->") !== -1) {
        _a = __read(cueLines[1].split("-->").map(function (s) { return s.trim(); }), 2), startTimeString = _a[0], endTimeString = _a[1];
        payload = cueLines.slice(2, cueLines.length);
    }
    if (!(0, is_non_empty_string_1.default)(startTimeString) || !(0, is_non_empty_string_1.default)(endTimeString)) {
        // Try to see if we find them in the first position
        _b = __read(cueLines[0].split("-->").map(function (s) { return s.trim(); }), 2), startTimeString = _b[0], endTimeString = _b[1];
        payload = cueLines.slice(1, cueLines.length);
    }
    if (!(0, is_non_empty_string_1.default)(startTimeString) || !(0, is_non_empty_string_1.default)(endTimeString)) {
        // if the time is still not found, exit
        return null;
    }
    var start = (0, parse_timestamp_1.default)(startTimeString);
    var end = (0, parse_timestamp_1.default)(endTimeString);
    if (start === undefined || end === undefined) {
        return null;
    }
    return { start: start + timeOffset, end: end + timeOffset, payload: payload };
}
exports.default = parseCueBlock;
