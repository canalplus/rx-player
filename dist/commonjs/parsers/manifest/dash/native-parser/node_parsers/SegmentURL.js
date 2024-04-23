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
var utils_1 = require("./utils");
/**
 * Parse a SegmentURL element into a SegmentURL intermediate
 * representation.
 * @param {Element} root - The SegmentURL root element.
 * @returns {Array}
 */
function parseSegmentURL(root) {
    var parsedSegmentURL = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(parsedSegmentURL, warnings);
    for (var i = 0; i < root.attributes.length; i++) {
        var attribute = root.attributes[i];
        switch (attribute.name) {
            case "media":
                parsedSegmentURL.media = attribute.value;
                break;
            case "indexRange":
                parseValue(attribute.value, {
                    asKey: "indexRange",
                    parser: utils_1.parseByteRange,
                    dashName: "indexRange",
                });
                break;
            case "index":
                parsedSegmentURL.index = attribute.value;
                break;
            case "mediaRange":
                parseValue(attribute.value, {
                    asKey: "mediaRange",
                    parser: utils_1.parseByteRange,
                    dashName: "mediaRange",
                });
                break;
        }
    }
    return [parsedSegmentURL, warnings];
}
exports.default = parseSegmentURL;
