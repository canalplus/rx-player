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

import {
  IParsedAdaptation,
  IParsedManifest,
} from "../types";

/**
 * Returns "first time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the latest first time from every representations in the given
 * adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
function getFirstTimeReferenceFromAdaptation(
  adaptation: IParsedAdaptation
) : number | undefined {
  if (!adaptation) {
    return undefined;
  }
  const representations = adaptation.representations || [];
  const firstTimeReferences: Array<number | undefined> = representations
    .map(representation => {
      const firstPosition = representation.index.getFirstPosition();
      return firstPosition != null ? firstPosition : undefined;
    });

  if (firstTimeReferences.some((x) => x == null)) {
    return undefined;
  }

  const representationsMin = Math.max(...firstTimeReferences as number[]);
  return isNaN(representationsMin) ? undefined : representationsMin;
}

/**
 * Returns "last time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the earliest last time from every representations in the given
 * adaptation.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
function getLastTimeReferenceFromAdaptation(
  adaptation: IParsedAdaptation
) : number | undefined {
  if (!adaptation) {
    return undefined;
  }
  const representations = adaptation.representations || [];
  const lastTimeReferences: Array<number | undefined> = representations
    .map(representation => {
      const lastPosition = representation.index.getLastPosition();
      return lastPosition != null ? lastPosition : undefined;
    });

  if (lastTimeReferences.some((x) => x == null)) {
    return undefined;
  }

  const representationsMin = Math.min(...lastTimeReferences as number[]);
  return isNaN(representationsMin) ? undefined : representationsMin;
}

/**
 * Get presentation live gap from manifest informations.
 * @param {Object} manifest
 * @returns {number}
 */
export default function getMinimumAndMaximumPosition(
  manifest: IParsedManifest
) : [number|undefined, number|undefined] {
  if (manifest.periods.length === 0) {
    throw new Error("DASH Parser: no period available for a live content");
  }
  const lastPeriodAdaptations =
    manifest.periods[manifest.periods.length - 1].adaptations;
  const firstAdaptationsFromLastPeriod =
    lastPeriodAdaptations.video || lastPeriodAdaptations.audio;
  if (!firstAdaptationsFromLastPeriod || !firstAdaptationsFromLastPeriod.length) {
    throw new Error("DASH Parser: Can't find first adaptation from last period");
  }
  const firstAdaptationFromLastPeriod = firstAdaptationsFromLastPeriod[0];
  if (firstAdaptationsFromLastPeriod == null) {
    return [undefined, undefined];
  }
  return [ getFirstTimeReferenceFromAdaptation(firstAdaptationFromLastPeriod),
           getLastTimeReferenceFromAdaptation(firstAdaptationFromLastPeriod) ];
}
