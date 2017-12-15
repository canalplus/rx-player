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

interface IHTMLCue {
  start : number;
  end : number;
  element : HTMLElement;
}

interface ICuesGroup {
  start : number;
  end : number;
  cues : IHTMLCue[];
}

/**
 * Maximum time difference, in seconds, between two text segment's start times
 * and/or end times for them to be considered the same in the custom text's
 * source buffer used for the "html" textTrackMode.
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
 * lead to indicate that an unwanted text track is still here (theorically
 * though, this is a case that should never happen for reasons that might be too
 * long to explain here).
 *
 * Setting a value too high might lead to two segments targeting different times
 * to be wrongly believed to target the same time. In worst case scenarios, this
 * could lead to wanted text tracks being removed.
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
 * Get all cues strictly before the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
function getCuesBefore(cues : IHTMLCue[], time : number) : IHTMLCue[] {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time < cue.end) {
      return cues.slice(0, i);
    }
  }
  return cues.slice();
}

/**
 * Get all cues strictly after the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
function getCuesAfter(cues : IHTMLCue[], time : number) : IHTMLCue[] {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time < cue.end) {
      return cues.slice(i + 1, cues.length);
    }
  }
  return [];
}

/**
 * @param {Object} cuesInfos
 * @param {Number} start
 * @param {Number} end
 * @returns {Array.<Object>}
 */
function removeCuesInfosBetween(
  cuesInfos : ICuesGroup,
  start : number,
  end : number
) : [ICuesGroup, ICuesGroup] {
  const cuesInfos1 = {
    start: cuesInfos.start,
    end: start,
    cues: getCuesBefore(cuesInfos.cues, start),
  };

  const cuesInfos2 = {
    start: end,
    end: cuesInfos.end,
    cues: getCuesAfter(cuesInfos.cues, end),
  };
  return [cuesInfos1, cuesInfos2];
}

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
      const startCuesInfos = cuesBuffer[i];

      if (startCuesInfos.end >= to) {
        const [
          cuesInfos1,
          cuesInfos2,
        ] = removeCuesInfosBetween(startCuesInfos, from, to);
        this._cuesBuffer[i] = cuesInfos1;
        cuesBuffer.splice(i + 1, 0, cuesInfos2);
        return;
      } else {
        startCuesInfos.cues = getCuesBefore(startCuesInfos.cues, from);
        startCuesInfos.end = from;
      }

      for (let j = i + 1; j < len; j++) {
        const endCuesInfos = cuesBuffer[i];
        if (to < endCuesInfos.end) {
          cuesBuffer.splice(i + 1, j - (i + 1));
          endCuesInfos.cues = getCuesAfter(endCuesInfos.cues, to);
          endCuesInfos.start = to;
          return;
        }
      }
      cuesBuffer.splice(i + 1, cuesBuffer.length - (i + 1));
      return;
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
          } while (cuesInfos && end > cuesInfos.end);

          if (!cuesInfos) {
            // There was no more cue, add ours
            cuesBuffer[i] = cuesInfosToInsert;
            return;
          } else if (areNearlyEqual(end, cuesInfos.end)) {
            cuesBuffer[i] = cuesInfosToInsert; // replace
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
        const [
          cuesInfos1,
          cuesInfos2,
        ] = removeCuesInfosBetween(cuesInfos, start, end);
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
