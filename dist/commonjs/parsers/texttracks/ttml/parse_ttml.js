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
var array_find_1 = require("../../../utils/array_find");
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var object_assign_1 = require("../../../utils/object_assign");
var get_parameters_1 = require("./get_parameters");
var get_styling_1 = require("./get_styling");
var resolve_styles_inheritance_1 = require("./resolve_styles_inheritance");
var xml_utils_1 = require("./xml_utils");
var STYLE_ATTRIBUTES = [
    "align",
    "backgroundColor",
    "color",
    "direction",
    "display",
    "displayAlign",
    "extent",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "lineHeight",
    "opacity",
    "origin",
    "overflow",
    "padding",
    "textAlign",
    "textDecoration",
    "textOutline",
    "unicodeBidi",
    "visibility",
    "wrapOption",
    "writingMode",
    // Not managed anywhere for now
    // "showBackground",
    // "zIndex",
];
/**
 * Create array of objects which should represent the given TTML text track.
 * TODO TTML parsing is still pretty heavy on the CPU.
 * Optimizations have been done, principally to avoid using too much XML APIs,
 * but we can still do better.
 * @param {string} str
 * @param {Number} timeOffset
 * @returns {Array.<Object>}
 */
function parseTTMLString(str, timeOffset) {
    var cues = [];
    var xml = new DOMParser().parseFromString(str, "text/xml");
    if (xml !== null && xml !== undefined) {
        var tts = xml.getElementsByTagName("tt");
        var tt = tts[0];
        if (tt === undefined) {
            // EBU-TT sometimes namespaces tt, by "tt:"
            // Just catch all namespaces to play it safe
            var namespacedTT = xml.getElementsByTagNameNS("*", "tt");
            tt = namespacedTT[0];
            if (tt === undefined) {
                throw new Error("invalid XML");
            }
        }
        var body = (0, xml_utils_1.getBodyNode)(tt);
        var styleNodes = (0, xml_utils_1.getStyleNodes)(tt);
        var regionNodes = (0, xml_utils_1.getRegionNodes)(tt);
        var paragraphNodes = (0, xml_utils_1.getTextNodes)(tt);
        var ttParams = (0, get_parameters_1.default)(tt);
        // construct idStyles array based on the xml as an optimization
        var idStyles = [];
        for (var i = 0; i <= styleNodes.length - 1; i++) {
            var styleNode = styleNodes[i];
            if (styleNode instanceof Element) {
                var styleID = styleNode.getAttribute("xml:id");
                if (styleID !== null) {
                    var subStyles = styleNode.getAttribute("style");
                    var extendsStyles = subStyles === null ? [] : subStyles.split(" ");
                    idStyles.push({
                        id: styleID,
                        style: (0, get_styling_1.getStylingFromElement)(styleNode),
                        extendsStyles: extendsStyles,
                    });
                }
            }
        }
        (0, resolve_styles_inheritance_1.default)(idStyles);
        // construct regionStyles array based on the xml as an optimization
        var regionStyles = [];
        var _loop_1 = function (i) {
            var regionNode = regionNodes[i];
            if (regionNode instanceof Element) {
                var regionID = regionNode.getAttribute("xml:id");
                if (regionID !== null) {
                    var regionStyle = (0, get_styling_1.getStylingFromElement)(regionNode);
                    var associatedStyleID_1 = regionNode.getAttribute("style");
                    if ((0, is_non_empty_string_1.default)(associatedStyleID_1)) {
                        var style = (0, array_find_1.default)(idStyles, function (x) { return x.id === associatedStyleID_1; });
                        if (style !== undefined) {
                            regionStyle = (0, object_assign_1.default)({}, style.style, regionStyle);
                        }
                    }
                    regionStyles.push({
                        id: regionID,
                        style: regionStyle,
                        // already handled
                        extendsStyles: [],
                    });
                }
            }
        };
        for (var i = 0; i <= regionNodes.length - 1; i++) {
            _loop_1(i);
        }
        // Computing the style takes a lot of ressources.
        // To avoid too much re-computation, let's compute the body style right
        // now and do the rest progressively.
        // TODO Compute corresponding CSS style here (as soon as we now the TTML
        // style) to speed up the process even more.
        var bodyStyle = (0, get_styling_1.getStylingAttributes)(STYLE_ATTRIBUTES, body !== null ? [body] : [], idStyles, regionStyles);
        var bodySpaceAttribute = body !== null ? body.getAttribute("xml:space") : undefined;
        var shouldTrimWhiteSpaceOnBody = bodySpaceAttribute === "default" || ttParams.spaceStyle === "default";
        for (var i = 0; i < paragraphNodes.length; i++) {
            var paragraph = paragraphNodes[i];
            if (paragraph instanceof Element) {
                var divs = (0, xml_utils_1.getParentDivElements)(paragraph);
                var paragraphStyle = (0, object_assign_1.default)({}, bodyStyle, (0, get_styling_1.getStylingAttributes)(STYLE_ATTRIBUTES, __spreadArray([paragraph], __read(divs), false), idStyles, regionStyles));
                var paragraphSpaceAttribute = paragraph.getAttribute("xml:space");
                var shouldTrimWhiteSpace = (0, is_non_empty_string_1.default)(paragraphSpaceAttribute)
                    ? paragraphSpaceAttribute === "default"
                    : shouldTrimWhiteSpaceOnBody;
                var cue = {
                    paragraph: paragraph,
                    timeOffset: timeOffset,
                    idStyles: idStyles,
                    regionStyles: regionStyles,
                    body: body,
                    paragraphStyle: paragraphStyle,
                    ttParams: ttParams,
                    shouldTrimWhiteSpace: shouldTrimWhiteSpace,
                };
                if (cue !== null) {
                    cues.push(cue);
                }
            }
        }
    }
    return cues;
}
exports.default = parseTTMLString;
