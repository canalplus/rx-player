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
import sliceUint8Array from "../../../utils/slice_uint8array";
import { bytesToHex } from "../../../utils/string_parsing";
import {
  getBoxContent,
  getBoxOffsets,
} from "./get_box";

/** Information related to a PSSH box. */
export interface IISOBMFFPSSHInfo {
  /** Corresponding DRM's system ID, as an hexadecimal string. */
  systemId : string;
  /** Additional data contained in the PSSH Box. */
  data : Uint8Array;
}

/**
 * Replace every PSSH box from an ISOBMFF segment by FREE boxes and returns the
 * removed PSSH in an array.
 * Useful to manually manage encryption while avoiding the round-trip with the
 * browser's encrypted event.
 * @param {Uint8Array} data - the ISOBMFF segment
 * @returns {Array.<Uint8Array>} - The extracted PSSH boxes. In the order they
 * are encountered.
 */
export default function takePSSHOut(data : Uint8Array) : IISOBMFFPSSHInfo[] {
  let i = 0;
  const moov = getBoxContent(data, 0x6D6F6F76 /* moov */);
  if (moov === null) {
    return [];
  }

  const psshBoxes : IISOBMFFPSSHInfo[] = [];
  while (i < moov.length) {
    let psshOffsets;
    try {
      psshOffsets = getBoxOffsets(moov, 0x70737368 /* pssh */);
    } catch (e) {
      log.warn("ISOBMFF:", e);
      return psshBoxes;
    }
    if (psshOffsets == null) {
      return psshBoxes;
    }
    const pssh = sliceUint8Array(moov, psshOffsets[0], psshOffsets[2]);
    const systemId = getPsshSystemID(pssh, psshOffsets[1] - psshOffsets[0]);
    if (systemId !== null) {
      psshBoxes.push({ systemId, data: pssh });
    }

    // replace by `free` box.
    moov[psshOffsets[0] + 4] = 0x66;
    moov[psshOffsets[0] + 5] = 0x72;
    moov[psshOffsets[0] + 6] = 0x65;
    moov[psshOffsets[0] + 7] = 0x65;
    i = psshOffsets[2];
  }
  return psshBoxes;
}

/**
 * Parse systemId from a "pssh" box into an hexadecimal string.
 * @param {Uint8Array} buff - The pssh box
 * @param {number} initialDataOffset - offset of the first byte after the size
 * and name in this pssh box.
 * @returns {string|null}
 */
export function getPsshSystemID(
  buff : Uint8Array,
  initialDataOffset : number
) : string|null {
  if (buff[initialDataOffset] > 1) {
    log.warn("ISOBMFF: un-handled PSSH version");
    return null;
  }
  const offset = initialDataOffset +
                 4; /* version + flags */
  if (offset + 16 > buff.length) {
    return null;
  }
  const systemIDBytes = sliceUint8Array(buff, offset, offset + 16);
  return bytesToHex(systemIDBytes);
}
