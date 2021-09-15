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
import {
  be4toi,
  be8toi,
} from "../../../utils/byte_parsing";

/**
 * Returns the content of a box based on its name.
 * `null` if not found.
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 bit integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {UInt8Array|null}
 */
function getBoxContent(buf : Uint8Array, boxName : number) : Uint8Array|null {
  const offsets = getBoxOffsets(buf, boxName);
  return offsets !== null ? buf.subarray(offsets[1], offsets[2]) :
                            null;
}

/**
 * Returns an ISOBMFF box - size and name included - based on its name.
 * `null` if not found.
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 bit integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {UInt8Array|null}
 */
function getBox(buf : Uint8Array, boxName : number) : Uint8Array|null {
  const offsets = getBoxOffsets(buf, boxName);
  return offsets !== null ? buf.subarray(offsets[0], offsets[2]) :
                            null;
}

/**
 * Returns byte offsets for the start of the box, the start of its content and
 * the end of the box (not inclusive).
 *
 * `null` if not found.
 *
 * If found, the tuple returned has three elements, all numbers:
 *   1. The starting byte corresponding to the start of the box (from its size)
 *   2. The beginning of the box content - meaning the first byte after the
 *      size and the name of the box.
 *   3. The first byte after the end of the box, might be equal to `buf`'s
 *      length if we're considering the last box.
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 bit integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {Array.<number>|null}
 */
function getBoxOffsets(
  buf : Uint8Array,
  boxName : number
) : [ number /* start byte */,
      number /* First byte after the size and name (where the content begins)*/,
      number /* end byte, not included. */] |
    null {
  const len = buf.length;

  let boxBaseOffset = 0;
  let name : number;
  let lastBoxSize : number = 0;
  let lastOffset;
  while (boxBaseOffset + 8 <= len) {
    lastOffset = boxBaseOffset;
    lastBoxSize = be4toi(buf, lastOffset);
    lastOffset += 4;

    name = be4toi(buf, lastOffset);
    lastOffset += 4;

    if (lastBoxSize === 0) {
      lastBoxSize = len - boxBaseOffset;
    } else if (lastBoxSize === 1) {
      if (lastOffset + 8 > len) {
        return null;
      }
      lastBoxSize = be8toi(buf, lastOffset);
      lastOffset += 8;
    }

    if (lastBoxSize < 0) {
      throw new Error("ISOBMFF: Size out of range");
    }
    if (name === boxName) {
      if (boxName  === 0x75756964 /* === "uuid" */) {
        lastOffset += 16; // Skip uuid name
      }
      return [boxBaseOffset, lastOffset, boxBaseOffset + lastBoxSize];
    } else {
      boxBaseOffset += lastBoxSize;
    }
  }
  return null;
}

/**
 * Gives the content of a specific UUID box.
 * `undefined` if that box is not found.
 *
 * If found, the returned Uint8Array contains just the box's content: the box
 * without its name and size.
 * @param {Uint8Array} buf
 * @param {Number} id1
 * @param {Number} id2
 * @param {Number} id3
 * @param {Number} id4
 * @returns {Uint8Array|undefined}
 */
function getUuidContent(
  buf : Uint8Array,
  id1 : number,
  id2 : number,
  id3 : number,
  id4 : number
) : Uint8Array | undefined {
  const len = buf.length;

  let boxSize : number;
  for (let boxBaseOffset = 0; boxBaseOffset < len; boxBaseOffset += boxSize) {
    let currentOffset = boxBaseOffset;
    boxSize = be4toi(buf, currentOffset);
    currentOffset += 4;

    const boxName = be4toi(buf, currentOffset);
    currentOffset += 4;

    if (boxSize === 0) {
      boxSize = len - boxBaseOffset;
    } else if (boxSize === 1) {
      if (currentOffset + 8 > len) {
        return undefined;
      }
      boxSize = be8toi(buf, currentOffset);
      currentOffset += 8;
    }

    if (
      boxName  === 0x75756964 /* === "uuid" */ &&
      currentOffset + 16 <= len &&
      be4toi(buf, currentOffset) === id1 &&
      be4toi(buf, currentOffset + 4) === id2 &&
      be4toi(buf, currentOffset + 8) === id3 &&
      be4toi(buf, currentOffset + 12) === id4
    ) {
      currentOffset += 16;
      return buf.subarray(currentOffset, boxBaseOffset + boxSize);
    }
  }
}

/**
 * For the next encountered box, return byte offsets corresponding to:
 *   1. the starting byte offset for the next box (should always be equal to
 *       `0`).
 *   2. The beginning of the box content - meaning the first byte after the
 *      size and the name of the box.
 *   3. The first byte after the end of the box, might be equal to `buf`'s
 *      length if we're considering the last box.
 *
 * `null` if no box is found.
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 bit integer
 * generated from encoding the corresponding ASCII in big endian.
 */
function getNextBoxOffsets(buf : Uint8Array

) : [ 0 /* start byte */,
      number /* First byte after the size and name (where the content begins)*/,
      number /* end byte, not included. */] |
    null {
  const len = buf.length;
  if (len < 8) {
    log.warn("ISOBMFF: box inferior to 8 bytes, cannot find offsets");
    return null;
  }
  let lastOffset = 0;
  let boxSize = be4toi(buf, lastOffset);
  lastOffset += 4;

  const name = be4toi(buf, lastOffset);
  lastOffset += 4;

  if (boxSize === 0) {
    boxSize = len;
  } else if (boxSize === 1) {
    if (lastOffset + 8 > len) {
      log.warn("ISOBMFF: box too short, cannot find offsets");
      return null;
    }
    boxSize = be8toi(buf, lastOffset);
    lastOffset += 8;
  }

  if (boxSize < 0) {
    throw new Error("ISOBMFF: Size out of range");
  }
  if (name  === 0x75756964 /* === "uuid" */) {
    lastOffset += 16; // Skip uuid name
  }
  return [0, lastOffset, boxSize];
}

export {
  getBox,
  getBoxContent,
  getBoxOffsets,
  getNextBoxOffsets,
  getUuidContent,
};
