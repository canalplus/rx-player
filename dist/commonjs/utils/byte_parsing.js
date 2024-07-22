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
exports.toUint8Array = exports.isABEqualBytes = exports.itole4 = exports.itole2 = exports.itobe8 = exports.itobe4 = exports.itobe2 = exports.le8toi = exports.le4toi = exports.le2toi = exports.be8toi = exports.be4toi = exports.be3toi = exports.be2toi = exports.concat = void 0;
/**
 * Returns a Uint8Array from the arguments given, in order:
 *   - if the next argument given is a number N set the N next bytes to 0.
 *   - else set the next bytes to the argument given.
 * @param {...(Number|Uint8Array)} args
 * @returns {Uint8Array}
 */
function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var l = args.length;
    var i = -1;
    var len = 0;
    var arg;
    while (++i < l) {
        arg = args[i];
        len += typeof arg === "number" ? arg : arg.length;
    }
    var arr = new Uint8Array(len);
    var offset = 0;
    i = -1;
    while (++i < l) {
        arg = args[i];
        if (typeof arg === "number") {
            offset += arg;
        }
        else if (arg.length > 0) {
            arr.set(arg, offset);
            offset += arg.length;
        }
    }
    return arr;
}
exports.concat = concat;
/**
 * Translate groups of 2 big-endian bytes to Integer (from 0 up to 65535).
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be2toi(bytes, offset) {
    return (bytes[offset + 0] << 8) + (bytes[offset + 1] << 0);
}
exports.be2toi = be2toi;
/**
 * Translate groups of 3 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be3toi(bytes, offset) {
    return (bytes[offset + 0] * 0x0010000 + bytes[offset + 1] * 0x0000100 + bytes[offset + 2]);
}
exports.be3toi = be3toi;
/**
 * Translate groups of 4 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be4toi(bytes, offset) {
    return (bytes[offset + 0] * 0x1000000 +
        bytes[offset + 1] * 0x0010000 +
        bytes[offset + 2] * 0x0000100 +
        bytes[offset + 3]);
}
exports.be4toi = be4toi;
/**
 * Translate groups of 8 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be8toi(bytes, offset) {
    return ((bytes[offset + 0] * 0x1000000 +
        bytes[offset + 1] * 0x0010000 +
        bytes[offset + 2] * 0x0000100 +
        bytes[offset + 3]) *
        0x100000000 +
        bytes[offset + 4] * 0x1000000 +
        bytes[offset + 5] * 0x0010000 +
        bytes[offset + 6] * 0x0000100 +
        bytes[offset + 7]);
}
exports.be8toi = be8toi;
/**
 * Translate Integer (from 0 up to 65535) to a Uint8Array of length 2 of
 * the corresponding big-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe2(num) {
    return new Uint8Array([(num >>> 8) & 0xff, num & 0xff]);
}
exports.itobe2 = itobe2;
/**
 * Translate Integer to a Uint8Array of length 4 of the corresponding big-endian
 * bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe4(num) {
    return new Uint8Array([
        (num >>> 24) & 0xff,
        (num >>> 16) & 0xff,
        (num >>> 8) & 0xff,
        num & 0xff,
    ]);
}
exports.itobe4 = itobe4;
/**
 * Translate Integer to a Uint8Array of length 8 of the corresponding big-endian
 * bytes.
 * /!\ If the top-most bytes are set, this might go over MAX_SAFE_INTEGER, thus
 * leading to a "bad" value.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe8(num) {
    var l = num % 0x100000000;
    var h = (num - l) / 0x100000000;
    return new Uint8Array([
        (h >>> 24) & 0xff,
        (h >>> 16) & 0xff,
        (h >>> 8) & 0xff,
        h & 0xff,
        (l >>> 24) & 0xff,
        (l >>> 16) & 0xff,
        (l >>> 8) & 0xff,
        l & 0xff,
    ]);
}
exports.itobe8 = itobe8;
/**
 * Translate groups of 2 little-endian bytes to Integer (from 0 up to 65535).
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le2toi(bytes, offset) {
    return (bytes[offset + 0] << 0) + (bytes[offset + 1] << 8);
}
exports.le2toi = le2toi;
/**
 * Translate groups of 4 little-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le4toi(bytes, offset) {
    return (bytes[offset + 0] +
        bytes[offset + 1] * 0x0000100 +
        bytes[offset + 2] * 0x0010000 +
        bytes[offset + 3] * 0x1000000);
}
exports.le4toi = le4toi;
/**
 * Translate groups of 8 little-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le8toi(bytes, offset) {
    return (bytes[offset + 0] +
        bytes[offset + 1] * 0x0000100 +
        bytes[offset + 2] * 0x0010000 +
        bytes[offset + 3] * 0x1000000 +
        (bytes[offset + 4] +
            bytes[offset + 5] * 0x0000100 +
            bytes[offset + 6] * 0x0010000 +
            bytes[offset + 7] * 0x1000000) *
            0x100000000);
}
exports.le8toi = le8toi;
/**
 * Translate Integer (from 0 up to 65535) to a Uint8Array of length 2 of
 * the corresponding little-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itole2(num) {
    return new Uint8Array([num & 0xff, (num >>> 8) & 0xff]);
}
exports.itole2 = itole2;
/**
 * Translate Integer to a Uint8Array of length 4 of the corresponding
 * little-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itole4(num) {
    return new Uint8Array([
        num & 0xff,
        (num >>> 8) & 0xff,
        (num >>> 16) & 0xff,
        (num >>> 24) & 0xff,
    ]);
}
exports.itole4 = itole4;
/**
 * Check if an ArrayBuffer is equal to the bytes given.
 * @param {ArrayBuffer} buffer
 * @param {Uint8Array} bytes
 * @returns {Boolean}
 */
function isABEqualBytes(buffer, bytes) {
    var view = new DataView(buffer);
    var len = view.byteLength;
    if (len !== bytes.length) {
        return false;
    }
    for (var i = 0; i < len; i++) {
        if (view.getUint8(i) !== bytes[i]) {
            return false;
        }
    }
    return true;
}
exports.isABEqualBytes = isABEqualBytes;
/**
 * Convert any BufferSource-typed structure into the corresponding Uint8Array.
 * @param {BufferSource} input
 * @returns {Uint8Array}
 */
function toUint8Array(input) {
    if (input instanceof Uint8Array) {
        return input;
    }
    else if (input instanceof ArrayBuffer) {
        return new Uint8Array(input);
    }
    else {
        return new Uint8Array(input.buffer);
    }
}
exports.toUint8Array = toUint8Array;
