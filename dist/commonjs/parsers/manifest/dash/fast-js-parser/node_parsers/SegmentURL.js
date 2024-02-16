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
var utils_1 = require("./utils");
/**
 * Parse a SegmentURL element into a SegmentURL intermediate
 * representation.
 * @param {Object} root - The SegmentURL root element.
 * @returns {Array}
 */
function parseSegmentURL(root) {
    var e_1, _a;
    var parsedSegmentURL = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(parsedSegmentURL, warnings);
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "media":
                    parsedSegmentURL.media = attributeVal;
                    break;
                case "indexRange":
                    parseValue(attributeVal, {
                        asKey: "indexRange",
                        parser: utils_1.parseByteRange,
                        dashName: "indexRange",
                    });
                    break;
                case "index":
                    parsedSegmentURL.index = attributeVal;
                    break;
                case "mediaRange":
                    parseValue(attributeVal, {
                        asKey: "mediaRange",
                        parser: utils_1.parseByteRange,
                        dashName: "mediaRange",
                    });
                    break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return [parsedSegmentURL, warnings];
}
exports.default = parseSegmentURL;
