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

import config from "../../config";
import log from "../../log";
import { Representation } from "../../manifest";

const { ABR_BAN_TIME_STEPS } = config;

/**
 * From a given quality, return the ban duration.
 * @param {number} quality
 * @returns {number} - ban duration
 */
function getBanDurationFromStreamQuality(playbackQuality: number): number {
  const steps = ABR_BAN_TIME_STEPS.sort((a, b) => a.minimumQuality - b.minimumQuality);
  return steps.reduce((acc, step) => {
    if (playbackQuality >= step.minimumQuality) {
      return step.time;
    }
    return acc;
  }, steps[0].time);
}

/**
 * Ban representation, and de-ban it after a certain duration.
 * @param {Object} representation
 * @param {Array.<Object>} bannedRepresentations
 * @param {number} duration
 */
export default function banRepresentationFromPlayback(
  representation: Representation,
  bannedRepresentations: Representation[],
  quality: number
): void {
  const representationIsAlreadyBanned = bannedRepresentations.some((banned) => {
    return banned.id === representation.id;
  });

  if (!representationIsAlreadyBanned) {
    log.info("ABR - banned representation", representation);
    const duration = getBanDurationFromStreamQuality(quality);
    bannedRepresentations.push(representation);

    setTimeout(() => {
      const idx = bannedRepresentations.findIndex((banned) => {
        return banned.id === representation.id;
      });
      bannedRepresentations.splice(idx, 1);
    }, duration);
  }
}
