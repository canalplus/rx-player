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
import { isStartOfStyleBlock } from "./utils";

/**
 * Get cue blocks from a WebVTT file.
 * @param {Array.<string>} linified - Whole WebVTT file. Each new element in
 * this array is a new line.
 * @param {number} headerOffset - index of the first line after the header.
 * Used to avoid taking the header into consideration.
 * @returns {Array.<Array.<string>>}
 */
export default function getStyleBlocks(
  linified : string[],
  headerOffset : number
) : string[][] {
  const styleBlocks : string[][] = [];
  for (let i = headerOffset; i < linified.length; i++) { //
    if (isStartOfStyleBlock(linified, i)) {
      const startOfStyleBlock = i;
      i++;

      // continue incrementing i until either:
      //   - empty line
      //   - end of file
      while (isNonEmptyString(linified[i])) {
        i++;
      }
      const styleBlock = linified.slice(startOfStyleBlock, i);
      styleBlocks.push(styleBlock);
    } else if (isNonEmptyString(linified[i])) {
      // continue incrementing i until either:
      //   - empty line
      //   - end
      while (isNonEmptyString(linified[i])) {
        i++;
      }
    }
  }
  return styleBlocks;
}
