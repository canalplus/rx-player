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
Object.defineProperty(exports, "__esModule", { value: true });
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var object_assign_1 = require("../../../../../utils/object_assign");
var SegmentBase_1 = require("./SegmentBase");
var SegmentTimeline_1 = require("./SegmentTimeline");
var utils_1 = require("./utils");
/**
 * Parse a SegmentTemplate element into a SegmentTemplate intermediate
 * representation.
 * @param {Element} root - The SegmentTemplate root element.
 * @returns {Array}
 */
function parseSegmentTemplate(root) {
    var _a = __read((0, SegmentBase_1.default)(root), 2), base = _a[0], segmentBaseWarnings = _a[1];
    var warnings = segmentBaseWarnings;
    var timelineParser;
    // First look for a possible SegmentTimeline
    for (var i = 0; i < root.childNodes.length; i++) {
        if (root.childNodes[i].nodeType === Node.ELEMENT_NODE) {
            var currentNode = root.childNodes[i];
            if (currentNode.nodeName === "SegmentTimeline") {
                timelineParser = (0, SegmentTimeline_1.default)(currentNode);
            }
        }
    }
    var ret = (0, object_assign_1.default)({}, base, {
        duration: base.duration,
        timelineParser: timelineParser,
    });
    var parseValue = (0, utils_1.ValueParser)(ret, warnings);
    for (var i = 0; i < root.attributes.length; i++) {
        var attribute = root.attributes[i];
        switch (attribute.nodeName) {
            case "initialization":
                if ((0, is_null_or_undefined_1.default)(ret.initialization)) {
                    ret.initialization = { media: attribute.value };
                }
                break;
            case "index":
                ret.index = attribute.value;
                break;
            case "availabilityTimeOffset":
                parseValue(attribute.value, {
                    asKey: "availabilityTimeOffset",
                    parser: utils_1.parseMPDFloat,
                    dashName: "availabilityTimeOffset",
                });
                break;
            case "availabilityTimeComplete":
                parseValue(attribute.value, {
                    asKey: "availabilityTimeComplete",
                    parser: utils_1.parseBoolean,
                    dashName: "availabilityTimeComplete",
                });
                break;
            case "media":
                ret.media = attribute.value;
                break;
            case "bitstreamSwitching":
                parseValue(attribute.value, {
                    asKey: "bitstreamSwitching",
                    parser: utils_1.parseBoolean,
                    dashName: "bitstreamSwitching",
                });
                break;
        }
    }
    return [ret, warnings];
}
exports.default = parseSegmentTemplate;
