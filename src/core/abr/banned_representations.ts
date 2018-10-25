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

import { Representation } from "../../manifest";

/**
 * From a given quality, return the ban duration.
 * @param {number} quality
 * @returns {number} - ban duration
 */
function getBanDurationFromStreamQuality(playbackQuality: number): number {
  return ((60 * 5) / Math.pow(playbackQuality, 6)) * 1000;
}

/**
 * Ban representation, and de-ban it after a certain duration.
 * @param {Object} representation
 * @param {Array.<Object>} bannedRepresentations
 * @param {number} duration
 */
export default function banRepresentation(
  representation: Representation,
  bannedRepresentations: Representation[],
  quality: number
): void {
  const representationIsAlreadyBanned = bannedRepresentations.some((banned) => {
    return banned.id === representation.id;
  });

  if (!representationIsAlreadyBanned) {
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
