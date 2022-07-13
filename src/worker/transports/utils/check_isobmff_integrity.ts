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
