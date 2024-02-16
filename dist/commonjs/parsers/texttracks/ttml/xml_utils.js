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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSpanElement = exports.isLineBreakElement = exports.getTextNodes = exports.getRegionNodes = exports.getStyleNodes = exports.getBodyNode = exports.getAttributeInElements = exports.getParentDivElements = exports.getParentElementsByTagName = void 0;
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
/**
 * Returns the parent elements which have the given tagName, by order of
 * closeness relative to our element.
 * @param {Element|Node} element
 * @param {string} tagName
 * @returns {Array.<Element>}
 */
function getParentElementsByTagName(element, tagName) {
    if (!(element.parentNode instanceof Element)) {
        return [];
    }
    function constructArray(_element) {
        var elements = [];
        if (_element.tagName.toLowerCase() === tagName.toLowerCase()) {
            elements.push(_element);
        }
        var parentNode = _element.parentNode;
        if (parentNode instanceof Element) {
            elements.push.apply(elements, __spreadArray([], __read(constructArray(parentNode)), false));
        }
        return elements;
    }
    return constructArray(element.parentNode);
}
exports.getParentElementsByTagName = getParentElementsByTagName;
/**
 * Returns the parent elements which have the given tagName, by order of
 * closeness relative to our element.
 * @param {Element|Node} element
 * @returns {Array.<Element>}
 */
function getParentDivElements(element) {
    var divs = getParentElementsByTagName(element, "div");
    if (divs.length === 0) {
        var ttDivs = getParentElementsByTagName(element, "tt:div");
        if (ttDivs.length > 0) {
            divs = ttDivs;
        }
    }
    return divs;
}
exports.getParentDivElements = getParentDivElements;
/**
 * Returns the first notion of the attribute encountered in the list of elemnts
 * given.
 * @param {string} attribute
 * @param {Array.<Element>} elements
 * @returns {string|undefined}
 */
function getAttributeInElements(attribute, elements) {
    for (var i = 0; i <= elements.length - 1; i++) {
        var element = elements[i];
        if (element !== undefined) {
            var directAttrValue = element.getAttribute(attribute);
            if (!(0, is_null_or_undefined_1.default)(directAttrValue)) {
                return directAttrValue;
            }
        }
    }
}
exports.getAttributeInElements = getAttributeInElements;
/**
 * @param {Element} tt
 * @returns {Element}
 */
function getBodyNode(tt) {
    var bodyNodes = tt.getElementsByTagName("body");
    if (bodyNodes.length > 0) {
        return bodyNodes[0];
    }
    var namespacedBodyNodes = tt.getElementsByTagName("tt:body");
    if (namespacedBodyNodes.length > 0) {
        return namespacedBodyNodes[0];
    }
    return null;
}
exports.getBodyNode = getBodyNode;
/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getStyleNodes(tt) {
    var styleNodes = tt.getElementsByTagName("style");
    if (styleNodes.length > 0) {
        return styleNodes;
    }
    var namespacedStyleNodes = tt.getElementsByTagName("tt:style");
    if (namespacedStyleNodes.length > 0) {
        return namespacedStyleNodes;
    }
    return styleNodes;
}
exports.getStyleNodes = getStyleNodes;
/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getRegionNodes(tt) {
    var regionNodes = tt.getElementsByTagName("region");
    if (regionNodes.length > 0) {
        return regionNodes;
    }
    var namespacedRegionNodes = tt.getElementsByTagName("tt:region");
    if (namespacedRegionNodes.length > 0) {
        return namespacedRegionNodes;
    }
    return regionNodes;
}
exports.getRegionNodes = getRegionNodes;
/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getTextNodes(tt) {
    var pNodes = tt.getElementsByTagName("p");
    if (pNodes.length > 0) {
        return pNodes;
    }
    var namespacedPNodes = tt.getElementsByTagName("tt:p");
    if (namespacedPNodes.length > 0) {
        return namespacedPNodes;
    }
    return pNodes;
}
exports.getTextNodes = getTextNodes;
/**
 * Returns true if the given node corresponds to a TTML line break element.
 * @param {Node} node
 * @returns {boolean}
 */
function isLineBreakElement(node) {
    return node.nodeName === "br" || node.nodeName === "tt:br";
}
exports.isLineBreakElement = isLineBreakElement;
/**
 * Returns true if the given node corresponds to a TTML span element.
 * @param {Node} node
 * @returns {boolean}
 */
function isSpanElement(node) {
    return node.nodeName === "span" || node.nodeName === "tt:span";
}
exports.isSpanElement = isSpanElement;
