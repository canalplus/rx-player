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
var add_class_name_1 = require("../../../../compat/add_class_name");
var log_1 = require("../../../../log");
var regexps_1 = require("../regexps");
/**
 * @param {HTMLElement} element
 * @param {string} lineHeight
 */
function applyLineHeight(element, lineHeight) {
    var trimmedLineHeight = lineHeight.trim();
    var splittedLineHeight = trimmedLineHeight.split(" ");
    if (trimmedLineHeight === "auto") {
        return;
    }
    var firstLineHeight = regexps_1.REGXP_LENGTH.exec(splittedLineHeight[0]);
    if (firstLineHeight === null) {
        return;
    }
    if (firstLineHeight[2] === "px" ||
        firstLineHeight[2] === "%" ||
        firstLineHeight[2] === "em") {
        element.style.lineHeight = firstLineHeight[1] + firstLineHeight[2];
    }
    else if (firstLineHeight[2] === "c") {
        (0, add_class_name_1.default)(element, "proportional-style");
        element.setAttribute("data-proportional-line-height", firstLineHeight[1]);
    }
    else {
        log_1.default.warn("TTML Parser: unhandled lineHeight unit:", firstLineHeight[2]);
    }
}
exports.default = applyLineHeight;
