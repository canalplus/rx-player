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
import {
  ICuesGroup,
  IHTMLCue,
} from "./types";
import {
  areNearlyEqual,
  getCuesAfter,
  getCuesBefore,
  removeCuesInfosBetween,
} from "./utils";

/**
 * Manage the buffer of the HTML text Sourcebuffer.
 * Allows to add, remove and recuperate cues at given times.
 * @class TextBufferManager
 */
export default class TextBufferManager {
  private _cuesBuffer : ICuesGroup[];

  constructor() {
    this._cuesBuffer = [];
  }

  /**
   * Get corresponding cue for the given time.
   * A cue is an object with three properties:
   *   - start {Number}: start time for which the cue should be displayed.
   *   - end {Number}: end time for which the cue should be displayed.
   *   - element {HTMLElement}: The cue to diplay
   *
   * We do not mutate individual cue here.
   * That is, if the ``get`` method returns the same cue's reference than a
   * previous ``get`` call, its properties are guaranteed to have the exact same
   * values than before, if you did not mutate it on your side.
   * The inverse is true, if the values are the same than before, the reference
   * will stay the same (this is useful to easily check if the DOM should be
   * updated, for example).
   *
   * @param {Number} time
   * @returns {HTMLElement|undefined} - The cue to display
   */
  get(time : number) : IHTMLCue|undefined {
    const cuesBuffer = this._cuesBuffer;

    // begins at the end as most of the time the player will ask for the last
    // CuesGroup
    for (let i = cuesBuffer.length - 1; i >= 0; i--) {
      const cues = cuesBuffer[i].cues;
      for (let j = cues.length - 1; j >= 0; j--) {
        const cue = cues[j];
        if (time >= cue.start) {
          if (time < cue.end) {
            return cue;
          } else {
            return undefined;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Remove cue from a certain range of time.
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
    const cuesBuffer = this._cuesBuffer;
    const len = cuesBuffer.length;
    for (let i = 0; i < len; i++) {
      if (cuesBuffer[i].end > from) {
        const startCuesInfos = cuesBuffer[i];

        if (startCuesInfos.start >= to) {
          // our cue is strictly after this interval, we have nothing to do
          return;
        }

        // ``to`` is within this segment
        if (startCuesInfos.end >= to) {
          const [ cuesInfos1,
                  cuesInfos2 ] = removeCuesInfosBetween(startCuesInfos, from, to);
          this._cuesBuffer[i] = cuesInfos1;
          cuesBuffer.splice(i + 1, 0, cuesInfos2);
          return;
        }

        // Else remove the part of the segment after ``from``, and the concerned
        // segments after that
        startCuesInfos.cues = getCuesBefore(startCuesInfos.cues, from);
        startCuesInfos.end = Math.max(from, startCuesInfos.start);

        for (let j = i + 1; j < len; j++) {
          const endCuesInfos = cuesBuffer[i];
          if (to <= endCuesInfos.end) {
            // remove all cues from the start to this one non-included
            cuesBuffer.splice(i + 1, j - (i + 1));

            // if ``to`` is in the middle of the last segment
            if (to > endCuesInfos.start) {
              endCuesInfos.cues = getCuesAfter(endCuesInfos.cues, to);
              endCuesInfos.start = to;
            }
            return;
          }
        }
        cuesBuffer.splice(i + 1, cuesBuffer.length - (i + 1));
        return;
      }
    }
  }

  /**
   * Insert new cues in our text buffer.
   * cues is an array of objects with three properties:
   *   - start {Number}: start time for which the cue should be displayed.
   *   - end {Number}: end time for which the cue should be displayed.
   *   - element {HTMLElement}: The cue to diplay
   *
   * @param {Array.<Object>} cues - CuesGroups, array of objects with the
   * following properties:
   *   - start {Number}: the time at which the cue will start to be displayed
   *   - end {Number}: the time at which the cue will end to be displayed
   *   - cue {HTMLElement}: The cue
   * @param {Number} start - Start time at which the CuesGroup applies.
   * This is different than the start of the first cue to display in it, this
   * has more to do with the time at which the _text segment_ starts.
   * @param {Number} end - End time at which the CuesGroup applies.
   * This is different than the end of the last cue to display in it, this
   * has more to do with the time at which the _text segment_ ends.
   *
   * TODO add securities to ensure that:
   *   - the start of a CuesGroup is inferior or equal to the start of the first
   *     cue in it
   *   - the end of a CuesGroup is superior or equal to the end of the last
   *     cue in it
   * If those requirements are not met, we could delete some cues when adding
   * a CuesGroup before/after. Find a solution.
   */
  insert(cues : IHTMLCue[], start : number, end : number) : void {
    const cuesBuffer = this._cuesBuffer;
    const cuesInfosToInsert = { start, end, cues };
    for (let i = 0; i < cuesBuffer.length; i++) {
      let cuesInfos = cuesBuffer[i];
      if (start < cuesInfos.end) {
        if (areNearlyEqual(start, cuesInfos.start)) {
          if (areNearlyEqual(end, cuesInfos.end)) {
            // exact same segment
            //   ours:            |AAAAA|
            //   the current one: |BBBBB|
            //   Result:          |AAAAA|
            // Which means:
            //   1. replace the current cue with ours
            cuesBuffer[i] = cuesInfosToInsert;
            return;
          } else if (end < cuesInfos.end) {
            // our cue overlaps with the current one:
            //   ours:            |AAAAA|
            //   the current one: |BBBBBBBB|
            //   Result:          |AAAAABBB|
            // Which means:
            //   1. remove some cues at the start of the current one
            //   2. update start of current one
            //   3. add ours before the current one
            cuesInfos.cues = getCuesAfter(cuesInfos.cues, end);
            cuesInfos.start = end;
            cuesBuffer.splice(i, 0, cuesInfosToInsert);
            return;
          }
          // our cue goes beyond the current one:
          //   ours:            |AAAAAAA|
          //   the current one: |BBBB|
          //   Result:          |AAAAAAA|
          // Here we have to delete any cuesInfos which end before ours end,
          // and see about the following one.
          do {
            cuesBuffer.splice(i, 1);
            cuesInfos = cuesBuffer[i];
          } while (cuesInfos !== undefined && end > cuesInfos.end);

          if (
            cuesInfos === undefined || // There is no cue here
            areNearlyEqual(end, cuesInfos.end) // this cue has the same end
          ) {
            // put in place
            cuesBuffer[i] = cuesInfosToInsert;
            return;
          }
          // else -> end < cuesInfos.end (overlapping case)
          //   ours:            |AAAAA|
          //   the current one: |BBBBBBBB|
          //   Result:          |AAAAABBB|
          cuesInfos.cues = getCuesAfter(cuesInfos.cues, end);
          cuesInfos.start = end;
          cuesBuffer.splice(i, 0, cuesInfosToInsert);
          return;
        } else if (start < cuesInfos.start) {
          if (end < cuesInfos.start) {
            // our cue goes strictly before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:           |BBBB|
            //   Result:          |AAAAAAA| |BBBB|
            // Which means:
            //   - add ours before the current one
            cuesBuffer.splice(i, 0, cuesInfosToInsert);
            return;
          } else if (areNearlyEqual(end, cuesInfos.start)) {
            // our cue goes just before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:         |BBBB|
            //   Result:          |AAAAAAA|BBBB|
            // Which means:
            //   - update start time of the current one to be sure
            //   - add ours before the current one
            cuesInfos.start = end;
            cuesBuffer.splice(i, 0, cuesInfosToInsert);
            return;
          }
          // our cue overlaps the current one:
          //   ours:            |AAAAAAA|
          //   the current one:     |BBBBB|
          //   Result:          |AAAAAAABB|
          // Which means:
          //   1. remove some cues at the start of the current one
          //   2. update start of current one
          //   3. add ours before the current one
          cuesInfos.cues = getCuesAfter(cuesInfos.cues, end);
          cuesInfos.start = end;
          cuesBuffer.splice(i, 0, cuesInfosToInsert);
          return;
        }
        // else -> start > cuesInfos.start
        if (end > cuesInfos.end || areNearlyEqual(end, cuesInfos.end)) {
          // our cue overlaps the current one:
          //   ours:              |AAAAAA|
          //   the current one: |BBBBB|
          //   Result:          |BBAAAAAA|
          //   - or -
          //   ours:              |AAAA|
          //   the current one: |BBBBBB|
          //   Result:          |BBAAAA|
          // Which means:
          //   1. remove some cues at the end of the current one
          //   2. update end of current one
          //   3. add ours after current one
          cuesInfos.cues = getCuesBefore(cuesInfos.cues, start);
          cuesInfos.end = start;
          cuesBuffer.splice(i + 1, 0, cuesInfosToInsert);
          return;
        }
        // else -> end < cuesInfos.end
        // our cue is in the current one:
        //   ours:              |AAA|
        //   the current one: |BBBBBBB|
        //   Result:          |BBAAABB|
        // Which means:
        //   1. split current one in two parts based on our cue.
        //   2. insert our cue into it.
        const [ cuesInfos1,
                cuesInfos2 ] = removeCuesInfosBetween(cuesInfos, start, end);
        this._cuesBuffer[i] = cuesInfos1;
        cuesBuffer.splice(i + 1, 0, cuesInfosToInsert);
        cuesBuffer.splice(i + 2, 0, cuesInfos2);
        return;
      }
    }
    // no cues group has the end after our current start.
    // These cues should be the last one
    cuesBuffer.push(cuesInfosToInsert);
  }
}
