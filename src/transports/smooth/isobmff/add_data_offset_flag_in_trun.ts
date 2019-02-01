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

import { itobe4 } from "../../../utils/byte_parsing";

/**
 * Update `trun` box given to add a data offset flag and the corresponding space
 * to set a data offset.
 * Do not do anything if the flag is already set.
 * @param {Uint8Array} trun
 * @returns {Uint8Array}
 */
export default function addDataOffsetFlagInTrun(trun : Uint8Array) : Uint8Array {
  const lastFlags = trun[11];
  const hasDataOffset = lastFlags & 0x01;
  if (hasDataOffset) {
    return trun;
  }

  // If no dataoffset is present, we add one
  const newTrun = new Uint8Array(trun.length + 4);
  newTrun.set(itobe4(trun.length + 4), 0); // original length + data_offset size
  newTrun.set(trun.subarray(4, 16), 4); // name + (version + flags) + samplecount
  newTrun[11] = newTrun[11] | 0x01; // add data_offset flag
  newTrun.set([0, 0, 0, 0], 16); // add data offset
  newTrun.set(trun.subarray(16, trun.length), 20);
  return newTrun;
}
