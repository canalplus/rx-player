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
 * Convert given buffer to a 32bit integer hash
 * @param {Array|TypedArray} buffer
 * @returns {Number}
 */
function hashBuffer(buffer : Uint8Array|number[]) : number {
  let hash = 0;
  let char;
  for (let i = 0; i < buffer.length; i++) {
    char = buffer[i];
    hash = ((hash <<  5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Convert given init data to a 32bit integer hash
 * @param {Array|TypedArray|number} buffer
 * @returns {Number}
 */
function hashInitData(initData: Uint8Array|number[]|number) : number {
  if (typeof initData === "number") {
    return initData;
  } else {
    return hashBuffer(initData);
  }
}

export default hashInitData;
