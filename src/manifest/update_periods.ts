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

import { MediaError } from "../errors";
import log from "../log";
import arrayFindIndex from "../utils/array_find_index";
import {
  LoadedPeriod,
  PartialPeriod,
} from "./period";
import { MANIFEST_UPDATE_TYPE } from "./types";
import updatePeriodInPlace from "./update_period_in_place";

// Object informing what changed in an Array of Periods when updating it.
export interface IPeriodsUpdateResult {
  // Period that were available in the old Manifest that are now removed
  removed: Array< PartialPeriod | LoadedPeriod >;

  // Period from the new Manifest that have been added to the old one
  added: Array< PartialPeriod | LoadedPeriod >;

  // Period that have been mutated to be updated / replaced
  updated: Array< PartialPeriod | LoadedPeriod >;

  // Partial Period that have been now loaded
  loaded: Array< [ PartialPeriod, LoadedPeriod[] ] >;
}

/**
 * @param {Object} oldPeriod
 * @param {Object} newPeriod
 * @returns {boolean}
 */
function areLinkedPeriods(
  oldPeriod : PartialPeriod | LoadedPeriod,
  newPeriod : PartialPeriod | LoadedPeriod
) : boolean {
  if (!newPeriod.isLoaded) {
    return newPeriod.id === (oldPeriod.isLoaded ? oldPeriod.partialPeriodId :
                                                  oldPeriod.id);
  }
  return oldPeriod.id === (oldPeriod.isLoaded ? newPeriod.id :
                                                newPeriod.partialPeriodId);
}

/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 */
export function replacePeriods(
  oldPeriods: Array<LoadedPeriod | PartialPeriod>,
  newPeriods: Array<LoadedPeriod | PartialPeriod>
) : IPeriodsUpdateResult {
  const result : IPeriodsUpdateResult = { removed: [],
                                          added: [],
                                          updated: [],
                                          loaded: [] };
  let prevOldPeriodIdx = 0;
  for (let newPeriodIdx = 0; newPeriodIdx < newPeriods.length; newPeriodIdx++) {
    let oldPeriodIdx = prevOldPeriodIdx;

    // find the first old Period linked to newPeriod
    const newPeriod = newPeriods[newPeriodIdx];
    let oldPeriod = oldPeriods[oldPeriodIdx];
    while (oldPeriod !== undefined && !areLinkedPeriods(oldPeriod, newPeriod)) {
      oldPeriodIdx++;
      oldPeriod = oldPeriods[oldPeriodIdx];
    }

    if (oldPeriod !== undefined) {
      // first old Period linked to newPeriod is found, perform an update
      const firstLinkedOldPeriodIdx = oldPeriodIdx;

      if (oldPeriod.isLoaded) {
        if (newPeriod.isLoaded) {
          // both Periods are loaded -> perform a simple update
          updatePeriodInPlace(oldPeriod, newPeriod, MANIFEST_UPDATE_TYPE.Full);
          result.updated.push(oldPeriod);

        } else {
          // Old Period was loaded but the new one is not -> keep the old one(s)
          const oldPeriodsToKeep : LoadedPeriod[] = [oldPeriod];
          let nextPeriod = newPeriods[oldPeriodIdx + 1];
          while (nextPeriod.isLoaded &&
            nextPeriod.partialPeriodId === newPeriod.id)
          {
            oldPeriodsToKeep.push(nextPeriod);
            oldPeriodIdx++;
            nextPeriod = newPeriods[oldPeriodIdx + 1];
          }
        }
      } else if (newPeriod.isLoaded) {
        // the old Period was Partial and is now loaded -> remove the old
        // Period and add the new loaded one(s) in its place

        log.info("Manifest: new Period loaded", oldPeriod.id);

        // get every loaded Period(s) linked to that previous PartialPeriod
        const periodsToAdd : LoadedPeriod[] = [newPeriod];
        let nextPeriod = newPeriods[newPeriodIdx + 1];
        while (nextPeriod.isLoaded &&
               nextPeriod.partialPeriodId === newPeriod.partialPeriodId)
        {
          periodsToAdd.push(nextPeriod);
          newPeriodIdx++;
          nextPeriod = newPeriods[newPeriodIdx + 1];
        }

        // add them and remove the previous partial one
        oldPeriods.splice(oldPeriodIdx, 1, ...periodsToAdd);
        result.removed.push(oldPeriod);
        result.added.push(newPeriod);
        result.loaded.push([oldPeriod, periodsToAdd]);
      } else {
        // both are PartialPeriod -> perform a simple update

        updatePeriodInPlace(oldPeriod, newPeriod, MANIFEST_UPDATE_TYPE.Full);
        result.updated.push(oldPeriod);
      }

      const nbrOfPeriodsToRemove = firstLinkedOldPeriodIdx - prevOldPeriodIdx;
      const periodsToInclude = newPeriods.slice(prevOldPeriodIdx, newPeriodIdx);
      const removedElts = oldPeriods.splice(prevOldPeriodIdx,
                                            nbrOfPeriodsToRemove,
                                            ...periodsToInclude);
      result.removed.push(...removedElts);
      result.added.push(...periodsToInclude);

      prevOldPeriodIdx = newPeriodIdx + 1;
    }
  }

  if (prevOldPeriodIdx > oldPeriods.length) {
    log.error("Manifest: error when updating Periods");
    return result;
  }
  if (prevOldPeriodIdx < oldPeriods.length) {
    const removedElts = oldPeriods.splice(prevOldPeriodIdx,
                                          oldPeriods.length - prevOldPeriodIdx);
    result.removed.push(...removedElts);
  }
  const remainingNewPeriods = newPeriods.slice(prevOldPeriodIdx,
                                               newPeriods.length);
  if (remainingNewPeriods.length > 0) {
    oldPeriods.push(...remainingNewPeriods);
    result.added.push(...remainingNewPeriods);
  }
  return result;
}

/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 */
export function updatePeriods(
  oldPeriods: Array<LoadedPeriod | PartialPeriod>,
  newPeriods: Array<LoadedPeriod | PartialPeriod>
) : IPeriodsUpdateResult {
  const result : IPeriodsUpdateResult = { removed: [],
                                          added: [],
                                          updated: [],
                                          loaded: [] };
  if (oldPeriods.length === 0) {
    const removedElts = oldPeriods.splice(0, 0, ...newPeriods);
    result.removed.push(...removedElts);
    result.added.push(...newPeriods);
    return result;
  }
  if (newPeriods.length === 0) {
    return result;
  }
  const oldLastPeriod = oldPeriods[oldPeriods.length - 1];
  if (oldLastPeriod.start < newPeriods[0].start) {
    if (oldLastPeriod.end !== newPeriods[0].start) {
      throw new MediaError("MANIFEST_UPDATE_ERROR",
                           "Cannot perform partial update: not enough data");
    }
    oldPeriods.push(...newPeriods);
    result.added.push(...newPeriods);
    return result;
  }
  const indexOfNewFirstPeriod = arrayFindIndex(oldPeriods,
                                               ({ id }) => id === newPeriods[0].id);
  if (indexOfNewFirstPeriod < 0) {
    throw new MediaError("MANIFEST_UPDATE_ERROR",
                         "Cannot perform partial update: incoherent data");
  }
  const firstOldPeriodToUpdate = oldPeriods[indexOfNewFirstPeriod];
  const firstNewPeriod = newPeriods[0];

  // XXX TODO
  if (!firstOldPeriodToUpdate.isLoaded || !firstNewPeriod.isLoaded) {
    throw new Error();
  }

  // The first updated Period can be a partial part only
  updatePeriodInPlace(firstOldPeriodToUpdate,
                      firstNewPeriod,
                      MANIFEST_UPDATE_TYPE.Partial);

  let prevIndexOfNewPeriod = indexOfNewFirstPeriod + 1;
  for (let i = 1; i < newPeriods.length; i++) {
    const newPeriod = newPeriods[i];
    let indexOfNewPeriod = -1;
    for (let j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
      if (newPeriod.id === oldPeriods[j].id) {
        indexOfNewPeriod = j;
        break; // end the loop
      }
    }
    if (indexOfNewPeriod < 0) {
      oldPeriods.splice(prevIndexOfNewPeriod,
                        oldPeriods.length - prevIndexOfNewPeriod,
                        ...newPeriods.slice(i, newPeriods.length));
      return result;
    }

    if (indexOfNewPeriod > prevIndexOfNewPeriod) {
      oldPeriods.splice(prevIndexOfNewPeriod,
                        indexOfNewPeriod - prevIndexOfNewPeriod);
      indexOfNewPeriod = prevIndexOfNewPeriod;
    }

    const oldPeriod = oldPeriods[indexOfNewPeriod];

    // XXX TODO
    if (!oldPeriod.isLoaded || !newPeriod.isLoaded) {
      throw new Error();
    }

    // Later Periods can be fully replaced
    updatePeriodInPlace(oldPeriod,
                        newPeriod,
                        MANIFEST_UPDATE_TYPE.Full);
    prevIndexOfNewPeriod++;
  }

  if (prevIndexOfNewPeriod < oldPeriods.length)  {
    oldPeriods.splice(prevIndexOfNewPeriod,
                      oldPeriods.length - prevIndexOfNewPeriod);
  }
  return result;
}
