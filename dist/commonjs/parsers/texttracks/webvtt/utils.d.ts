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
declare function getFirstLineAfterHeader(linified: string[]): number;
/**
 * Returns true if the given line looks like the beginning of a Style block.
 * @param {string} text
 * @returns {Boolean}
 */
declare function isStartOfStyleBlock(lines: string[], index: number): boolean;
/**
 * Returns true if the given line looks like the beginning of a comment block.
 * @param {string} text
 * @returns {Boolean}
 */
declare function isStartOfNoteBlock(lines: string[], index: number): boolean;
/**
 * Returns true if the given line looks like the beginning of a region block.
 * @param {string} text
 * @returns {Boolean}
 */
declare function isStartOfRegionBlock(lines: string[], index: number): boolean;
/**
 * Returns true if the line given looks like the beginning of a cue.
 * You should provide to this function only lines following "empty" lines.
 * @param {Array.<string>} lines
 * @param {number} index
 * @returns {Boolean}
 */
declare function isStartOfCueBlock(lines: string[], index: number): boolean;
/**
 * Find end of current WebVTT cue block.
 * @param {Array<string>} linified
 * @param {number} startOfCueBlock
 * @returns {number}
 */
declare function findEndOfCueBlock(linified: string[], startOfCueBlock: number): number;
export { getFirstLineAfterHeader, isStartOfCueBlock, isStartOfNoteBlock, isStartOfRegionBlock, isStartOfStyleBlock, findEndOfCueBlock, };
