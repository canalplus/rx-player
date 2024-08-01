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
/**
 * Generate a "children parser" once inside a `EventStream` node.
 * @param {Object} childrenObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
export function generateEventStreamChildrenParser(childrenObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 6 /* TagName.EventStreamElt */: {
                const event = {};
                childrenObj.events.push(event);
                const attrParser = generateEventAttrParser(event, linearMemory, fullMpd);
                parsersStack.pushParsers(nodeId, noop, attrParser);
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
 * @param {Object} esAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateEventStreamAttrParser(esAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
        const dataView = new DataView(linearMemory.buffer);
        switch (attr) {
            case 16 /* AttributeName.SchemeIdUri */:
                esAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 17 /* AttributeName.SchemeValue */:
                esAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 27 /* AttributeName.TimeScale */:
                esAttrs.timescale = dataView.getFloat64(ptr, true);
                break;
            case 70 /* AttributeName.Namespace */:
                const xmlNs = { key: "", value: "" };
                let offset = ptr;
                const keySize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
                offset += keySize;
                const valSize = dataView.getUint32(offset);
                offset += 4;
                xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);
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
/**
 * @param {Object} eventAttr
 * @param {WebAssembly.Memory} linearMemory
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
function generateEventAttrParser(eventAttr, linearMemory, fullMpd) {
    const textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
        const dataView = new DataView(linearMemory.buffer);
        switch (attr) {
            case 25 /* AttributeName.EventPresentationTime */:
                eventAttr.presentationTime = dataView.getFloat64(ptr, true);
                break;
            case 1 /* AttributeName.Duration */:
                eventAttr.duration = dataView.getFloat64(ptr, true);
                break;
            case 0 /* AttributeName.Id */:
                eventAttr.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
                break;
            case 69 /* AttributeName.EventStreamEltRange */:
                const rangeStart = dataView.getFloat64(ptr, true);
                const rangeEnd = dataView.getFloat64(ptr + 8, true);
                eventAttr.eventStreamData = fullMpd.slice(rangeStart, rangeEnd);
                break;
        }
    };
}
