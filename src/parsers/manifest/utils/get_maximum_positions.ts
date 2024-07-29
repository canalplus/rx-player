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
import getLastPositionFromRepresentations from "./get_last_time_from_representations";

/**
 * @param {Array.<Object>} periods
 * @returns {number | undefined}
 */
export default function getMaximumPosition(periods: IParsedPeriod[]): {
  safe: number | undefined;
  unsafe: number | undefined;
} {
  for (let i = periods.length - 1; i >= 0; i--) {
    const periodVariantStreams = periods[i].variantStreams;
    const firstAudioMediaFromPeriod = periodVariantStreams[0]?.audio?.[0];
    const firstVideoMediaFromPeriod = periodVariantStreams[0]?.video?.[0];

    if (
      firstAudioMediaFromPeriod !== undefined ||
      firstVideoMediaFromPeriod !== undefined
    ) {
      // null == no segment
      let maximumAudioPosition: number | null = null;
      let maximumVideoPosition: number | null = null;
      if (firstAudioMediaFromPeriod !== undefined) {
        const lastPosition = getLastPositionFromRepresentations(
          firstAudioMediaFromPeriod.representations,
        );
        if (lastPosition === undefined) {
          return { safe: undefined, unsafe: undefined };
        }
        maximumAudioPosition = lastPosition;
      }
      if (firstVideoMediaFromPeriod !== undefined) {
        const lastPosition = getLastPositionFromRepresentations(
          firstVideoMediaFromPeriod.representations,
        );
        if (lastPosition === undefined) {
          return { safe: undefined, unsafe: undefined };
        }
        maximumVideoPosition = lastPosition;
      }

      if (
        (firstAudioMediaFromPeriod !== undefined && maximumAudioPosition === null) ||
        (firstVideoMediaFromPeriod !== undefined && maximumVideoPosition === null)
      ) {
        log.info(
          "Parser utils: found Period with no segment. ",
          "Going to previous one to calculate last position",
        );
        return { safe: undefined, unsafe: undefined };
      }

      if (maximumVideoPosition !== null) {
        if (maximumAudioPosition !== null) {
          return {
            safe: Math.min(maximumAudioPosition, maximumVideoPosition),
            unsafe: Math.max(maximumAudioPosition, maximumVideoPosition),
          };
        }
        return { safe: maximumVideoPosition, unsafe: maximumVideoPosition };
      }
      if (maximumAudioPosition !== null) {
        return { safe: maximumAudioPosition, unsafe: maximumAudioPosition };
      }
    }
  }
  return { safe: undefined, unsafe: undefined };
}
