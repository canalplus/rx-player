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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUuidContent = exports.getNextBoxOffsets = exports.getChildBox = exports.getBoxOffsets = exports.getBoxesContent = exports.getBoxContent = exports.getBox = void 0;
var log_1 = require("../../../log");
var assert_1 = require("../../../utils/assert");
var byte_parsing_1 = require("../../../utils/byte_parsing");
/**
 * From a given buffer representing ISOBMFF data, browses inner boxes in
 * `childNames`, each element being a child box of the one before it.
 * Returns `null` if one of the child (or if the parent) is not found.
 * @param {Uint8Array} buf
 * @param {number[]} childNames
 * @returns {Uint8Array|null}
 */
function getChildBox(buf, childNames) {
    var e_1, _a;
    var currBox = buf;
    try {
        for (var childNames_1 = __values(childNames), childNames_1_1 = childNames_1.next(); !childNames_1_1.done; childNames_1_1 = childNames_1.next()) {
            var childName = childNames_1_1.value;
            var box = getBoxContent(currBox, childName);
            if (box === null) {
                return null;
            }
            currBox = box;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (childNames_1_1 && !childNames_1_1.done && (_a = childNames_1.return)) _a.call(childNames_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return currBox;
}
exports.getChildBox = getChildBox;
/**
 * Returns the content of a box based on its name.
 * `null` if not found.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {UInt8Array|null}
 */
function getBoxContent(buf, boxName) {
    var offsets = getBoxOffsets(buf, boxName);
    return offsets !== null ? buf.subarray(offsets[1], offsets[2]) : null;
}
exports.getBoxContent = getBoxContent;
/**
 * Reads the whole ISOBMFF and returns the content of all boxes with the given
 * name, in order.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {Array.<Uint8Array>}
 */
function getBoxesContent(buf, boxName) {
    var ret = [];
    var currentBuf = buf;
    while (true) {
        var offsets = getBoxOffsets(currentBuf, boxName);
        if (offsets === null) {
            return ret;
        }
        // Guard against a (very highly improbable) infinite loop
        (0, assert_1.default)(offsets[2] !== 0 && currentBuf.length !== 0);
        ret.push(currentBuf.subarray(offsets[1], offsets[2]));
        currentBuf = currentBuf.subarray(offsets[2]);
    }
}
exports.getBoxesContent = getBoxesContent;
/**
 * Returns an ISOBMFF box - size and name included - based on its name.
 * `null` if not found.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {UInt8Array|null}
 */
function getBox(buf, boxName) {
    var offsets = getBoxOffsets(buf, boxName);
    return offsets !== null ? buf.subarray(offsets[0], offsets[2]) : null;
}
exports.getBox = getBox;
/**
 * Returns byte offsets for the start of the box, the start of its content and
 * the end of the box (not inclusive).
 *
 * `null` if not found.
 *
 * If found, the tuple returned has three elements, all numbers:
 *   1. The starting byte corresponding to the start of the box (from its size)
 *   2. The beginning of the box content - meaning the first byte after the
 *      size and the name of the box.
 *   3. The first byte after the end of the box, might be equal to `buf`'s
 *      length if we're considering the last box.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {Array.<number>|null}
 */
function getBoxOffsets(buf, boxName) {
    var len = buf.length;
    var boxBaseOffset = 0;
    var name;
    var lastBoxSize = 0;
    var lastOffset;
    while (boxBaseOffset + 8 <= len) {
        lastOffset = boxBaseOffset;
        lastBoxSize = (0, byte_parsing_1.be4toi)(buf, lastOffset);
        lastOffset += 4;
        name = (0, byte_parsing_1.be4toi)(buf, lastOffset);
        lastOffset += 4;
        if (lastBoxSize === 0) {
            lastBoxSize = len - boxBaseOffset;
        }
        else if (lastBoxSize === 1) {
            if (lastOffset + 8 > len) {
                return null;
            }
            lastBoxSize = (0, byte_parsing_1.be8toi)(buf, lastOffset);
            lastOffset += 8;
        }
        if (lastBoxSize < 0) {
            throw new Error("ISOBMFF: Size out of range");
        }
        if (name === boxName) {
            if (boxName === 0x75756964 /* === "uuid" */) {
                lastOffset += 16; // Skip uuid name
            }
            return [boxBaseOffset, lastOffset, boxBaseOffset + lastBoxSize];
        }
        else {
            boxBaseOffset += lastBoxSize;
        }
    }
    return null;
}
exports.getBoxOffsets = getBoxOffsets;
/**
 * Gives the content of a specific UUID box.
 * `undefined` if that box is not found.
 *
 * If found, the returned Uint8Array contains just the box's content: the box
 * without its name and size.
 * @param {Uint8Array} buf
 * @param {Number} id1
 * @param {Number} id2
 * @param {Number} id3
 * @param {Number} id4
 * @returns {Uint8Array|undefined}
 */
function getUuidContent(buf, id1, id2, id3, id4) {
    var len = buf.length;
    var boxSize;
    for (var boxBaseOffset = 0; boxBaseOffset < len; boxBaseOffset += boxSize) {
        var currentOffset = boxBaseOffset;
        boxSize = (0, byte_parsing_1.be4toi)(buf, currentOffset);
        currentOffset += 4;
        var boxName = (0, byte_parsing_1.be4toi)(buf, currentOffset);
        currentOffset += 4;
        if (boxSize === 0) {
            boxSize = len - boxBaseOffset;
        }
        else if (boxSize === 1) {
            if (currentOffset + 8 > len) {
                return undefined;
            }
            boxSize = (0, byte_parsing_1.be8toi)(buf, currentOffset);
            currentOffset += 8;
        }
        if (boxName === 0x75756964 /* === "uuid" */ &&
            currentOffset + 16 <= len &&
            (0, byte_parsing_1.be4toi)(buf, currentOffset) === id1 &&
            (0, byte_parsing_1.be4toi)(buf, currentOffset + 4) === id2 &&
            (0, byte_parsing_1.be4toi)(buf, currentOffset + 8) === id3 &&
            (0, byte_parsing_1.be4toi)(buf, currentOffset + 12) === id4) {
            currentOffset += 16;
            return buf.subarray(currentOffset, boxBaseOffset + boxSize);
        }
    }
}
exports.getUuidContent = getUuidContent;
/**
 * For the next encountered box, return byte offsets corresponding to:
 *   1. the starting byte offset for the next box (should always be equal to
 *       `0`).
 *   2. The beginning of the box content - meaning the first byte after the
 *      size and the name of the box.
 *   3. The first byte after the end of the box, might be equal to `buf`'s
 *      length if we're considering the last box.
 *
 * `null` if no box is found.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 */
function getNextBoxOffsets(buf) {
    var len = buf.length;
    if (len < 8) {
        log_1.default.warn("ISOBMFF: box inferior to 8 bytes, cannot find offsets");
        return null;
    }
    var lastOffset = 0;
    var boxSize = (0, byte_parsing_1.be4toi)(buf, lastOffset);
    lastOffset += 4;
    var name = (0, byte_parsing_1.be4toi)(buf, lastOffset);
    lastOffset += 4;
    if (boxSize === 0) {
        boxSize = len;
    }
    else if (boxSize === 1) {
        if (lastOffset + 8 > len) {
            log_1.default.warn("ISOBMFF: box too short, cannot find offsets");
            return null;
        }
        boxSize = (0, byte_parsing_1.be8toi)(buf, lastOffset);
        lastOffset += 8;
    }
    if (boxSize < 0) {
        throw new Error("ISOBMFF: Size out of range");
    }
    if (name === 0x75756964 /* === "uuid" */) {
        lastOffset += 16; // Skip uuid name
    }
    return [0, lastOffset, boxSize];
}
exports.getNextBoxOffsets = getNextBoxOffsets;
