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
 * Returns a Uint8Array from the arguments given, in order:
 *   - if the next argument given is a number N set the N next bytes to 0.
 *   - else set the next bytes to the argument given.
 * @param {...(Number|Uint8Array)} args
 * @returns {Uint8Array}
 */
function concat(...args : Array<Uint8Array|number[]|number>) : Uint8Array {
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
  return ((bytes[offset + 0] << 8) +
          (bytes[offset + 1] << 0));
}

/**
 * Translate groups of 3 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be3toi(bytes : Uint8Array, offset : number) : number {
  return ((bytes[offset + 0] * 0x0010000) +
          (bytes[offset + 1] * 0x0000100) +
          (bytes[offset + 2]));
}

/**
 * Translate groups of 4 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be4toi(bytes : Uint8Array, offset : number) : number {
  return ((bytes[offset + 0] * 0x1000000) +
          (bytes[offset + 1] * 0x0010000) +
          (bytes[offset + 2] * 0x0000100) +
          (bytes[offset + 3]));
}

/**
 * Translate groups of 8 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be8toi(bytes : Uint8Array, offset : number) : number {
  return (((bytes[offset + 0] * 0x1000000) +
           (bytes[offset + 1] * 0x0010000) +
           (bytes[offset + 2] * 0x0000100) +
           (bytes[offset + 3])
          ) * 0x100000000 +

         (bytes[offset + 4] * 0x1000000) +
         (bytes[offset + 5] * 0x0010000) +
         (bytes[offset + 6] * 0x0000100) +
         (bytes[offset + 7]));
}

/**
 * Translate Integer (from 0 up to 65535) to a Uint8Array of length 2 of
 * the corresponding big-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe2(num : number) : Uint8Array {
  return new Uint8Array([ (num >>> 8) & 0xFF,
                          (num)       & 0xFF ]);
}

/**
 * Translate Integer to a Uint8Array of length 4 of the corresponding big-endian
 * bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe4(num : number) : Uint8Array {
  return new Uint8Array([ (num >>> 24) & 0xFF,
                          (num >>> 16) & 0xFF,
                          (num >>>  8) & 0xFF,
                          (num)        & 0xFF ]);
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
  return new Uint8Array([ (h >>> 24) & 0xFF,
                          (h >>> 16) & 0xFF,
                          (h >>>  8) & 0xFF,
                          (h)        & 0xFF,
                          (l >>> 24) & 0xFF,
                          (l >>> 16) & 0xFF,
                          (l >>>  8) & 0xFF,
                          (l)        & 0xFF ]);
}

/**
 * Translate groups of 2 little-endian bytes to Integer (from 0 up to 65535).
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le2toi(bytes : Uint8Array, offset : number) : number {
  return ((bytes[offset + 0] << 0) +
          (bytes[offset + 1] << 8));
}

/**
 * Translate groups of 4 little-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le4toi(bytes : Uint8Array, offset : number) : number {
  return ((bytes[offset + 0]) +
          (bytes[offset + 1] * 0x0000100) +
          (bytes[offset + 2] * 0x0010000) +
          (bytes[offset + 3] * 0x1000000));
}

/**
 * Translate groups of 8 little-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function le8toi(bytes : Uint8Array, offset : number) : number {
  return (bytes[offset + 0]) +
         (bytes[offset + 1] * 0x0000100) +
         (bytes[offset + 2] * 0x0010000) +
         (bytes[offset + 3] * 0x1000000) +
         (
           (bytes[offset + 4]) +
           (bytes[offset + 5] * 0x0000100) +
           (bytes[offset + 6] * 0x0010000) +
           (bytes[offset + 7] * 0x1000000)
         ) * 0x100000000;
}

/**
 * Translate Integer (from 0 up to 65535) to a Uint8Array of length 2 of
 * the corresponding little-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itole2(num : number) : Uint8Array {
  return new Uint8Array([ (num)       & 0xFF,
                          (num >>> 8) & 0xFF ]);
}

/**
 * Translate Integer to a Uint8Array of length 4 of the corresponding
 * little-endian bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itole4(num : number) : Uint8Array {
  return new Uint8Array([ (num)        & 0xFF,
                          (num >>>  8) & 0xFF,
                          (num >>> 16) & 0xFF,
                          (num >>> 24) & 0xFF ]);
}

/**
 * Check if an ArrayBuffer is equal to the bytes given.
 * @param {ArrayBuffer} buffer
 * @param {Uint8Array} bytes
 * @returns {Boolean}
 */
function isABEqualBytes(buffer : ArrayBuffer, bytes : Uint8Array) : boolean {
  const view = new DataView(buffer);
  const len = view.byteLength;
  if (len !== bytes.length) {
    return false;
  }
  for (let i = 0; i < len; i++) {
    if (view.getUint8(i) !== bytes[i]) {
      return false;
    }
  }
  return true;
}

export {
  concat,
  be2toi, be3toi, be4toi, be8toi,
  le2toi, le4toi, le8toi,
  itobe2, itobe4, itobe8,
  itole2, itole4,
  isABEqualBytes,
};
