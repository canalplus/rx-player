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

import { getBoxContent } from "./get_box";

/**
 * Returns TRAF Box from the whole ISOBMFF File.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getTRAF(buffer : Uint8Array) : Uint8Array|null {
  const moof = getBoxContent(buffer, 0x6D6F6F66 /* moof */);
  if (moof === null) {
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
  const moov = getBoxContent(buf, 0x6D6F6F76 /* moov */);
  if (moov === null) {
    return null;
  }

  const trak = getBoxContent(moov, 0x7472616B /* "trak" */);
  if (trak === null) {
    return null;
  }

  return getBoxContent(trak, 0x6D646961 /* "mdia" */);
}

/**
 * Returns EMSG Box from the while ISOBMFF File.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getEMSG(buffer: Uint8Array, offset = 0) : Uint8Array|null {
  const emsg = getBoxContent(buffer.subarray(offset), 0x656D7367 /* emsg */);
  if (emsg === null) {
    return null;
  }
  return emsg;
}

export {
  getTRAF,
  getMDAT,
  getMDIA,
  getEMSG,
};
