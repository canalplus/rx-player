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
 * Uniq implementation by combining a filter and an indexOf.
 * @param {Array.<*>} arr
 * @returns {Array.<*>}
 */
function uniqFromFilter<T>(arr: T[]) : T[] {
  return arr.filter((val, i, self) => self.indexOf(val) === i);
}

/**
 * Uniq implementation by using the Set browser API.
 * @param {Array.<*>} arr
 * @returns {Array.<*>}
 */
function uniqFromSet<T>(arr: T[]) : T[] {
  return Array.from(new Set(arr));
}

/**
 * Returns the input array without duplicates values.
 * All values are unique.
 * @param {Array.<*>} arr
 * @returns {Array.<*>}
 */
export default  typeof window !== "undefined" &&
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                typeof (window as any).Set === "function" &&
                typeof Array.from === "function" ? uniqFromSet :
                                                   uniqFromFilter;
export {
  uniqFromFilter,
  uniqFromSet,
};
