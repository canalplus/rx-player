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

import assert from "../../../../../utils/assert";
import {
  ICuesGroup,
  IHTMLCue,
} from "./types";
import {
  areNearlyEqual,
  getCuesAfter,
  getCuesBefore,
  removeCuesInfosBetween,
  areCuesStartNearlyEqual,
} from "./utils";

/**
 * first or last IHTMLCue in a group can have a slighlty different start
 * or end time than the start or end time of the ICuesGroup due to parsing
 * approximation.
 * DELTA_CUES_GROUP defines the tolerance level when comparing the start/end
 * of a IHTMLCue to the start/end of a ICuesGroup.
 * Having this value too high may lead to have unwanted subtitle displayed
 * Having this value too low may lead to have subtitles not displayed
 */
const DELTA_CUES_GROUP = 1e-3;

/**
 * segment_duration / RELATIVE_DELTA_RATIO = relative_delta
 *
 * relative_delta is the tolerance to determine if two segements are the same
 */
const RELATIVE_DELTA_RATIO = 5;
/**
 * Manage the buffer of the HTMLTextSegmentBuffer.
 * Allows to add, remove and recuperate cues at given times.
 * @class TextTrackCuesStore
 */
export default class TextTrackCuesStore {
  private _cuesBuffer : ICuesGroup[];

  constructor() {
    this._cuesBuffer = [];
  }

  /**
   * Get corresponding cue(s) for the given time.
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
   * @returns {Array.<HTMLElement>} - The cues that need to be displayed at that
   * time.
   */
  get(time : number) : HTMLElement[] {
    const cuesBuffer = this._cuesBuffer;
    const ret = [];

    // begins at the end as most of the time the player will ask for the last
    // CuesGroup
    for (let cueIdx = cuesBuffer.length - 1; cueIdx >= 0; cueIdx--) {
      const segment = cuesBuffer[cueIdx];
      if (time < segment.end && time >= segment.start) {
        const cues = segment.cues;
        for (let j = 0; j < cues.length; j++) {
          if (time >= cues[j].start && time < cues[j].end) {
            ret.push(cues[j].element);
          }
        }
        // first or last IHTMLCue in a group can have a slighlty different start
        // or end time than the start or end time of the ICuesGroup due to parsing
        // approximation.
        // Add a tolerance of 1ms to fix this issue
        if (ret.length === 0 && cues.length > 0) {
          for (let j = 0; j < cues.length; j++) {
            if (areNearlyEqual(time, cues[j].start, DELTA_CUES_GROUP)
            || areNearlyEqual(time, cues[j].end, DELTA_CUES_GROUP)
            ) {
              ret.push(cues[j].element);
            }
          }
        }
        return ret;
      }
    }
    return [];
  }

  /**
   * Remove cue from a certain range of time.
   * @param {Number} from
   * @param {Number} to
   */
  remove(from : number, _to : number) : void {
    if (__ENVIRONMENT__.CURRENT_ENV as number === __ENVIRONMENT__.DEV as number) {
      assert(from >= 0);
      assert(_to >= 0);
      assert(_to > from);
    }

    const to = Math.max(from, _to);
    const cuesBuffer = this._cuesBuffer;
    for (let cueIdx = 0; cueIdx < cuesBuffer.length; cueIdx++) {
      if (cuesBuffer[cueIdx].end > from) {
        // this cuesInfos is concerned by the remove
        const startCuesInfos = cuesBuffer[cueIdx];
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
            this._cuesBuffer[cueIdx] = cuesInfos1;
            cuesBuffer.splice(cueIdx + 1, 0, cuesInfos2);
          }
          // No cuesInfos can be concerned after this one, we can quit
          return;
        }

        // Else remove all part after `from`
        if (startCuesInfos.start >= from) {
          // all the segment is concerned
          cuesBuffer.splice(cueIdx, 1);
          cueIdx--; // one less element, we have to decrement the loop
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
    // it's preferable to have a delta depending on the duration of the segment
    // if the delta is one fifth of the length of the segment:
    // a segment of [0, 2] is the "same" segment as [0, 2.1]
    // but [0, 0.04] is not the "same" segement as [0,04, 0.08]
    const relativeDelta = Math.abs(start - end) / RELATIVE_DELTA_RATIO;

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
          areNearlyEqual(cuesInfosToInsert.end, nextCue.end, relativeDelta)) // samey end
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

    for (let cueIdx = 0; cueIdx < cuesBuffer.length; cueIdx++) {
      let cuesInfos = cuesBuffer[cueIdx];
      if (start < cuesInfos.end) {
        if (areCuesStartNearlyEqual(cuesInfosToInsert, cuesInfos)) {
          if (areNearlyEqual(end, cuesInfos.end, relativeDelta)) {
            // exact same segment
            //   ours:            |AAAAA|
            //   the current one: |BBBBB|
            //   Result:          |AAAAA|
            // Which means:
            //   1. replace the current cue with ours
            cuesBuffer[cueIdx] = cuesInfosToInsert;
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
            cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
            return;
          }

          // our cue goes beyond the current one:
          //   ours:            |AAAAAAA|
          //   the current one: |BBBB|...
          //   Result:          |AAAAAAA|
          // Here we have to delete any cuesInfos which end before ours end,
          // and see about the following one.
          do {
            cuesBuffer.splice(cueIdx, 1);
            cuesInfos = cuesBuffer[cueIdx];
          } while (cuesInfos !== undefined && end > cuesInfos.end);
          onIndexOfNextCueFound(cueIdx);
          return;
        } else if (start < cuesInfos.start) {
          if (end < cuesInfos.start) {
            // our cue goes strictly before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:           |BBBB|
            //   Result:          |AAAAAAA| |BBBB|
            // Which means:
            //   - add ours before the current one
            cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
            return;
          } else if (areNearlyEqual(end, cuesInfos.start, relativeDelta)) {
            // our cue goes just before the current one:
            //   ours:            |AAAAAAA|
            //   the current one:         |BBBB|
            //   Result:          |AAAAAAA|BBBB|
            // Which means:
            //   - update start time of the current one to be sure
            //   - add ours before the current one
            cuesInfos.start = end;
            cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
            return;
          } else if (areNearlyEqual(end, cuesInfos.end, relativeDelta)) {
            //   ours:            |AAAAAAA|
            //   the current one:    |BBBB|
            //   Result:          |AAAAAAA|
            // Replace
            cuesBuffer.splice(cueIdx, 1, cuesInfosToInsert);
            return;
          } else if (end < cuesInfos.end) {
            //   ours:            |AAAAAAA|
            //   the current one:     |BBBBB|
            //   Result:          |AAAAAAABB|
            cuesInfos.cues = getCuesAfter(cuesInfos.cues, end);
            cuesInfos.start = end;
            cuesBuffer.splice(cueIdx, 0, cuesInfosToInsert);
            return;
          }

          //   ours:            |AAAAAAA|
          //   the current one:   |BBB|...
          //   Result:          |AAAAAAA|...
          do {
            cuesBuffer.splice(cueIdx, 1);
            cuesInfos = cuesBuffer[cueIdx];
          } while (cuesInfos !== undefined && end > cuesInfos.end);
          onIndexOfNextCueFound(cueIdx);
          return;
        }
        // else -> start > cuesInfos.start

        if (areNearlyEqual(cuesInfos.end, end, relativeDelta)) {
          //   ours:              |AAAAAA|
          //   the current one: |BBBBBBBB|
          //   Result:          |BBAAAAAA|
          cuesInfos.cues = getCuesBefore(cuesInfos.cues, start);
          cuesInfos.end = start;
          cuesBuffer.splice(cueIdx + 1, 0, cuesInfosToInsert);
          return;
        } else if (cuesInfos.end > end) {
          //   ours:              |AAAAAA|
          //   the current one: |BBBBBBBBBBB|
          //   Result:          |BBAAAAAABBB|
          const [ cuesInfos1,
                  cuesInfos2 ] = removeCuesInfosBetween(cuesInfos, start, end);
          this._cuesBuffer[cueIdx] = cuesInfos1;
          cuesBuffer.splice(cueIdx + 1, 0, cuesInfosToInsert);
          cuesBuffer.splice(cueIdx + 2, 0, cuesInfos2);
          return;
        } else {
          //   ours:              |AAAAAA|
          //   the current one: |BBBBB|...
          //   Result:          |BBAAAAAA|...
          cuesInfos.cues = getCuesBefore(cuesInfos.cues, start);
          cuesInfos.end = start;

          const nextCueIdx = cueIdx + 1;
          cuesInfos = cuesBuffer[nextCueIdx];
          while (cuesInfos !== undefined && end > cuesInfos.end) {
            cuesBuffer.splice(nextCueIdx, 1);
            cuesInfos = cuesBuffer[nextCueIdx];
          }
          onIndexOfNextCueFound(nextCueIdx);
          return;
        }
      }
    }

    if (cuesBuffer.length) {
      const lastCue = cuesBuffer[cuesBuffer.length - 1];
      if (areNearlyEqual(lastCue.end, start, relativeDelta)) {
        // Match the end of the previous cue to the start of the following one
        // if they are close enough. If there is a small gap between two segments
        // it can lead to having no subtitles for a short time, this is noticeable when
        // two successive segments displays the same text, making it diseappear
        // and reappear quickly, which gives the impression of blinking
        //
        //   ours:                   |AAAAA|
        //   the current one: |BBBBB|...
        //   Result:          |BBBBBBBAAAAA|
        lastCue.end  = start;
      }
    }
    // no cues group has the end after our current start.
    // These cues should be the last one
    cuesBuffer.push(cuesInfosToInsert);
  }
}
