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
var create_styled_element_1 = require("./create_styled_element");
/**
 * @param {string} text
 * @param {Array.<Object>} styleElements
 * @returns {Array.<HTMLElement>}
 */
function convertPayloadToHTML(text, styleElements) {
    var filteredText = text
        // Remove timestamp tags
        .replace(/<[0-9]{2}:[0-9]{2}.[0-9]{3}>/, "")
        // Remove tag content or attributes (e.g. <b dfgfdg> => <b>)
        .replace(/<([u,i,b,c])(\..*?)?(?: .*?)?>(.*?)<\/\1>/g, "<$1$2>$3</$1$2>");
    var parsedWebVTT = new DOMParser().parseFromString(filteredText, "text/html");
    var nodes = parsedWebVTT.body.childNodes;
    var styledElements = [];
    for (var i = 0; i < nodes.length; i++) {
        styledElements.push((0, create_styled_element_1.default)(nodes[i], styleElements));
    }
    return styledElements;
}
exports.default = convertPayloadToHTML;
