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

import log from "../../../log";
import { concat } from "../../../utils/byte_parsing";
import {
  getBoxContent,
  getBoxOffsets,
} from "./get_box";

/**
 * Replace every PSSH box from an ISOBMFF segment by FREE boxes and returns the
 * removed PSSH in an array.
 * Useful to manually manage encryption while avoiding the round-trip with the
 * browser's encrypted event.
 * @param {Uint8Array} data - the ISOBMFF segment
 * @returns {Array.<Uint8Array>} - The extracted PSSH boxes. In the order they
 * are encountered.
 */
export default function takePSSHOut(data : Uint8Array) : Uint8Array {
  let i = 0;
  const moov = getBoxContent(data, 0x6D6F6F76 /* moov */);
  if (moov === null) {
    return new Uint8Array([]);
  }

  const psshBoxes : Uint8Array[] = [];
  while (i < moov.length) {
    let psshOffsets : [number, number]|null;
    try {
      psshOffsets = getBoxOffsets(moov, 0x70737368 /* pssh */);
    } catch (e) {
      log.warn(e);
      return concat(...psshBoxes);
    }
    if (psshOffsets == null) {
      return concat(...psshBoxes);
    }
    psshBoxes.push(moov.slice(psshOffsets[0], psshOffsets[1]));

    // replace by `free` box.
    moov[psshOffsets[0] + 4] = 0x66;
    moov[psshOffsets[0] + 5] = 0x72;
    moov[psshOffsets[0] + 6] = 0x65;
    moov[psshOffsets[0] + 7] = 0x65;
    i = psshOffsets[1];
  }
  return concat(...psshBoxes);
}
