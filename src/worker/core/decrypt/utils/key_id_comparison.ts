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

import areArraysOfNumbersEqual from "../../../../common/utils/are_arrays_of_numbers_equal";

/**
 * Returns `true` if both given key id appear to be equal.
 * @param {Uint8Array} keyId1
 * @param {Uint8Array} keyId2
 * @returns {boolean}
 */
export function areKeyIdsEqual(
  keyId1 : Uint8Array,
  keyId2 : Uint8Array
) : boolean {
  return keyId1 === keyId2 || areArraysOfNumbersEqual(keyId1, keyId2);
}

/**
 * @param {Uint8Array} wantedKeyId
 * @param {Array.<Uint8Array>} keyIdsArr
 * @returns {boolean}
 */
export function isKeyIdContainedIn(
  wantedKeyId : Uint8Array,
  keyIdsArr : Uint8Array[]
) : boolean {
  return keyIdsArr.some(k => areKeyIdsEqual(k, wantedKeyId));
}

/**
 * Returns `true` if all key ids in `wantedKeyIds` are present in the
 * `keyIdsArr` array.
 * @param {Array.<Uint8Array>} wantedKeyIds
 * @param {Array.<Uint8Array>} keyIdsArr
 * @returns {boolean}
 */
export function areAllKeyIdsContainedIn(
  wantedKeyIds : Uint8Array[],
  keyIdsArr : Uint8Array[]
) : boolean {
  for (const keyId of wantedKeyIds) {
    const found = keyIdsArr.some(k => areKeyIdsEqual(k, keyId));
    if (!found) {
      return false;
    }
  }
  return true;
}

/**
 * Returns `true` if at least one key id in `wantedKeyIds` is present in the
 * `keyIdsArr` array.
 * @param {Array.<Uint8Array>} wantedKeyIds
 * @param {Array.<Uint8Array>} keyIdsArr
 * @returns {boolean}
 */
export function areSomeKeyIdsContainedIn(
  wantedKeyIds : Uint8Array[],
  keyIdsArr : Uint8Array[]
) : boolean {
  for (const keyId of wantedKeyIds) {
    const found = keyIdsArr.some(k => areKeyIdsEqual(k, keyId));
    if (found) {
      return true;
    }
  }
  return false;
}
