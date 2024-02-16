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
exports.getPlayReadyKIDFromPrivateData = void 0;
var base64_1 = require("../../../../utils/base64");
var byte_parsing_1 = require("../../../../utils/byte_parsing");
var string_parsing_1 = require("../../../../utils/string_parsing");
/**
 * Parse PlayReady privateData to get its Hexa-coded KeyID.
 * @param {Uint8Array} privateData
 * @returns {string}
 */
function getPlayReadyKIDFromPrivateData(data) {
    var xmlLength = (0, byte_parsing_1.le2toi)(data, 8);
    var xml = (0, string_parsing_1.utf16LEToStr)(data.subarray(10, xmlLength + 10));
    var doc = new DOMParser().parseFromString(xml, "application/xml");
    var kidElement = doc.querySelector("KID");
    if (kidElement === null) {
        throw new Error("Cannot parse PlayReady private data: invalid XML");
    }
    var b64guidKid = kidElement.textContent === null ? "" : kidElement.textContent;
    var uuidKid = (0, string_parsing_1.guidToUuid)((0, base64_1.base64ToBytes)(b64guidKid));
    return (0, string_parsing_1.bytesToHex)(uuidKid).toLowerCase();
}
exports.getPlayReadyKIDFromPrivateData = getPlayReadyKIDFromPrivateData;
