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
 * Apply `tts:fontSize` styling to an HTML element.
 * @param {HTMLElement} element
 * @param {string} fontSize
 */
function applyFontSize(element, fontSize) {
    var trimmedFontSize = fontSize.trim();
    var splittedFontSize = trimmedFontSize.split(" ");
    if (splittedFontSize.length === 0) {
        return;
    }
    var firstFontSize = regexps_1.REGXP_LENGTH.exec(splittedFontSize[0]);
    if (firstFontSize === null) {
        return;
    }
    if (firstFontSize[2] === "px" || firstFontSize[2] === "em") {
        element.style.fontSize = firstFontSize[1] + firstFontSize[2];
    }
    else if (firstFontSize[2] === "c") {
        element.style.position = "relative";
        (0, add_class_name_1.default)(element, "proportional-style");
        element.setAttribute("data-proportional-font-size", firstFontSize[1]);
    }
    else if (firstFontSize[2] === "%") {
        var toNum = Number(firstFontSize[1]);
        if (isNaN(toNum)) {
            log_1.default.warn('TTML Parser: could not parse fontSize value "' +
                firstFontSize[1] +
                '" into a number');
        }
        else {
            element.style.position = "relative";
            (0, add_class_name_1.default)(element, "proportional-style");
            element.setAttribute("data-proportional-font-size", String(toNum / 100));
        }
    }
    else {
        log_1.default.warn("TTML Parser: unhandled fontSize unit:", firstFontSize[2]);
    }
}
exports.default = applyFontSize;
