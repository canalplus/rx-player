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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var Initialization_1 = require("./Initialization");
var utils_1 = require("./utils");
/**
 * Parse a SegmentBase element into a SegmentBase intermediate representation.
 * @param {Object} root - The SegmentBase root element.
 * @returns {Array}
 */
function parseSegmentBase(root) {
    var e_1, _a;
    var attributes = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(attributes, warnings);
    var segmentBaseChildren = root.children;
    for (var i = 0; i < segmentBaseChildren.length; i++) {
        var currentNode = segmentBaseChildren[i];
        if (typeof currentNode !== "string") {
            if (currentNode.tagName === "Initialization") {
                var _b = __read((0, Initialization_1.default)(currentNode), 2), initialization = _b[0], initializationWarnings = _b[1];
                attributes.initialization = initialization;
                warnings = warnings.concat(initializationWarnings);
            }
        }
    }
    try {
        for (var _c = __values(Object.keys(root.attributes)), _d = _c.next(); !_d.done; _d = _c.next()) {
            var attributeName = _d.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "timescale":
                    parseValue(attributeVal, {
                        asKey: "timescale",
                        parser: utils_1.parseMPDInteger,
                        dashName: "timescale",
                    });
                    break;
                case "presentationTimeOffset":
                    parseValue(attributeVal, {
                        asKey: "presentationTimeOffset",
                        parser: utils_1.parseMPDFloat,
                        dashName: "presentationTimeOffset",
                    });
                    break;
                case "indexRange":
                    parseValue(attributeVal, {
                        asKey: "indexRange",
                        parser: utils_1.parseByteRange,
                        dashName: "indexRange",
                    });
                    break;
                case "indexRangeExact":
                    parseValue(attributeVal, {
                        asKey: "indexRangeExact",
                        parser: utils_1.parseBoolean,
                        dashName: "indexRangeExact",
                    });
                    break;
                case "availabilityTimeOffset":
                    parseValue(attributeVal, {
                        asKey: "availabilityTimeOffset",
                        parser: utils_1.parseMPDFloat,
                        dashName: "availabilityTimeOffset",
                    });
                    break;
                case "availabilityTimeComplete":
                    parseValue(attributeVal, {
                        asKey: "availabilityTimeComplete",
                        parser: utils_1.parseBoolean,
                        dashName: "availabilityTimeComplete",
                    });
                    break;
                case "duration":
                    parseValue(attributeVal, {
                        asKey: "duration",
                        parser: utils_1.parseMPDInteger,
                        dashName: "duration",
                    });
                    break;
                case "startNumber":
                    parseValue(attributeVal, {
                        asKey: "startNumber",
                        parser: utils_1.parseMPDInteger,
                        dashName: "startNumber",
                    });
                    break;
                case "endNumber":
                    parseValue(attributeVal, {
                        asKey: "endNumber",
                        parser: utils_1.parseMPDInteger,
                        dashName: "endNumber",
                    });
                    break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return [attributes, warnings];
}
exports.default = parseSegmentBase;
