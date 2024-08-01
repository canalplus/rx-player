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
exports.generateAdaptationSetAttrParser = exports.generateAdaptationSetChildrenParser = void 0;
var noop_1 = require("../../../../../../utils/noop");
var utils_1 = require("../utils");
var BaseURL_1 = require("./BaseURL");
var ContentComponent_1 = require("./ContentComponent");
var ContentProtection_1 = require("./ContentProtection");
var Representation_1 = require("./Representation");
var Scheme_1 = require("./Scheme");
var SegmentBase_1 = require("./SegmentBase");
var SegmentList_1 = require("./SegmentList");
var SegmentTemplate_1 = require("./SegmentTemplate");
/**
 * Generate a "children parser" once inside a `AdaptationSet` node.
 * @param {Object} adaptationSetChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
function generateAdaptationSetChildrenParser(adaptationSetChildren, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 8 /* TagName.Accessibility */: {
                var accessibility = {};
                if (adaptationSetChildren.accessibilities === undefined) {
                    adaptationSetChildren.accessibilities = [];
                }
                adaptationSetChildren.accessibilities.push(accessibility);
                var schemeAttrParser = (0, Scheme_1.generateSchemeAttrParser)(accessibility, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, schemeAttrParser);
                break;
            }
            case 15 /* TagName.BaseURL */: {
                var baseUrl = { value: "", attributes: {} };
                adaptationSetChildren.baseURLs.push(baseUrl);
                var attributeParser = (0, BaseURL_1.generateBaseUrlAttrParser)(baseUrl, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, attributeParser);
                break;
            }
            case 9 /* TagName.ContentComponent */: {
                var contentComponent = {};
                adaptationSetChildren.contentComponent = contentComponent;
                parsersStack.pushParsers(nodeId, noop_1.default, (0, ContentComponent_1.generateContentComponentAttrParser)(contentComponent, linearMemory));
                break;
            }
            case 10 /* TagName.ContentProtection */: {
                var contentProtection = {
                    children: { cencPssh: [] },
                    attributes: {},
                };
                if (adaptationSetChildren.contentProtections === undefined) {
                    adaptationSetChildren.contentProtections = [];
                }
                adaptationSetChildren.contentProtections.push(contentProtection);
                var contentProtAttrParser = (0, ContentProtection_1.generateContentProtectionAttrParser)(contentProtection, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, contentProtAttrParser);
                break;
            }
            case 11 /* TagName.EssentialProperty */: {
                var essentialProperty = {};
                if (adaptationSetChildren.essentialProperties === undefined) {
                    adaptationSetChildren.essentialProperties = [];
                }
                adaptationSetChildren.essentialProperties.push(essentialProperty);
                var childrenParser = noop_1.default; // EssentialProperty have no sub-element
                var attributeParser = (0, Scheme_1.generateSchemeAttrParser)(essentialProperty, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 19 /* TagName.InbandEventStream */: {
                var inbandEvent = {};
                if (adaptationSetChildren.inbandEventStreams === undefined) {
                    adaptationSetChildren.inbandEventStreams = [];
                }
                adaptationSetChildren.inbandEventStreams.push(inbandEvent);
                var childrenParser = noop_1.default; // InbandEventStream have no sub-element
                var attributeParser = (0, Scheme_1.generateSchemeAttrParser)(inbandEvent, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 7 /* TagName.Representation */: {
                var representationObj = {
                    children: { baseURLs: [] },
                    attributes: {},
                };
                adaptationSetChildren.representations.push(representationObj);
                var childrenParser = (0, Representation_1.generateRepresentationChildrenParser)(representationObj.children, linearMemory, parsersStack);
                var attributeParser = (0, Representation_1.generateRepresentationAttrParser)(representationObj.attributes, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 12 /* TagName.Role */: {
                var role = {};
                if (adaptationSetChildren.roles === undefined) {
                    adaptationSetChildren.roles = [];
                }
                adaptationSetChildren.roles.push(role);
                var attributeParser = (0, Scheme_1.generateSchemeAttrParser)(role, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, attributeParser);
                break;
            }
            case 13 /* TagName.SupplementalProperty */: {
                var supplementalProperty = {};
                if (adaptationSetChildren.supplementalProperties === undefined) {
                    adaptationSetChildren.supplementalProperties = [];
                }
                adaptationSetChildren.supplementalProperties.push(supplementalProperty);
                var attributeParser = (0, Scheme_1.generateSchemeAttrParser)(supplementalProperty, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, attributeParser);
                break;
            }
            case 17 /* TagName.SegmentBase */: {
                var segmentBaseObj = {};
                adaptationSetChildren.segmentBase = segmentBaseObj;
                var attributeParser = (0, SegmentBase_1.generateSegmentBaseAttrParser)(segmentBaseObj, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, attributeParser);
                break;
            }
            case 18 /* TagName.SegmentList */: {
                var segmentListObj = {
                    list: [],
                };
                adaptationSetChildren.segmentList = segmentListObj;
                var childrenParser = (0, SegmentList_1.generateSegmentListChildrenParser)(segmentListObj, linearMemory, parsersStack);
                // Re-use SegmentBase attribute parse as we should have the same attributes
                var attributeParser = (0, SegmentBase_1.generateSegmentBaseAttrParser)(segmentListObj, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 16 /* TagName.SegmentTemplate */: {
                var stObj = {};
                adaptationSetChildren.segmentTemplate = stObj;
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
exports.generateAdaptationSetChildrenParser = generateAdaptationSetChildrenParser;
/**
 * @param {Object} adaptationAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
function generateAdaptationSetAttrParser(adaptationAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onAdaptationSetAttribute(attr, ptr, len) {
        var dataView = new DataView(linearMemory.buffer);
        switch (attr) {
            case 0 /* AttributeName.Id */:
                adaptationAttrs.id = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 48 /* AttributeName.Group */:
                adaptationAttrs.group = dataView.getFloat64(ptr, true);
                break;
            case 60 /* AttributeName.Language */:
                adaptationAttrs.language = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 61 /* AttributeName.ContentType */:
                adaptationAttrs.contentType = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 62 /* AttributeName.Par */:
                adaptationAttrs.par = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 53 /* AttributeName.MinBandwidth */:
                adaptationAttrs.minBitrate = dataView.getFloat64(ptr, true);
                break;
            case 49 /* AttributeName.MaxBandwidth */:
                adaptationAttrs.maxBitrate = dataView.getFloat64(ptr, true);
                break;
            case 56 /* AttributeName.MinWidth */:
                adaptationAttrs.minWidth = dataView.getFloat64(ptr, true);
                break;
            case 52 /* AttributeName.MaxWidth */:
                adaptationAttrs.maxWidth = dataView.getFloat64(ptr, true);
                break;
            case 55 /* AttributeName.MinHeight */:
                adaptationAttrs.minHeight = dataView.getFloat64(ptr, true);
                break;
            case 51 /* AttributeName.MaxHeight */:
                adaptationAttrs.maxHeight = dataView.getFloat64(ptr, true);
                break;
            case 54 /* AttributeName.MinFrameRate */:
                adaptationAttrs.minFrameRate = dataView.getFloat64(ptr, true);
                break;
            case 50 /* AttributeName.MaxFrameRate */:
                adaptationAttrs.maxFrameRate = dataView.getFloat64(ptr, true);
                break;
            case 57 /* AttributeName.SelectionPriority */:
                adaptationAttrs.selectionPriority = dataView.getFloat64(ptr, true);
                break;
            case 58 /* AttributeName.SegmentAlignment */:
                adaptationAttrs.segmentAlignment = (0, utils_1.parseFloatOrBool)(dataView.getFloat64(ptr, true));
                break;
            case 59 /* AttributeName.SubsegmentAlignment */:
                adaptationAttrs.subsegmentAlignment = (0, utils_1.parseFloatOrBool)(dataView.getFloat64(ptr, true));
                break;
            case 32 /* AttributeName.BitstreamSwitching */:
                adaptationAttrs.bitstreamSwitching = dataView.getFloat64(ptr, true) !== 0;
                break;
            case 3 /* AttributeName.AudioSamplingRate */:
                adaptationAttrs.audioSamplingRate = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 4 /* AttributeName.Codecs */:
                adaptationAttrs.codecs = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 77 /* AttributeName.SupplementalCodecs */:
                adaptationAttrs.supplementalCodecs = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 2 /* AttributeName.Profiles */:
                adaptationAttrs.profiles = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 12 /* AttributeName.SegmentProfiles */:
                adaptationAttrs.segmentProfiles = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 11 /* AttributeName.MimeType */:
                adaptationAttrs.mimeType = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 5 /* AttributeName.CodingDependency */:
                adaptationAttrs.codingDependency = dataView.getFloat64(ptr, true) !== 0;
                break;
            case 6 /* AttributeName.FrameRate */:
                adaptationAttrs.frameRate = dataView.getFloat64(ptr, true);
                break;
            case 7 /* AttributeName.Height */:
                adaptationAttrs.height = dataView.getFloat64(ptr, true);
                break;
            case 8 /* AttributeName.Width */:
                adaptationAttrs.width = dataView.getFloat64(ptr, true);
                break;
            case 9 /* AttributeName.MaxPlayoutRate */:
                adaptationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
                break;
            case 10 /* AttributeName.MaxSAPPeriod */:
                adaptationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
                break;
            case 43 /* AttributeName.AvailabilityTimeOffset */:
                adaptationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
                break;
            case 22 /* AttributeName.AvailabilityTimeComplete */:
                adaptationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
                break;
            case 71 /* AttributeName.Label */:
                var label = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                adaptationAttrs.label = label;
                break;
            // TODO
            // case AttributeName.StartsWithSap:
            //   adaptationAttrs.startsWithSap = dataView.getFloat64(ptr, true);
        }
    };
}
exports.generateAdaptationSetAttrParser = generateAdaptationSetAttrParser;
