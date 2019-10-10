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

import log from "../../log";
import { be4toi } from "../../utils/byte_parsing";
import findCompleteBox from "../utils/find_complete_box";

/**
 * Extract the constituent boxes (ftyp / moov) of an init segment.
 * @param {Uint8Array} buf
 * @returns {Uint8Array|number}
 */
export default function extractCompleteInitChunk(buf: Uint8Array): Uint8Array|-1 {
  const ftypBoxIndex = findCompleteBox(buf, 0x66747970 /* ftyp */);
  if (ftypBoxIndex < 0) {
    log.error("Incomplete `ftyp` box");
    return -1;
  }
  const ftypBoxSize = be4toi(buf, ftypBoxIndex); // size of the "ftyp" box
  const ftypBox = buf.subarray(ftypBoxIndex, ftypBoxIndex + ftypBoxSize);

  const moovBoxIndex = findCompleteBox(buf, 0x6d6f6f76 /* moov */);
  if (ftypBoxIndex < 0) {
    log.error("Incomplete `moov` box");
    return -1;
  }
  const moovBoxSize = be4toi(buf, moovBoxIndex); // size of the "moov" box
  const moovBox = buf.subarray(moovBoxIndex, moovBoxIndex + moovBoxSize);
  const initChunk = new Uint8Array(ftypBoxSize + moovBoxSize);
  initChunk.set(ftypBox, 0);
  initChunk.set(moovBox, ftypBoxSize);

  return initChunk;
}
