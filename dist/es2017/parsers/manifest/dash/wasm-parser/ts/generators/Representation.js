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
import noop from "../../../../../../utils/noop";
import { parseString } from "../utils";
import { generateBaseUrlAttrParser } from "./BaseURL";
import { generateContentProtectionAttrParser } from "./ContentProtection";
import { generateSchemeAttrParser } from "./Scheme";
import { generateSegmentBaseAttrParser } from "./SegmentBase";
import { generateSegmentListChildrenParser } from "./SegmentList";
import { generateSegmentTemplateAttrParser } from "./SegmentTemplate";
/**
 * Generate a "children parser" once inside a `Representation` node.
 * @param {Object} childrenObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
export function generateRepresentationChildrenParser(childrenObj, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 15 /* TagName.BaseURL */: {
                const baseUrl = { value: "", attributes: {} };
                childrenObj.baseURLs.push(baseUrl);
                parsersStack.pushParsers(nodeId, noop, generateBaseUrlAttrParser(baseUrl, linearMemory));
                break;
            }
            case 10 /* TagName.ContentProtection */: {
                const contentProtection = {
                    children: { cencPssh: [] },
                    attributes: {},
                };
                if (childrenObj.contentProtections === undefined) {
                    childrenObj.contentProtections = [];
                }
                childrenObj.contentProtections.push(contentProtection);
                const contentProtAttrParser = generateContentProtectionAttrParser(contentProtection, linearMemory);
                parsersStack.pushParsers(nodeId, noop, contentProtAttrParser);
                break;
            }
            case 19 /* TagName.InbandEventStream */: {
                const inbandEvent = {};
                if (childrenObj.inbandEventStreams === undefined) {
                    childrenObj.inbandEventStreams = [];
                }
                childrenObj.inbandEventStreams.push(inbandEvent);
                parsersStack.pushParsers(nodeId, noop, generateSchemeAttrParser(inbandEvent, linearMemory));
                break;
            }
            case 13 /* TagName.SupplementalProperty */: {
                const supplementalProperty = {};
                if (childrenObj.supplementalProperties === undefined) {
                    childrenObj.supplementalProperties = [];
                }
                childrenObj.supplementalProperties.push(supplementalProperty);
                const attributeParser = generateSchemeAttrParser(supplementalProperty, linearMemory);
                parsersStack.pushParsers(nodeId, noop, attributeParser);
                break;
            }
            case 17 /* TagName.SegmentBase */: {
                const segmentBaseObj = {};
                childrenObj.segmentBase = segmentBaseObj;
                const attributeParser = generateSegmentBaseAttrParser(segmentBaseObj, linearMemory);
                parsersStack.pushParsers(nodeId, noop, attributeParser);
                break;
            }
            case 18 /* TagName.SegmentList */: {
                const segmentListObj = {
                    list: [],
                };
                childrenObj.segmentList = segmentListObj;
                const childrenParser = generateSegmentListChildrenParser(segmentListObj, linearMemory, parsersStack);
                // Re-use SegmentBase attribute parse as we should have the same attributes
                const attributeParser = generateSegmentBaseAttrParser(segmentListObj, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 16 /* TagName.SegmentTemplate */: {
                const stObj = {};
                childrenObj.segmentTemplate = stObj;
                parsersStack.pushParsers(nodeId, noop, // SegmentTimeline as treated like an attribute
                generateSegmentTemplateAttrParser(stObj, linearMemory));
                break;
            }
            default:
                // Allows to make sure we're not mistakenly closing a re-opened
                // tag.
                parsersStack.pushParsers(nodeId, noop, noop);
                break;
        }
    };
}
/**
 * @param {Object} representationAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateRepresentationAttrParser(representationAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onRepresentationAttribute(attr, ptr, len) {
        const dataView = new DataView(linearMemory.buffer);
        switch (attr) {
            case 0 /* AttributeName.Id */:
                representationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 3 /* AttributeName.AudioSamplingRate */:
                representationAttrs.audioSamplingRate = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 63 /* AttributeName.Bitrate */:
                representationAttrs.bitrate = dataView.getFloat64(ptr, true);
                break;
            case 4 /* AttributeName.Codecs */:
                representationAttrs.codecs = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 77 /* AttributeName.SupplementalCodecs */:
                representationAttrs.supplementalCodecs = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 5 /* AttributeName.CodingDependency */:
                representationAttrs.codingDependency =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            case 6 /* AttributeName.FrameRate */:
                representationAttrs.frameRate = dataView.getFloat64(ptr, true);
                break;
            case 7 /* AttributeName.Height */:
                representationAttrs.height = dataView.getFloat64(ptr, true);
                break;
            case 8 /* AttributeName.Width */:
                representationAttrs.width = dataView.getFloat64(ptr, true);
                break;
            case 9 /* AttributeName.MaxPlayoutRate */:
                representationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
                break;
            case 10 /* AttributeName.MaxSAPPeriod */:
                representationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
                break;
            case 11 /* AttributeName.MimeType */:
                representationAttrs.mimeType = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 2 /* AttributeName.Profiles */:
                representationAttrs.profiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 65 /* AttributeName.QualityRanking */:
                representationAttrs.qualityRanking = dataView.getFloat64(ptr, true);
                break;
            case 12 /* AttributeName.SegmentProfiles */:
                representationAttrs.segmentProfiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 43 /* AttributeName.AvailabilityTimeOffset */:
                representationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
                break;
            case 22 /* AttributeName.AvailabilityTimeComplete */:
                representationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
                break;
        }
    };
}
