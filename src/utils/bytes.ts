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

import assert from "./assert";

type TypedArray = Uint8Array | Uint16Array | Uint32Array;

/**
 * Returns Uint8Array from UTF16 string.
 * /!\ Take only the first byte from each UTF16 code.
 * @param {string} str
 * @returns {Uint8Array}
 */
function strToBytes(str : string) : Uint8Array {
  const len = str.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = str.charCodeAt(i) & 0xFF;
  }
  return arr;
}

/**
 * construct string from unicode values.
 * /!\ does not support non-UCS-2 values
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToStr(bytes : Uint8Array) : string {
  return String.fromCharCode.apply(null, bytes);
}

/**
 * construct string from unicode values.
 * Only use every other byte for each UTF-16 character.
 * /!\ does not support non-UCS-2 values
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToUTF16Str(bytes : Uint8Array) : string {
  let str = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 2) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

/**
 * Convert hex codes in a string form into the corresponding bytes.
 * @param {string} str
 * @returns {Uint8Array}
 * @throws TypeError - str.length is odd
 */
function hexToBytes(str : string) : Uint8Array {
  const len = str.length;
  const arr = new Uint8Array(len / 2);
  for (let i = 0, j = 0; i < len; i += 2, j++) {
    arr[j] = parseInt(str.substr(i, 2), 16) & 0xFF;
  }
  return arr;
}

/**
 * Convert bytes into the corresponding hex string, with the possibility
 * to add a separator.
 * @param {Uint8Array} bytes
 * @param {string} [sep=""] - separator. Separate each two hex character.
 * @returns {string}
 */
function bytesToHex(bytes : Uint8Array, sep? : string) : string {
  if (!sep) {
    sep = "";
  }

  let hex = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    hex += (bytes[i] >>> 4).toString(16);
    hex += (bytes[i] & 0xF).toString(16);
    if (sep.length && i < bytes.byteLength - 1) {
      hex += sep;
    }
  }
  return hex;
}

/**
 * Returns a Uint8Array from the arguments given, in order:
 *   - if the next argument given is a number N set the N next bytes to 0.
 *   - else set the next bytes to the argument given.
 * @param {...(Number|Uint8Array)} args
 * @returns {Uint8Array}
 */
function concat(...args : Array<TypedArray|number[]|number>) : Uint8Array {
  const l = args.length;
  let i = -1;
  let len = 0;
  let arg;
  while (++i < l) {
    arg = args[i];
    len += (typeof arg === "number") ? arg : arg.length;
  }
  const arr = new Uint8Array(len);
  let offset = 0;
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

/**
 * Translate groups of 2 big-endian bytes to Integer (from 0 up to 65535).
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be2toi(bytes : Uint8Array, offset : number) : number {
  return (
    (bytes[0 + offset] << 8) +
    (bytes[1 + offset] << 0));
}

/**
 * Translate groups of 3 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be3toi(bytes : Uint8Array, offset : number) : number {
  return (
    (bytes[0 + offset] * 0x0010000) +
    (bytes[1 + offset] * 0x0000100) +
    (bytes[2 + offset])
  );
}

/**
 * Translate groups of 4 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be4toi(bytes : Uint8Array, offset : number) : number {
  return (
    (bytes[0 + offset] * 0x1000000) +
    (bytes[1 + offset] * 0x0010000) +
    (bytes[2 + offset] * 0x0000100) +
    (bytes[3 + offset]));
}

/**
 * Translate groups of 8 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be8toi(bytes : Uint8Array, offset : number) : number {
  return (
    (
      (bytes[0 + offset] * 0x1000000) +
      (bytes[1 + offset] * 0x0010000) +
      (bytes[2 + offset] * 0x0000100) +
       (bytes[3 + offset])
     ) * 0x100000000 +
     (bytes[4 + offset] * 0x1000000) +
     (bytes[5 + offset] * 0x0010000) +
     (bytes[6 + offset] * 0x0000100) +
     (bytes[7 + offset]));
}

/**
 * Translate Integer (from 0 up to 65535) to a Uint8Array of length 2 of
 * the corresponding big-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe2(num : number) : Uint8Array {
  return new Uint8Array([
    (num >>> 8) & 0xFF,
    (num)       & 0xFF,
  ]);
}

/**
 * Translate Integer to a Uint8Array of length 4 of the corresponding big-endian
 * bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe4(num : number) : Uint8Array {
  return new Uint8Array([
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>>  8) & 0xFF,
    (num)        & 0xFF,
  ]);
}

/**
 * Translate Integer to a Uint8Array of length 8 of the corresponding big-endian
 * bytes.
 * /!\ If the top-most bytes are set, this might go over MAX_SAFE_INTEGER, thus
 * leading to a "bad" value.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe8(num : number) : Uint8Array {
  const l = (num % 0x100000000);
  const h = (num - l) / 0x100000000;
  return new Uint8Array([
    (h >>> 24) & 0xFF,
    (h >>> 16) & 0xFF,
    (h >>>  8) & 0xFF,
    (h)        & 0xFF,
    (l >>> 24) & 0xFF,
    (l >>> 16) & 0xFF,
    (l >>>  8) & 0xFF,
    (l)        & 0xFF,
  ]);
}

/**
 * Translate groups of 2 little-endian bytes to Integer (from 0 up to 65535).
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le2toi(bytes : Uint8Array, offset : number) : number {
  return (
    (bytes[0 + offset] << 0) +
    (bytes[1 + offset] << 8));
}

/**
 * Translate groups of 4 little-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le4toi(bytes : Uint8Array, offset : number) : number {
  return (
    (bytes[0 + offset]) +
    (bytes[1 + offset] * 0x0000100) +
    (bytes[2 + offset] * 0x0010000) +
    (bytes[3 + offset] * 0x1000000));
}

/**
 * Translate groups of 8 little-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le8toi(bytes : Uint8Array, offset : number) : number {
  return (
    (bytes[0 + offset]) +
    (bytes[1 + offset] * 0x0000100) +
    (bytes[2 + offset] * 0x0010000) +
    (bytes[3 + offset] * 0x1000000) +
   ((bytes[4 + offset]) +
    (bytes[5 + offset] * 0x0000100) +
    (bytes[6 + offset] * 0x0010000) +
     (bytes[7 + offset] * 0x1000000)
   ) * 0x100000000);
}

/**
 * Translate Integer (from 0 up to 65535) to a Uint8Array of length 2 of
 * the corresponding little-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itole2(num : number) : Uint8Array {
  return new Uint8Array([
    (num)       & 0xFF,
    (num >>> 8) & 0xFF,
  ]);
}

/**
 * Translate Integer to a Uint8Array of length 4 of the corresponding
 * little-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itole4(num : number) : Uint8Array {
  return new Uint8Array([
    (num)        & 0xFF,
    (num >>>  8) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 24) & 0xFF,
  ]);
}

/**
 * Translate Integer to a Uint8Array of length 8 of the corresponding
 * little-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itole8(num : number) : Uint8Array {
  const l = (num % 0x100000000);
  const h = (num - l) / 0x100000000;
  return new Uint8Array([
    (h)        & 0xFF,
    (h >>>  8) & 0xFF,
    (h >>> 16) & 0xFF,
    (h >>> 24) & 0xFF,
    (l)        & 0xFF,
    (l >>>  8) & 0xFF,
    (l >>> 16) & 0xFF,
    (l >>> 24) & 0xFF,
  ]);
}

/**
 * @param {string} uuid
 * @returns {string}
 * @throws AssertionError - The uuid length is not 16
 */
function guidToUuid(uuid : string) : string {
  assert.equal(uuid.length, 16, "UUID length should be 16");
  const buf = strToBytes(uuid);

  const p1A = buf[0];
  const p1B = buf[1];
  const p1C = buf[2];
  const p1D = buf[3];
  const p2A = buf[4];
  const p2B = buf[5];
  const p3A = buf[6];
  const p3B = buf[7];
  const p4 = buf.subarray( 8, 10);
  const p5 = buf.subarray(10, 16);

  const ord = new Uint8Array(16);
  ord[0] = p1D; ord[1] = p1C; ord[2] = p1B; ord[3] = p1A; // swap32 BE -> LE
  ord[4] = p2B; ord[5] = p2A;                             // swap16 BE -> LE
  ord[6] = p3B; ord[7] = p3A;                             // swap16 BE -> LE
  ord.set(p4,  8);
  ord.set(p5, 10);

  return bytesToHex(ord);
}

/**
 * Creates a base-64 encoded ASCII string from a string of binary data, with
 * possible trailing equal sign(s) stripped.
 * @param {string}
 * @returns {string}
 */
function toBase64URL(str : string) : string {
  return btoa(str).replace(/\=+$/, "");
}

export {
  strToBytes,
  bytesToStr, bytesToUTF16Str,
  hexToBytes,
  bytesToHex,
  concat,
  be2toi, be3toi, be4toi, be8toi,
  le2toi, le4toi, le8toi,
  itobe2, itobe4, itobe8,
  itole2, itole4, itole8,
  guidToUuid,
  toBase64URL,
};
