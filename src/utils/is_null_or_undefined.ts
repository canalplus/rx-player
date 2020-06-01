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
 * Returns true if the argument given is neither null or undefined.
 * This function was added to have a clearer alternative to `== null` which is
 * not always understood by newcomers to the code, and which can be overused when
 * only one of the possibility can arise.
 * @param {*} x
 * @returns {*}
 */
export default function isNullOrUndefined(x : unknown) : x is null | undefined | void {
  return x === null || x === undefined;
}
