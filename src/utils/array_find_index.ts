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

// Ugly transitory type to make duck typing work
type ArrayWithFindIndex<T> = T[] & {
  findIndex(
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: unknown,
  ): number;
};

/**
 * Array.prototype.find ponyfill.
 * @param {Array} arr
 * @param {Function} predicate
 * @param {*} thisArg
 * @returns {boolean}
 */
export default function arrayFindIndex<T>(
  arr: T[],
  predicate: (arg: T, index: number, fullArray: T[]) => boolean,
  thisArg?: unknown,
): number {
  // eslint-disable-next-line no-restricted-properties, @typescript-eslint/unbound-method
  if (typeof (Array.prototype as ArrayWithFindIndex<T>).findIndex === "function") {
    // eslint-disable-next-line no-restricted-properties
    return (arr as ArrayWithFindIndex<T>).findIndex(predicate, thisArg);
  }

  const len = arr.length >>> 0;
  for (let i = 0; i < len; i++) {
    if (predicate.call(thisArg, arr[i], i, arr)) {
      return i;
    }
  }
  return -1;
}
