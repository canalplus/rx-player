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
var string_parsing_1 = require("../../utils/string_parsing");
var browser_detection_1 = require("../browser_detection");
/**
 * Get KID from MediaKeySession keyStatus, and convert it in usual big-endian kid
 * if necessary. On EDGE, Microsoft Playready KID are presented into little-endian GUID.
 * @param {String} keySystem
 * @param {Uint8Array} baseKeyId
 * @returns {Uint8Array}
 */
function getUUIDKIDFromKeyStatusKID(keySystem, baseKeyId) {
    if (keySystem.indexOf("playready") !== -1 && (browser_detection_1.isIEOrEdge || browser_detection_1.isEdgeChromium)) {
        return (0, string_parsing_1.guidToUuid)(baseKeyId);
    }
    return baseKeyId;
}
exports.default = getUUIDKIDFromKeyStatusKID;
