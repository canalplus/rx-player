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

import { Period } from "../../manifest";
import { getLeftSizeOfRange } from "../../utils/ranges";

// XXX TODO
// Item emitted by the Buffer's clock$
export interface IBufferClockTick {
  currentTime : number;
  readyState : number;

  // TODO Rename "baseTime" or something which will be currentTime + timeOffset
  timeOffset : number;
  stalled : object|null;
  liveGap? : number;
}

/**
 * Returns the range needed for a particular point in time.
 * @param {Object} timing
 * @param {number} bufferGoal
 * @returns {Object}
 */
export default function getWantedRange(
  period : Period,
  buffered : TimeRanges,
  timing : IBufferClockTick,
  bufferGoal : number,
  paddings : { low : number; high : number }
) : { start : number; end : number } {
  const currentTime = timing.currentTime + timing.timeOffset;
  const limitEnd = timing.liveGap == null ?
    period.end : Math.min(period.end || Infinity, currentTime + timing.liveGap);
  const limits = {
    start: Math.max(period.start, timing.currentTime + timing.timeOffset),
    end: limitEnd,
  };

  const { low: lowPadding, high: highPadding } = paddings;

  // Difference between the current time and the end of the current range
  const bufferGap = getLeftSizeOfRange(buffered, currentTime);

  // the ts padding is the time offset that we want to apply to our current
  // start in order to calculate the starting point of the list of
  // segments to inject.
  const timestampPadding = bufferGap > lowPadding && bufferGap < Infinity ?
    Math.min(bufferGap, highPadding) : 0;

  return {
    start: Math.min(
      Math.max(currentTime + timestampPadding, limits.start),
      limits.end || Infinity),
    end: Math.min(
      Math.max(currentTime + bufferGoal, limits.start),
      limits.end || Infinity),
  };
}
