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
import type Period from "./period";
import { MANIFEST_UPDATE_TYPE } from "./types";
import type { IUpdatedPeriodResult } from "./update_period_in_place";
import updatePeriodInPlace from "./update_period_in_place";

/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 * @returns {Object}
 */
export function replacePeriods(
  oldPeriods: Period[],
  newPeriods: Period[],
): IPeriodsUpdateResult {
  const res: IPeriodsUpdateResult = {
    updatedPeriods: [],
    addedPeriods: [],
    removedPeriods: [],
  };
  let firstUnhandledPeriodIdx = 0;
  for (let i = 0; i < newPeriods.length; i++) {
    const newPeriod = newPeriods[i];
    let j = firstUnhandledPeriodIdx;
    let oldPeriod = oldPeriods[j];
    while (oldPeriod != null && oldPeriod.id !== newPeriod.id) {
      j++;
      oldPeriod = oldPeriods[j];
    }
    if (oldPeriod != null) {
      const result = updatePeriodInPlace(oldPeriod, newPeriod, MANIFEST_UPDATE_TYPE.Full);
      res.updatedPeriods.push({ period: oldPeriod, result });
      const periodsToInclude = newPeriods.slice(firstUnhandledPeriodIdx, i);
      const nbrOfPeriodsToRemove = j - firstUnhandledPeriodIdx;
      const removed = oldPeriods.splice(
        firstUnhandledPeriodIdx,
        nbrOfPeriodsToRemove,
        ...periodsToInclude,
      );
      res.removedPeriods.push(...removed);
      res.addedPeriods.push(...periodsToInclude);
      firstUnhandledPeriodIdx = i + 1;
    }
  }

  if (firstUnhandledPeriodIdx > oldPeriods.length) {
    log.error("Manifest: error when updating Periods");
    return res;
  }
  if (firstUnhandledPeriodIdx < oldPeriods.length) {
    const removed = oldPeriods.splice(
      firstUnhandledPeriodIdx,
      oldPeriods.length - firstUnhandledPeriodIdx,
    );
    res.removedPeriods.push(...removed);
  }
  const remainingNewPeriods = newPeriods.slice(
    firstUnhandledPeriodIdx,
    newPeriods.length,
  );
  if (remainingNewPeriods.length > 0) {
    oldPeriods.push(...remainingNewPeriods);
    res.addedPeriods.push(...remainingNewPeriods);
  }
  return res;
}

/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 * @returns {Object}
 */
export function updatePeriods(
  oldPeriods: Period[],
  newPeriods: Period[],
): IPeriodsUpdateResult {
  const res: IPeriodsUpdateResult = {
    updatedPeriods: [],
    addedPeriods: [],
    removedPeriods: [],
  };
  if (oldPeriods.length === 0) {
    oldPeriods.splice(0, 0, ...newPeriods);
    res.addedPeriods.push(...newPeriods);
    return res;
  }
  if (newPeriods.length === 0) {
    return res;
  }
  const oldLastPeriod = oldPeriods[oldPeriods.length - 1];
  if (oldLastPeriod.start < newPeriods[0].start) {
    if (oldLastPeriod.end !== newPeriods[0].start) {
      throw new MediaError(
        "MANIFEST_UPDATE_ERROR",
        "Cannot perform partial update: not enough data",
      );
    }
    oldPeriods.push(...newPeriods);
    res.addedPeriods.push(...newPeriods);
    return res;
  }

  /** Index, in `oldPeriods` of the first element of `newPeriods` */
  const indexOfNewFirstPeriod = arrayFindIndex(
    oldPeriods,
    ({ id }) => id === newPeriods[0].id,
  );
  if (indexOfNewFirstPeriod < 0) {
    throw new MediaError(
      "MANIFEST_UPDATE_ERROR",
      "Cannot perform partial update: incoherent data",
    );
  }

  // The first updated Period can only be a partial part
  const updateRes = updatePeriodInPlace(
    oldPeriods[indexOfNewFirstPeriod],
    newPeriods[0],
    MANIFEST_UPDATE_TYPE.Partial,
  );
  res.updatedPeriods.push({
    period: oldPeriods[indexOfNewFirstPeriod],
    result: updateRes,
  });

  // Search each consecutive elements of `newPeriods` - after the initial one already
  // processed - in `oldPeriods`, removing and adding unfound Periods in the process
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
      // Next element of `newPeriods` not found: insert it
      let toRemoveUntil = -1;
      for (let j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
        if (newPeriod.start < oldPeriods[j].start) {
          toRemoveUntil = j;
          break; // end the loop
        }
      }
      const nbElementsToRemove = toRemoveUntil - prevIndexOfNewPeriod;
      const removed = oldPeriods.splice(
        prevIndexOfNewPeriod,
        nbElementsToRemove,
        newPeriod,
      );
      res.addedPeriods.push(newPeriod);
      res.removedPeriods.push(...removed);
    } else {
      if (indexOfNewPeriod > prevIndexOfNewPeriod) {
        // Some old periods were not found: remove
        log.warn("Manifest: old Periods not found in new when updating, removing");
        const removed = oldPeriods.splice(
          prevIndexOfNewPeriod,
          indexOfNewPeriod - prevIndexOfNewPeriod,
        );
        res.removedPeriods.push(...removed);
        indexOfNewPeriod = prevIndexOfNewPeriod;
      }

      // Later Periods can be fully replaced
      const result = updatePeriodInPlace(
        oldPeriods[indexOfNewPeriod],
        newPeriod,
        MANIFEST_UPDATE_TYPE.Full,
      );
      res.updatedPeriods.push({ period: oldPeriods[indexOfNewPeriod], result });
    }
    prevIndexOfNewPeriod++;
  }

  if (prevIndexOfNewPeriod < oldPeriods.length) {
    log.warn("Manifest: Ending Periods not found in new when updating, removing");
    const removed = oldPeriods.splice(
      prevIndexOfNewPeriod,
      oldPeriods.length - prevIndexOfNewPeriod,
    );
    res.removedPeriods.push(...removed);
  }
  return res;
}

/** Object describing a Manifest update at the Periods level. */
export interface IPeriodsUpdateResult {
  /** Information on Periods that have been updated. */
  updatedPeriods: Array<{
    /** The concerned Period. */
    period: Period;
    /** The updates performed. */
    result: IUpdatedPeriodResult;
  }>;
  /** Periods that have been added. */
  addedPeriods: Period[];
  /** Periods that have been removed. */
  removedPeriods: Period[];
}
