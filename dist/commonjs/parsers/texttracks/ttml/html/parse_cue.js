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
var get_time_delimiters_1 = require("../get_time_delimiters");
var create_element_1 = require("./create_element");
/**
 * @param {Object} parsedCue
 * @returns {Object|null}
 */
function parseCue(parsedCue) {
    var paragraph = parsedCue.paragraph, ttParams = parsedCue.ttParams, body = parsedCue.body, regionStyles = parsedCue.regionStyles, idStyles = parsedCue.idStyles, paragraphStyle = parsedCue.paragraphStyle, timeOffset = parsedCue.timeOffset, shouldTrimWhiteSpace = parsedCue.shouldTrimWhiteSpace;
    // Disregard empty elements:
    // TTML allows for empty elements like <div></div>.
    // If paragraph has neither time attributes, nor
    // non-whitespace text, don't try to make a cue out of it.
    if (!paragraph.hasAttribute("begin") &&
        !paragraph.hasAttribute("end") &&
        /^\s*$/.test(paragraph.textContent === null ? "" : paragraph.textContent)) {
        return null;
    }
    var cellResolution = ttParams.cellResolution;
    var _a = (0, get_time_delimiters_1.default)(paragraph, ttParams), start = _a.start, end = _a.end;
    var element = (0, create_element_1.default)(paragraph, body, regionStyles, idStyles, paragraphStyle, {
        cellResolution: cellResolution,
        shouldTrimWhiteSpace: shouldTrimWhiteSpace,
    });
    return { start: start + timeOffset, end: end + timeOffset, element: element };
}
exports.default = parseCue;
