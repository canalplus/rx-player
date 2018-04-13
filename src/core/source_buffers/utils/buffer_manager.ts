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

import assert from "../../../utils/assert";

interface ITimedData<T> {
  start : number; // start time at which the data should be applied
  end : number; // end time at which the data should stop to be applied
  data : T; // the data to apply
}

interface ITimedDataSegment<T> {
  start : number; // start time at which this group of data should be considered
  end : number; // end time at which this group of data should be considered
  data : Array<ITimedData<T>>; // group of data for this segment
}

/**
 * Maximum time difference, in seconds, between two segment's start times
 * and/or end times for them to be considered the same in a source buffer.
 *
 * For example for two segments s1 and s2 which have a start time respectively
 * of st1 and st2 and end time of et1 and et2:
 *   - if both the absolute difference between st1 and st2 AND the one between
 *     et1 and et2 is inferior or equal to the MAX_DELTA_BUFFER_TIME, s1 and s2
 *     are considered to target the exact same time. As a consequence, if s2 is
 *     added after s1 in the source buffer, s1 will be completely replaced by
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
 * both being present in the source buffer. In worst case scenarios, this could
 * lead to indicate that an unwanted segment is still here (theorically though,
 * this is a case that should never happen for reasons that might be too long
 * to explain here).
 *
 * Setting a value too high might lead to two segments targeting different times
 * to be wrongly believed to target the same time. In worst case scenarios, this
 * could lead to wanted segment being removed.
 * @type Number
 */
const MAX_DELTA_BUFFER_TIME = 0.2;

/**
 * @see MAX_DELTA_BUFFER_TIME
 * @param {Number} a
 * @param {Number} b
 * @returns {Boolean}
 */
function areNearlyEqual(a : number, b : number) : boolean {
  return Math.abs(a - b) <= MAX_DELTA_BUFFER_TIME;
}

/**
 * Get all data strictly before the given time.
 * @param {Object} data
 * @param {Number} time
 * @returns {Array.<Object>}
 */
function getDataBefore<T>(
  data : Array<ITimedData<T>>,
  time : number
) : Array<ITimedData<T>> {
  for (let i = 0; i < data.length; i++) {
    const datum = data[i];
    if (time < datum.end) {
      return data.slice(0, i);
    }
  }
  return data.slice();
}

/**
 * Get all data strictly after the given time.
 * @param {Object} data
 * @param {Number} time
 * @returns {Array.<Object>}
 */
function getDataAfter<T>(
  data : Array<ITimedData<T>>,
  time : number
) : Array<ITimedData<T>> {
  for (let i = 0; i < data.length; i++) {
    const datum = data[i];
    if (time < datum.end) {
      return data.slice(i + 1, data.length);
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
function removeDataBetween<T>(
  segment : ITimedDataSegment<T>,
  start : number,
  end : number
) : [ITimedDataSegment<T>, ITimedDataSegment<T>] {
  const dataGroup1 = {
    start: segment.start,
    end: start,
    data: getDataBefore(segment.data, start),
  };

  const dataGroup2 = {
    start: end,
    end: segment.end,
    data: getDataAfter(segment.data, end),
  };
  return [dataGroup1, dataGroup2];
}

/**
 * Manage the buffer of custom Sourcebuffer relying on segments of Timed data
 * (e.g., subtitles).
 * Allows to add, remove and recuperate data at given times.
 * @class TimedDataBufferManager
 */
export default class TimedDataBufferManager<T> {
  private _buffer : Array<ITimedDataSegment<T>>;

  constructor() {
    this._buffer = [];
  }

  /**
   * Get corresponding data for the given time.
   * The response is an object with three properties:
   *   - start {Number}: start time for which the data should be applied.
   *   - end {Number}: end time for which the data should be applied.
   *   - data {*}: The data to apply
   *
   * Note: The data returned here is never mutated.
   * That is, if the ``get`` method returns the same data's reference than a
   * previous ``get`` call, its properties are guaranteed to have the exact same
   * values than before, if you did not mutate it on your side.
   * The inverse is true, if the values are the same than before, the reference
   * will stay the same (this is useful to easily check if the DOM should be
   * updated, for example).
   *
   * @param {Number} time
   * @returns {Object}
   */
  get(time : number) : ITimedData<T>|undefined {
    const buffer = this._buffer;

    // begins at the end as most of the time the player will ask for the last
    // data here
    for (let i = buffer.length - 1; i >= 0; i--) {
      const data = buffer[i].data;
      for (let j = data.length - 1; j >= 0; j--) {
        const datum = data[j];
        if (time >= datum.start) {
          if (time < datum.end) {
            return datum;
          } else {
            return undefined;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Remove some data from a certain range of time.
   * @param {Number} from
   * @param {Number} to
   */
  remove(from : number, _to : number) : void {
    if (__DEV__) {
      assert(from >= 0);
      assert(_to >= 0);
      assert(_to > from);
    }

    const to = Math.max(from, _to);
    const buffer = this._buffer;
    const len = buffer.length;
    for (let i = 0; i < len; i++) {
      const segmentStart = buffer[i];

      if (segmentStart.end >= to) {
        const [
          dataGroup1,
          dataGroup2,
        ] = removeDataBetween(segmentStart, from, to);
        this._buffer[i] = dataGroup1;
        buffer.splice(i + 1, 0, dataGroup2);
        return;
      } else {
        segmentStart.data = getDataBefore(segmentStart.data, from);
        segmentStart.end = from;
      }

      for (let j = i + 1; j < len; j++) {
        const segmentEnd = buffer[i];
        if (to < segmentEnd.end) {
          buffer.splice(i + 1, j - (i + 1));
          segmentEnd.data = getDataAfter(segmentEnd.data, to);
          segmentEnd.start = to;
          return;
        }
      }
      buffer.splice(i + 1, buffer.length - (i + 1));
      return;
    }
  }

  /**
   * Insert new data in our buffer.
   *
   * @param {Array.<Object>} data - Array of objects with the following
   * properties:
   *   - start {Number}: start time for which the data should be applied.
   *   - end {Number}: end time for which the data should be applied.
   *   - data {*}: The data to apply
   * @param {Number} start - Start time at which this group of data applies.
   * This is different than the start of the first item to display in it, this
   * has more to do with the time at which the _segment_ starts.
   * @param {Number} end - End time at which the this group of data applies.
   * This is different than the end of the last item to display in it, this
   * has more to do with the time at which the _segment_ ends.
   *
   * TODO add securities to ensure that:
   *   - the start of a segment is inferior or equal to the start of the first
   *     item in it
   *   - the end of a segment is superior or equal to the end of the last
   *     item in it
   * If those requirements are not met, we could delete some data when adding
   * a segment before/after. Find a solution.
   */
  insert(
    data : Array<ITimedData<T>>,
    start : number,
    end : number
  ) : void {
    const buffer = this._buffer;
    const segmentToInsert = { start, end, data };
    for (let i = 0; i < buffer.length; i++) {
      let segment = buffer[i];
      if (start < segment.end) {
        if (areNearlyEqual(start, segment.start)) {
          if (areNearlyEqual(end, segment.end)) {
            // exact same segment
            //   ours:            |AAAAA|
            //   the current one: |BBBBB|
            //   Result:          |AAAAA|
            // Which means:
            //   1. replace the current segment with ours
            buffer[i] = segmentToInsert;
            return;
          } else if (end < segment.end) {
            // our segment overlaps with the current one:
            //   ours:            |AAAAA|
            //   the current one: |BBBBBBBB|
            //   Result:          |AAAAABBB|
            // Which means:
            //   1. remove some data at the start of the current one
            //   2. update start of current one
            //   3. add ours before the current one
            segment.data = getDataAfter(segment.data, end);
            segment.start = end;
            buffer.splice(i, 0, segmentToInsert);
            return;
          }
          // our segment goes beyond the current one:
          //   ours:            |AAAAAAA|
          //   the current one: |BBBB|
          //   Result:          |AAAAAAA|
          // Here we have to delete any segment which end before ours end,
          // and see about the following one.
          do {
            buffer.splice(i, 1);
            segment = buffer[i];
          } while (segment && end > segment.end);

          if (!segment) {
            // There was no more segment, add ours
            buffer[i] = segmentToInsert;
            return;
          } else if (areNearlyEqual(end, segment.end)) {
            buffer[i] = segmentToInsert; // replace
            return;
          }
          // else -> end < segment.end (overlapping case)
          //   ours:            |AAAAA|
          //   the current one: |BBBBBBBB|
          //   Result:          |AAAAABBB|
          segment.data = getDataAfter(segment.data, end);
          segment.start = end;
          buffer.splice(i, 0, segmentToInsert);
          return;
        } else if (start < segment.start) {
          if (end < segment.start) {
            // our segment goes strictly before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:           |BBBB|
            //   Result:          |AAAAAAA| |BBBB|
            // Which means:
            //   - add ours before the current one
            buffer.splice(i, 0, segmentToInsert);
            return;
          } else if (areNearlyEqual(end, segment.start)) {
            // our segment goes just before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:         |BBBB|
            //   Result:          |AAAAAAA|BBBB|
            // Which means:
            //   - update start time of the current one to be sure
            //   - add ours before the current one
            segment.start = end;
            buffer.splice(i, 0, segmentToInsert);
            return;
          }
          // our segment overlaps the current one:
          //   ours:            |AAAAAAA|
          //   the current one:     |BBBBB|
          //   Result:          |AAAAAAABB|
          // Which means:
          //   1. remove some data at the start of the current one
          //   2. update start of current one
          //   3. add ours before the current one
          segment.data = getDataAfter(segment.data, end);
          segment.start = end;
          buffer.splice(i, 0, segmentToInsert);
          return;
        }
        // else -> start > segment.start
        if (end > segment.end || areNearlyEqual(end, segment.end)) {
          // our segment overlaps the current one:
          //   ours:              |AAAAAA|
          //   the current one: |BBBBB|
          //   Result:          |BBAAAAAA|
          //   - or -
          //   ours:              |AAAA|
          //   the current one: |BBBBBB|
          //   Result:          |BBAAAA|
          // Which means:
          //   1. remove some data at the end of the current one
          //   2. update end of current one
          //   3. add ours after current one
          segment.data = getDataBefore(segment.data, start);
          segment.end = start;
          buffer.splice(i + 1, 0, segmentToInsert);
          return;
        }
        // else -> end < segment.end
        // our segment is in the current one:
        //   ours:              |AAA|
        //   the current one: |BBBBBBB|
        //   Result:          |BBAAABB|
        // Which means:
        //   1. split current one in two parts based on our segment.
        //   2. insert our segment into it.
        const [
          dataGroup1,
          dataGroup2,
        ] = removeDataBetween(segment, start, end);
        this._buffer[i] = dataGroup1;
        buffer.splice(i + 1, 0, segmentToInsert);
        buffer.splice(i + 2, 0, dataGroup2);
        return;
      }
    }
    // no data group has the end after our current start.
    // These data should be the last one
    buffer.push(segmentToInsert);
  }
}
