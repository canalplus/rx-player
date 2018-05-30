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
  findEndOfCueBlock,
  isStartOfCueBlock,
} from "./utils";

/**
 * Get cue blocks from a WebVTT file.
 * @param {Array.<string>} linified - Whole WebVTT file. Each new element in
 * this array is a new line.
 * @param {number} headerOffset - index of the first line after the header.
 * Used to avoid taking the header into consideration.
 * @returns {Array.<Array.<string>>}
 */
export default function getCueBlocks(
  linified : string[],
  headerOffset : number
) : string[][] {
  const cueBlocks : string[][] = [];
  for (let i = headerOffset; i < linified.length; i++) { //
    if (isStartOfCueBlock(linified, i)) {
      const endOfCue = findEndOfCueBlock(linified, i);
      cueBlocks.push(linified.slice(i, endOfCue));
      i = endOfCue;
    } else if (linified[i]) {
      // continue incrementing i until either:
      //   - empty line
      //   - end
      while (linified[i]) {
        i++;
      }
    }
  }
  return cueBlocks;
}
