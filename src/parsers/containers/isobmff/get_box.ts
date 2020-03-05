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

import { be4toi } from "../../../utils/byte_parsing";

/**
 * Returns the content of a box based on its name.
 * `null` if not found.
 * /!\ does not work with UUID boxes
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 4-letter 'name' of the box (e.g. 'sidx' or
 * 'moov'), hexa encoded
 * @returns {UInt8Array|null}
 */
function getBoxContent(buf : Uint8Array, boxName : number) : Uint8Array|null {
  const offsets = getBoxOffsets(buf, boxName);
  return offsets !== null ? buf.subarray(offsets[0] + 8, offsets[1]) :
                            null;
}

/**
 * Returns an ISOBMFF box based on its name.
 * `null` if not found.
 * /!\ does not work with UUID boxes
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 4-letter 'name' of the box (e.g. 'sidx' or
 * 'moov'), hexa encoded
 * @returns {UInt8Array|null}
 */
function getBox(buf : Uint8Array, boxName : number) : Uint8Array|null {
  const offsets = getBoxOffsets(buf, boxName);
  return offsets !== null ? buf.subarray(offsets[0], offsets[1]) :
                            null;
}

/**
 * Returns start and end offset for a given box.
 * `null` if not found.
 * /!\ does not work with UUID boxes
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 4-letter 'name' of the box (e.g. 'sidx' or
 * 'moov'), hexa encoded
 * @returns {Array.<number>|null}
 */
function getBoxOffsets(buf : Uint8Array, boxName : number) : [number, number]|null {
  const l = buf.length;
  let i = 0;

  let name : number;
  let size : number = 0;
  while (i + 8 < l) {
    size = be4toi(buf, i);
    name = be4toi(buf, i + 4);
    if (size <= 0) {
      throw new Error("ISOBMFF: Size out of range");
    }
    if (name === boxName) {
      break;
    } else {
      i += size;
    }
  }

  if (i < l) {
    return [i, i + size];
  } else {
    return null;
  }
}

/**
 * Gives the content of a specific UUID with its attached ID
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
) : Uint8Array|undefined {
  let len : number;
  const l = buf.length;
  for (let i = 0; i < l; i += len) {
    len = be4toi(buf, i);
    if (
      be4toi(buf, i +  4) === 0x75756964 /* === "uuid" */ &&
      be4toi(buf, i +  8) === id1 &&
      be4toi(buf, i + 12) === id2 &&
      be4toi(buf, i + 16) === id3 &&
      be4toi(buf, i + 20) === id4
    ) {
      return buf.subarray(i + 24, i + len);
    }
  }
}

export {
  getBox,
  getBoxContent,
  getBoxOffsets,
  getUuidContent,
};
