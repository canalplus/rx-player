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
exports.generatePeriodAttrParser = exports.generatePeriodChildrenParser = void 0;
var noop_1 = require("../../../../../../utils/noop");
var utils_1 = require("../utils");
var AdaptationSet_1 = require("./AdaptationSet");
var BaseURL_1 = require("./BaseURL");
var EventStream_1 = require("./EventStream");
var SegmentTemplate_1 = require("./SegmentTemplate");
/**
 * Generate a "children parser" once inside a `Perod` node.
 * @param {Object} periodChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
function generatePeriodChildrenParser(periodChildren, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 4 /* TagName.AdaptationSet */: {
                var adaptationObj = {
                    children: { baseURLs: [], representations: [] },
                    attributes: {},
                };
                periodChildren.adaptations.push(adaptationObj);
                var childrenParser = (0, AdaptationSet_1.generateAdaptationSetChildrenParser)(adaptationObj.children, linearMemory, parsersStack);
                var attributeParser = (0, AdaptationSet_1.generateAdaptationSetAttrParser)(adaptationObj.attributes, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 15 /* TagName.BaseURL */: {
                var baseUrl = { value: "", attributes: {} };
                periodChildren.baseURLs.push(baseUrl);
                var childrenParser = noop_1.default;
                var attributeParser = (0, BaseURL_1.generateBaseUrlAttrParser)(baseUrl, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
                break;
            }
            case 5 /* TagName.EventStream */: {
                var eventStream = {
                    children: { events: [] },
                    attributes: {},
                };
                periodChildren.eventStreams.push(eventStream);
                var childrenParser = (0, EventStream_1.generateEventStreamChildrenParser)(eventStream.children, linearMemory, parsersStack, fullMpd);
                var attrParser = (0, EventStream_1.generateEventStreamAttrParser)(eventStream.attributes, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attrParser);
                break;
            }
            case 16 /* TagName.SegmentTemplate */: {
                var stObj = {};
                periodChildren.segmentTemplate = stObj;
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
exports.generatePeriodChildrenParser = generatePeriodChildrenParser;
/**
 * @param {Object} periodAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
function generatePeriodAttrParser(periodAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onPeriodAttribute(attr, ptr, len) {
        switch (attr) {
            case 0 /* AttributeName.Id */:
                periodAttrs.id = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 45 /* AttributeName.Start */:
                periodAttrs.start = new DataView(linearMemory.buffer).getFloat64(ptr, true);
                break;
            case 1 /* AttributeName.Duration */:
                periodAttrs.duration = new DataView(linearMemory.buffer).getFloat64(ptr, true);
                break;
            case 32 /* AttributeName.BitstreamSwitching */:
                periodAttrs.bitstreamSwitching =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            case 46 /* AttributeName.XLinkHref */:
                periodAttrs.xlinkHref = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 47 /* AttributeName.XLinkActuate */:
                periodAttrs.xlinkActuate = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 43 /* AttributeName.AvailabilityTimeOffset */:
                periodAttrs.availabilityTimeOffset = new DataView(linearMemory.buffer).getFloat64(ptr, true);
                break;
            case 22 /* AttributeName.AvailabilityTimeComplete */:
                periodAttrs.availabilityTimeComplete =
                    new DataView(linearMemory.buffer).getUint8(0) === 0;
                break;
            case 70 /* AttributeName.Namespace */:
                var xmlNs = { key: "", value: "" };
                var dataView = new DataView(linearMemory.buffer);
                var offset = ptr;
                var keySize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.key = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, offset, keySize);
                offset += keySize;
                var valSize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.value = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, offset, valSize);
                if (periodAttrs.namespaces === undefined) {
                    periodAttrs.namespaces = [xmlNs];
                }
                else {
                    periodAttrs.namespaces.push(xmlNs);
                }
                break;
        }
    };
}
exports.generatePeriodAttrParser = generatePeriodAttrParser;
