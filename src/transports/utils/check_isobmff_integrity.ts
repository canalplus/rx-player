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

import { OtherError } from "../../errors";
import log from "../../log";
import {
  be4toi,
  be8toi
} from "../../utils/byte_parsing";
import findCompleteBox from "./find_complete_box";

/**
 * Check if an ISOBMFF segment has all the right box needed to be decoded.
 * Throw if that's not the case.
 * @param {Uint8Array} buffer - The whole ISOBMFF segment
 * @param {boolean} isInitSegment - `true` if this is an initialization segment,
 * `false` otherwise.
 */
export default function checkISOBMFFIntegrity(
  buffer : Uint8Array,
  isInitSegment : boolean
) : void {
  if (isInitSegment) {
    const ftypIndex = findCompleteBox(buffer, 0x66747970 /* ftyp */);
    if (ftypIndex < 0) {
      throw new OtherError("INTEGRITY_ERROR", "Incomplete `ftyp` box");
    }
    const moovIndex = findCompleteBox(buffer, 0x6D6F6F76 /* moov */);
    if (moovIndex < 0) {
      throw new OtherError("INTEGRITY_ERROR", "Incomplete `moov` box");
    }
  } else {
    const moofIndex = findCompleteBox(buffer, 0x6D6F6F66 /* moof */);
    if (moofIndex < 0) {
      throw new OtherError("INTEGRITY_ERROR", "Incomplete `moof` box");
    }
    const mdatIndex = findCompleteBox(buffer, 0x6D646174 /* mdat */);
    if (mdatIndex < 0) {
      throw new OtherError("INTEGRITY_ERROR", "Incomplete `mdat` box");
    }
  }
}

/**
 * Check if the given ISOBMFF segment contains a truncated box at the end.
 * The returned value is a number which is equal to:
 *
 *   - `0` if nothing appear to be missing at the end of the segment
 *
 *   - a positive value if the last box in the given segment is missing some
 *     bytes. This value indicates the number of bytes missing.
 *
 *   - a negative value if the last box in the given segment is missing some
 *     bytes, but the box in question can be omitted from the chunk.
 *     That negative value is the amount of bytes you can remove from the end of
 *     the given segment.
 *
 * Returns `undefined` if we know data is missing but we cannot say how much.
 *
 * In the rare case we don't know whether data is missing or not (like when
 * getting a box with a length of `0` indicating that the box goes until the
 * end), we will assume that the given `buffer` is complete and just return `0`.
 *
 * Note: This code has been added - reluctantly - to work-around mistakes on the
 * byte-range of the last segment on some Canal+ streams. This is a lot of code
 * for a very rare problem which is on the content packaging size.
 *
 * @param {Uint8Array} buffer - The whole ISOBMFF segment
 * @param {boolean} isInitSegment - `true` if this is an initialization segment,
 * `false` otherwise.
 * @returns {number|undefined}
 */
export function getMissingBytes(
  buffer : Uint8Array,
  isInitSegment : boolean
) : number | undefined {
  const bufferLength = buffer.length;

  /** Every boxes name that should be encountered and complete. */
  const wantedCompleteBoxes = isInitSegment ? [0x66747970 /* ftyp */,
                                               0x6D6F6F76 /* moov */] :
                                              [0x6D6F6F66 /* moof */,
                                               0x6D646174 /* mdat */];
  /** Offset of the current considered box in `buffer`. */
  let boxBaseOffset = 0;
  /**
   * Name of the last box encountered.
   * Read as a 32bit (big endian) integer from `buffer`.
   * `undefined` if no box has been encountered yet.
   */
  let name : number | undefined;
  /**
   * Size of the last box encountered.
   * `undefined` if no box has been encountered yet.
   */
  let lastBoxSize : number | undefined;

  while (boxBaseOffset + 8 <= bufferLength) {
    lastBoxSize = be4toi(buffer, boxBaseOffset);
    name = be4toi(buffer, boxBaseOffset + 4);

    if (lastBoxSize === 0) { // == until the end of the segment
      // we can never now for sure...
      // Let's assume the segment is complete
      return 0;
    } else if (lastBoxSize === 1) { // == the size is on 8 bytes
      if (boxBaseOffset + 8 + 8 > bufferLength) {
        if (wantedCompleteBoxes.length === 0) {
          // We may have been loading too much data.
          // Return negative offset to remove that box from the range.
          return boxBaseOffset - bufferLength;
        }
        log.error("ISOBMFF: not enough bytes downloaded for knowing the size of box",
                  name);
        return undefined;
      }
      lastBoxSize = be8toi(buffer, boxBaseOffset + 8);
    }

    if (isNaN(lastBoxSize) && lastBoxSize < 0) { // shouldn't happen
      throw new Error("ISOBMFF: Size out of range");
    }

    // remove from `wantedCompleteBoxes` if found in it
    const indexOfName = wantedCompleteBoxes.indexOf(name);
    if (indexOfName >= 0) {
      wantedCompleteBoxes.splice(indexOfName, 1);
    }

    boxBaseOffset += lastBoxSize;
  }

  if (boxBaseOffset === bufferLength) {
    return wantedCompleteBoxes.length === 0 ? 0 :
                                              undefined;
  }

  // Check if we didn't just read too much
  if (wantedCompleteBoxes.length === 0) {
    const missingBytes = bufferLength - boxBaseOffset;

    // We may have been loading too much data.
    // Return negative offset.
    log.warn(`ISOBMFF: ISOBMFF box ${name ?? "unknown"}` +
             `is missing ${missingBytes} bytes.`);
    return boxBaseOffset - bufferLength;
  }

  if (boxBaseOffset + 4 <= bufferLength) { // there is enough to read the size
    lastBoxSize = be4toi(buffer, boxBaseOffset);
    if (lastBoxSize === 0) { // == until the end of the segment
      // we can never now for sure...
      // Let's assume the segment is complete
      return 0;
    } else if (lastBoxSize === 1) { // == the size is on 8 bytes
      log.error("ISOBMFF: not enough bytes downloaded for the last box.");
      return undefined;
    }
  }

  log.error("ISOBMFF: not enough bytes downloaded.");
  return undefined;
}
