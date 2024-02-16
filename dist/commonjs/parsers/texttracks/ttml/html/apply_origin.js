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
 * @param {string} origin
 */
function applyOrigin(element, origin) {
    var trimmedOrigin = origin.trim();
    if (trimmedOrigin === "auto") {
        return;
    }
    var splittedOrigin = trimmedOrigin.split(" ");
    if (splittedOrigin.length !== 2) {
        return;
    }
    var firstOrigin = regexps_1.REGXP_LENGTH.exec(splittedOrigin[0]);
    var secondOrigin = regexps_1.REGXP_LENGTH.exec(splittedOrigin[1]);
    if (firstOrigin !== null && secondOrigin !== null) {
        if (firstOrigin[2] === "px" || firstOrigin[2] === "%" || firstOrigin[2] === "em") {
            element.style.left = firstOrigin[1] + firstOrigin[2];
        }
        else if (firstOrigin[2] === "c") {
            (0, add_class_name_1.default)(element, "proportional-style");
            element.setAttribute("data-proportional-left", firstOrigin[1]);
        }
        else {
            log_1.default.warn("TTML Parser: unhandled origin unit:", firstOrigin[2]);
        }
        if (secondOrigin[2] === "px" || secondOrigin[2] === "%" || secondOrigin[2] === "em") {
            element.style.top = secondOrigin[1] + secondOrigin[2];
        }
        else if (secondOrigin[2] === "c") {
            (0, add_class_name_1.default)(element, "proportional-style");
            element.setAttribute("data-proportional-top", secondOrigin[1]);
        }
        else {
            log_1.default.warn("TTML Parser: unhandled origin unit:", secondOrigin[2]);
        }
    }
}
exports.default = applyOrigin;
