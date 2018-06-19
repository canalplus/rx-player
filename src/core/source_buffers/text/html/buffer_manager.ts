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

import assert from "../../../../utils/assert";
import {
  ITimedData,
  ITimedDataSegment,
} from "./types";
import {
  areNearlyEqual,
  getDataAfter,
  getDataBefore,
  removeDataInfosBetween,
} from "./utils";

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
   * +   * Note: The data returned here is never mutated.
   * That is, if the ``get`` method returns the same data's reference than a
   * previous ``get`` call, its properties are guaranteed to have the exact same
   * values than before, if you did not mutate it on your side.
   * The inverse is true, if the values are the same than before, the reference
   * will stay the same (this is useful to easily check if the DOM should be
   * updated, for example).
   *
   * @param {Number} time
   * @returns {Object|undefined}
   */
  get(time : number) : ITimedData<T>|undefined {
    const buffer = this._buffer;

    // begins at the end as most of the time the player will ask for the last
    // data
    for (let i = buffer.length - 1; i >= 0; i--) {
      const content = buffer[i].content;
      for (let j = content.length - 1; j >= 0; j--) {
        const data = content[j];
        if (time >= data.start) {
          if (time < data.end) {
            return data;
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
      if (buffer[i].end > from) {
        const segmentStart = buffer[i];

        if (segmentStart.start >= to) {
          // our segment is strictly after this interval, we have nothing to do
          return;
        }

        // ``to`` is within this segment
        if (segmentStart.end >= to) {
          const [ dataGroup1,
                  dataGroup2 ] = removeDataInfosBetween(segmentStart, from, to);
          this._buffer[i] = dataGroup1;
          buffer.splice(i + 1, 0, dataGroup2);
          return;
        }

        // Else remove the part of the segment after ``from``, and the concerned
        // segments after that
        segmentStart.content = getDataBefore(segmentStart.content, from);
        segmentStart.end = Math.max(from, segmentStart.start);

        for (let j = i + 1; j < len; j++) {
          const segmentEnd = buffer[i];
          if (to <= segmentEnd.end) {
            // remove all data from the start to this one non-included
            buffer.splice(i + 1, j - (i + 1));

            // if ``to`` is in the middle of the last segment
            if (to > segmentEnd.start) {
              segmentEnd.content = getDataAfter(segmentEnd.content, to);
              segmentEnd.start = to;
            }
            return;
          }
        }
        buffer.splice(i + 1, buffer.length - (i + 1));
        return;
      }
    }
  }

  /**
   * Insert new data in our buffer.
   *
   * @param {Array.<Object>} content - Array of objects with the following
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
    content : Array<ITimedData<T>>,
    start : number,
    end : number
  ) : void {
    const buffer = this._buffer;
    const segmentToInsert = { start, end, content };
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
            //   1. remove some content at the start of the current one
            //   2. update start of current one
            //   3. add ours before the current one
            segment.content = getDataAfter(segment.content, end);
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

          if (
            !segment || // There is no segment here
            areNearlyEqual(end, segment.end) // this segment has the same end
          ) {
            // put in place
            buffer[i] = segmentToInsert;
            return;
          }
          // else -> end < segment.end (overlapping case)
          //   ours:            |AAAAA|
          //   the current one: |BBBBBBBB|
          //   Result:          |AAAAABBB|
          segment.content = getDataAfter(segment.content, end);
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
          segment.content = getDataAfter(segment.content, end);
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
          segment.content = getDataBefore(segment.content, start);
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
        const [ dataGroup1,
                dataGroup2 ] = removeDataInfosBetween(segment, start, end);
        this._buffer[i] = dataGroup1;
        buffer.splice(i + 1, 0, segmentToInsert);
        buffer.splice(i + 2, 0, dataGroup2);
        return;
      }
    }
    // no segment has the end after our current start.
    // These should be the last one
    buffer.push(segmentToInsert);
  }
}
