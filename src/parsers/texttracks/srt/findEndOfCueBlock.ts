
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

/**
 * Returns true if the given lines looks like the beginning of a cue.
 * You should provide to this function only lines following "empty" lines.
 * @param {string} line
 * @returns {Boolean}
 */
function isStartOfCueBlock(lines : string[], index: number) : boolean {
  const firstLine = lines[index];
  const secondLine = lines[index + 1];
  if (firstLine.indexOf("-->") > -1 || secondLine.indexOf("-->") > -1) {
    return true;
  }
  return false;
}

/**
 * Find end of current SRT cue block.
 * @param {Array<string>} linified - Whole srt file. Line by line.
 * @param {number} index - Index in `linified` of the first line within the
 * block.
 * @returns {number}
 */
export default function findEndOfCueBlock(
  linified: string[],
  startOfCueBlock: number
): number {
  let endOfCue = startOfCueBlock + 1;
  // continue incrementing i until either:
  //   - empty line
  //   - end
  while (linified[endOfCue]) {
    endOfCue++;
  }
  if (
      linified[endOfCue + 1] !== undefined &&
      !isStartOfCueBlock(linified, endOfCue + 1)
    ) {
    endOfCue = findEndOfCueBlock(linified, endOfCue);
  }
  return endOfCue;
}
