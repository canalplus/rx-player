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
exports.getPsshSystemID = void 0;
var log_1 = require("../../../log");
var slice_uint8array_1 = require("../../../utils/slice_uint8array");
var string_parsing_1 = require("../../../utils/string_parsing");
var get_box_1 = require("./get_box");
/**
 * Replace every PSSH box from an ISOBMFF segment by FREE boxes and returns the
 * removed PSSH in an array.
 * Useful to manually manage encryption while avoiding the round-trip with the
 * browser's encrypted event.
 * @param {Uint8Array} data - the ISOBMFF segment
 * @returns {Array.<Uint8Array>} - The extracted PSSH boxes. In the order they
 * are encountered.
 */
function takePSSHOut(data) {
    var i = 0;
    var moov = (0, get_box_1.getBoxContent)(data, 0x6d6f6f76 /* moov */);
    if (moov === null) {
        return [];
    }
    var psshBoxes = [];
    while (i < moov.length) {
        var psshOffsets = void 0;
        try {
            psshOffsets = (0, get_box_1.getBoxOffsets)(moov, 0x70737368 /* pssh */);
        }
        catch (e) {
            var err = e instanceof Error ? e : "";
            log_1.default.warn("Error while removing PSSH from ISOBMFF", err);
            return psshBoxes;
        }
        if (psshOffsets === null) {
            return psshBoxes;
        }
        var pssh = (0, slice_uint8array_1.default)(moov, psshOffsets[0], psshOffsets[2]);
        var systemId = getPsshSystemID(pssh, psshOffsets[1] - psshOffsets[0]);
        if (systemId !== undefined) {
            psshBoxes.push({ systemId: systemId, data: pssh });
        }
        // replace by `free` box.
        moov[psshOffsets[0] + 4] = 0x66;
        moov[psshOffsets[0] + 5] = 0x72;
        moov[psshOffsets[0] + 6] = 0x65;
        moov[psshOffsets[0] + 7] = 0x65;
        i = psshOffsets[2];
    }
    return psshBoxes;
}
exports.default = takePSSHOut;
/**
 * Parse systemId from a "pssh" box into an hexadecimal string.
 * `undefined` if we could not extract a systemId.
 * @param {Uint8Array} buff - The pssh box
 * @param {number} initialDataOffset - offset of the first byte after the size
 * and name in this pssh box.
 * @returns {string|undefined}
 */
function getPsshSystemID(buff, initialDataOffset) {
    if (buff[initialDataOffset] > 1) {
        log_1.default.warn("ISOBMFF: un-handled PSSH version");
        return undefined;
    }
    var offset = initialDataOffset + 4; /* version + flags */
    if (offset + 16 > buff.length) {
        return undefined;
    }
    var systemIDBytes = (0, slice_uint8array_1.default)(buff, offset, offset + 16);
    return (0, string_parsing_1.bytesToHex)(systemIDBytes);
}
exports.getPsshSystemID = getPsshSystemID;
