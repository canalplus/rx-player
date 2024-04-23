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
var can_patch_isobmff_1 = require("../../../compat/can_patch_isobmff");
var isobmff_1 = require("../../../parsers/containers/isobmff");
var byte_parsing_1 = require("../../../utils/byte_parsing");
var create_boxes_1 = require("./create_boxes");
var create_traf_box_1 = require("./create_traf_box");
/**
 * Update ISOBMFF Segment downloaded in Smooth Streaming so it is playable on
 * the browser.
 * @param {Uint8Array} segment
 * @param {Number} decodeTime
 * @return {Uint8Array}
 */
function patchSegment(segment, decodeTime) {
    var oldMoofOffsets = (0, isobmff_1.getBoxOffsets)(segment, 0x6d6f6f66 /* moof */);
    if (oldMoofOffsets === null) {
        throw new Error("Smooth: Invalid ISOBMFF given");
    }
    var oldMoofContent = segment.subarray(oldMoofOffsets[1], oldMoofOffsets[2]);
    var mfhdBox = (0, isobmff_1.getBox)(oldMoofContent, 0x6d666864 /* mfhd */);
    var trafContent = (0, isobmff_1.getBoxContent)(oldMoofContent, 0x74726166 /* traf */);
    if (trafContent === null || mfhdBox === null) {
        throw new Error("Smooth: Invalid ISOBMFF given");
    }
    var tfhdOffsets = (0, isobmff_1.getBoxOffsets)(trafContent, 0x74666864 /* tfhd */);
    var oldTrunOffsets = (0, isobmff_1.getBoxOffsets)(trafContent, 0x7472756e /* trun */);
    if (tfhdOffsets === null || oldTrunOffsets === null) {
        throw new Error("Smooth: Invalid ISOBMFF given");
    }
    var tfhdBox = trafContent.subarray(tfhdOffsets[0], tfhdOffsets[2]);
    var oldTrunBox = trafContent.subarray(oldTrunOffsets[0], oldTrunOffsets[2]);
    // force trackId=1 since trackIds are not always reliable...
    tfhdBox.set([0, 0, 0, 1], tfhdOffsets[1] - tfhdOffsets[0] + 4 /* version + flags */);
    var tfdtBox = (0, create_boxes_1.createTfdtBox)(decodeTime);
    var newTrunBox = updateTrunDataOffset(oldTrunBox, oldTrunOffsets[1] - oldTrunOffsets[0]);
    var sencContent = (0, isobmff_1.getUuidContent)(trafContent, 0xa2394f52, 0x5a9b4f14, 0xa2446c42, 0x7c648df4);
    var newTrafBox = (0, create_traf_box_1.default)(tfhdBox, tfdtBox, newTrunBox, mfhdBox, sencContent);
    var newMoof = (0, isobmff_1.createBoxWithChildren)("moof", [mfhdBox, newTrafBox]);
    var newMoofOffsets = (0, isobmff_1.getBoxOffsets)(newMoof, 0x6d6f6f66 /* moof */);
    var newTrafOffsets = (0, isobmff_1.getBoxOffsets)(newTrafBox, 0x74726166 /* traf */);
    var newTrunOffsets = (0, isobmff_1.getBoxOffsets)(newTrunBox, 0x7472756e /* trun */);
    if (newMoofOffsets === null || newTrafOffsets === null || newTrunOffsets === null) {
        throw new Error("Smooth: Invalid moof, trun or traf generation");
    }
    /** index of the `data_offset` property from the trun box in the whole "moof". */
    var indexOfTrunDataOffsetInMoof = newMoofOffsets[1] -
        newMoofOffsets[0] +
        mfhdBox.length +
        /* new traf size + name */
        (newTrafOffsets[1] - newTrafOffsets[0]) +
        tfhdBox.length +
        tfdtBox.length +
        /* new trun size + name */
        (newTrunOffsets[1] - newTrunOffsets[0]) +
        8; /* trun version + flags + `sample_count` */
    var oldMoofLength = oldMoofOffsets[2] - oldMoofOffsets[0];
    var newMoofSizeDiff = newMoof.length - oldMoofLength;
    var oldMdatOffset = (0, isobmff_1.getBoxOffsets)(segment, 0x6d646174 /* "mdat" */);
    if (oldMdatOffset === null) {
        throw new Error("Smooth: Invalid ISOBMFF given");
    }
    if ((0, can_patch_isobmff_1.default)() && (newMoofSizeDiff === 0 || newMoofSizeDiff <= -8)) {
        // patch trun data_offset
        var mdatContentOffset = oldMdatOffset[1];
        newMoof.set((0, byte_parsing_1.itobe4)(mdatContentOffset), indexOfTrunDataOffsetInMoof);
        segment.set(newMoof, oldMoofOffsets[0]);
        // add "free" box for the remaining space
        if (newMoofSizeDiff <= -8) {
            segment.set((0, create_boxes_1.createFreeBox)(-newMoofSizeDiff), newMoof.length);
        }
        return segment;
    }
    else {
        // patch trun data_offset
        var mdatContentOffset = oldMdatOffset[1] + newMoofSizeDiff;
        newMoof.set((0, byte_parsing_1.itobe4)(mdatContentOffset), indexOfTrunDataOffsetInMoof);
        var newSegment = new Uint8Array(segment.length + newMoofSizeDiff);
        var beforeMoof = segment.subarray(0, oldMoofOffsets[0]);
        var afterMoof = segment.subarray(oldMoofOffsets[2], segment.length);
        newSegment.set(beforeMoof, 0);
        newSegment.set(newMoof, beforeMoof.length);
        newSegment.set(afterMoof, beforeMoof.length + newMoof.length);
        return newSegment;
    }
}
exports.default = patchSegment;
/**
 * Update `trun` box given or create a new one from it to add a data offset
 * flag and the corresponding space to set a data offset.
 * Do not do anything if the flag is already set.
 *
 * Note that the `oldTrunBox` given should not be mutated by this function but
 * the returned value CAN point to the exact same `Uint8Array`.
 *
 * @param {Uint8Array} oldTrunBox - The whole original trun box
 * @param {number} initialDataOffset - Offset at which the first value of the
 * "trun" box (the "version") is set.
 * @returns {Uint8Array}
 */
function updateTrunDataOffset(oldTrunBox, initialDataOffset) {
    var trunHasDataOffset = (oldTrunBox[initialDataOffset + 3 /* last flag */] & 0x01) > 0;
    if (trunHasDataOffset) {
        return oldTrunBox;
    }
    // If no data_offset is present, we create another "trun" with one
    var newTrunBox = new Uint8Array(oldTrunBox.length + 4);
    // copy size + name + version=1 + flags=3 + sample_count=4
    newTrunBox.set(oldTrunBox.subarray(0, initialDataOffset + 8), 0);
    // add data_offset flag
    newTrunBox[initialDataOffset + 3] = newTrunBox[initialDataOffset + 3] | 0x01;
    newTrunBox.set([0, 0, 0, 0], initialDataOffset + 8); // add data offset
    // add the rest
    newTrunBox.set(oldTrunBox.subarray(initialDataOffset + 8, oldTrunBox.length), initialDataOffset + 12);
    return (0, isobmff_1.updateBoxLength)(newTrunBox); // update the trun box's length
}
