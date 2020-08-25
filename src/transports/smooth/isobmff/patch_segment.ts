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

import { canPatchISOBMFFSegment } from "../../../compat";
import {
  createBoxWithChildren,
  getBox,
  getBoxContent,
  getBoxOffsets,
  getUuidContent,
  updateBoxLength,
} from "../../../parsers/containers/isobmff";
import { itobe4 } from "../../../utils/byte_parsing";
import {
  createFreeBox,
  createTfdtBox,
} from "./create_boxes";
import createTrafBox from "./create_traf_box";

/**
 * Update ISOBMFF Segment downloaded in Smooth Streaming so it is playable on
 * the browser.
 * @param {Uint8Array} segment
 * @param {Number} decodeTime
 * @return {Uint8Array}
 */
export default function patchSegment(
  segment : Uint8Array,
  decodeTime : number
) : Uint8Array {
  const oldMoofOffsets = getBoxOffsets(segment, 0x6D6F6F66 /* moof */);
  if (oldMoofOffsets === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }
  const oldMoofContent = segment.subarray(oldMoofOffsets[1], oldMoofOffsets[2]);

  const mfhdBox = getBox(oldMoofContent, 0x6D666864 /* mfhd */);
  const trafContent = getBoxContent(oldMoofContent, 0x74726166 /* traf */);
  if (trafContent === null || mfhdBox === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }

  const tfhdOffsets = getBoxOffsets(trafContent, 0x74666864 /* tfhd */);
  const oldTrunOffsets = getBoxOffsets(trafContent, 0x7472756E /* trun */);
  if (tfhdOffsets === null || oldTrunOffsets === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }
  const tfhdBox = trafContent.subarray(tfhdOffsets[0], tfhdOffsets[2]);
  const oldTrunBox = trafContent.subarray(oldTrunOffsets[0], oldTrunOffsets[2]);

  // force trackId=1 since trackIds are not always reliable...
  tfhdBox.set([0, 0, 0, 1], tfhdOffsets[1] - tfhdOffsets[0] + 4 /* version + flags */);

  const tfdtBox = createTfdtBox(decodeTime);

  const newTrunBox = updateTrunDataOffset(oldTrunBox,
                                          oldTrunOffsets[1] - oldTrunOffsets[0]);
  const sencContent = getUuidContent(trafContent, 0xA2394F52,
                                                  0x5A9B4F14,
                                                  0xA2446C42,
                                                  0x7C648DF4);
  const newTrafBox = createTrafBox(tfhdBox, tfdtBox, newTrunBox, mfhdBox, sencContent);
  const newMoof = createBoxWithChildren("moof", [mfhdBox, newTrafBox]);

  const newMoofOffsets = getBoxOffsets(newMoof, 0x6D6F6F66 /* moof */);
  const newTrafOffsets = getBoxOffsets(newTrafBox, 0x74726166 /* traf */);
  const newTrunOffsets = getBoxOffsets(newTrunBox, 0x7472756E /* trun */);
  if (newMoofOffsets === null || newTrafOffsets === null || newTrunOffsets === null) {
    throw new Error("Smooth: Invalid moof, trun or traf generation");
  }
  /** index of the `data_offset` property from the trun box in the whole "moof". */
  const indexOfTrunDataOffsetInMoof = /* new moof size + name */ +
                                      (newMoofOffsets[1] - newMoofOffsets[0]) +
                                      mfhdBox.length +

                                      /* new traf size + name */
                                      (newTrafOffsets[1] - newTrafOffsets[0]) +
                                      tfhdBox.length +
                                      tfdtBox.length +

                                      /* new trun size + name */
                                      (newTrunOffsets[1] - newTrunOffsets[0]) +
                                      8 /* trun version + flags + `sample_count` */;

  const oldMoofLength = oldMoofOffsets[2] - oldMoofOffsets[0];
  const newMoofSizeDiff = newMoof.length - oldMoofLength;

  const oldMdatOffset = getBoxOffsets(segment, 0x6D646174 /* "mdat" */);
  if (oldMdatOffset === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }

  if (canPatchISOBMFFSegment() && (newMoofSizeDiff === 0 || newMoofSizeDiff <= -8)) {
    // patch trun data_offset
    const mdatContentOffset = oldMdatOffset[1];
    newMoof.set(itobe4(mdatContentOffset), indexOfTrunDataOffsetInMoof);
    segment.set(newMoof, oldMoofOffsets[0]);

    // add "free" box for the remaining space
    if (newMoofSizeDiff <= -8) {
      segment.set(createFreeBox(-newMoofSizeDiff), newMoof.length);
    }

    return segment;
  } else {
    // patch trun data_offset
    const mdatContentOffset = oldMdatOffset[1] + newMoofSizeDiff;
    newMoof.set(itobe4(mdatContentOffset), indexOfTrunDataOffsetInMoof);

    const newSegment = new Uint8Array(segment.length + newMoofSizeDiff);
    const beforeMoof = segment.subarray(0, oldMoofOffsets[0]);
    const afterMoof = segment.subarray(oldMoofOffsets[2], segment.length);
    newSegment.set(beforeMoof, 0);
    newSegment.set(newMoof, beforeMoof.length);
    newSegment.set(afterMoof, beforeMoof.length + newMoof.length);
    return newSegment;
  }
}

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
function updateTrunDataOffset(
  oldTrunBox : Uint8Array,
  initialDataOffset : number
) : Uint8Array {
  const trunHasDataOffset =
    (oldTrunBox[initialDataOffset + 3 /* last flag */] & 0x01) > 0;
  if (trunHasDataOffset) {
    return oldTrunBox;
  }

  // If no data_offset is present, we create another "trun" with one
  const newTrunBox = new Uint8Array(oldTrunBox.length + 4);

  // copy size + name + version=1 + flags=3 + sample_count=4
  newTrunBox.set(oldTrunBox.subarray(0, initialDataOffset + 8), 0);

  // add data_offset flag
  newTrunBox[initialDataOffset + 3] = newTrunBox[initialDataOffset + 3] | 0x01;

  newTrunBox.set([0, 0, 0, 0], initialDataOffset + 8); // add data offset

  // add the rest
  newTrunBox.set(oldTrunBox.subarray(initialDataOffset + 8, oldTrunBox.length),
                 initialDataOffset + 12);
  return updateBoxLength(newTrunBox); // update the trun box's length
}
