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

import { getLeftSizeOfRange } from "../../utils/ranges";

export interface ITimingData {
  currentTime : number;
  wantedTimeOffset : number;
  liveGap? : number;
}

/**
 * Returns the range of segments needed for a particular point in time.
 *
 * @param {Object} hardLimits
 * @param {TimeRanges} buffered
 * @param {Object} timing
 * @param {number} bufferGoal
 * @param {Object} paddings
 * @returns {Object}
 */
export default function getWantedRange(
  hardLimits : { start? : number; end? : number },
  buffered : TimeRanges,
  timing : ITimingData,
  bufferGoal : number,
  paddings : { low : number; high : number }
) : { start : number; end : number } {
  const currentTime = timing.currentTime + timing.wantedTimeOffset;
  const limitEnd = timing.liveGap == null ?
    hardLimits.end :
    Math.min(hardLimits.end || Infinity, timing.currentTime + timing.liveGap);
  const boundedLimits = {
    start: Math.max(hardLimits.start || 0, currentTime),
    end: limitEnd,
  };

  const { low: lowPadding, high: highPadding } = paddings;

  // Difference between the current time and the end of the current range
  const bufferGap = getLeftSizeOfRange(buffered, currentTime);

  // the timestamp padding is the time offset that we want to apply to our
  // current start in order to calculate the starting point of the list of
  // segments to inject.
  const timestampPadding = bufferGap > lowPadding && bufferGap < Infinity ?
    Math.min(bufferGap, highPadding) : 0;

  return {

    start: Math.min(
      Math.max(currentTime + timestampPadding, boundedLimits.start),
      boundedLimits.end || Infinity),

    end: Math.min(
      Math.max(currentTime + bufferGoal, boundedLimits.start),
      boundedLimits.end || Infinity),
  };
}
