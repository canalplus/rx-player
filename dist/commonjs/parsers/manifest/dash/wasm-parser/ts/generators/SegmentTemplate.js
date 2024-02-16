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
exports.generateSegmentTemplateAttrParser = void 0;
var utils_1 = require("../utils");
function generateSegmentTemplateAttrParser(segmentTemplateAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onSegmentTemplateAttribute(attr, ptr, len) {
        switch (attr) {
            case 19 /* AttributeName.SegmentTimeline */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.timeline = [];
                var base = ptr;
                for (var i = 0; i < len / 24; i++) {
                    segmentTemplateAttrs.timeline.push({
                        start: dataView.getFloat64(base, true),
                        duration: dataView.getFloat64(base + 8, true),
                        repeatCount: dataView.getFloat64(base + 16, true),
                    });
                    base += 24;
                }
                break;
            }
            case 67 /* AttributeName.InitializationMedia */:
                segmentTemplateAttrs.initialization = {
                    media: (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len),
                };
                break;
            case 28 /* AttributeName.Index */:
                segmentTemplateAttrs.index = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 43 /* AttributeName.AvailabilityTimeOffset */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
                break;
            }
            case 22 /* AttributeName.AvailabilityTimeComplete */: {
                segmentTemplateAttrs.availabilityTimeComplete =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            }
            case 24 /* AttributeName.PresentationTimeOffset */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.presentationTimeOffset = dataView.getFloat64(ptr, true);
                break;
            }
            case 27 /* AttributeName.TimeScale */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.timescale = dataView.getFloat64(ptr, true);
                break;
            }
            case 31 /* AttributeName.IndexRange */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.indexRange = [
                    dataView.getFloat64(ptr, true),
                    dataView.getFloat64(ptr + 8, true),
                ];
                break;
            }
            case 23 /* AttributeName.IndexRangeExact */: {
                segmentTemplateAttrs.indexRangeExact =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            }
            case 30 /* AttributeName.Media */:
                segmentTemplateAttrs.media = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 32 /* AttributeName.BitstreamSwitching */: {
                segmentTemplateAttrs.bitstreamSwitching =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            }
            case 1 /* AttributeName.Duration */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.duration = dataView.getFloat64(ptr, true);
                break;
            }
            case 20 /* AttributeName.StartNumber */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.startNumber = dataView.getFloat64(ptr, true);
                break;
            }
            case 76 /* AttributeName.EndNumber */: {
                var dataView = new DataView(linearMemory.buffer);
                segmentTemplateAttrs.endNumber = dataView.getFloat64(ptr, true);
                break;
            }
        }
    };
}
exports.generateSegmentTemplateAttrParser = generateSegmentTemplateAttrParser;
