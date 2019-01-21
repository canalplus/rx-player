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

import assert from "../../../utils/assert";
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
  return offsets != null ? buf.subarray(offsets[0] + 8, offsets[1]) : null;
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
  return offsets != null ? buf.subarray(offsets[0], offsets[1]) : null;
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
    assert(size > 0, "out of range size");
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
 * Returns TRAF Box from the whole ISOBMFF File.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getTRAF(buffer : Uint8Array) : Uint8Array|null {
  const moof = getBoxContent(buffer, 0x6d6f6f66 /* moof */);
  if (!moof) {
    return null;
  }
  return getBoxContent(moof, 0x74726166 /* traf */);
}

/**
 * Returns MDAT Box from the whole ISOBMFF File.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDAT(buf : Uint8Array) : Uint8Array|null {
  return getBoxContent(buf, 0x6D646174 /* "mdat" */);
}

/**
 * Returns MDIA Box from the whole ISOBMFF File.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDIA(buf : Uint8Array) : Uint8Array|null {
  const moov = getBoxContent(buf, 0x6d6f6f76 /* moov */);
  if (!moov) {
    return null;
  }

  const trak = getBoxContent(moov, 0x7472616b /* "trak" */);
  if (!trak) {
    return null;
  }

  return getBoxContent(trak, 0x6d646961 /* "mdia" */);
}

export {
  getBox,
  getBoxContent,
  getBoxOffsets,
  getTRAF,
  getMDAT,
  getMDIA,
};
