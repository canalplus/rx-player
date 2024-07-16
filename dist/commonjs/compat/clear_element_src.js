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
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
/**
 * Clear element's src attribute.
 * @param {HTMLMediaElement} element
 */
function clearElementSrc(element) {
    // On some browsers, we first have to make sure the textTracks elements are
    // both disabled and removed from the DOM.
    // If we do not do that, we may be left with displayed text tracks on the
    // screen, even if the track elements are properly removed, due to browser
    // issues.
    // Bug seen on Firefox (I forgot which version) and Chrome 96.
    var textTracks = element.textTracks;
    if (!(0, is_null_or_undefined_1.default)(textTracks)) {
        for (var i = 0; i < textTracks.length; i++) {
            textTracks[i].mode = "disabled";
        }
        if (element.hasChildNodes()) {
            var childNodes = element.childNodes;
            for (var j = childNodes.length - 1; j >= 0; j--) {
                if (childNodes[j].nodeName === "track") {
                    try {
                        element.removeChild(childNodes[j]);
                    }
                    catch (err) {
                        log_1.default.warn("Compat: Could not remove text track child from element.");
                    }
                }
            }
        }
    }
    element.src = "";
    // On IE11, element.src = "" is not sufficient as it
    // does not clear properly the current MediaKey Session.
    // Microsoft recommended to use element.removeAttr("src").
    element.removeAttribute("src");
}
exports.default = clearElementSrc;
