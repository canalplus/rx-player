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
exports.generateSegmentBaseAttrParser = void 0;
var utils_1 = require("../utils");
function generateSegmentBaseAttrParser(segmentBaseAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onSegmentBaseAttribute(attr, ptr, len) {
        switch (attr) {
            case 29 /* AttributeName.InitializationRange */: {
                var dataView = new DataView(linearMemory.buffer);
                if (segmentBaseAttrs.initialization === undefined) {
                    segmentBaseAttrs.initialization = {};
                }
                segmentBaseAttrs.initialization.range = [
                    dataView.getFloat64(ptr, true),
                    dataView.getFloat64(ptr + 8, true),
                ];
                break;
            }
            case 67 /* AttributeName.InitializationMedia */:
                if (segmentBaseAttrs.initialization === undefined) {
                    segmentBaseAttrs.initialization = {};
                }
                segmentBaseAttrs.initialization.media = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 43 /* AttributeName.AvailabilityTimeOffset */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentBaseAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
                break;
            }
            case 22 /* AttributeName.AvailabilityTimeComplete */: {
                segmentBaseAttrs.availabilityTimeComplete =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            }
            case 24 /* AttributeName.PresentationTimeOffset */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentBaseAttrs.presentationTimeOffset = dataView.getFloat64(ptr, true);
                break;
            }
            case 27 /* AttributeName.TimeScale */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentBaseAttrs.timescale = dataView.getFloat64(ptr, true);
                break;
            }
            case 31 /* AttributeName.IndexRange */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentBaseAttrs.indexRange = [
                    dataView.getFloat64(ptr, true),
                    dataView.getFloat64(ptr + 8, true),
                ];
                break;
            }
            case 23 /* AttributeName.IndexRangeExact */: {
                segmentBaseAttrs.indexRangeExact =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            }
            case 1 /* AttributeName.Duration */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentBaseAttrs.duration = dataView.getFloat64(ptr, true);
                break;
            }
            case 20 /* AttributeName.StartNumber */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentBaseAttrs.startNumber = dataView.getFloat64(ptr, true);
                break;
            }
            case 76 /* AttributeName.EndNumber */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentBaseAttrs.endNumber = dataView.getFloat64(ptr, true);
                break;
            }
        }
    };
}
exports.generateSegmentBaseAttrParser = generateSegmentBaseAttrParser;
