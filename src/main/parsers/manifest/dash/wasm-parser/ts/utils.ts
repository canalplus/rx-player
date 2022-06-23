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
 * @param {TextDecoder} textDecoder
 * @param {ArrayBuffer} buffer
 * @param {number} ptr
 * @param {number} len
 * @returns {string}
 */
function parseString(
  textDecoder : TextDecoder,
  buffer : ArrayBuffer,
  ptr : number,
  len : number
) : string {
  const arr = new Uint8Array(buffer, ptr, len);
  return textDecoder.decode(arr);
}

/**
 * @param {number} val
 * @returns {number|boolean}
 */
function parseFloatOrBool(val : number) : number | boolean {
  return val === Infinity  ? true :
         val === -Infinity ? false :
                             val;
}

export {
  parseString,
  parseFloatOrBool,
};
