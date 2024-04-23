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
exports.generateRepresentationAttrParser = exports.generateRepresentationChildrenParser = void 0;
var noop_1 = require("../../../../../../utils/noop");
var utils_1 = require("../utils");
var BaseURL_1 = require("./BaseURL");
var ContentProtection_1 = require("./ContentProtection");
var Scheme_1 = require("./Scheme");
var SegmentBase_1 = require("./SegmentBase");
var SegmentList_1 = require("./SegmentList");
var SegmentTemplate_1 = require("./SegmentTemplate");
/**
 * Generate a "children parser" once inside a `Representation` node.
 * @param {Object} childrenObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
function generateRepresentationChildrenParser(childrenObj, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 15 /* TagName.BaseURL */: {
                var baseUrl = { value: "", attributes: {} };
                childrenObj.baseURLs.push(baseUrl);
                parsersStack.pushParsers(nodeId, noop_1.default, (0, BaseURL_1.generateBaseUrlAttrParser)(baseUrl, linearMemory));
                break;
            }
            case 10 /* TagName.ContentProtection */: {
                var contentProtection = {
                    children: { cencPssh: [] },
                    attributes: {},
                };
                if (childrenObj.contentProtections === undefined) {
                    childrenObj.contentProtections = [];
                }
                childrenObj.contentProtections.push(contentProtection);
                var contentProtAttrParser = (0, ContentProtection_1.generateContentProtectionAttrParser)(contentProtection, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, contentProtAttrParser);
                break;
            }
            case 19 /* TagName.InbandEventStream */: {
                var inbandEvent = {};
                if (childrenObj.inbandEventStreams === undefined) {
                    childrenObj.inbandEventStreams = [];
                }
                childrenObj.inbandEventStreams.push(inbandEvent);
                parsersStack.pushParsers(nodeId, noop_1.default, (0, Scheme_1.generateSchemeAttrParser)(inbandEvent, linearMemory));
                break;
            }
            case 13 /* TagName.SupplementalProperty */: {
                var supplementalProperty = {};
                if (childrenObj.supplementalProperties === undefined) {
                    childrenObj.supplementalProperties = [];
                }
                childrenObj.supplementalProperties.push(supplementalProperty);
                var attributeParser = (0, Scheme_1.generateSchemeAttrParser)(supplementalProperty, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, attributeParser);
                break;
            }
            case 17 /* TagName.SegmentBase */: {
                var segmentBaseObj = {};
                childrenObj.segmentBase = segmentBaseObj;
                var attributeParser = (0, SegmentBase_1.generateSegmentBaseAttrParser)(segmentBaseObj, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, attributeParser);
                break;
            }
            case 18 /* TagName.SegmentList */: {
                var segmentListObj = {
                    list: [],
                };
                childrenObj.segmentList = segmentListObj;
                var childrenParser = (0, SegmentList_1.generateSegmentListChildrenParser)(segmentListObj, linearMemory, parsersStack);
                // Re-use SegmentBase attribute parse as we should have the same attributes
                var attributeParser = (0, SegmentBase_1.generateSegmentBaseAttrParser)(segmentListObj, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 16 /* TagName.SegmentTemplate */: {
                var stObj = {};
                childrenObj.segmentTemplate = stObj;
                parsersStack.pushParsers(nodeId, noop_1.default, // SegmentTimeline as treated like an attribute
                (0, SegmentTemplate_1.generateSegmentTemplateAttrParser)(stObj, linearMemory));
                break;
            }
            default:
                // Allows to make sure we're not mistakenly closing a re-opened
                // tag.
                parsersStack.pushParsers(nodeId, noop_1.default, noop_1.default);
                break;
        }
    };
}
exports.generateRepresentationChildrenParser = generateRepresentationChildrenParser;
/**
 * @param {Object} representationAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
function generateRepresentationAttrParser(representationAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onRepresentationAttribute(attr, ptr, len) {
        var dataView = new DataView(linearMemory.buffer);
        switch (attr) {
            case 0 /* AttributeName.Id */:
                representationAttrs.id = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 3 /* AttributeName.AudioSamplingRate */:
                representationAttrs.audioSamplingRate = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 63 /* AttributeName.Bitrate */:
                representationAttrs.bitrate = dataView.getFloat64(ptr, true);
                break;
            case 4 /* AttributeName.Codecs */:
                representationAttrs.codecs = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 77 /* AttributeName.SupplementalCodecs */:
                representationAttrs.supplementalCodecs = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
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
                representationAttrs.mimeType = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 2 /* AttributeName.Profiles */:
                representationAttrs.profiles = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 65 /* AttributeName.QualityRanking */:
                representationAttrs.qualityRanking = dataView.getFloat64(ptr, true);
                break;
            case 12 /* AttributeName.SegmentProfiles */:
                representationAttrs.segmentProfiles = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
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
exports.generateRepresentationAttrParser = generateRepresentationAttrParser;
