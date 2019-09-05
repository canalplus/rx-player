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
import { IParsedManifest } from "../types";
import getFirstPositionFromAdaptation from "./get_first_time_from_adaptation";

/**
 * @param {Object} manifest
 * @returns {number | undefined}
 */
export default function getMinimumPosition(
  manifest: IParsedManifest
) : number | undefined {
  for (let i = 0; i <= manifest.periods.length - 1; i--) {
    const periodAdaptations = manifest.periods[i].adaptations;
    const firstAudioAdaptationFromPeriod = periodAdaptations.audio == null ?
      undefined :
      periodAdaptations.audio[0];
    const firstVideoAdaptationFromPeriod =  periodAdaptations.video == null ?
      undefined :
      periodAdaptations.video[0];

    if (firstAudioAdaptationFromPeriod != null ||
        firstVideoAdaptationFromPeriod != null)
    {
      // null == no segment
      let minimumAudioPosition : number | null = null;
      let minimumVideoPosition : number | null = null;
      if (firstAudioAdaptationFromPeriod != null) {
        const firstPosition =
          getFirstPositionFromAdaptation(firstAudioAdaptationFromPeriod);
        if (firstPosition === undefined) {
          return undefined;
        }
        minimumAudioPosition = firstPosition;
      }
      if (firstVideoAdaptationFromPeriod != null) {
        const firstPosition =
          getFirstPositionFromAdaptation(firstVideoAdaptationFromPeriod);
        if (firstPosition === undefined) {
          return undefined;
        }
        minimumVideoPosition = firstPosition;
      }

      if (minimumAudioPosition === null || minimumVideoPosition === null) {
        log.info("DASH Parser: found Period with no segment. ",
                 "Going to next one to calculate first position");
      } else {
        if (firstVideoAdaptationFromPeriod == null) {
          return minimumAudioPosition;
        }
        if (firstAudioAdaptationFromPeriod == null) {
          return minimumVideoPosition;
        }
        return Math.max(minimumAudioPosition, minimumVideoPosition);
      }
    }
  }
}
