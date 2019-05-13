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

/**
 * Return minimum seekable time of the MPD at the current time.
 * @param {number} maximumTime - Current maximum time in the MPD.
 * @param {number|undefined} timeShiftBufferDepth - timeShiftBufferDepth, as
 * recuperated from the MPD, in seconds. Undefined if no timeShiftBufferDepth
 * was set.
 * @returns {number}
 */
export default function getMinimumTime(
  maximumTime : number,
  timeShiftBufferDepth? : number
) : number {
  const minimumTimeValue = maximumTime -
    (timeShiftBufferDepth != null ? (timeShiftBufferDepth - 5) : 0);
  return Math.min(minimumTimeValue, maximumTime);
}
