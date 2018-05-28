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
 * Returns the first line that is not apart of the given cue block.
 * The index given can be anywhere in a known cue block.
 *
 * This function is extra-resilient due to observed real-life malformed
 * subtitles.
 * Basically, it allows some deviation from the specification as long as the
 * intent is pretty clear.
 * @param {Array<string>} linified - Whole srt. Line by line.
 * @param {number} startIndex - Index in `linified` of the first line within the
 * block.
 * @returns {number}
 */
export default function findEndOfCueBlock(
  linified: string[],
  startIndex: number
): number {
  const length = linified.length;
  let firstEmptyLineIndex = startIndex + 1;

  // continue incrementing i until either:
  //   - an empty line
  //   - the end
  while (linified[firstEmptyLineIndex]) {
    firstEmptyLineIndex++;
  }

  if (firstEmptyLineIndex >= length) {
    // text of the cue goes until the end
    return length;
  }

  let nextLineWithText = firstEmptyLineIndex + 1;
  while (nextLineWithText < length && linified[nextLineWithText] === "") {
    nextLineWithText++;
  }

  if (nextLineWithText >= length) {
    // we only have empty lines until the end
    // empty lines are not part of a cue block, returns the first empty one
    return firstEmptyLineIndex;
  }

  if (linified[nextLineWithText].indexOf("-->") >= 0) {
    // nextLineWithText leads to the timing of the next cue block
    // empty lines are not part of a cue block, returns the first empty one
    return firstEmptyLineIndex;
  } else if (nextLineWithText + 1 >= length) {
    // let the last line, which contains some text, be part of the current cue
    return length;
  } else if (linified[nextLineWithText + 1].indexOf("-->") >= 0) {
    // nextLineWithText is the cue identifier of the next cue block
    // empty lines are not part of a cue block, returns the first empty one
    return firstEmptyLineIndex;
  } else {
    // the text we encountered at nextLineWithText was separated by blank lines.
    // This is not authorized by the specification, but we still include it
    // in the current block, for format error resilience.
    // Loop again from that point
    return findEndOfCueBlock(linified, nextLineWithText);
  }
}
