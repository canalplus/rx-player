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
 * Transform an array of strings into an Object with the key and value
 * mirrored.
 * @param {Array.<string>} list
 * @returns {Object}
 */
export default function listToMap(
  list : string[]
) : { [key: string] : string } {

  const map = list.reduce((obj : { [key: string] : string }, name : string) => {
    obj[name] = name;
    return obj;
  }, {});
  return map;
}
