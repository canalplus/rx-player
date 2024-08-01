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
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var time_parsing_1 = require("./time_parsing");
/**
 * Get start and end time of an element.
 * @param {Element} element
 * @param {Object} ttParams
 * @returns {Object}
 */
function getTimeDelimiters(element, ttParams) {
    var beginAttr = element.getAttribute("begin");
    var durationAttr = element.getAttribute("dur");
    var endAttr = element.getAttribute("end");
    var start = (0, is_non_empty_string_1.default)(beginAttr) ? (0, time_parsing_1.default)(beginAttr, ttParams) : null;
    var duration = (0, is_non_empty_string_1.default)(durationAttr)
        ? (0, time_parsing_1.default)(durationAttr, ttParams)
        : null;
    var parsedEnd = (0, is_non_empty_string_1.default)(endAttr) ? (0, time_parsing_1.default)(endAttr, ttParams) : null;
    if ((0, is_null_or_undefined_1.default)(start) ||
        ((0, is_null_or_undefined_1.default)(parsedEnd) && (0, is_null_or_undefined_1.default)(duration))) {
        throw new Error("Invalid text cue");
    }
    var end = (0, is_null_or_undefined_1.default)(parsedEnd) ? start + duration : parsedEnd;
    return { start: start, end: end };
}
exports.default = getTimeDelimiters;
