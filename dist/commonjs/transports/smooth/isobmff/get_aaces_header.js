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
var byte_parsing_1 = require("../../../utils/byte_parsing");
var string_parsing_1 = require("../../../utils/string_parsing");
/**
 * Sampling frequencies defined in MPEG-4 Audio.
 * @type {Array.<Number>}
 */
var SAMPLING_FREQUENCIES = [
    96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350,
];
/**
 * Return AAC ES Header (hexstr form)
 *
 * @param {Number} type
 *          1 = AAC Main
 *          2 = AAC LC
 *          cf http://wiki.multimedia.cx/index.php?title=MPEG-4_Audio
 * @param {Number} frequency
 * @param {Number} chans (1 or 2)
 * @returns {string}
 */
function getAacesHeader(type, frequency, chans) {
    var freq = SAMPLING_FREQUENCIES.indexOf(frequency); // TODO : handle Idx = 15...
    var val;
    val = (type & 0x3f) << 0x4;
    val = (val | (freq & 0x1f)) << 0x4;
    val = (val | (chans & 0x1f)) << 0x3;
    return (0, string_parsing_1.bytesToHex)((0, byte_parsing_1.itobe2)(val));
}
exports.default = getAacesHeader;
