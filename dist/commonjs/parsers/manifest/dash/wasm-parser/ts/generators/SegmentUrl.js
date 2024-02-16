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
exports.generateSegmentUrlAttrParser = void 0;
var utils_1 = require("../utils");
/**
 * Generate "attribute parser" for an encountered `SegmentURL` opening
 * tag.
 * @param {Object} segmentUrlAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
function generateSegmentUrlAttrParser(segmentUrlAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onSegmentUrlAttribute(attr, ptr, len) {
        switch (attr) {
            case 28 /* AttributeName.Index */:
                segmentUrlAttrs.index = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 31 /* AttributeName.IndexRange */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentUrlAttrs.indexRange = [
                    dataView.getFloat64(ptr, true),
                    dataView.getFloat64(ptr + 8, true),
                ];
                break;
            }
            case 30 /* AttributeName.Media */:
                segmentUrlAttrs.media = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 18 /* AttributeName.MediaRange */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentUrlAttrs.mediaRange = [
                    dataView.getFloat64(ptr, true),
                    dataView.getFloat64(ptr + 8, true),
                ];
                break;
            }
        }
    };
}
exports.generateSegmentUrlAttrParser = generateSegmentUrlAttrParser;
