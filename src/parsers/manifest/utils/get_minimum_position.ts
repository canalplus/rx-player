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

import log from "../../../log";
import type { IParsedPeriod } from "../types";
import getFirstPositionFromRepresentations from "./get_first_time_from_representations";

/**
 * @param {Array.<Object>} periods
 * @returns {number | undefined}
 */
export default function getMinimumPosition(periods: IParsedPeriod[]): number | undefined {
  for (let i = 0; i <= periods.length - 1; i++) {
    const periodVariantStreams = periods[i].variantStreams;
    const firstAudioMediaFromPeriod = periodVariantStreams[0]?.audio?.[0];
    const firstVideoMediaFromPeriod = periodVariantStreams[0]?.video?.[0];

    if (
      firstAudioMediaFromPeriod !== undefined ||
      firstVideoMediaFromPeriod !== undefined
    ) {
      // null == no segment
      let minimumAudioPosition: number | null = null;
      let minimumVideoPosition: number | null = null;
      if (firstAudioMediaFromPeriod !== undefined) {
        const firstPosition = getFirstPositionFromRepresentations(
          firstAudioMediaFromPeriod.representations,
        );
        if (firstPosition === undefined) {
          return undefined;
        }
        minimumAudioPosition = firstPosition;
      }
      if (firstVideoMediaFromPeriod !== undefined) {
        const firstPosition = getFirstPositionFromRepresentations(
          firstVideoMediaFromPeriod.representations,
        );
        if (firstPosition === undefined) {
          return undefined;
        }
        minimumVideoPosition = firstPosition;
      }

      if (
        (firstAudioMediaFromPeriod !== undefined && minimumAudioPosition === null) ||
        (firstVideoMediaFromPeriod !== undefined && minimumVideoPosition === null)
      ) {
        log.info(
          "Parser utils: found Period with no segment. ",
          "Going to next one to calculate first position",
        );
        return undefined;
      }

      if (minimumVideoPosition !== null) {
        if (minimumAudioPosition !== null) {
          return Math.max(minimumAudioPosition, minimumVideoPosition);
        }
        return minimumVideoPosition;
      }
      if (minimumAudioPosition !== null) {
        return minimumAudioPosition;
      }
    }
  }
}
