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
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
/**
 * Parse a single srt timestamp into seconds
 * @param {string} timestampString
 * @returns {Number|undefined}
 */
function parseTimestamp(timestampString) {
    var splittedTS = timestampString.split(":");
    if ((0, is_non_empty_string_1.default)(splittedTS[2])) {
        var hours = parseInt(splittedTS[0], 10);
        var minutes = parseInt(splittedTS[1], 10);
        var seconds = parseFloat(splittedTS[2].replace(",", "."));
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            return undefined;
        }
        return hours * 60 * 60 + minutes * 60 + seconds;
    }
}
exports.default = parseTimestamp;
