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
 * @param {Object} limits
 * @param {Number} bufferGoal
 * @param {Object} paddings
 * @param {Number} paddings.low
 * @param {Number} paddings.high
 * @returns {Object} - Start and end timestamps, in seconds, under an object
 * form with two properties:
 *   - start {Number}
 *   - end {Number}
 */
export default function getWantedBufferRange(
  buffered : TimeRanges,
  limits : {
    start: number;
    end? : number;
    liveGap? : number;
  },
  bufferGoal : number,
  paddings : {
    low : number;
    high : number;
  }
) : {
  start : number;
  end : number;
} {
  const { low: lowPadding, high: highPadding } = paddings;
  const start = limits.start;

  // wantedBufferSize calculates the size of the buffer we want to ensure,
  // taking into account the min between: the set max buffer size, the
  // duration and the live gap.
  const endDiff = (limits.end || Infinity) - start;
  const wantedBufferSize = Math.max(0, limits.liveGap == null ?
    Math.min(bufferGoal, endDiff) :
    Math.min(bufferGoal, limits.liveGap, endDiff)
  );

  const bufferGap = getLeftSizeOfRange(buffered, start);

  // the ts padding is the time offset that we want to apply to our current
  // start in order to calculate the starting point of the list of
  // segments to inject.
  const timestampPadding = bufferGap > lowPadding && bufferGap < Infinity ?
    Math.min(bufferGap, highPadding) : 0;

  return {
    start: start + timestampPadding,
    end: start + wantedBufferSize,
  };
}
