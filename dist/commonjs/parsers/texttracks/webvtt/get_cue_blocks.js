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
var utils_1 = require("./utils");
/**
 * Get cue blocks from a WebVTT file.
 * @param {Array.<string>} linified - Whole WebVTT file. Each new element in
 * this array is a new line.
 * @param {number} headerOffset - index of the first line after the header.
 * Used to avoid taking the header into consideration.
 * @returns {Array.<Array.<string>>}
 */
function getCueBlocks(linified, headerOffset) {
    var cueBlocks = [];
    for (var i = headerOffset; i < linified.length; i++) {
        if ((0, utils_1.isStartOfCueBlock)(linified, i)) {
            var endOfCue = (0, utils_1.findEndOfCueBlock)(linified, i);
            cueBlocks.push(linified.slice(i, endOfCue));
            i = endOfCue;
        }
        else if ((0, is_non_empty_string_1.default)(linified[i])) {
            // continue incrementing i until either:
            //   - empty line
            //   - end
            while ((0, is_non_empty_string_1.default)(linified[i])) {
                i++;
            }
        }
    }
    return cueBlocks;
}
exports.default = getCueBlocks;
