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
import { be4toi } from "../../../utils/bytes";

/**
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} boxName - the 'name' of the box (e.g. 'sidx' or 'moov'),
 * hexa encoded
 * @returns {UInt8Array|null}
 */
function getBox(buf : Uint8Array, boxName : number) : Uint8Array|null {
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
    return buf.subarray(i + 8, i + size);
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
  const moof = getBox(buffer, 0x6d6f6f66 /* moof */);
  if (!moof) {
    return null;
  }
  return getBox(moof, 0x74726166 /* traf */);
}

/**
 * Returns MDAT Box from the whole ISOBMFF File.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDAT(buf : Uint8Array) : Uint8Array|null {
  return getBox(buf, 0x6D646174 /* "mdat" */);
}

/**
 * Returns MDIA Box from the whole ISOBMFF File.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDIA(buf : Uint8Array) : Uint8Array|null {
  const moov = getBox(buf, 0x6d6f6f76 /* moov */);
  if (!moov) {
    return null;
  }

  const trak = getBox(moov, 0x7472616b /* "trak" */);
  if (!trak) {
    return null;
  }

  return getBox(trak, 0x6d646961 /* "mdia" */);
}

export {
  getTRAF,
  getMDAT,
  getMDIA,
};
