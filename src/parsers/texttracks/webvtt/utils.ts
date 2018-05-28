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
 * Returns first line after the WEBVTT header.
 * That is, the line after the first blank line after the first line!
 * @param {Array.<string>} linified
 * @returns {Number}
 */
function getFirstLineAfterHeader(linified : string[]) : number {
  let i = 0;
  while (i < linified.length) {
    if (linified[i] === "") {
      return i + 1;
    }
    i++;
  }
  return i;
}

/**
 * Returns true if the given line looks like the beginning of a Style block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfStyleBlock(text : string) : boolean {
  return /^STYLE( .*)?$/g.test(text);
}

/**
 * Returns true if the given line looks like the beginning of a comment block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfNoteBlock(text : string) : boolean {
  return /^NOTE( .*)?$/g.test(text);
}

/**
 * Returns true if the given line looks like the beginning of a region block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfRegionBlock(text : string) : boolean {
  return /^REGION( .*)?$/g.test(text);
}

/**
 * Returns true if the line given looks like the beginning of a cue.
 * You should provide to this function only lines following "empty" lines.
 * @param {string} line
 * @returns {Boolean}
 */
function isStartOfCueBlock(lines : string[], index: number) : boolean {
  // checked cases:
  //   - empty lines
  //   - start of a comment
  //   - start of a region
  //   - start of a style
  // Anything else whose first or second line is a timestamp line is a cue.
  const firstLine = lines[index];
  const secondLine = lines[index + 1];
  return (
    !(!firstLine || !secondLine || /^(NOTE)|(REGION)|(STYLE)($| |\t)/.test(firstLine)) &&
    (firstLine.indexOf("-->") > -1 || secondLine.indexOf("-->") > -1)
  );
}

/**
 * Find end of current WebVTT cue block.
 * @param {Array<string>} linified
 * @param {number} startOfCueBlock
 */
function findEndOfCueBlock(
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
    !isStartOfCueBlock(linified, endOfCue + 1) &&
    !isStartOfStyleBlock(linified[endOfCue + 1]) &&
    !isStartOfNoteBlock(linified[endOfCue + 1]) &&
    !isStartOfRegionBlock(linified[endOfCue + 1])
  ) {
    endOfCue = findEndOfCueBlock(linified, endOfCue);
  }
  return endOfCue;
}

export {
  getFirstLineAfterHeader,
  isStartOfCueBlock,
  isStartOfNoteBlock,
  isStartOfRegionBlock,
  isStartOfStyleBlock,
  findEndOfCueBlock
};
