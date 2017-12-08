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

/**
 * Calculate start and end timestamps delimiting wanted segments for the current
 * buffer.
 *
 * @param {TimeRanges} buffered - TimeRanges coming from the concerned
 * SourceBuffer
 * @param {Number} currentTime - Time currently played
 * @param {Object} limits
 * @param {Number} limits.start - Minimum time we should have
 * @param {Number} [limits.end] - Maximum time we should have
 * @param {Number} bufferGoal - Current buffer goal (minimum time ahead of the
 * current time wanted in the buffer).
 * @param {Object} paddings - contains two number properties: low and high.
 * If the gap to the end of the current buffered range is superior to the low
 * value, we will offset the start of the range, at most to the high value.
 * This is to avoid having excessive re-buffering where we re-downloads segments
 * already in the buffer.
 * @param {Number} paddings.low
 * @param {Number} paddings.high
 * @returns {Object} - Start and end timestamps, in seconds, under an object
 * form with two properties:
 *   - start {Number}
 *   - end {Number}
 */
export default function getWantedBufferRange(
  buffered : TimeRanges,
  currentTime : number,
  bufferGoal : number,
  limits : { start: number; end? : number },
  paddings : { low : number; high : number }
) : { start : number; end : number } {
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
