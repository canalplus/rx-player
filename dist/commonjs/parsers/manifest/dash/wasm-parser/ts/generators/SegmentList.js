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
exports.generateSegmentListChildrenParser = void 0;
var noop_1 = require("../../../../../../utils/noop");
var SegmentUrl_1 = require("./SegmentUrl");
/**
 * Generate a "children parser" once inside a `SegmentList` node.
 * @param {Object} segListChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @returns {Function}
 */
function generateSegmentListChildrenParser(segListChildren, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 20 /* TagName.SegmentUrl */: {
                var segmentObj = {};
                if (segListChildren.list === undefined) {
                    segListChildren.list = [];
                }
                segListChildren.list.push(segmentObj);
                var attrParser = (0, SegmentUrl_1.generateSegmentUrlAttrParser)(segmentObj, linearMemory);
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
exports.generateSegmentListChildrenParser = generateSegmentListChildrenParser;
