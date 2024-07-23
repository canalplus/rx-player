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
exports.generateXLinkChildrenParser = void 0;
var noop_1 = require("../../../../../../utils/noop");
var Period_1 = require("./Period");
/**
 * Generate a "children parser" when an XLink has been loaded.
 * @param {Object} xlinkObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
function generateXLinkChildrenParser(xlinkObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
        switch (nodeId) {
            case 2 /* TagName.Period */: {
                var period = {
                    children: { adaptations: [], baseURLs: [], eventStreams: [] },
                    attributes: {},
                };
                xlinkObj.periods.push(period);
                var childrenParser = (0, Period_1.generatePeriodChildrenParser)(period.children, linearMemory, parsersStack, fullMpd);
                var attributeParser = (0, Period_1.generatePeriodAttrParser)(period.attributes, linearMemory);
                parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
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
exports.generateXLinkChildrenParser = generateXLinkChildrenParser;
