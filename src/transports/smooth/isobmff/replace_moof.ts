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
import { getBoxOffsets } from "../../../parsers/containers/isobmff";
import { itobe4 } from "../../../utils/byte_parsing";
import { createFreeBox } from "./create_boxes";

/**
 * Replace a moof in a segment by a new one.
 * @param {Uint8Array} segment
 * @param {Uint8Array} newMoof
 * @param {Array.<number>} moofOffsets
 * @param {number} trunOffsetInMoof
 * @returns {Uint8Array}
 */
export default function replaceMoofInSegment(
  segment : Uint8Array,
  newMoof : Uint8Array,
  moofOffsets : [number, number],
  trunOffsetInMoof : number
) : Uint8Array {
  const oldMoofLength = moofOffsets[1] - moofOffsets[0];
  const moofDelta = newMoof.length - oldMoofLength;

  const mdatOffsets = getBoxOffsets(segment, 0x6D646174 /* "mdat" */);
  if (mdatOffsets === null) {
    throw new Error("Smooth: Invalid ISOBMFF given");
  }
  if (canPatchISOBMFFSegment() && (moofDelta === 0 || moofDelta <= -8)) {
    // patch trun data_offset
    newMoof.set(itobe4(mdatOffsets[0] + 8), trunOffsetInMoof + 16);
    segment.set(newMoof, moofOffsets[0]);

    if (moofDelta <= -8) {
      segment.set(createFreeBox(-moofDelta), newMoof.length);
    }
    return segment;
  }

  // patch trun data_offset
  newMoof.set(itobe4(mdatOffsets[0] + moofDelta + 8), trunOffsetInMoof + 16);
  const newSegment = new Uint8Array(segment.length + moofDelta);
  const beforeMoof = segment.subarray(0, moofOffsets[0]);
  const afterMoof = segment.subarray(moofOffsets[1], segment.length);
  newSegment.set(beforeMoof, 0);
  newSegment.set(newMoof, beforeMoof.length);
  newSegment.set(afterMoof, beforeMoof.length + newMoof.length);
  return newSegment;
}
