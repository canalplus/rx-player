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
import {
  IParsedPartialPeriod,
  IParsedPeriod,
} from "../types";
import getFirstPositionFromAdaptation from "./get_first_time_from_adaptation";

export interface INeedsToLoadPeriodEvent {
  type : "needs-to-load-period";
  value : IParsedPartialPeriod;
}

export interface IResultEvent {
  type : "result";
  value : number | undefined;
}

/**
 * @param {Array.<Object>} periods
 * @returns {Object}
 */
export default function getMinimumPosition(periods : IParsedPeriod[]) : IResultEvent;
export default function getMinimumPosition(
  periods : Array<IParsedPartialPeriod | IParsedPeriod>
) : INeedsToLoadPeriodEvent | IResultEvent;
export default function getMinimumPosition(
  periods : Array<IParsedPartialPeriod | IParsedPeriod>
) : INeedsToLoadPeriodEvent | IResultEvent {
  for (let i = 0; i <= periods.length - 1; i++) {
    const period = periods[i];
    if (!period.isLoaded) {
      return { type: "needs-to-load-period",
               value: period };
    }
    const periodAdaptations = period.adaptations;
    const firstAudioAdaptationFromPeriod = periodAdaptations.audio === undefined ?
      undefined :
      periodAdaptations.audio[0];
    const firstVideoAdaptationFromPeriod =  periodAdaptations.video === undefined ?
      undefined :
      periodAdaptations.video[0];

    if (firstAudioAdaptationFromPeriod !== undefined ||
        firstVideoAdaptationFromPeriod !== undefined)
    {
      // null == no segment
      let minimumAudioPosition : number | null = null;
      let minimumVideoPosition : number | null = null;
      if (firstAudioAdaptationFromPeriod !== undefined) {
        const firstPosition =
          getFirstPositionFromAdaptation(firstAudioAdaptationFromPeriod);
        if (firstPosition === undefined) {
          return { type: "result", value: undefined };
        }
        minimumAudioPosition = firstPosition;
      }
      if (firstVideoAdaptationFromPeriod !== undefined) {
        const firstPosition =
          getFirstPositionFromAdaptation(firstVideoAdaptationFromPeriod);
        if (firstPosition === undefined) {
          return { type: "result", value: undefined };
        }
        minimumVideoPosition = firstPosition;
      }

      if ((firstAudioAdaptationFromPeriod !== undefined &&
           minimumAudioPosition === null) ||
          (firstVideoAdaptationFromPeriod !== undefined &&
           minimumVideoPosition === null)) {
        log.info("Parser utils: found Period with no segment. ",
                 "Going to next one to calculate first position");
        return { type: "result", value: undefined };
      }

      if (minimumVideoPosition !== null) {
        const value = minimumAudioPosition !== null ?
          Math.max(minimumAudioPosition, minimumVideoPosition) :
          minimumVideoPosition;
        return { type: "result", value };
      }
      if (minimumAudioPosition !== null) {
        return { type: "result", value: minimumAudioPosition };
      }
    }
  }
  return { type: "result", value: undefined };
}
