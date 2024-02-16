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
 * Convert a string to an Uint8Array containing the corresponding UTF-16 code
 * units in little-endian.
 * @param {string} str
 * @returns {Uint8Array}
 */
declare function strToUtf16LE(str: string): Uint8Array;
/**
 * Convert a string to an Uint8Array containing the corresponding UTF-16 code
 * units in little-endian.
 * @param {string} str
 * @returns {Uint8Array}
 */
declare function strToBeUtf16(str: string): Uint8Array;
/**
 * Construct string from the little-endian UTF-16 code units given.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
declare function utf16LEToStr(bytes: Uint8Array): string;
/**
 * Construct string from the little-endian UTF-16 code units given.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
declare function beUtf16ToStr(bytes: Uint8Array): string;
/**
 * Convert a string to an Uint8Array containing the corresponding UTF-8 code
 * units.
 * @param {string} str
 * @returns {Uint8Array}
 */
declare function strToUtf8(str: string): Uint8Array;
/**
 * Creates a string from the given Uint8Array containing utf-8 code units.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
declare function utf8ToStr(data: Uint8Array): string;
/**
 * Convert hex codes in a string form into the corresponding bytes.
 * @param {string} str
 * @returns {Uint8Array}
 * @throws TypeError - str.length is odd
 */
declare function hexToBytes(str: string): Uint8Array;
/**
 * Convert bytes into the corresponding hex string, with the possibility
 * to add a separator.
 * @param {Uint8Array} bytes
 * @param {string} [sep=""] - separator. Separate each two hex character.
 * @returns {string}
 */
declare function bytesToHex(bytes: Uint8Array, sep?: string): string;
/**
 * Convert little-endian GUID into big-endian UUID.
 * @param {Uint8Array} guid
 * @returns {Uint8Array} - uuid
 * @throws AssertionError - The guid length is not 16
 */
declare function guidToUuid(guid: Uint8Array): Uint8Array;
/**
 * Decode string from bytes (UTF-8).
 * Keeps reading until it reaches a byte that equals to zero.
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @returns {Object}
 */
declare function readNullTerminatedString(buffer: Uint8Array, offset: number): {
    end: number;
    string: string;
};
export { bytesToHex, hexToBytes, strToUtf8, utf8ToStr, strToUtf16LE, utf16LEToStr, strToBeUtf16, beUtf16ToStr, guidToUuid, readNullTerminatedString, };
