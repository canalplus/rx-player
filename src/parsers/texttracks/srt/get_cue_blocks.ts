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

import isNonEmptyString from "../../../utils/is_non_empty_string";
import findEndOfCueBlock from "./find_end_of_cue_block";

/**
 * Get cue blocks from a srt file.
 * @param {Array.<string>} linified - Whole srt file. Each new element in this
 * array is a new line.
 * @returns {Array.<Array.<string>>}
 */
export default function getCueBlocks(linified: string[]): string[][] {
  const cueBlocks: string[][] = [];
  for (let i = 0; i < linified.length; i++) {
    if (isNonEmptyString(linified[i])) {
      const endOfCue = findEndOfCueBlock(linified, i);
      const cueBlockCandidate = linified.slice(i, endOfCue);
      if (cueBlockCandidate.length > 0) {
        if (cueBlockCandidate.length === 1) {
          if (cueBlockCandidate[0].indexOf("-->") >= 0) {
            cueBlocks.push(cueBlockCandidate);
          }
        } else {
          if (
            cueBlockCandidate[1].indexOf("-->") >= 0 ||
            cueBlockCandidate[0].indexOf("-->") >= 0
          ) {
            cueBlocks.push(cueBlockCandidate);
          }
        }
      }
      i = endOfCue;
    }
  }
  return cueBlocks;
}
