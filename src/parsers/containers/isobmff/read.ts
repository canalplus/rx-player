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

import { getBoxContent, getBoxesContent } from "./get_box";

/**
 * Returns the content of the first "traf" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getTRAF(buffer: Uint8Array): Uint8Array | null {
  const moof = getBoxContent(buffer, 0x6d6f6f66 /* moof */);
  if (moof === null) {
    return null;
  }
  return getBoxContent(moof, 0x74726166 /* traf */);
}

/**
 * Returns the content of all "traf" boxes encountered in the given ISOBMFF
 * data.
 * Might be preferred to just `getTRAF` if you suspect that your ISOBMFF may
 * have multiple "moof" boxes.
 * @param {Uint8Array} buffer
 * @returns {Array.<Uint8Array>}
 */
function getTRAFs(buffer: Uint8Array): Uint8Array[] {
  const moofs = getBoxesContent(buffer, 0x6d6f6f66 /* moof */);
  return moofs.reduce((acc: Uint8Array[], moof: Uint8Array) => {
    const traf = getBoxContent(moof, 0x74726166 /* traf */);
    if (traf !== null) {
      acc.push(traf);
    }
    return acc;
  }, []);
}

/**
 * Returns the content of the first "moof" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDAT(buf: Uint8Array): Uint8Array | null {
  return getBoxContent(buf, 0x6d646174 /* "mdat" */);
}

/**
 * Returns the content of the first "mdia" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDIA(buf: Uint8Array): Uint8Array | null {
  const moov = getBoxContent(buf, 0x6d6f6f76 /* moov */);
  if (moov === null) {
    return null;
  }

  const trak = getBoxContent(moov, 0x7472616b /* "trak" */);
  if (trak === null) {
    return null;
  }

  return getBoxContent(trak, 0x6d646961 /* "mdia" */);
}

/**
 * Returns the content of the first "emsg" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getEMSG(buffer: Uint8Array, offset = 0): Uint8Array | null {
  return getBoxContent(buffer.subarray(offset), 0x656d7367 /* emsg */);
}

export { getTRAF, getTRAFs, getMDAT, getMDIA, getEMSG };
