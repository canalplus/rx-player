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
Object.defineProperty(exports, "__esModule", { value: true });
var isobmff_1 = require("../../../parsers/containers/isobmff");
var string_parsing_1 = require("../../../utils/string_parsing");
var create_boxes_1 = require("./create_boxes");
var create_init_segment_1 = require("./create_init_segment");
/**
 * Return full video Init segment as Uint8Array
 * @param {Number} timescale - lowest number, this one will be set into mdhd
 * *10000 in mvhd, e.g. 1000
 * @param {Number} width
 * @param {Number} height
 * @param {Number} hRes
 * @param {Number} vRes
 * @param {Number} nalLength (1, 2 or 4)
 * @param {string} codecPrivateData
 * @param {Uint8Array} [keyId]
 * @returns {Uint8Array}
 */
function createVideoInitSegment(timescale, width, height, hRes, vRes, nalLength, codecPrivateData, keyId) {
    var _a = __read(codecPrivateData.split("00000001"), 3), spsHex = _a[1], ppsHex = _a[2];
    if (spsHex === undefined || ppsHex === undefined) {
        throw new Error("Smooth: unsupported codec private data.");
    }
    var sps = (0, string_parsing_1.hexToBytes)(spsHex);
    var pps = (0, string_parsing_1.hexToBytes)(ppsHex);
    // TODO NAL length is forced to 4
    var avcc = (0, create_boxes_1.createAVCCBox)(sps, pps, nalLength);
    var stsd;
    if (keyId === undefined) {
        var avc1 = (0, create_boxes_1.createAVC1Box)(width, height, hRes, vRes, "AVC Coding", 24, avcc);
        stsd = (0, create_boxes_1.createSTSDBox)([avc1]);
    }
    else {
        var tenc = (0, create_boxes_1.createTENCBox)(1, 8, keyId);
        var schi = (0, isobmff_1.createBoxWithChildren)("schi", [tenc]);
        var schm = (0, create_boxes_1.createSCHMBox)("cenc", 65536);
        var frma = (0, create_boxes_1.createFRMABox)("avc1");
        var sinf = (0, isobmff_1.createBoxWithChildren)("sinf", [frma, schm, schi]);
        var encv = (0, create_boxes_1.createENCVBox)(width, height, hRes, vRes, "AVC Coding", 24, avcc, sinf);
        stsd = (0, create_boxes_1.createSTSDBox)([encv]);
    }
    return (0, create_init_segment_1.default)(timescale, "video", stsd, (0, create_boxes_1.createVMHDBox)(), width, height);
}
exports.default = createVideoInitSegment;
