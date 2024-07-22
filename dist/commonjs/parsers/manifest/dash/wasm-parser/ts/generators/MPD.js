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
exports.generateMPDAttrParser = exports.generateMPDChildrenParser = void 0;
var noop_1 = require("../../../../../../utils/noop");
var utils_1 = require("../utils");
var BaseURL_1 = require("./BaseURL");
var ContentProtection_1 = require("./ContentProtection");
var Period_1 = require("./Period");
var Scheme_1 = require("./Scheme");
/**
 * Generate a "children parser" once inside an `MPD` node.
 * @param {Object} mpdChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
function generateMPDChildrenParser(mpdChildren, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 15 /* TagName.BaseURL */: {
                var baseUrl = { value: "", attributes: {} };
                mpdChildren.baseURLs.push(baseUrl);
                var childrenParser = noop_1.default; // BaseURL have no sub-element
                var attributeParser = (0, BaseURL_1.generateBaseUrlAttrParser)(baseUrl, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 2 /* TagName.Period */: {
                var period = {
                    children: { adaptations: [], baseURLs: [], eventStreams: [] },
                    attributes: {},
                };
                mpdChildren.periods.push(period);
                var childrenParser = (0, Period_1.generatePeriodChildrenParser)(period.children, linearMemory, parsersStack, fullMpd);
                var attributeParser = (0, Period_1.generatePeriodAttrParser)(period.attributes, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 3 /* TagName.UtcTiming */: {
                var utcTiming = {};
                mpdChildren.utcTimings.push(utcTiming);
                var childrenParser = noop_1.default; // UTCTiming have no sub-element
                var attributeParser = (0, Scheme_1.generateSchemeAttrParser)(utcTiming, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 10 /* TagName.ContentProtection */: {
                var contentProtection = {
                    children: { cencPssh: [] },
                    attributes: {},
                };
                if (mpdChildren.contentProtections === undefined) {
                    mpdChildren.contentProtections = [];
                }
                mpdChildren.contentProtections.push(contentProtection);
                var contentProtAttrParser = (0, ContentProtection_1.generateContentProtectionAttrParser)(contentProtection, linearMemory);
                parsersStack.pushParsers(nodeId, noop_1.default, contentProtAttrParser);
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
exports.generateMPDChildrenParser = generateMPDChildrenParser;
function generateMPDAttrParser(mpdChildren, mpdAttrs, linearMemory) {
    var dataView;
    var textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
        switch (attr) {
            case 0 /* AttributeName.Id */:
                mpdAttrs.id = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 2 /* AttributeName.Profiles */:
                mpdAttrs.profiles = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 33 /* AttributeName.Type */:
                mpdAttrs.type = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 34 /* AttributeName.AvailabilityStartTime */:
                var startTime = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                mpdAttrs.availabilityStartTime = new Date(startTime).getTime() / 1000;
                break;
            case 35 /* AttributeName.AvailabilityEndTime */:
                var endTime = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                mpdAttrs.availabilityEndTime = new Date(endTime).getTime() / 1000;
                break;
            case 36 /* AttributeName.PublishTime */:
                var publishTime = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                mpdAttrs.publishTime = new Date(publishTime).getTime() / 1000;
                break;
            case 68 /* AttributeName.MediaPresentationDuration */:
                dataView = new DataView(linearMemory.buffer);
                mpdAttrs.duration = dataView.getFloat64(ptr, true);
                break;
            case 37 /* AttributeName.MinimumUpdatePeriod */:
                dataView = new DataView(linearMemory.buffer);
                mpdAttrs.minimumUpdatePeriod = dataView.getFloat64(ptr, true);
                break;
            case 38 /* AttributeName.MinBufferTime */:
                dataView = new DataView(linearMemory.buffer);
                mpdAttrs.minBufferTime = dataView.getFloat64(ptr, true);
                break;
            case 39 /* AttributeName.TimeShiftBufferDepth */:
                dataView = new DataView(linearMemory.buffer);
                mpdAttrs.timeShiftBufferDepth = dataView.getFloat64(ptr, true);
                break;
            case 40 /* AttributeName.SuggestedPresentationDelay */:
                dataView = new DataView(linearMemory.buffer);
                mpdAttrs.suggestedPresentationDelay = dataView.getFloat64(ptr, true);
                break;
            case 41 /* AttributeName.MaxSegmentDuration */:
                dataView = new DataView(linearMemory.buffer);
                mpdAttrs.maxSegmentDuration = dataView.getFloat64(ptr, true);
                break;
            case 42 /* AttributeName.MaxSubsegmentDuration */:
                dataView = new DataView(linearMemory.buffer);
                mpdAttrs.maxSubsegmentDuration = dataView.getFloat64(ptr, true);
                break;
            case 66 /* AttributeName.Location */:
                var location_1 = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                mpdChildren.locations.push(location_1);
                break;
            case 70 /* AttributeName.Namespace */:
                var xmlNs = { key: "", value: "" };
                dataView = new DataView(linearMemory.buffer);
                var offset = ptr;
                var keySize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.key = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, offset, keySize);
                offset += keySize;
                var valSize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.value = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, offset, valSize);
                if (mpdAttrs.namespaces === undefined) {
                    mpdAttrs.namespaces = [xmlNs];
                }
                else {
                    mpdAttrs.namespaces.push(xmlNs);
                }
                break;
        }
    };
}
exports.generateMPDAttrParser = generateMPDAttrParser;
