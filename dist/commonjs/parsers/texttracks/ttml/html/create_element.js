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
var add_class_name_1 = require("../../../../compat/add_class_name");
var is_non_empty_string_1 = require("../../../../utils/is_non_empty_string");
var object_assign_1 = require("../../../../utils/object_assign");
var get_styling_1 = require("../get_styling");
var xml_utils_1 = require("../xml_utils");
var apply_extent_1 = require("./apply_extent");
var apply_font_size_1 = require("./apply_font_size");
var apply_line_height_1 = require("./apply_line_height");
var apply_origin_1 = require("./apply_origin");
var apply_padding_1 = require("./apply_padding");
var generate_css_test_outline_1 = require("./generate_css_test_outline");
var ttml_color_to_css_color_1 = require("./ttml_color_to_css_color");
// Styling which can be applied to <span> from any level upper.
// Added here as an optimization
var SPAN_LEVEL_ATTRIBUTES = [
    "color",
    "direction",
    "display",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "textDecoration",
    "textOutline",
    "unicodeBidi",
    "visibility",
    "wrapOption",
];
// TODO
// tts:showBackground (applies to region)
// tts:zIndex (applies to region)
/**
 * Apply style set for a singular text span of the current cue.
 * @param {HTMLElement} element - The text span
 * @param {Object} style - The style to apply
 */
function applyTextStyle(element, style, shouldTrimWhiteSpace) {
    // applies to span
    var color = style.color;
    if ((0, is_non_empty_string_1.default)(color)) {
        element.style.color = (0, ttml_color_to_css_color_1.default)(color);
    }
    // applies to body, div, p, region, span
    var backgroundColor = style.backgroundColor;
    if ((0, is_non_empty_string_1.default)(backgroundColor)) {
        element.style.backgroundColor = (0, ttml_color_to_css_color_1.default)(backgroundColor);
    }
    // applies to span
    var textOutline = style.textOutline;
    if ((0, is_non_empty_string_1.default)(textOutline)) {
        var outlineData = textOutline.trim().replace(/\s+/g, " ").split(" ");
        var len = outlineData.length;
        if (len === 3) {
            var outlineColor = (0, ttml_color_to_css_color_1.default)(outlineData[0]);
            var thickness = outlineData[1];
            element.style.textShadow = (0, generate_css_test_outline_1.default)(outlineColor, thickness);
        }
        else if ((0, is_non_empty_string_1.default)(color) && len === 1) {
            var thickness = outlineData[0];
            element.style.textShadow = (0, generate_css_test_outline_1.default)(color, thickness);
        }
        else if (len === 2) {
            var isFirstArgAColor = /^[#A-Z]/i.test(outlineData[0]);
            var isFirstArgANumber = /^[0-9]/.test(outlineData[0]);
            // XOR-ing to be sure we get what we have
            if (isFirstArgAColor !== isFirstArgANumber) {
                if (isFirstArgAColor) {
                    var outlineColor = (0, ttml_color_to_css_color_1.default)(outlineData[0]);
                    var thickness = outlineData[1];
                    element.style.textShadow = (0, generate_css_test_outline_1.default)(outlineColor, thickness);
                }
                else if ((0, is_non_empty_string_1.default)(color)) {
                    var thickness = outlineData[0];
                    element.style.textShadow = (0, generate_css_test_outline_1.default)(color, thickness);
                }
            }
        }
    }
    // applies to span
    var textDecoration = style.textDecoration;
    if ((0, is_non_empty_string_1.default)(textDecoration)) {
        switch (textDecoration) {
            case "noUnderline":
            case "noLineThrough":
            case "noOverline":
                element.style.textDecoration = "none";
                break;
            case "lineThrough":
                element.style.textDecoration = "line-through";
                break;
            default:
                element.style.textDecoration = textDecoration;
                break;
        }
    }
    // applies to span
    var fontFamily = style.fontFamily;
    if ((0, is_non_empty_string_1.default)(fontFamily)) {
        switch (fontFamily) {
            case "proportionalSansSerif":
                element.style.fontFamily = "Arial, Helvetica, Liberation Sans, sans-serif";
                break;
            // TODO monospace or sans-serif or font with both?
            case "monospaceSansSerif":
            case "sansSerif":
                element.style.fontFamily = "sans-serif";
                break;
            case "monospaceSerif":
            case "default":
                element.style.fontFamily = "Courier New, Liberation Mono, monospace";
                break;
            // TODO font with both?
            case "proportionalSerif":
                element.style.fontFamily = "serif";
                break;
            default:
                element.style.fontFamily = fontFamily;
        }
    }
    // applies to span
    var fontStyle = style.fontStyle;
    if ((0, is_non_empty_string_1.default)(fontStyle)) {
        element.style.fontStyle = fontStyle;
    }
    // applies to span
    var fontWeight = style.fontWeight;
    if ((0, is_non_empty_string_1.default)(fontWeight)) {
        element.style.fontWeight = fontWeight;
    }
    // applies to span
    var fontSize = style.fontSize;
    if ((0, is_non_empty_string_1.default)(fontSize)) {
        (0, apply_font_size_1.default)(element, fontSize);
    }
    else {
        (0, add_class_name_1.default)(element, "proportional-style");
        element.setAttribute("data-proportional-font-size", "1");
    }
    // applies to p, span
    var direction = style.direction;
    if ((0, is_non_empty_string_1.default)(direction)) {
        element.style.direction = direction;
    }
    // applies to p, span
    var unicodeBidi = style.unicodeBidi;
    if ((0, is_non_empty_string_1.default)(unicodeBidi)) {
        switch (unicodeBidi) {
            case "bidiOverride":
                element.style.unicodeBidi = "bidi-override";
                break;
            case "embed":
                element.style.unicodeBidi = "embed";
                break;
            default:
                element.style.unicodeBidi = "normal";
        }
    }
    // applies to body, div, p, region, span
    var visibility = style.visibility;
    if ((0, is_non_empty_string_1.default)(visibility)) {
        element.style.visibility = visibility;
    }
    // applies to body, div, p, region, span
    var display = style.display;
    if (display === "none") {
        element.style.display = "none";
    }
    // applies to body, div, p, region, span
    var wrapOption = style.wrapOption;
    if (wrapOption === "noWrap") {
        if (shouldTrimWhiteSpace) {
            element.style.whiteSpace = "nowrap";
        }
        else {
            element.style.whiteSpace = "pre";
        }
    }
    else if (shouldTrimWhiteSpace) {
        element.style.whiteSpace = "normal";
    }
    else {
        element.style.whiteSpace = "pre-wrap";
    }
}
/**
 * Apply style for the general text track div.
 * @param {HTMLElement} element - The <div> the style will be applied on.
 * @param {Object} style - The general style object of the paragraph.
 */
function applyGeneralStyle(element, style) {
    // Set default text color. It can be overrided by text element color.
    element.style.color = "white";
    element.style.position = "absolute";
    // applies to tt, region
    var extent = style.extent;
    if ((0, is_non_empty_string_1.default)(extent)) {
        (0, apply_extent_1.default)(element, extent);
    }
    // applies to region
    var writingMode = style.writingMode;
    if ((0, is_non_empty_string_1.default)(writingMode)) {
        // TODO
    }
    // applies to region
    var overflow = style.overflow;
    element.style.overflow = (0, is_non_empty_string_1.default)(overflow) ? overflow : "hidden";
    // applies to region
    var padding = style.padding;
    if ((0, is_non_empty_string_1.default)(padding)) {
        (0, apply_padding_1.default)(element, padding);
    }
    // applies to region
    var origin = style.origin;
    if ((0, is_non_empty_string_1.default)(origin)) {
        (0, apply_origin_1.default)(element, origin);
    }
    // applies to region
    var displayAlign = style.displayAlign;
    if ((0, is_non_empty_string_1.default)(displayAlign)) {
        element.style.display = "flex";
        element.style.flexDirection = "column";
        switch (displayAlign) {
            case "before":
                element.style.justifyContent = "flex-start";
                break;
            case "center":
                element.style.justifyContent = "center";
                break;
            case "after":
                element.style.justifyContent = "flex-end";
                break;
        }
    }
    // applies to region
    var opacity = style.opacity;
    if ((0, is_non_empty_string_1.default)(opacity)) {
        element.style.opacity = opacity;
    }
    // applies to body, div, p, region, span
    var visibility = style.visibility;
    if ((0, is_non_empty_string_1.default)(visibility)) {
        element.style.visibility = visibility;
    }
    // applies to body, div, p, region, span
    var display = style.display;
    if (display === "none") {
        element.style.display = "none";
    }
}
/**
 * Apply style set for a <p> element
 * @param {HTMLElement} element - The <p> element
 * @param {Object} style - The general style object of the paragraph.
 */
function applyPStyle(element, style) {
    element.style.margin = "0px";
    // Set on it the default font-size, more specific font sizes may then be set
    // on children elements.
    // Doing this on the parent <p> elements seems to fix some CSS issues we had
    // with too large inner line breaks spacing when the text track element was
    // too small, for some reasons.
    (0, add_class_name_1.default)(element, "proportional-style");
    element.setAttribute("data-proportional-font-size", "1");
    // applies to body, div, p, region, span
    var paragraphBackgroundColor = style.backgroundColor;
    if ((0, is_non_empty_string_1.default)(paragraphBackgroundColor)) {
        element.style.backgroundColor = (0, ttml_color_to_css_color_1.default)(paragraphBackgroundColor);
    }
    // applies to p
    var lineHeight = style.lineHeight;
    if ((0, is_non_empty_string_1.default)(lineHeight)) {
        (0, apply_line_height_1.default)(element, lineHeight);
    }
    // applies to p
    var textAlign = style.textAlign;
    if ((0, is_non_empty_string_1.default)(textAlign)) {
        switch (textAlign) {
            case "center":
                element.style.textAlign = "center";
                break;
            case "left":
            case "start":
                // TODO check what start means (difference with left, writing direction?)
                element.style.textAlign = "left";
                break;
            case "right":
            case "end":
                // TODO check what end means (difference with right, writing direction?)
                element.style.textAlign = "right";
                break;
        }
    }
}
/**
 * Creates span of text for the given #text element, with the right style.
 *
 * TODO create text elements as string? Might help performances.
 * @param {Element} el - the #text element, which text content should be
 * displayed
 * @param {Object} style - the style object for the given text
 * @param {Boolean} shouldTrimWhiteSpace - True if the space should be
 * trimmed.
 * @returns {HTMLElement}
 */
function createTextElement(el, style, shouldTrimWhiteSpace) {
    var textElement = document.createElement("span");
    var textContent = el.textContent === null ? "" : el.textContent;
    if (shouldTrimWhiteSpace) {
        // 1. Trim leading and trailing whitespace.
        // 2. Collapse multiple spaces into one.
        var trimmed = textContent.trim();
        trimmed = trimmed.replace(/\s+/g, " ");
        textContent = trimmed;
    }
    var textNode = document.createTextNode(textContent);
    textElement.appendChild(textNode);
    textElement.className = "rxp-texttrack-span";
    applyTextStyle(textElement, style, shouldTrimWhiteSpace);
    return textElement;
}
/**
 * Generate every text elements to display in a given paragraph.
 * @param {Element} paragraph - The <p> tag.
 * @param {Array.<Object>} regions
 * @param {Array.<Object>} styles
 * @param {Object} paragraphStyle - The general style object of the paragraph.
 * @param {Boolean} shouldTrimWhiteSpace
 * @returns {Array.<HTMLElement>}
 */
function generateTextContent(paragraph, regions, styles, paragraphStyle, shouldTrimWhiteSpace) {
    /**
     * Recursive function, taking a node in argument and returning the
     * corresponding array of HTMLElement in order.
     * @param {Node} node - the node in question
     * @param {Object} style - the current state of the style for the node.
     * /!\ The style object can be mutated, provide a copy of it.
     * @param {Array.<Element>} spans - The spans parent of this node.
     * @param {Boolean} shouldTrimWhiteSpaceFromParent - True if the space should be
     * trimmed by default. From the parent xml:space parameter.
     * @returns {Array.<HTMLElement>}
     */
    function loop(node, style, spans, shouldTrimWhiteSpaceFromParent) {
        var childNodes = node.childNodes;
        var elements = [];
        for (var i = 0; i < childNodes.length; i++) {
            var currentNode = childNodes[i];
            if (currentNode.nodeName === "#text") {
                var backgroundColor = (0, get_styling_1.getStylingAttributes)(["backgroundColor"], spans, styles, regions).backgroundColor;
                if ((0, is_non_empty_string_1.default)(backgroundColor)) {
                    style.backgroundColor = backgroundColor;
                }
                else {
                    delete style.backgroundColor;
                }
                var el = createTextElement(currentNode, style, shouldTrimWhiteSpaceFromParent);
                elements.push(el);
            }
            else if ((0, xml_utils_1.isLineBreakElement)(currentNode)) {
                var br = document.createElement("BR");
                elements.push(br);
            }
            else if ((0, xml_utils_1.isSpanElement)(currentNode) &&
                currentNode.nodeType === Node.ELEMENT_NODE &&
                currentNode.childNodes.length > 0) {
                var spaceAttribute = currentNode.getAttribute("xml:space");
                var shouldTrimWhiteSpaceOnSpan = (0, is_non_empty_string_1.default)(spaceAttribute)
                    ? spaceAttribute === "default"
                    : shouldTrimWhiteSpaceFromParent;
                // compute the new applyable style
                var newStyle = (0, object_assign_1.default)({}, style, (0, get_styling_1.getStylingAttributes)(SPAN_LEVEL_ATTRIBUTES, [currentNode], styles, regions));
                elements.push.apply(elements, __spreadArray([], __read(loop(currentNode, newStyle, __spreadArray([currentNode], __read(spans), false), shouldTrimWhiteSpaceOnSpan)), false));
            }
        }
        return elements;
    }
    return loop(paragraph, (0, object_assign_1.default)({}, paragraphStyle), [], shouldTrimWhiteSpace);
}
/**
 * @param {Element} paragraph
 * @param {Element} body
 * @param {Array.<Object>} regions
 * @param {Array.<Object>} styles
 * @param {Object} paragraphStyle
 * @param {Object}
 * @returns {HTMLElement}
 */
function createElement(paragraph, body, regions, styles, paragraphStyle, _a) {
    var cellResolution = _a.cellResolution, shouldTrimWhiteSpace = _a.shouldTrimWhiteSpace;
    var divs = (0, xml_utils_1.getParentDivElements)(paragraph);
    var parentElement = document.createElement("DIV");
    parentElement.className = "rxp-texttrack-region";
    parentElement.setAttribute("data-resolution-columns", String(cellResolution.columns));
    parentElement.setAttribute("data-resolution-rows", String(cellResolution.rows));
    applyGeneralStyle(parentElement, paragraphStyle);
    if (body !== null) {
        // applies to body, div, p, region, span
        var bodyBackgroundColor = (0, get_styling_1.getStylingAttributes)(["backgroundColor"], __spreadArray(__spreadArray([], __read(divs), false), [body], false), styles, regions).bodyBackgroundColor;
        if ((0, is_non_empty_string_1.default)(bodyBackgroundColor)) {
            parentElement.style.backgroundColor = (0, ttml_color_to_css_color_1.default)(bodyBackgroundColor);
        }
    }
    var pElement = document.createElement("p");
    pElement.className = "rxp-texttrack-p";
    applyPStyle(pElement, paragraphStyle);
    var textContent = generateTextContent(paragraph, regions, styles, paragraphStyle, shouldTrimWhiteSpace);
    for (var i = 0; i < textContent.length; i++) {
        pElement.appendChild(textContent[i]);
    }
    // NOTE:
    // The following code is for the inclusion of div elements. This has no
    // advantage for now, and might only with future evolutions.
    // (This is only an indication of what the base of the code could look like).
    // if (divs.length) {
    //   let container = parentElement;
    //   for (let i = divs.length - 1; i >= 0; i--) {
    //     // TODO manage style at div level?
    //     // They are: visibility, display and backgroundColor
    //     // All these do not have any difference if applied to the <p> element
    //     // instead of the div.
    //     // The advantage might only be for multiple <p> elements dispatched
    //     // in multiple div Which we do not manage anyway for now.
    //     const divEl = document.createElement("DIV");
    //     divEl.className = "rxp-texttrack-div";
    //     container.appendChild(divEl);
    //     container = divEl;
    //   }
    //   container.appendChild(pElement);
    //   parentElement.appendChild(container);
    // } else {
    //   parentElement.appendChild(pElement);
    // }
    parentElement.appendChild(pElement);
    return parentElement;
}
exports.default = createElement;
