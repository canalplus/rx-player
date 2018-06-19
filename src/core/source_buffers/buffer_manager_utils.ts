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

import {
  ITimedData,
  ITimedDataSegment,
} from "./types";

/**
 * Maximum time difference, in seconds, between two segment's start times
 * and/or end times for them to be considered the same.
 *
 * For example for two segments s1 and s2 which have a start time respectively
 * of st1 and st2 and end time of et1 and et2:
 *   - if both the absolute difference between st1 and st2 AND the one between
 *     et1 and et2 is inferior or equal to the MAX_DELTA_BUFFER_TIME, s1 and s2
 *     are considered to target the exact same time. As a consequence, if s2 is
 *     added after s1 in the SourceBuffer, s1 will be completely replaced by
 *     it and vice-versa.
 *   - if only one of the two (absolute difference between st1 and st2 OR et1
 *     and et2) is inferior to the MAX_DELTA_BUFFER_TIME then the last added
 *     is not completely considered the same. It WILL still replace - either
 *     partially or completely (depending on the sign of the other difference) -
 *     the previously added segment.
 *   - if both differences are strictly superior to the MAX_DELTA_BUFFER_TIME,
 *     then they are not considered to have the same start nor the same end.
 *     They can still overlap however, and MIGHT thus still replace partially
 *     or completely each other.
 *
 * Setting a value too low might lead to two segments targeting the same time,
 * both being present in the SourceBuffer. In worst case scenarios, this could
 * lead to indicate that an unwanted segment is still here (theorically
 * though, this is a case that should never happen for reasons that might be too
 * long to explain here).
 *
 * Setting a value too high might lead to two segments targeting different times
 * to be wrongly believed to target the same time. In worst case scenarios, this
 * could lead to wanted segments being removed.
 * @type Number
 */
const MAX_DELTA_BUFFER_TIME : number = 0.2;

/**
 * @see MAX_DELTA_BUFFER_TIME
 * @param {Number} a
 * @param {Number} b
 * @returns {Boolean}
 */
export function areNearlyEqual(a : number, b : number) : boolean {
  return Math.abs(a - b) <= MAX_DELTA_BUFFER_TIME;
}

/**
 * Get all timed data strictly before the given time.
 * @param {Array.<Object>} timedData
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export function getDataBefore<T>(
  timedData : Array<ITimedData<T>>,
  time : number
) : Array<ITimedData<T>> {
  for (let i = 0; i < timedData.length; i++) {
    const dataElement = timedData[i];
    if (time < dataElement.end) {
      return timedData.slice(0, i);
    }
  }
  return timedData.slice();
}

/**
 * Get all timedData strictly after the given time.
 * @param {Object} timedData
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export function getDataAfter<T>(
  timedData : Array<ITimedData<T>>,
  time : number
) : Array<ITimedData<T>> {
  for (let i = 0; i < timedData.length; i++) {
    const dataElement = timedData[i];
    if (dataElement.start > time) {
      return timedData.slice(i, timedData.length);
    }
  }
  return [];
}

/**
 * @param {Object} segment
 * @param {Number} start
 * @param {Number} end
 * @returns {Array.<Object>}
 */
export function removeDataInfosBetween<T>(
  segment : ITimedDataSegment<T>,
  start : number,
  end : number
) : [ITimedDataSegment<T>, ITimedDataSegment<T>] {
  const end1 = Math.max(segment.start, start);
  const segment1 = { start: segment.start,
                     end: end1,
                     content: getDataBefore(segment.content, start) };

  const start2 = Math.min(end, segment.end);
  const segment2 = { start: start2,
                     end: segment.end,
                     content: getDataAfter(segment.content, end) };
  return [segment1, segment2];
}
