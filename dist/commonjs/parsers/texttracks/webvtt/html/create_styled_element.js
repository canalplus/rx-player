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
var array_includes_1 = require("../../../../utils/array_includes");
var is_non_empty_string_1 = require("../../../../utils/is_non_empty_string");
/**
 * Construct an HTMLElement/TextNode representing the given node and apply
 * the right styling on it.
 * @param {Node} baseNode
 * @param {Array.<Object>} styleElements
 * @param {Array.<string>} styleClasses
 * @returns {Node}
 */
function createStyledElement(baseNode, styleElements) {
    var HTMLTags = ["u", "i", "b"];
    var authorizedNodeNames = ["u", "i", "b", "c", "#text"];
    var mainNodeName = baseNode.nodeName.toLowerCase().split(".")[0];
    var nodeWithStyle;
    if ((0, array_includes_1.default)(authorizedNodeNames, mainNodeName)) {
        if (mainNodeName === "#text") {
            var linifiedText = baseNode.wholeText.split("\n");
            nodeWithStyle = document.createElement("span");
            for (var i = 0; i < linifiedText.length; i++) {
                if (i > 0) {
                    nodeWithStyle.appendChild(document.createElement("br"));
                }
                if (linifiedText[i].length > 0) {
                    var textNode = document.createTextNode(linifiedText[i]);
                    nodeWithStyle.appendChild(textNode);
                }
            }
        }
        else {
            var nodeClasses = baseNode.nodeName.toLowerCase().split(".");
            var styleContents_1 = [];
            nodeClasses.forEach(function (nodeClass) {
                if ((0, is_non_empty_string_1.default)(styleElements[nodeClass])) {
                    styleContents_1.push(styleElements[nodeClass]);
                }
            });
            if (styleContents_1.length !== 0) {
                // If style must be applied
                var attr_1 = document.createAttribute("style");
                styleContents_1.forEach(function (styleContent) {
                    attr_1.value += styleContent;
                });
                var nameClass = (0, array_includes_1.default)(HTMLTags, mainNodeName) ? mainNodeName : "span";
                nodeWithStyle = document.createElement(nameClass);
                nodeWithStyle.setAttributeNode(attr_1);
            }
            else {
                // If style mustn't be applied. Rebuild element with tag name
                var elementTag = !(0, array_includes_1.default)(HTMLTags, mainNodeName) ? "span" : mainNodeName;
                nodeWithStyle = document.createElement(elementTag);
            }
            for (var j = 0; j < baseNode.childNodes.length; j++) {
                var child = createStyledElement(baseNode.childNodes[j], styleElements);
                nodeWithStyle.appendChild(child);
            }
        }
    }
    else {
        nodeWithStyle = document.createElement("span");
        for (var j = 0; j < baseNode.childNodes.length; j++) {
            var child = createStyledElement(baseNode.childNodes[j], styleElements);
            nodeWithStyle.appendChild(child);
        }
    }
    return nodeWithStyle;
}
exports.default = createStyledElement;
