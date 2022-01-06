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

import areArraysOfNumbersEqual from "../../../utils/are_arrays_of_numbers_equal";
import InitDataContainer from "./init_data_container";

/**
 * Returns `true` if both values are compatible initialization data, which
 * means that one is completely contained in the other.
 *
 * Both values given should be sorted by systemId the same way.
 * @param {Array.<Object>} stored
 * @param {Array.<Object>} newElts
 * @returns {boolean}
 */
export default function areInitializationValuesCompatible(
  stored : Array<{ systemId : string | undefined;
                   hash : number;
                   data : Uint8Array | InitDataContainer; }>,
  newElts : Array<{ systemId : string | undefined;
                    hash : number;
                    data : Uint8Array | InitDataContainer; }>
) : boolean {
  return _isAInB(stored, newElts) ??
         _isAInB(newElts, stored) ??
         false;
}

/**
 * Take two arrays of initialization data values, `a` and `b`, sorted by
 * their `systemId` property in the same order.
 *
 * Returns `true` if `a` is not empty and is completely contained in the `b`
 * array.
 * This is equivalent to: "`a` is contained in `b`".
 *
 * Returns `false` either if `a` is empty or if `b` has different initialization
 * data than it for equivalent system ids.
 * This is equivalent to: "`a` represents different data than `b`".
 *
 * Returns `null` if `a` is not fully contained in `b` but can still be
 * compatible with it.
 * This is equivalent to: "`a` is not contained in `b`, but `b` could be
 * contained in `a`".
 * @param {Array.<Object>} a
 * @param {Array.<Object>} b
 * @returns {boolean}
 */
function _isAInB(
  a : Array<{ systemId : string | undefined;
              hash : number;
              data : Uint8Array | InitDataContainer; }>,
  b : Array<{ systemId : string | undefined;
              hash : number;
              data : Uint8Array | InitDataContainer; }>
) : boolean | null {
  if (a.length === 0) {
    return false;
  }
  if (b.length < a.length) {
    return null;
  }

  const firstAElt = a[0];
  let aIdx = 0;
  let bIdx = 0;

  for (; bIdx < b.length; bIdx++) {
    const bElt = b[bIdx];
    if (bElt.systemId !== firstAElt.systemId) {
      continue;
    }
    if (bElt.hash !== firstAElt.hash) {
      return false;
    }

    const aData : Uint8Array =
      firstAElt.data instanceof Uint8Array ? firstAElt.data :
      typeof firstAElt.data === "string"   ? InitDataContainer.decode(firstAElt.data) :
                                             firstAElt.data.initData;
    const bData : Uint8Array =
      bElt.data instanceof Uint8Array ? bElt.data :
      typeof bElt.data === "string"   ? InitDataContainer.decode(bElt.data) :
                                             bElt.data.initData;
    if (!areArraysOfNumbersEqual(aData, bData)) {
      return false;
    }

    if (b.length - bIdx < a.length) {
      // not enough place to store `a`'s initialization data.
      return null;
    }

    // first `a` value was found. Check if all `a` values are found in `b`
    for (aIdx = 1; aIdx < a.length; aIdx++) {
      const aElt = a[aIdx];
      for (bIdx += 1; bIdx < b.length; bIdx++) {
        const bNewElt = b[bIdx];
        if (aElt.systemId !== bNewElt.systemId) {
          continue;
        }
        if (aElt.hash !== bNewElt.hash) {
          return false;
        }
        const aNewData : Uint8Array =
          aElt.data instanceof Uint8Array ? aElt.data :
          typeof aElt.data === "string"   ? InitDataContainer.decode(aElt.data) :
                                                 aElt.data.initData;
        const bNewData : Uint8Array =
          bNewElt.data instanceof Uint8Array ? bNewElt.data :
          typeof bNewElt.data === "string"   ? InitDataContainer.decode(bNewElt.data) :
                                               bNewElt.data.initData;
        if (!areArraysOfNumbersEqual(aNewData, bNewData)) {
          return false;
        }
        break;
      }
      if (aIdx === b.length) {
        // we didn't find `aElt`'s systemId in b
        return null;
      }
    }
    // If we're here, then we've found all `a`'s systemId in `b` and they match
    return true;
  }
  return null; // We didn't find the firstAElt`s systemId in `b`.
}
