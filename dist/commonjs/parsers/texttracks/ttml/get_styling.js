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
exports.getStylingFromElement = exports.getStylingAttributes = void 0;
var array_find_1 = require("../../../utils/array_find");
var array_includes_1 = require("../../../utils/array_includes");
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var starts_with_1 = require("../../../utils/starts_with");
/**
 * Retrieve the attributes given in arguments in the given nodes and their
 * associated style(s)/region.
 * The first notion of the attribute encountered will be taken (by looping
 * through the given nodes in order).
 *
 * TODO manage IDREFS (plural) for styles and regions, that is, multiple one
 * @param {Array.<string>} attributes
 * @param {Array.<Node>} nodes
 * @param {Array.<Object>} styles
 * @param {Array.<Object>} regions
 * @returns {Object}
 */
function getStylingAttributes(attributes, nodes, styles, regions) {
    var currentStyle = {};
    var leftAttributes = attributes.slice();
    var _loop_1 = function (i) {
        var node = nodes[i];
        if (node !== undefined) {
            var styleID_1;
            var regionID_1;
            // 1. the style is directly set on a "tts:" attribute
            if (node.nodeType === Node.ELEMENT_NODE) {
                var element = node;
                for (var j = 0; j <= element.attributes.length - 1; j++) {
                    var attribute = element.attributes[j];
                    var name_1 = attribute.name;
                    if (name_1 === "style") {
                        styleID_1 = attribute.value;
                    }
                    else if (name_1 === "region") {
                        regionID_1 = attribute.value;
                    }
                    else {
                        var nameWithoutTTS = name_1.substring(4);
                        if ((0, array_includes_1.default)(leftAttributes, nameWithoutTTS)) {
                            currentStyle[nameWithoutTTS] = attribute.value;
                            leftAttributes.splice(j, 1);
                            if (leftAttributes.length === 0) {
                                return { value: currentStyle };
                            }
                        }
                    }
                }
            }
            // 2. the style is referenced on a "style" attribute
            if ((0, is_non_empty_string_1.default)(styleID_1)) {
                var style = (0, array_find_1.default)(styles, function (x) { return x.id === styleID_1; });
                if (style !== undefined) {
                    for (var j = 0; j <= leftAttributes.length - 1; j++) {
                        var attribute = leftAttributes[j];
                        if (!(0, is_non_empty_string_1.default)(currentStyle[attribute])) {
                            if ((0, is_non_empty_string_1.default)(style.style[attribute])) {
                                currentStyle[attribute] = style.style[attribute];
                                leftAttributes.splice(j, 1);
                                if (leftAttributes.length === 0) {
                                    return { value: currentStyle };
                                }
                                j--;
                            }
                        }
                    }
                }
            }
            // 3. the node reference a region (which can have a value for the
            //    corresponding style)
            if ((0, is_non_empty_string_1.default)(regionID_1)) {
                var region = (0, array_find_1.default)(regions, function (x) { return x.id === regionID_1; });
                if (region !== undefined) {
                    for (var j = 0; j <= leftAttributes.length - 1; j++) {
                        var attribute = leftAttributes[j];
                        if (!(0, is_non_empty_string_1.default)(currentStyle[attribute])) {
                            if ((0, is_non_empty_string_1.default)(region.style[attribute])) {
                                currentStyle[attribute] = region.style[attribute];
                                leftAttributes.splice(j, 1);
                                if (leftAttributes.length === 0) {
                                    return { value: currentStyle };
                                }
                                j--;
                            }
                        }
                    }
                }
            }
        }
    };
    for (var i = 0; i <= nodes.length - 1; i++) {
        var state_1 = _loop_1(i);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    return currentStyle;
}
exports.getStylingAttributes = getStylingAttributes;
/**
 * Returns the styling directly linked to an element.
 * @param {Node} node
 * @returns {Object}
 */
function getStylingFromElement(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return {};
    }
    var element = node;
    var currentStyle = {};
    for (var i = 0; i <= element.attributes.length - 1; i++) {
        var styleAttribute = element.attributes[i];
        if ((0, starts_with_1.default)(styleAttribute.name, "tts")) {
            var nameWithoutTTS = styleAttribute.name.substring(4);
            currentStyle[nameWithoutTTS] = styleAttribute.value;
        }
    }
    return currentStyle;
}
exports.getStylingFromElement = getStylingFromElement;
