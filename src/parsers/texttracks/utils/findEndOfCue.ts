
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
export default function findEndOfCue(
    linified: string[],
    index: number,
    isStartOfCueBlock: (line: string) => boolean
) {
    let j = index + 1;
    // continue incrementing i until either:
    //   - empty line
    //   - end
    while (linified[j]) {
      j++;
    }
    if (
      isStartOfCueBlock(linified[j + 1]) &&
      (
        linified[j + 1].indexOf("-->") === -1 &&
        linified[j + 2].indexOf("-->") === -1
      )
    ) {
      j = findEndOfCue(linified, j, isStartOfCueBlock);
    }
    return j;
}
