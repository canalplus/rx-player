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

import {
  createBoxWithChildren,
  getBox,
  getBoxContent,
  getBoxOffsets,
  getUuidContent,
} from "../../../parsers/containers/isobmff";
import addDataOffsetFlagInTrun from "./add_data_offset_flag_in_trun";
import { createTfdtBox, } from "./create_boxes";
import createTrafBox from "./create_traf_box";
import replaceMoofInSegment from "./replace_moof";

/**
 * Patch ISOBMFF Segment downloaded in Smooth Streaming.
 * @param {Uint8Array} segment
 * @param {Number} decodeTime
 * @return {Uint8Array}
 */
export default function patchSegment(
  segment : Uint8Array,
  decodeTime : number
) : Uint8Array {
  const moofOffsets = getBoxOffsets(segment, 0x6D6F6F66 /* moof */);
  if (moofOffsets === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }
  const moofContent = segment.subarray(moofOffsets[0] + 8, moofOffsets[1]);

  const mfhdBox = getBox(moofContent, 0x6D666864 /* mfhd */);
  const trafContent = getBoxContent(moofContent, 0x74726166 /* traf */);
  if (trafContent === null || mfhdBox === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }

  const tfhdBox = getBox(trafContent, 0x74666864 /* tfhd */);
  const trunBox = getBox(trafContent, 0x7472756E /* trun */);
  if (tfhdBox === null || trunBox === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }

  // force trackId=1 since trackIds are not always reliable...
  tfhdBox.set([0, 0, 0, 1], 12);

  const tfdtBox = createTfdtBox(decodeTime);
  const newTrunBox = addDataOffsetFlagInTrun(trunBox);
  const sencContent = getUuidContent(trafContent,
                                     0xA2394F52,
                                     0x5A9B4F14,
                                     0xA2446C42,
                                     0x7C648DF4);
  const newTrafBox = createTrafBox(tfhdBox, tfdtBox, newTrunBox, mfhdBox, sencContent);
  const newMoof = createBoxWithChildren("moof", [mfhdBox, newTrafBox]);
  const trunOffsetInMoof = mfhdBox.length + tfhdBox.length + tfdtBox.length +
    8 /* moof size + name */ +
    8 /* traf size + name */;

  return replaceMoofInSegment(segment, newMoof, moofOffsets, trunOffsetInMoof);
}
