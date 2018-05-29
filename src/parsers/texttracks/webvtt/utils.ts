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
function isStartOfStyleBlock(lines : string[], index : number) : boolean {
  return !!lines[index] && /^STYLE( .*)?$/g.test(lines[index]) &&
    // A cue identifer can also contain "STYLe". Check that we have no timings
    // on the second line
    (!lines[index + 1] || lines[index + 1].indexOf("-->") < 0);
}

/**
 * Returns true if the given line looks like the beginning of a comment block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfNoteBlock(lines : string[], index : number) : boolean {
  return !!lines[index] && /^NOTE( .*)?$/g.test(lines[index]) &&
    // A cue identifer can also contain "NOTE". Check that we have no timings
    // on the second line
    (!lines[index + 1] || lines[index + 1].indexOf("-->") < 0);
}

/**
 * Returns true if the given line looks like the beginning of a region block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfRegionBlock(lines : string[], index : number) : boolean {
  return !!lines[index] && /^REGION( .*)?$/g.test(lines[index]) &&
    // A cue identifer can also contain "REGION". Check that we have no timings
    // on the second line
    (!lines[index + 1] || lines[index + 1].indexOf("-->") < 0);
}

/**
 * Returns true if the line given looks like the beginning of a cue.
 * You should provide to this function only lines following "empty" lines.
 * @param {Array.<string>} lines
 * @param {number} index
 * @returns {Boolean}
 */
function isStartOfCueBlock(lines : string[], index : number) : boolean {
  // checked cases:
  //   - empty lines
  //   - start of a comment
  //   - start of a region
  //   - start of a style
  // Anything else whose first or second line is a timestamp line is a cue.
  const firstLine = lines[index];
  if (
    !firstLine ||
    isStartOfStyleBlock(lines, index) ||
    isStartOfRegionBlock(lines, index) ||
    isStartOfNoteBlock(lines, index)
  ) {
    return false;
  }

  if (firstLine.indexOf("-->") >= 0) {
    return true;
  }

  const secondLine = lines[index + 1];
  return !!secondLine && secondLine.indexOf("-->") >= 0;
}

/**
 * Find end of current WebVTT cue block.
 * @param {Array<string>} linified
 * @param {number} startOfCueBlock
 * @returns {number}
 */
function findEndOfCueBlock(
  linified : string[],
  startOfCueBlock : number
) : number {
  const length = linified.length;
  let firstEmptyLineIndex = startOfCueBlock + 1;

  // continue incrementing i until either:
  //   - empty line
  //   - end
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
  } else if (isStartOfCueBlock(linified, nextLineWithText)) {
    // nextLineWithText leads to the timing of the next cue block
    // empty lines are not part of a cue block, returns the first empty one
    return firstEmptyLineIndex;
  } else if (isStartOfNoteBlock(linified, nextLineWithText)) {
    return firstEmptyLineIndex;
  } else if (nextLineWithText + 1 >= length) {
    // let the last line, which contains some text, be part of the current cue
    return length;
  } else {
    // the text we encountered at nextLineWithText was separated by blank lines.
    // This is not authorized by the specification, but we still include it
    // in the current block, for format error resilience.
    // Loop again from that point
    return findEndOfCueBlock(linified, nextLineWithText);
  }
}

export {
  getFirstLineAfterHeader,
  isStartOfCueBlock,
  isStartOfNoteBlock,
  isStartOfRegionBlock,
  isStartOfStyleBlock,
  findEndOfCueBlock
};
