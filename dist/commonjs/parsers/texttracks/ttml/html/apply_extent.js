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
 * Apply `tts:extent` styling to an HTML element.
 * @param {HTMLElement} element
 * @param {string} extent
 */
function applyExtent(element, extent) {
    var trimmedExtent = extent.trim();
    if (trimmedExtent === "auto") {
        return;
    }
    var splittedExtent = trimmedExtent.split(" ");
    if (splittedExtent.length !== 2) {
        return;
    }
    var firstExtent = regexps_1.REGXP_LENGTH.exec(splittedExtent[0]);
    var secondExtent = regexps_1.REGXP_LENGTH.exec(splittedExtent[1]);
    if (firstExtent !== null && secondExtent !== null) {
        if (firstExtent[2] === "px" || firstExtent[2] === "%" || firstExtent[2] === "em") {
            element.style.width = firstExtent[1] + firstExtent[2];
        }
        else if (firstExtent[2] === "c") {
            (0, add_class_name_1.default)(element, "proportional-style");
            element.setAttribute("data-proportional-width", firstExtent[1]);
        }
        else {
            log_1.default.warn("TTML Parser: unhandled extent unit:", firstExtent[2]);
        }
        if (secondExtent[2] === "px" || secondExtent[2] === "%" || secondExtent[2] === "em") {
            element.style.height = secondExtent[1] + secondExtent[2];
        }
        else if (secondExtent[2] === "c") {
            (0, add_class_name_1.default)(element, "proportional-style");
            element.setAttribute("data-proportional-height", secondExtent[1]);
        }
        else {
            log_1.default.warn("TTML Parser: unhandled extent unit:", secondExtent[2]);
        }
    }
}
exports.default = applyExtent;
