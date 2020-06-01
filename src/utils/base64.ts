/* tslint:disable file-header */
/*
MIT License
Copyright (c) 2020 Egor Nepomnyaschih
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import log from "../log";

/*
// This constant can also be computed with the following algorithm:
const base64abc = [],
  A = "A".charCodeAt(0),
  a = "a".charCodeAt(0),
  n = "0".charCodeAt(0);
for (let i = 0; i < 26; ++i) {
  base64abc.push(String.fromCharCode(A + i));
}
for (let i = 0; i < 26; ++i) {
  base64abc.push(String.fromCharCode(a + i));
}
for (let i = 0; i < 10; ++i) {
  base64abc.push(String.fromCharCode(n + i));
}
base64abc.push("+");
base64abc.push("/");
 */
const base64abc = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/",
];

/*
// This constant can also be computed with the following algorithm:
const l = 256, base64codes = new Uint8Array(l);
for (let i = 0; i < l; ++i) {
  base64codes[i] = 255; // invalid character
}
base64abc.forEach((char, index) => {
  base64codes[char.charCodeAt(0)] = index;
});
base64codes["=".charCodeAt(0)] = 0; // ignored anyway, so we just need to prevent an error
 */
const base64codes = [
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255,
  255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255,
  255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
];

/**
 * Obtain the value corresponding to a base64 char code.
 * /!\ Can throw if the char code given is invalid.
 * @param {number} charCode
 * @returns {number}
 */
function getBase64Code(charCode: number) : number {
  if (charCode >= base64codes.length) {
    throw new Error("Unable to parse base64 string.");
  }
  const code = base64codes[charCode];
  if (code === 255) {
    throw new Error("Unable to parse base64 string.");
  }
  return code;
}

/**
 * Convert an array of bytes into a base64 string.
 * @param {Array.<number>|Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes: number[] | Uint8Array) : string {
  let result = "";
  let i;
  const length = bytes.length;
  for (i = 2; i < length; i += 3) {
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
    result += base64abc[bytes[i] & 0x3F];
  }
  if (i === length + 1) { // 1 octet yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[(bytes[i - 2] & 0x03) << 4];
    result += "==";
  }
  if (i === length) { // 2 octets yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[(bytes[i - 1] & 0x0F) << 2];
    result += "=";
  }
  return result;
}

/**
 * Convert a base64 string into the corresponding Uint8Array containing its
 * corresponding binary data.
 * /!\ Can throw if an invalid base64 string was given.
 * @param {Array.<number>|Uint8Array} bytes
 * @returns {string}
 */
export function base64ToBytes(str : string) : Uint8Array {
  const paddingNeeded = str.length % 4;
  let paddedStr = str;
  if (paddingNeeded !== 0) {
    log.warn("base64ToBytes: base64 given miss padding");
    paddedStr += paddingNeeded === 3 ? "=" :
                 paddingNeeded === 2 ? "==" :
                                       "==="; // invalid, but we will catch it
  }
  const index = paddedStr.indexOf("=");
  if (index !== -1 && index < paddedStr.length - 2) {
    throw new Error("Unable to parse base64 string.");
  }
  const missingOctets = paddedStr.endsWith("==") ? 2 :
                        paddedStr.endsWith("=") ? 1 : 0;
  const n = paddedStr.length;
  const result = new Uint8Array((n / 4) * 3);
  let buffer: number;
  for (let i = 0, j = 0; i < n; i += 4, j += 3) {
    buffer = getBase64Code(paddedStr.charCodeAt(i)) << 18 |
             getBase64Code(paddedStr.charCodeAt(i + 1)) << 12 |
             getBase64Code(paddedStr.charCodeAt(i + 2)) << 6 |
             getBase64Code(paddedStr.charCodeAt(i + 3));
    result[j] = buffer >> 16;
    result[j + 1] = (buffer >> 8) & 0xFF;
    result[j + 2] = buffer & 0xFF;
  }
  return result.subarray(0, result.length - missingOctets);
}
