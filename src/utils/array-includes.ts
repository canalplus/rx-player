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
 * Ponyfill for the Array.prototype.includes function.
 * Inspired from MDN polyfill, but ponyfilled instead
 *
 * @param {Array.<*>} arr
 * @param {*} searchElement
 * @param {number} [fromIndex]
 * @returns {boolean}
 */
export default function arrayIncludes<T>(
  arr : T[],
  searchElement : T,
  fromIndex? : number
) : boolean {
  /* tslint:disable no-unbound-method */
  if (typeof Array.prototype.includes === "function") {
  /* tslint:enable no-unbound-method */
    return arr.includes(searchElement, fromIndex);
  }

  const len = arr.length >>> 0;

  if (len === 0) {
    return false;
  }

  const n = (fromIndex as number) | 0;
  let k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

  const areTheSame = (x : T, y : T) =>
    x === y ||
      // Viva las JavaScriptas!
      (typeof x === "number" && typeof y === "number"
        && isNaN(x) && isNaN(y));

  while (k < len) {
    if (areTheSame(arr[k], searchElement)) {
      return true;
    }
    k++;
  }

  return false;
}
