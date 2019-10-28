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

export interface IClockTick {
  currentTime : number;
  wantedTimeOffset : number;
  liveGap? : number;
}

/**
 * Returns the range of segments needed for a particular point in time.
 *
 * @param {Object} hardLimits
 * @param {TimeRanges} buffered
 * @param {Object} tick
 * @param {number} bufferGoal
 * @param {Object} paddings
 * @returns {Object}
 */
export default function getWantedRange(
  hardLimits : { start? : number; end? : number },
  tick : IClockTick,
  bufferGoal : number
) : { start : number; end : number } {
  const currentTime = tick.currentTime + tick.wantedTimeOffset;
  const startHardLimit = hardLimits.start == null ? 0 :
                                                    hardLimits.start;
  const endHardLimit = hardLimits.end == null ? Infinity :
                                                hardLimits.end;
  const boundedLimits = { start: Math.max(startHardLimit, currentTime),
                          end: endHardLimit };

  return { start: Math.min(boundedLimits.end,
                           Math.max(currentTime,
                                    boundedLimits.start)),
           end: Math.min(boundedLimits.end,
                         Math.max(currentTime + bufferGoal,
                                  boundedLimits.start)),
  };
}
