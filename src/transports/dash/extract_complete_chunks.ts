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

import { be4toi } from "../../utils/byte_parsing";

/**
 * Find the offset for the first declaration of the given box in an isobmff.
 * Returns -1 if not found.
 * @param {Uint8Array} buf - the isobmff
 * @param {Number} wantedName
 * @returns {Number} - Offset where the box begins. -1 if not found.
 */
function findBox(buf : Uint8Array, wantedName : number) : number {
  const len = buf.length;
  let i = 0;
  while (i + 8 < len) {
    const size = be4toi(buf, i);
    if (size <= 0) {
      return - 1;
    }

    const name = be4toi(buf, i + 4);
    if (name === wantedName) {
      if (i + size <= len) {
        return i;
      }
      return -1;
    }
    i += size;
  }
  return -1;
}

/**
 * Take a chunk of ISOBMFF data and extract complete `moof`+`mdat` subsegments
 * which are ready to be decoded.
 * Returns a tuple of two containing first an array of those subsegments
 * followed by tha last un-decodable part.
 * @param {Uint8Array} buffer
 * @returns {Array}
 */
export default function extractCompleteChunks(
  buffer: Uint8Array
) : [Uint8Array[], Uint8Array | null] {
  let _position = 0;
  const chunks : Uint8Array[] = [];
  while (_position < buffer.length) {
    const currentBuffer = buffer.subarray(_position, Infinity);
    const moofIndex = findBox(currentBuffer, 0x6d6f6f66 /* moof */);
    if (moofIndex < 0) {
      // no moof, not a segment.
      return [ chunks, currentBuffer ];
    }
    const moofLen = be4toi(buffer, moofIndex + _position);
    const moofEnd = _position + moofIndex + moofLen;
    if (moofEnd > buffer.length) {
      // not a complete moof segment
      return [ chunks, currentBuffer ];
    }

    const mdatIndex = findBox(currentBuffer, 0x6d646174 /* mdat */);
    if (mdatIndex < 0) {
      // no mdat, not a segment.
      return [ chunks, currentBuffer ];
    }
    const mdatLen = be4toi(buffer, mdatIndex + _position);
    const mdatEnd = _position + mdatIndex + mdatLen;
    if (mdatEnd > buffer.length) {
      // not a complete mdat segment
      return [ chunks, currentBuffer ];
    }

    const maxEnd = Math.max(moofEnd, mdatEnd);
    const chunk = buffer.subarray(_position, maxEnd);
    chunks.push(chunk);

    _position = maxEnd;
  }
  return [ chunks, null ];
}
