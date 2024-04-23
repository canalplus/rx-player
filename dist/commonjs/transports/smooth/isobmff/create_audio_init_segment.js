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
var isobmff_1 = require("../../../parsers/containers/isobmff");
var create_boxes_1 = require("./create_boxes");
var create_init_segment_1 = require("./create_init_segment");
var get_aaces_header_1 = require("./get_aaces_header");
/**
 * Return full audio initialization segment as Uint8Array.
 * @param {Number} timescale
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {string} codecPrivateData
 * @param {Uint8Array} keyId - hex string representing the key Id, 32 chars.
 * eg. a800dbed49c12c4cb8e0b25643844b9b
 * @returns {Uint8Array}
 */
function createAudioInitSegment(timescale, channelsCount, sampleSize, packetSize, sampleRate, codecPrivateData, keyId) {
    var _codecPrivateData = codecPrivateData.length === 0
        ? (0, get_aaces_header_1.default)(2, sampleRate, channelsCount)
        : codecPrivateData;
    var esds = (0, create_boxes_1.createESDSBox)(1, _codecPrivateData);
    var stsd = (function () {
        if (keyId === undefined) {
            var mp4a = (0, create_boxes_1.createMP4ABox)(1, channelsCount, sampleSize, packetSize, sampleRate, esds);
            return (0, create_boxes_1.createSTSDBox)([mp4a]);
        }
        var tenc = (0, create_boxes_1.createTENCBox)(1, 8, keyId);
        var schi = (0, isobmff_1.createBoxWithChildren)("schi", [tenc]);
        var schm = (0, create_boxes_1.createSCHMBox)("cenc", 65536);
        var frma = (0, create_boxes_1.createFRMABox)("mp4a");
        var sinf = (0, isobmff_1.createBoxWithChildren)("sinf", [frma, schm, schi]);
        var enca = (0, create_boxes_1.createENCABox)(1, channelsCount, sampleSize, packetSize, sampleRate, esds, sinf);
        return (0, create_boxes_1.createSTSDBox)([enca]);
    })();
    return (0, create_init_segment_1.default)(timescale, "audio", stsd, (0, create_boxes_1.createSMHDBox)(), 0, 0);
}
exports.default = createAudioInitSegment;
