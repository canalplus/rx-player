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
var Initialization_1 = require("./Initialization");
var utils_1 = require("./utils");
/**
 * Parse a SegmentBase element into a SegmentBase intermediate representation.
 * @param {Element} root - The SegmentBase root element.
 * @returns {Array}
 */
function parseSegmentBase(root) {
    var attributes = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(attributes, warnings);
    var segmentBaseChildren = root.childNodes;
    for (var i = 0; i < segmentBaseChildren.length; i++) {
        if (segmentBaseChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentNode = segmentBaseChildren[i];
            if (currentNode.nodeName === "Initialization") {
                var _a = __read((0, Initialization_1.default)(currentNode), 2), initialization = _a[0], initializationWarnings = _a[1];
                attributes.initialization = initialization;
                warnings = warnings.concat(initializationWarnings);
            }
        }
    }
    for (var i = 0; i < root.attributes.length; i++) {
        var attr = root.attributes[i];
        switch (attr.name) {
            case "timescale":
                parseValue(attr.value, {
                    asKey: "timescale",
                    parser: utils_1.parseMPDInteger,
                    dashName: "timescale",
                });
                break;
            case "presentationTimeOffset":
                parseValue(attr.value, {
                    asKey: "presentationTimeOffset",
                    parser: utils_1.parseMPDFloat,
                    dashName: "presentationTimeOffset",
                });
                break;
            case "indexRange":
                parseValue(attr.value, {
                    asKey: "indexRange",
                    parser: utils_1.parseByteRange,
                    dashName: "indexRange",
                });
                break;
            case "indexRangeExact":
                parseValue(attr.value, {
                    asKey: "indexRangeExact",
                    parser: utils_1.parseBoolean,
                    dashName: "indexRangeExact",
                });
                break;
            case "availabilityTimeOffset":
                parseValue(attr.value, {
                    asKey: "availabilityTimeOffset",
                    parser: utils_1.parseMPDFloat,
                    dashName: "availabilityTimeOffset",
                });
                break;
            case "availabilityTimeComplete":
                parseValue(attr.value, {
                    asKey: "availabilityTimeComplete",
                    parser: utils_1.parseBoolean,
                    dashName: "availabilityTimeComplete",
                });
                break;
            case "duration":
                parseValue(attr.value, {
                    asKey: "duration",
                    parser: utils_1.parseMPDInteger,
                    dashName: "duration",
                });
                break;
            case "startNumber":
                parseValue(attr.value, {
                    asKey: "startNumber",
                    parser: utils_1.parseMPDInteger,
                    dashName: "startNumber",
                });
                break;
            case "endNumber":
                parseValue(attr.value, {
                    asKey: "endNumber",
                    parser: utils_1.parseMPDInteger,
                    dashName: "endNumber",
                });
                break;
        }
    }
    return [attributes, warnings];
}
exports.default = parseSegmentBase;
