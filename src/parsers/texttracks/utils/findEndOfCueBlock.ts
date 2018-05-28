
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
 * Find end of current SRT or WebVTT cue block.
 * @param {Array<string>} linified
 * @param {number} index
 */
export default function findEndOfCueBlock(
    linified: string[],
    startOfCueBlock: number,
    isStartOfCueBlock: (line: string) => boolean
): number {
    let endOfCue = startOfCueBlock + 1;
    // continue incrementing i until either:
    //   - empty line
    //   - end
    while (linified[endOfCue]) {
      endOfCue++;
    }
    if (
      isStartOfCueBlock(linified[endOfCue + 1]) &&
      (
        linified[endOfCue + 1].indexOf("-->") === -1 &&
        linified[endOfCue + 2].indexOf("-->") === -1
      )
    ) {
      endOfCue = findEndOfCueBlock(linified, endOfCue, isStartOfCueBlock);
    }
    return endOfCue;
}
