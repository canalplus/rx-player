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
 * @class TextTrackCuesStore
 */
export default class TextTrackCuesStore {
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
    for (let i = 0; i < cuesBuffer.length; i++) {
      if (cuesBuffer[i].end > from) {
        // this cuesInfos is concerned by the remove
        const startCuesInfos = cuesBuffer[i];
        if (startCuesInfos.start >= to) {
          // our cuesInfos is strictly after this interval, we have nothing to do
          return;
        }
        if (startCuesInfos.end >= to) {
          // our cuesInfos ends after `to`, we have to keep the end of it
          if (from <= startCuesInfos.start) {
            // from -> to only remove the start of startCuesInfos
            startCuesInfos.cues = getCuesAfter(startCuesInfos.cues, to);
            startCuesInfos.start = to;
          } else {
            // from -> to is in the middle part of startCuesInfos
            const [ cuesInfos1,
                    cuesInfos2 ] = removeCuesInfosBetween(startCuesInfos,
                                                          from,
                                                          to);
            this._cuesBuffer[i] = cuesInfos1;
            cuesBuffer.splice(i + 1, 0, cuesInfos2);
          }
          // No cuesInfos can be concerned after this one, we can quit
          return;
        }

        // Else remove all part after `from`
        if (startCuesInfos.start >= from) {
          // all the segment is concerned
          cuesBuffer.splice(i, 1);
          i--; // one less element, we have to decrement the loop
        } else {
          // only the end is concerned
          startCuesInfos.cues = getCuesBefore(startCuesInfos.cues, from);
          startCuesInfos.end = Math.max(from, startCuesInfos.start);
        }
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

    /**
     * Called when we found the index of the next cue relative to the cue we
     * want to insert (that is a cue starting after its start or at the same
     * time but ending strictly after its end).
     * Will insert the cue at the right place and update the next cue
     * accordingly.
     * @param {number} indexOfNextCue
     */
    function onIndexOfNextCueFound(indexOfNextCue : number) : void {
      const nextCue = cuesBuffer[indexOfNextCue];
      if (nextCue === undefined || // no cue
          areNearlyEqual(cuesInfosToInsert.end, nextCue.end)) // samey end
      {
        //   ours:            |AAAAA|
        //   the current one: |BBBBB|
        //   Result:          |AAAAA|
        cuesBuffer[indexOfNextCue] = cuesInfosToInsert;
      } else if (nextCue.start >= cuesInfosToInsert.end) {
        // Either
        //   ours:            |AAAAA|
        //   the current one:         |BBBBBB|
        //   Result:          |AAAAA| |BBBBBB|
        // Or:
        //   ours:            |AAAAA|
        //   the current one:       |BBBBBB|
        //   Result:          |AAAAA|BBBBBB|
        // Add ours before
        cuesBuffer.splice(indexOfNextCue, 0, cuesInfosToInsert);
      } else {
        // Either
        //   ours:            |AAAAA|
        //   the current one: |BBBBBBBB|
        //   Result:          |AAAAABBB|
        // Or:
        //   ours:            |AAAAA|
        //   the current one:    |BBBBB|
        //   Result:          |AAAAABBB|
        nextCue.cues = getCuesAfter(nextCue.cues, cuesInfosToInsert.end);
        nextCue.start = cuesInfosToInsert.end;
        cuesBuffer.splice(indexOfNextCue, 0, cuesInfosToInsert);
      }
    }

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
          //   the current one: |BBBB|...
          //   Result:          |AAAAAAA|
          // Here we have to delete any cuesInfos which end before ours end,
          // and see about the following one.
          do {
            cuesBuffer.splice(i, 1);
            cuesInfos = cuesBuffer[i];
          } while (cuesInfos !== undefined && end > cuesInfos.end);
          onIndexOfNextCueFound(i);
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
          } else if (areNearlyEqual(end, cuesInfos.end)) {
            //   ours:            |AAAAAAA|
            //   the current one:    |BBBB|
            //   Result:          |AAAAAAA|
            // Replace
            cuesBuffer.splice(i, 1, cuesInfosToInsert);
            return;
          } else if (end < cuesInfos.end) {
            //   ours:            |AAAAAAA|
            //   the current one:     |BBBBB|
            //   Result:          |AAAAAAABB|
            cuesInfos.cues = getCuesAfter(cuesInfos.cues, end);
            cuesInfos.start = end;
            cuesBuffer.splice(i, 0, cuesInfosToInsert);
            return;
          }

          //   ours:            |AAAAAAA|
          //   the current one:   |BBB|...
          //   Result:          |AAAAAAA|...
          do {
            cuesBuffer.splice(i, 1);
            cuesInfos = cuesBuffer[i];
          } while (cuesInfos !== undefined && end > cuesInfos.end);
          onIndexOfNextCueFound(i);
          return;
        }
        // else -> start > cuesInfos.start

        if (areNearlyEqual(cuesInfos.end, end)) {
          //   ours:              |AAAAAA|
          //   the current one: |BBBBBBBB|
          //   Result:          |BBAAAAAA|
          cuesInfos.cues = getCuesBefore(cuesInfos.cues, start);
          cuesInfos.end = start;
          cuesBuffer.splice(i + 1, 0, cuesInfosToInsert);
          return;
        } else if (cuesInfos.end > end) {
          //   ours:              |AAAAAA|
          //   the current one: |BBBBBBBBBBB|
          //   Result:          |BBAAAAAABBB|
          const [ cuesInfos1,
                  cuesInfos2 ] = removeCuesInfosBetween(cuesInfos, start, end);
          this._cuesBuffer[i] = cuesInfos1;
          cuesBuffer.splice(i + 1, 0, cuesInfosToInsert);
          cuesBuffer.splice(i + 2, 0, cuesInfos2);
          return;
        } else {
          //   ours:              |AAAAAA|
          //   the current one: |BBBBB|...
          //   Result:          |BBAAAAAA|...
          cuesInfos.cues = getCuesBefore(cuesInfos.cues, start);
          cuesInfos.end = start;

          cuesInfos = cuesBuffer[i + 1];
          while (cuesInfos !== undefined && end > cuesInfos.end) {
            cuesBuffer.splice(i, 1);
            cuesInfos = cuesBuffer[i];
          }
          onIndexOfNextCueFound(i);
          return;
        }
      }
    }
    // no cues group has the end after our current start.
    // These cues should be the last one
    cuesBuffer.push(cuesInfosToInsert);
  }
}
