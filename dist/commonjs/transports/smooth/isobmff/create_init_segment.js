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
var byte_parsing_1 = require("../../../utils/byte_parsing");
var create_boxes_1 = require("./create_boxes");
/**
 * @param {Uint8Array} mvhd
 * @param {Uint8Array} mvex
 * @param {Uint8Array} trak
 * @returns {Array.<Uint8Array>}
 */
function createMOOVBox(mvhd, mvex, trak) {
    var children = [mvhd, mvex, trak];
    return (0, isobmff_1.createBoxWithChildren)("moov", children);
}
/**
 * Create an initialization segment with the information given.
 * @param {Number} timescale
 * @param {string} type
 * @param {Uint8Array} stsd
 * @param {Uint8Array} mhd
 * @param {Number} width
 * @param {Number} height
 * @param {Array.<Object>} pssList - List of dict, example:
 * {systemId: "DEADBEEF", codecPrivateData: "DEAFBEEF}
 * @returns {Uint8Array}
 */
function createInitSegment(timescale, type, stsd, mhd, width, height) {
    var stbl = (0, isobmff_1.createBoxWithChildren)("stbl", [
        stsd,
        (0, isobmff_1.createBox)("stts", new Uint8Array(0x08)),
        (0, isobmff_1.createBox)("stsc", new Uint8Array(0x08)),
        (0, isobmff_1.createBox)("stsz", new Uint8Array(0x0c)),
        (0, isobmff_1.createBox)("stco", new Uint8Array(0x08)),
    ]);
    var url = (0, isobmff_1.createBox)("url ", new Uint8Array([0, 0, 0, 1]));
    var dref = (0, create_boxes_1.createDREFBox)(url);
    var dinf = (0, isobmff_1.createBoxWithChildren)("dinf", [dref]);
    var minf = (0, isobmff_1.createBoxWithChildren)("minf", [mhd, dinf, stbl]);
    var hdlr = (0, create_boxes_1.createHDLRBox)(type);
    var mdhd = (0, create_boxes_1.createMDHDBox)(timescale); // this one is really important
    var mdia = (0, isobmff_1.createBoxWithChildren)("mdia", [mdhd, hdlr, minf]);
    var tkhd = (0, create_boxes_1.createTKHDBox)(width, height, 1);
    var trak = (0, isobmff_1.createBoxWithChildren)("trak", [tkhd, mdia]);
    var trex = (0, create_boxes_1.createTREXBox)(1);
    var mvex = (0, isobmff_1.createBoxWithChildren)("mvex", [trex]);
    var mvhd = (0, create_boxes_1.createMVHDBox)(timescale, 1); // in fact, we don't give a sh** about
    // this value :O
    var moov = createMOOVBox(mvhd, mvex, trak);
    var ftyp = (0, create_boxes_1.createFTYPBox)("isom", ["isom", "iso2", "iso6", "avc1", "dash"]);
    return (0, byte_parsing_1.concat)(ftyp, moov);
}
exports.default = createInitSegment;
