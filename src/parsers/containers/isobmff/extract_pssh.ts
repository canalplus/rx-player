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

import canPatchOutPsshBox from "../../../compat/can_patch_out_pssh";
import log from "../../../log";
import sliceUint8Array from "../../../utils/slice_uint8array";
import { bytesToHex } from "../../../utils/string_parsing";
import { getBoxContent, getBoxOffsets } from "./get_box";

/** Information related to a PSSH box. */
export interface IISOBMFFPSSHInfo {
  /** Corresponding DRM's system ID, as an hexadecimal string. */
  systemId: string;
  /** Additional data contained in the PSSH Box. */
  data: Uint8Array<ArrayBuffer>;
}

/**
 * Return every `pssh` box from an ISOBMFF segment.
 *
 * If the current device has no issue with it, also replace them by `free` boxes.
 * Useful to manually manage encryption while avoiding the round-trip with the
 * browser's encrypted event.
 *
 * @param {Uint8Array} data - the ISOBMFF segment
 * @returns {Array.<Uint8Array>} - The extracted PSSH boxes. In the order they
 * are encountered.
 */
export default function extractPssh(data: Uint8Array<ArrayBuffer>): IISOBMFFPSSHInfo[] {
  const moovContent = getBoxContent(data, 0x6d6f6f76 /* moov */);
  if (moovContent === null) {
    return [];
  }

  const psshBoxes: IISOBMFFPSSHInfo[] = [];
  let remainingMoovContent = moovContent;
  while (remainingMoovContent.length > 0) {
    let psshOffsets;
    try {
      psshOffsets = getBoxOffsets(remainingMoovContent, 0x70737368 /* pssh */);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Unknown ISOBMFF box reading error");
      log.warn("isobmff", "Error while removing PSSH from ISOBMFF", err);
      return psshBoxes;
    }
    if (psshOffsets === null) {
      return psshBoxes;
    }
    const pssh = sliceUint8Array(remainingMoovContent, psshOffsets[0], psshOffsets[2]);
    const systemId = getPsshSystemID(pssh, psshOffsets[1] - psshOffsets[0]);
    if (systemId !== undefined) {
      psshBoxes.push({ systemId, data: pssh });
    }
    if (canPatchOutPsshBox()) {
      // replace by `free` box.
      remainingMoovContent[psshOffsets[0] + 4] = 0x66;
      remainingMoovContent[psshOffsets[0] + 5] = 0x72;
      remainingMoovContent[psshOffsets[0] + 6] = 0x65;
      remainingMoovContent[psshOffsets[0] + 7] = 0x65;
    }
    remainingMoovContent = remainingMoovContent.subarray(psshOffsets[2]);
  }
  return psshBoxes;
}

/**
 * Parse systemId from a "pssh" box into an hexadecimal string.
 * `undefined` if we could not extract a systemId.
 * @param {Uint8Array} buff - The pssh box
 * @param {number} initialDataOffset - offset of the first byte after the size
 * and name in this pssh box.
 * @returns {string|undefined}
 */
export function getPsshSystemID(
  buff: Uint8Array,
  initialDataOffset: number,
): string | undefined {
  if (buff[initialDataOffset] > 1) {
    log.warn("isobmff", "un-handled PSSH version");
    return undefined;
  }
  const offset = initialDataOffset + 4; /* version + flags */
  if (offset + 16 > buff.length) {
    return undefined;
  }
  const systemIDBytes = sliceUint8Array(buff, offset, offset + 16);
  return bytesToHex(systemIDBytes);
}
