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

import {
  be4toi,
  be8toi,
} from "../../utils/byte_parsing";

/**
 * Find the offset for the first declaration of the given box in an isobmff.
 * Returns -1 if not found or if incomplete.
 *
 * This function does not throw or log in case of partial segments.
 * @param {Uint8Array} buf - the isobmff
 * @param {Number} wantedName
 * @returns {Number} - Offset where the box begins. -1 if not found.
 */
export default function findCompleteBox(
  buf : Uint8Array,
  wantedName : number
) : number {
  const len = buf.length;
  let i = 0;
  while (i + 8 <= len) {
    let size = be4toi(buf, i);

    if (size === 0) {
      size = len - i;
    } else if (size === 1) {
      if (i + 16 > len) {
        return -1;
      }
      size = be8toi(buf, i + 8);
    }

    if (isNaN(size) || size <= 0) { // should not happen
      return -1;
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
