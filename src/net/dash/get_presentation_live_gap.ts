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

import { IParsedDASHManifest } from "../../parsers/manifest/dash/node_parsers";
import { IParsedAdaptation } from "../../parsers/manifest/types";

/**
 * Returns "last time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the earliest last time from every representations in the given
 * adaptation.
 *
 * This is done to calculate a liveGap which is valid for the whole manifest,
 * even in weird ones.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
const getLastLiveTimeReference = (
  adaptation: IParsedAdaptation
): number | undefined => {
  // Here's how we do, for each possibility:
  //  1. every representations have an index:
  //    - returns minimum for every representations
  //
  //  2. no index for 1+ representation(s) and no adaptation index:
  //    - returns undefined
  //
  //  3. Invalid index found somewhere:
  //    - returns undefined
  if (!adaptation) {
    return undefined;
  }
  const representations = adaptation.representations || [];
  const lastLiveTimeReferences: Array<number | undefined> = representations
    .map(representation => {
      const lastPosition = representation.index ?
        representation.index.getLastPosition() :
        null;
      return lastPosition != null ? lastPosition - 10 : undefined;
    });
  if (lastLiveTimeReferences.some((x) => x == null)) {
    return undefined;
  }
  const representationsMin = Math.min(...lastLiveTimeReferences as number[]);
  if (isNaN(representationsMin)) {
    return undefined;
  }
  return representationsMin;
};

/**
 * Get presentation live gap from manifest informations.
 * @param {Object} manifest
 * @returns {number}
 */
export default function getPresentationLiveGap(manifest: IParsedDASHManifest) {
  const lastPeriodAdaptations = manifest.periods[
    manifest.periods.length - 1
  ].adaptations;
  const firstAdaptationsFromLastPeriod = lastPeriodAdaptations.video ||
    lastPeriodAdaptations.audio;
  if (
    !firstAdaptationsFromLastPeriod ||
    !firstAdaptationsFromLastPeriod.length
  ) {
    throw new Error("Can't find first adaptation from last period");
  }
  const firstAdaptationFromLastPeriod = firstAdaptationsFromLastPeriod[0];
  const lastRef = getLastLiveTimeReference(firstAdaptationFromLastPeriod);
  return lastRef != null ?
    Date.now() / 1000 - (lastRef + manifest.availabilityStartTime) :
    10;
}
