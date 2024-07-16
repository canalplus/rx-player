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
var object_assign_1 = require("../../../../../utils/object_assign");
var SegmentBase_1 = require("./SegmentBase");
var SegmentTimeline_1 = require("./SegmentTimeline");
var utils_1 = require("./utils");
/**
 * Parse a SegmentTemplate element into a SegmentTemplate intermediate
 * representation.
 * @param {Object} root - The SegmentTemplate root element.
 * @returns {Array}
 */
function parseSegmentTemplate(root) {
    var e_1, _a;
    var _b = __read((0, SegmentBase_1.default)(root), 2), base = _b[0], segmentBaseWarnings = _b[1];
    var warnings = segmentBaseWarnings;
    var timelineParser;
    // First look for a possible SegmentTimeline
    for (var i = 0; i < root.children.length; i++) {
        var currentNode = root.children[i];
        if (typeof currentNode !== "string" && currentNode.tagName === "SegmentTimeline") {
            timelineParser = (0, SegmentTimeline_1.default)(currentNode);
        }
    }
    var ret = (0, object_assign_1.default)({}, base, {
        duration: base.duration,
        timelineParser: timelineParser,
    });
    var parseValue = (0, utils_1.ValueParser)(ret, warnings);
    try {
        for (var _c = __values(Object.keys(root.attributes)), _d = _c.next(); !_d.done; _d = _c.next()) {
            var attributeName = _d.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "initialization":
                    if ((0, is_null_or_undefined_1.default)(ret.initialization)) {
                        ret.initialization = { media: attributeVal };
                    }
                    break;
                case "index":
                    ret.index = attributeVal;
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
                case "media":
                    ret.media = attributeVal;
                    break;
                case "bitstreamSwitching":
                    parseValue(attributeVal, {
                        asKey: "bitstreamSwitching",
                        parser: utils_1.parseBoolean,
                        dashName: "bitstreamSwitching",
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
    return [ret, warnings];
}
exports.default = parseSegmentTemplate;
