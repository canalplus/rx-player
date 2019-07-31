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

import { IParsedManifest } from "../types";
import getMaximumTime from "./get_maximum_time";

interface ITimeValue { isContinuous : boolean;
                       value : number;
                       time : number; }

export default function getTimeLimits(
  parsedMPD : IParsedManifest,
  timeShiftBufferDepth? : number,
  lastTimeReference? : number
) : [ ITimeValue, /* minimum */ ITimeValue, /* maximum */ ]
{
  const time = performance.now();
  const maximumTime = getMaximumTime(parsedMPD, lastTimeReference);
  const minimumTime : ITimeValue = (() => {
    if (timeShiftBufferDepth == null) {
      const ast = parsedMPD.availabilityStartTime || 0;
      return { isContinuous: false,
               value: ast,
               time };
    } else {
      const minimumTimeValue = maximumTime - (timeShiftBufferDepth - 3);
      const value = Math.min(minimumTimeValue, maximumTime);
      return { isContinuous: true,
               value,
               time };
    }
  })();
  return [ minimumTime,
           { isContinuous: true, value: maximumTime, time } ];
}
