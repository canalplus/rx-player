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

import { dashPeriodParser } from "../../parsers/manifest/dash";
import {
  ILinkedPeriod,
  IParsedManifest,
  IParsedPeriod,
} from "../../parsers/manifest/types";

/**
 * Get informations about supposed next and previous
 * playing period against linked period.
 * @param {Object} periods
 * @param {Object} linkedPeriod
 */
function getNextAndPreviousPeriodInfos(
    periods: IParsedPeriod[], linkedPeriod: ILinkedPeriod
  ) {
  const prevPeriodInfos = periods.reduce((
    acc: IParsedPeriod|undefined, period: IParsedPeriod) => {
        if (period.start <= linkedPeriod.start) {
          return period;
        }
        return acc;
    }, undefined);

  const nextPeriodInfos = periods.reduce((
    acc: IParsedPeriod|undefined, period: IParsedPeriod) => {
    if (
      period.start >= linkedPeriod.start &&
      acc == null
    ) {
      return period;
    }
    return acc;
  }, undefined);

  return {
    prevPeriodInfos,
    nextPeriodInfos,
  };
}
/**
 * Parse newly loaded periods, and update the concerned manifest
 * with those.
 * @param {Object} response
 * @param {Object} partialManifest
 * @returns {Object}
 */
function updateManifestWithParsedLinkedPeriods(
  partialManifest : IParsedManifest,
  linkedPeriodData: {
    rawText: string;
    xlink: ILinkedPeriod;
  }
): IParsedManifest {
  const { rawText, xlink } = linkedPeriodData;
  const { nextPeriodInfos, prevPeriodInfos } =
    getNextAndPreviousPeriodInfos(partialManifest.periods, xlink);

  const newParsedPeriods =
    dashPeriodParser(rawText, prevPeriodInfos, nextPeriodInfos);

  const { linkedPeriods, periods } = partialManifest;
  if (linkedPeriods) {
    newParsedPeriods.forEach((period) => {
      const idx = linkedPeriods.findIndex((linkedPeriod) => {
          return linkedPeriod.start === period.start;
        });
      if (idx > -1) {
        linkedPeriods.splice(idx, 1);
      }
    });
    let i = periods.length;
    while (i > 0) {
      const concernedPeriod = periods[i - 1];
      if (concernedPeriod.start <= newParsedPeriods[0].start) {
        periods.splice(i, 0, ...newParsedPeriods);
        i = 0;
      } else {
        i--;
      }
    }
  }

  return partialManifest;
}

export default updateManifestWithParsedLinkedPeriods;
