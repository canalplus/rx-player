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
 * String.prototype.startsWith ponyfill.
 * Indicates Whether a string starts with another substring.
 *
 * Inspired from MDN polyfill, but ponyfilled instead.
 * @param {string} completeString
 * @param {string} searchString
 * @param {number} [position]
 * @returns {boolean}
 */
export default function startsWith(
  completeString : string,
  searchString : string,
  position? : number
) : boolean {
  /* tslint:disable no-unbound-method */
  if (typeof String.prototype.startsWith === "function") {
  /* tslint:enable no-unbound-method */
    /* tslint:disable ban */
    return completeString.startsWith(searchString, position);
    /* tslint:enable ban */
  }
  const initialPosition = position || 0;
  return completeString
    .substring(initialPosition, initialPosition + searchString.length) === searchString;
}
