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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVMHDBox = exports.createTfdtBox = exports.createTREXBox = exports.createTKHDBox = exports.createTENCBox = exports.createSTSDBox = exports.createSMHDBox = exports.createSCHMBox = exports.createSAIZBox = exports.createSAIOBox = exports.createMVHDBox = exports.createMP4ABox = exports.createMDHDBox = exports.createHDLRBox = exports.createFreeBox = exports.createFTYPBox = exports.createFRMABox = exports.createESDSBox = exports.createENCVBox = exports.createENCABox = exports.createDREFBox = exports.createAVCCBox = exports.createAVC1Box = void 0;
var isobmff_1 = require("../../../parsers/containers/isobmff");
var byte_parsing_1 = require("../../../utils/byte_parsing");
var string_parsing_1 = require("../../../utils/string_parsing");
/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} hRes - horizontal resolution, eg 72
 * @param {Number} vRes - vertical resolution, eg 72
 * @param {string} encName
 * @param {Number} colorDepth - eg 24
 * @param {Uint8Array} avcc - Uint8Array representing the avcC atom
 * @returns {Uint8Array}
 */
function createAVC1Box(width, height, hRes, vRes, encName, colorDepth, avcc) {
    return (0, isobmff_1.createBox)("avc1", (0, byte_parsing_1.concat)(6, // 6 bytes reserved
    (0, byte_parsing_1.itobe2)(1), 16, // drefIdx + QuickTime reserved, zeroes
    (0, byte_parsing_1.itobe2)(width), // size 2 w
    (0, byte_parsing_1.itobe2)(height), // size 2 h
    (0, byte_parsing_1.itobe2)(hRes), 2, // reso 4 h
    (0, byte_parsing_1.itobe2)(vRes), 2 + 4, // reso 4 v + QuickTime reserved, zeroes
    [0, 1, encName.length], // frame count (default 1)
    (0, string_parsing_1.strToUtf8)(encName), // 1byte len + encoder name str
    31 - encName.length, // + padding
    (0, byte_parsing_1.itobe2)(colorDepth), // color depth
    [0xff, 0xff], // reserved ones
    avcc));
}
exports.createAVC1Box = createAVC1Box;
/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} hRes - horizontal resolution, eg 72
 * @param {Number} vRes - vertical resolution, eg 72
 * @param {string} encName
 * @param {Number} colorDepth - eg 24
 * @param {Uint8Array} avcc - Uint8Array representing the avcC atom
 * @param {Uint8Array} sinf - Uint8Array representing the sinf atom
 * @returns {Uint8Array}
 */
function createENCVBox(width, height, hRes, vRes, encName, colorDepth, avcc, sinf) {
    return (0, isobmff_1.createBox)("encv", (0, byte_parsing_1.concat)(6, // 6 bytes reserved
    (0, byte_parsing_1.itobe2)(1), 16, // drefIdx + QuickTime reserved, zeroes
    (0, byte_parsing_1.itobe2)(width), // size 2 w
    (0, byte_parsing_1.itobe2)(height), // size 2 h
    (0, byte_parsing_1.itobe2)(hRes), 2, // reso 4 h
    (0, byte_parsing_1.itobe2)(vRes), 2 + 4, // reso 4 v + QuickTime reserved, zeroes
    [0, 1, encName.length], // frame count (default 1)
    (0, string_parsing_1.strToUtf8)(encName), // 1byte len + encoder name str
    31 - encName.length, // + padding
    (0, byte_parsing_1.itobe2)(colorDepth), // color depth
    [0xff, 0xff], // reserved ones
    avcc, // avcc atom,
    sinf));
}
exports.createENCVBox = createENCVBox;
/**
 * @param {Number} drefIdx
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {Uint8Array} esds - Uint8Array representing the esds atom
 * @returns {Uint8Array}
 */
function createMP4ABox(drefIdx, channelsCount, sampleSize, packetSize, sampleRate, esds) {
    return (0, isobmff_1.createBox)("mp4a", (0, byte_parsing_1.concat)(6, (0, byte_parsing_1.itobe2)(drefIdx), 8, (0, byte_parsing_1.itobe2)(channelsCount), (0, byte_parsing_1.itobe2)(sampleSize), 2, (0, byte_parsing_1.itobe2)(packetSize), (0, byte_parsing_1.itobe2)(sampleRate), 2, esds));
}
exports.createMP4ABox = createMP4ABox;
/**
 * @param {Number} drefIdx
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {Uint8Array} esds - Uint8Array representing the esds atom
 * @param {Uint8Array} [sinf] - Uint8Array representing the sinf atom,
 * only if name == "enca"
 * @returns {Uint8Array}
 */
function createENCABox(drefIdx, channelsCount, sampleSize, packetSize, sampleRate, esds, sinf) {
    return (0, isobmff_1.createBox)("enca", (0, byte_parsing_1.concat)(6, (0, byte_parsing_1.itobe2)(drefIdx), 8, (0, byte_parsing_1.itobe2)(channelsCount), (0, byte_parsing_1.itobe2)(sampleSize), 2, (0, byte_parsing_1.itobe2)(packetSize), (0, byte_parsing_1.itobe2)(sampleRate), 2, esds, sinf));
}
exports.createENCABox = createENCABox;
/**
 * @param {Uint8Array} url
 * @returns {Uint8Array}
 */
function createDREFBox(url) {
    // only one description here... FIXME
    return (0, isobmff_1.createBox)("dref", (0, byte_parsing_1.concat)(7, [1], url));
}
exports.createDREFBox = createDREFBox;
/**
 * @param {string} majorBrand
 * @param {Array.<string>} brands
 * @returns {Uint8Array}
 */
function createFTYPBox(majorBrand, brands) {
    var content = byte_parsing_1.concat.apply(void 0, __spreadArray([], __read([(0, string_parsing_1.strToUtf8)(majorBrand), [0, 0, 0, 1]].concat(brands.map(string_parsing_1.strToUtf8))), false));
    return (0, isobmff_1.createBox)("ftyp", content);
}
exports.createFTYPBox = createFTYPBox;
/**
 * @param {string} schemeType - four letters (eg "cenc" for Common Encryption)
 * @param {Number} schemeVersion - eg 65536
 * @returns {Uint8Array}
 */
function createSCHMBox(schemeType, schemeVersion) {
    return (0, isobmff_1.createBox)("schm", (0, byte_parsing_1.concat)(4, (0, string_parsing_1.strToUtf8)(schemeType), (0, byte_parsing_1.itobe4)(schemeVersion)));
}
exports.createSCHMBox = createSCHMBox;
/**
 * Create tfdt box from a decoding time.
 * @param {number} decodeTime
 * @returns {Uint8Array}
 */
function createTfdtBox(decodeTime) {
    return (0, isobmff_1.createBox)("tfdt", (0, byte_parsing_1.concat)([1, 0, 0, 0], (0, byte_parsing_1.itobe8)(decodeTime)));
}
exports.createTfdtBox = createTfdtBox;
/**
 * @returns {Uint8Array}
 */
function createVMHDBox() {
    var arr = new Uint8Array(12);
    arr[3] = 1; // QuickTime...
    return (0, isobmff_1.createBox)("vmhd", arr);
}
exports.createVMHDBox = createVMHDBox;
/**
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
function createTREXBox(trackId) {
    // default sample desc idx = 1
    return (0, isobmff_1.createBox)("trex", (0, byte_parsing_1.concat)(4, (0, byte_parsing_1.itobe4)(trackId), [0, 0, 0, 1], 12));
}
exports.createTREXBox = createTREXBox;
/**
 * @param {Number} length
 * @returns {Uint8Array}
 */
function createFreeBox(length) {
    return (0, isobmff_1.createBox)("free", new Uint8Array(length - 8));
}
exports.createFreeBox = createFreeBox;
/**
 * @param {Number} stream
 * @param {string} codecPrivateData - hex string
 * @returns {Uint8Array}
 */
function createESDSBox(stream, codecPrivateData) {
    return (0, isobmff_1.createBox)("esds", (0, byte_parsing_1.concat)(4, [0x03, 0x19], (0, byte_parsing_1.itobe2)(stream), [0x00, 0x04, 0x11, 0x40, 0x15], 11, [0x05, 0x02], (0, string_parsing_1.hexToBytes)(codecPrivateData), [0x06, 0x01, 0x02]));
}
exports.createESDSBox = createESDSBox;
/**
 * @param {string} dataFormat - four letters (eg "avc1")
 * @returns {Uint8Array}
 */
function createFRMABox(dataFormat) {
    return (0, isobmff_1.createBox)("frma", (0, string_parsing_1.strToUtf8)(dataFormat));
}
exports.createFRMABox = createFRMABox;
/**
 * @param {Uint8Array} sps
 * @param {Uint8Array} pps
 * @param {Number} nalLen - NAL Unit length: 1, 2 or 4 bytes
 * eg: avcc(0x4d, 0x40, 0x0d, 4, 0xe1, "674d400d96560c0efcb80a70505050a0",
 * 1, "68ef3880")
 * @returns {Uint8Array}
 */
function createAVCCBox(sps, pps, nalLen) {
    var nal;
    if (nalLen === 2) {
        nal = 0x1;
    }
    else if (nalLen === 4) {
        nal = 0x3;
    }
    else {
        nal = 0x0;
    }
    // Deduce AVC Profile from SPS
    var h264Profile = sps[1];
    var h264CompatibleProfile = sps[2];
    var h264Level = sps[3];
    return (0, isobmff_1.createBox)("avcC", (0, byte_parsing_1.concat)([1, h264Profile, h264CompatibleProfile, h264Level, (0x3f << 2) | nal, 0xe0 | 1], (0, byte_parsing_1.itobe2)(sps.length), sps, [1], (0, byte_parsing_1.itobe2)(pps.length), pps));
}
exports.createAVCCBox = createAVCCBox;
/**
 * @param {string} type - "video"/"audio"/"hint"
 * @returns {Uint8Array}
 */
function createHDLRBox(type) {
    var name;
    var handlerName;
    switch (type) {
        case "video":
            name = "vide";
            handlerName = "VideoHandler";
            break;
        case "audio":
            name = "soun";
            handlerName = "SoundHandler";
            break;
        default:
            name = "hint";
            handlerName = "";
            break;
    }
    return (0, isobmff_1.createBox)("hdlr", (0, byte_parsing_1.concat)(8, (0, string_parsing_1.strToUtf8)(name), 12, (0, string_parsing_1.strToUtf8)(handlerName), 1));
}
exports.createHDLRBox = createHDLRBox;
/**
 * @param {number} timescale
 * @returns {Uint8Array}
 */
function createMDHDBox(timescale) {
    return (0, isobmff_1.createBox)("mdhd", (0, byte_parsing_1.concat)(12, (0, byte_parsing_1.itobe4)(timescale), 8));
}
exports.createMDHDBox = createMDHDBox;
/**
 * @param {Number} timescale
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
function createMVHDBox(timescale, trackId) {
    return (0, isobmff_1.createBox)("mvhd", (0, byte_parsing_1.concat)(12, (0, byte_parsing_1.itobe4)(timescale), 4, [0, 1], 2, // we assume rate = 1;
    [1, 0], 10, // we assume volume = 100%;
    [0, 1], 14, // default matrix
    [0, 1], 14, // default matrix
    [64, 0, 0, 0], 26, (0, byte_parsing_1.itobe2)(trackId + 1)));
}
exports.createMVHDBox = createMVHDBox;
/**
 * @param {Uint8Array} mfhd
 * @param {Uint8Array} tfhd
 * @param {Uint8Array} tfdt
 * @param {Uint8Array} trun
 * @returns {Uint8Array}
 */
function createSAIOBox(mfhd, tfhd, tfdt, trun) {
    return (0, isobmff_1.createBox)("saio", (0, byte_parsing_1.concat)(4, [0, 0, 0, 1], // ??
    (0, byte_parsing_1.itobe4)(mfhd.length + tfhd.length + tfdt.length + trun.length + 8 + 8 + 8 + 8)));
}
exports.createSAIOBox = createSAIOBox;
/**
 * @param {Uint8Array} sencContent - including 8 bytes flags and entries count
 * @returns {Uint8Array}
 */
function createSAIZBox(sencContent) {
    if (sencContent.length === 0) {
        return (0, isobmff_1.createBox)("saiz", new Uint8Array(0));
    }
    var flags = (0, byte_parsing_1.be4toi)(sencContent, 0);
    var entries = (0, byte_parsing_1.be4toi)(sencContent, 4);
    var arr = new Uint8Array(entries + 9);
    arr.set((0, byte_parsing_1.itobe4)(entries), 5);
    var i = 9;
    var j = 8;
    var pairsCnt;
    var pairsLen;
    while (j < sencContent.length) {
        j += 8; // assuming IV is 8 bytes TODO handle 16 bytes IV
        // if we have extradata for each entry
        if ((flags & 0x2) === 0x2) {
            pairsLen = 2;
            pairsCnt = (0, byte_parsing_1.be2toi)(sencContent, j);
            j += pairsCnt * 6 + 2;
        }
        else {
            pairsCnt = 0;
            pairsLen = 0;
        }
        arr[i] = pairsCnt * 6 + 8 + pairsLen;
        i++;
    }
    return (0, isobmff_1.createBox)("saiz", arr);
}
exports.createSAIZBox = createSAIZBox;
/**
 * @returns {Uint8Array}
 */
function createSMHDBox() {
    return (0, isobmff_1.createBox)("smhd", new Uint8Array(8));
}
exports.createSMHDBox = createSMHDBox;
/**
 * @param {Array.<Uint8Array>} reps - arrays of Uint8Array,
 * typically [avc1] or [encv, avc1]
 * @returns {Uint8Array}
 */
function createSTSDBox(reps) {
    // only one description here... FIXME
    var arrBase = [7, [reps.length]];
    return (0, isobmff_1.createBox)("stsd", byte_parsing_1.concat.apply(void 0, __spreadArray([], __read(arrBase.concat(reps)), false)));
}
exports.createSTSDBox = createSTSDBox;
/**
 * @param {Number} width
 * @param {Number} height
 * @param {Number} trackId
 * @returns {Uint8Array}
 */
function createTKHDBox(width, height, trackId) {
    return (0, isobmff_1.createBox)("tkhd", (0, byte_parsing_1.concat)((0, byte_parsing_1.itobe4)(1 + 2 + 4), 8, // we assume track is enabled,
    // in media and in preview.
    (0, byte_parsing_1.itobe4)(trackId), 20, // we assume trackId = 1;
    [1, 0, 0, 0], // we assume volume = 100%;
    [0, 1, 0, 0], 12, // default matrix
    [0, 1, 0, 0], 12, // default matrix
    [64, 0, 0, 0], // ??
    (0, byte_parsing_1.itobe2)(width), 2, // width (TODO handle fixed)
    (0, byte_parsing_1.itobe2)(height), 2));
}
exports.createTKHDBox = createTKHDBox;
/**
 * @param {Number} algId - eg 1
 * @param {Number} ivSize - eg 8
 * @param {string} keyId - Hex KID 93789920e8d6520098577df8f2dd5546
 * @returns {Uint8Array}
 */
function createTENCBox(algId, ivSize, keyId) {
    return (0, isobmff_1.createBox)("tenc", (0, byte_parsing_1.concat)(6, [algId, ivSize], keyId));
}
exports.createTENCBox = createTENCBox;
