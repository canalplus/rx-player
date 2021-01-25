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
 * @param {Uint8Array} arr - The Uint8Array you want to slice
 * @param {number} start - The starting byte index from the beginning
 * @param {number} end -     Byte index before which to end slicing.
 * If end is unspecified, the new ArrayBuffer contains all bytes from begin to
 * the end of this ArrayBuffer. If negative, it will make the Byte index begin
 * from the last Byte.
 * @returns {Uint8Array}
 */
function arraySlice(
  arr : Uint8Array,
  start : number,
  end? : number
) : Uint8Array {
  return new Uint8Array(Array.prototype.slice.call(arr, start, end));
}

/**
 * @param {Uint8Array} arr - The Uint8Array you want to slice
 * @param {number} start - The starting byte index from the beginning
 * @param {number} end -     Byte index before which to end slicing.
 * If end is unspecified, the new ArrayBuffer contains all bytes from begin to
 * the end of this ArrayBuffer. If negative, it will make the Byte index begin
 * from the last Byte.
 * @returns {Uint8Array}
 */
function uint8ArraySlice(
  arr : Uint8Array,
  start : number,
  end? : number
) : Uint8Array {
  return arr.slice(start, end);
}

export default typeof Uint8Array.prototype.slice === "function" ?
  uint8ArraySlice :
  arraySlice;
