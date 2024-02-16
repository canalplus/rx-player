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
var base64_1 = require("../../../utils/base64");
var byte_parsing_1 = require("../../../utils/byte_parsing");
var string_parsing_1 = require("../../../utils/string_parsing");
var isobmff_1 = require("../../containers/isobmff");
/**
 * @param {Uint8Array} keyIdBytes
 * @returns {Array.<Object>}
 */
function createWidevineKeySystem(keyIdBytes) {
    return [
        {
            systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed", // Widevine
            privateData: (0, byte_parsing_1.concat)([0x08, 0x01, 0x12, 0x10], keyIdBytes),
        },
    ];
}
/**
 * Parse "Protection" Node, which contains DRM information
 * @param {Element} protectionNode
 * @returns {Object}
 */
function parseProtectionNode(protectionNode, keySystemCreator) {
    if (keySystemCreator === void 0) { keySystemCreator = createWidevineKeySystem; }
    if (protectionNode.firstElementChild === null ||
        protectionNode.firstElementChild.nodeName !== "ProtectionHeader") {
        throw new Error("Protection should have ProtectionHeader child");
    }
    var header = protectionNode.firstElementChild;
    var privateData = (0, base64_1.base64ToBytes)(header.textContent === null ? "" : header.textContent);
    var keyIdHex = (0, isobmff_1.getPlayReadyKIDFromPrivateData)(privateData);
    var keyIdBytes = (0, string_parsing_1.hexToBytes)(keyIdHex);
    // remove possible braces
    var systemIdAttr = header.getAttribute("SystemID");
    var systemId = (systemIdAttr !== null ? systemIdAttr : "")
        .toLowerCase()
        .replace(/\{|\}/g, "");
    return {
        keyId: keyIdBytes,
        keySystems: [
            {
                systemId: systemId,
                privateData: privateData,
                /* keyIds: [keyIdBytes], */
            },
        ].concat(keySystemCreator(keyIdBytes)),
    };
}
exports.default = parseProtectionNode;
