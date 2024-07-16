"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEndOfCueBlock = exports.isStartOfStyleBlock = exports.isStartOfRegionBlock = exports.isStartOfNoteBlock = exports.isStartOfCueBlock = exports.getFirstLineAfterHeader = void 0;
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
/**
 * Returns first line after the WEBVTT header.
 * That is, the line after the first blank line after the first line!
 * @param {Array.<string>} linified
 * @returns {Number}
 */
function getFirstLineAfterHeader(linified) {
    var i = 0;
    while (i < linified.length) {
        if (linified[i] === "") {
            return i + 1;
        }
        i++;
    }
    return i;
}
exports.getFirstLineAfterHeader = getFirstLineAfterHeader;
/**
 * Returns true if the given line looks like the beginning of a Style block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfStyleBlock(lines, index) {
    return (typeof lines[index] === "string" &&
        /^STYLE( .*)?$/g.test(lines[index]) &&
        // A cue identifer can also contain "STYLE". Check that we have no timings
        // on the second line
        (lines[index + 1] === undefined || lines[index + 1].indexOf("-->") < 0));
}
exports.isStartOfStyleBlock = isStartOfStyleBlock;
/**
 * Returns true if the given line looks like the beginning of a comment block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfNoteBlock(lines, index) {
    return (typeof lines[index] === "string" &&
        /^NOTE( .*)?$/g.test(lines[index]) &&
        // A cue identifer can also contain "NOTE". Check that we have no timings
        // on the second line
        (lines[index + 1] === undefined || lines[index + 1].indexOf("-->") < 0));
}
exports.isStartOfNoteBlock = isStartOfNoteBlock;
/**
 * Returns true if the given line looks like the beginning of a region block.
 * @param {string} text
 * @returns {Boolean}
 */
function isStartOfRegionBlock(lines, index) {
    return (typeof lines[index] === "string" &&
        /^REGION( .*)?$/g.test(lines[index]) &&
        // A cue identifer can also contain "REGION". Check that we have no timings
        // on the second line
        (lines[index + 1] === undefined || lines[index + 1].indexOf("-->") < 0));
}
exports.isStartOfRegionBlock = isStartOfRegionBlock;
/**
 * Returns true if the line given looks like the beginning of a cue.
 * You should provide to this function only lines following "empty" lines.
 * @param {Array.<string>} lines
 * @param {number} index
 * @returns {Boolean}
 */
function isStartOfCueBlock(lines, index) {
    // checked cases:
    //   - empty lines
    //   - start of a comment
    //   - start of a region
    //   - start of a style
    // Anything else whose first or second line is a timestamp line is a cue.
    var firstLine = lines[index];
    if (firstLine === undefined ||
        firstLine === "" ||
        isStartOfStyleBlock(lines, index) ||
        isStartOfRegionBlock(lines, index) ||
        isStartOfNoteBlock(lines, index)) {
        return false;
    }
    if (firstLine.indexOf("-->") >= 0) {
        return true;
    }
    var secondLine = lines[index + 1];
    return secondLine !== undefined && secondLine.indexOf("-->") >= 0;
}
exports.isStartOfCueBlock = isStartOfCueBlock;
/**
 * Find end of current WebVTT cue block.
 * @param {Array<string>} linified
 * @param {number} startOfCueBlock
 * @returns {number}
 */
function findEndOfCueBlock(linified, startOfCueBlock) {
    var firstEmptyLineIndex = startOfCueBlock + 1;
    // continue incrementing i until either:
    //   - empty line
    //   - end
    while ((0, is_non_empty_string_1.default)(linified[firstEmptyLineIndex])) {
        firstEmptyLineIndex++;
    }
    return firstEmptyLineIndex;
}
exports.findEndOfCueBlock = findEndOfCueBlock;
