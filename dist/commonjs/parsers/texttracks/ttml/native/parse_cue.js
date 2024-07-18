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
var is_vtt_cue_1 = require("../../../../compat/is_vtt_cue");
var make_vtt_cue_1 = require("../../../../compat/make_vtt_cue");
var is_non_empty_string_1 = require("../../../../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var get_time_delimiters_1 = require("../get_time_delimiters");
var regexps_1 = require("../regexps");
var xml_utils_1 = require("../xml_utils");
var TEXT_ALIGN_TO_LIGN_ALIGN = {
    left: "start",
    center: "center",
    right: "end",
    start: "start",
    end: "end",
};
/**
 * @type {Object}
 */
var TEXT_ALIGN_TO_POSITION_ALIGN = {
    left: "line-left",
    center: "center",
    right: "line-right",
};
/**
 * Parses an Element into a TextTrackCue or VTTCue.
 * /!\ Mutates the given cueElement Element
 * @param {Element} paragraph
 * @param {Number} offset
 * @param {Array.<Object>} styles
 * @param {Array.<Object>} regions
 * @param {Object} paragraphStyle
 * @param {Object} ttParams
 * @param {Boolean} shouldTrimWhiteSpace
 * @returns {TextTrackCue|null}
 */
function parseCue(parsedCue) {
    var paragraph = parsedCue.paragraph, timeOffset = parsedCue.timeOffset, paragraphStyle = parsedCue.paragraphStyle, ttParams = parsedCue.ttParams, shouldTrimWhiteSpace = parsedCue.shouldTrimWhiteSpace;
    // Disregard empty elements:
    // TTML allows for empty elements like <div></div>.
    // If paragraph has neither time attributes, nor
    // non-whitespace text, don't try to make a cue out of it.
    if (!paragraph.hasAttribute("begin") &&
        !paragraph.hasAttribute("end") &&
        /^\s*$/.test(paragraph.textContent === null ? "" : paragraph.textContent)) {
        return null;
    }
    var _a = (0, get_time_delimiters_1.default)(paragraph, ttParams), start = _a.start, end = _a.end;
    var text = generateTextContent(paragraph, shouldTrimWhiteSpace);
    var cue = (0, make_vtt_cue_1.default)(start + timeOffset, end + timeOffset, text);
    if (cue === null) {
        return null;
    }
    if ((0, is_vtt_cue_1.default)(cue)) {
        addStyle(cue, paragraphStyle);
    }
    return cue;
}
exports.default = parseCue;
/**
 * Generate text to display for a given paragraph.
 * @param {Element} paragraph - The <p> tag.
 * @param {Boolean} shouldTrimWhiteSpaceForParagraph
 * @returns {string}
 */
function generateTextContent(paragraph, shouldTrimWhiteSpaceForParagraph) {
    /**
     * Recursive function, taking a node in argument and returning the
     * corresponding string.
     * @param {Node} node - the node in question
     * @returns {string}
     */
    function loop(node, shouldTrimWhiteSpaceFromParent) {
        var childNodes = node.childNodes;
        var text = "";
        for (var i = 0; i < childNodes.length; i++) {
            var currentNode = childNodes[i];
            if (currentNode.nodeName === "#text") {
                var textContent = currentNode.textContent;
                if (textContent === null) {
                    textContent = "";
                }
                if (shouldTrimWhiteSpaceFromParent) {
                    // 1. Trim leading and trailing whitespace.
                    // 2. Collapse multiple spaces into one.
                    var trimmed = textContent.trim();
                    trimmed = trimmed.replace(/\s+/g, " ");
                    textContent = trimmed;
                }
                // DOM Parser turns HTML escape caracters into caracters,
                // that may be misinterpreted by VTTCue API (typically, less-than sign
                // and greater-than sign can be interpreted as HTML tags signs).
                // Original escaped caracters must be conserved.
                var escapedTextContent = textContent
                    .replace(/&|\u0026/g, "&amp;")
                    .replace(/<|\u003C/g, "&lt;")
                    .replace(/>|\u2265/g, "&gt;")
                    .replace(/\u200E/g, "&lrm;")
                    .replace(/\u200F/g, "&rlm;")
                    .replace(/\u00A0/g, "&nbsp;");
                text += escapedTextContent;
            }
            else if ((0, xml_utils_1.isLineBreakElement)(currentNode)) {
                text += "\n";
            }
            else if ((0, xml_utils_1.isSpanElement)(currentNode) &&
                currentNode.nodeType === Node.ELEMENT_NODE &&
                currentNode.childNodes.length > 0) {
                var spaceAttribute = currentNode.getAttribute("xml:space");
                var shouldTrimWhiteSpaceForSpan = (0, is_non_empty_string_1.default)(spaceAttribute)
                    ? spaceAttribute === "default"
                    : shouldTrimWhiteSpaceFromParent;
                text += loop(currentNode, shouldTrimWhiteSpaceForSpan);
            }
        }
        return text;
    }
    return loop(paragraph, shouldTrimWhiteSpaceForParagraph);
}
/**
 * Adds applicable style properties to a cue.
 * /!\ Mutates cue argument.
 * @param {VTTCue} cue
 * @param {Object} style
 */
function addStyle(cue, style) {
    var extent = style.extent;
    if ((0, is_non_empty_string_1.default)(extent)) {
        var results = regexps_1.REGXP_PERCENT_VALUES.exec(extent);
        if (!(0, is_null_or_undefined_1.default)(results)) {
            // Use width value of the extent attribute for size.
            // Height value is ignored.
            cue.size = Number(results[1]);
        }
    }
    var writingMode = style.writingMode;
    // let isVerticalText = true;
    switch (writingMode) {
        case "tb":
        case "tblr":
            cue.vertical = "lr";
            break;
        case "tbrl":
            cue.vertical = "rl";
            break;
        default:
            // isVerticalText = false;
            break;
    }
    var origin = style.origin;
    if ((0, is_non_empty_string_1.default)(origin)) {
        var results = regexps_1.REGXP_PERCENT_VALUES.exec(origin);
        if (!(0, is_null_or_undefined_1.default)(results)) {
            // for vertical text use first coordinate of tts:origin
            // to represent line of the cue and second - for position.
            // Otherwise (horizontal), use them the other way around.
            // if (isVerticalText) {
            // TODO check and uncomment
            // cue.position = Number(results[2]);
            // cue.line = Number(results[1]);
            // } else {
            // TODO check and uncomment
            // cue.position = Number(results[1]);
            // cue.line = Number(results[2]);
            // }
            // A boolean indicating whether the line is an integer
            // number of lines (using the line dimensions of the first
            // line of the cue), or whether it is a percentage of the
            // dimension of the video. The flag is set to true when lines
            // are counted, and false otherwise.
            // TODO check and uncomment
            // cue.snapToLines = false;
        }
    }
    var align = style.align;
    if ((0, is_non_empty_string_1.default)(align)) {
        cue.align = align;
        if (align === "center") {
            if (cue.align !== "center") {
                // Workaround for a Chrome bug http://crbug.com/663797
                // Chrome does not support align = "center"
                cue.align = "middle";
            }
            cue.position = "auto";
        }
        var positionAlign = TEXT_ALIGN_TO_POSITION_ALIGN[align];
        cue.positionAlign = positionAlign === undefined ? "" : positionAlign;
        var lineAlign = TEXT_ALIGN_TO_LIGN_ALIGN[align];
        cue.lineAlign = lineAlign === undefined ? "" : lineAlign;
    }
}
