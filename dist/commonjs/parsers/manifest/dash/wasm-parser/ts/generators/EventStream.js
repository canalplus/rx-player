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
exports.generateEventStreamAttrParser = exports.generateEventStreamChildrenParser = void 0;
var noop_1 = require("../../../../../../utils/noop");
var utils_1 = require("../utils");
/**
 * Generate a "children parser" once inside a `EventStream` node.
 * @param {Object} childrenObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
function generateEventStreamChildrenParser(childrenObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 6 /* TagName.EventStreamElt */: {
                var event_1 = {};
                childrenObj.events.push(event_1);
                var attrParser = generateEventAttrParser(event_1, linearMemory, fullMpd);
                parsersStack.pushParsers(nodeId, noop_1.default, attrParser);
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
exports.generateEventStreamChildrenParser = generateEventStreamChildrenParser;
/**
 * @param {Object} esAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
function generateEventStreamAttrParser(esAttrs, linearMemory) {
    var textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
        var dataView = new DataView(linearMemory.buffer);
        switch (attr) {
            case 16 /* AttributeName.SchemeIdUri */:
                esAttrs.schemeIdUri = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 17 /* AttributeName.SchemeValue */:
                esAttrs.value = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 27 /* AttributeName.TimeScale */:
                esAttrs.timescale = dataView.getFloat64(ptr, true);
                break;
            case 70 /* AttributeName.Namespace */:
                var xmlNs = { key: "", value: "" };
                var offset = ptr;
                var keySize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.key = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, offset, keySize);
                offset += keySize;
                var valSize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.value = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, offset, valSize);
                if (esAttrs.namespaces === undefined) {
                    esAttrs.namespaces = [xmlNs];
                }
                else {
                    esAttrs.namespaces.push(xmlNs);
                }
                break;
        }
    };
}
exports.generateEventStreamAttrParser = generateEventStreamAttrParser;
/**
 * @param {Object} eventAttr
 * @param {WebAssembly.Memory} linearMemory
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
function generateEventAttrParser(eventAttr, linearMemory, fullMpd) {
    var textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
        var dataView = new DataView(linearMemory.buffer);
        switch (attr) {
            case 25 /* AttributeName.EventPresentationTime */:
                eventAttr.presentationTime = dataView.getFloat64(ptr, true);
                break;
            case 1 /* AttributeName.Duration */:
                eventAttr.duration = dataView.getFloat64(ptr, true);
                break;
            case 0 /* AttributeName.Id */:
                eventAttr.id = (0, utils_1.parseString)(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 69 /* AttributeName.EventStreamEltRange */:
                var rangeStart = dataView.getFloat64(ptr, true);
                var rangeEnd = dataView.getFloat64(ptr + 8, true);
                eventAttr.eventStreamData = fullMpd.slice(rangeStart, rangeEnd);
                break;
        }
    };
}
