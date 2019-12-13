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
  ICuesGroup,
  IHTMLCue,
} from "./types";

/**
 * Maximum time difference, in seconds, between two text segment's start times
 * and/or end times for them to be considered the same in the custom text's
 * SourceBuffer used for the "html" textTrackMode.
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
export function areNearlyEqual(a : number, b : number) : boolean {
  return Math.abs(a - b) <= MAX_DELTA_BUFFER_TIME;
}

/**
 * Get all cues which have data before the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export function getCuesBefore(cues : IHTMLCue[], time : number) : IHTMLCue[] {
  for (let i = cues.length - 1; i >= 0; i--) {
    const cue = cues[i];
    if (cue.start < time) {
      return cues.slice(0, i + 1);
    }
  }
  return [];
}

/**
 * Get all cues which have data after the given time.
 * @param {Object} cues
 * @param {Number} time
 * @returns {Array.<Object>}
 */
export function getCuesAfter(cues : IHTMLCue[], time : number) : IHTMLCue[] {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (cue.end > time) {
      return cues.slice(i, cues.length);
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
export function removeCuesInfosBetween(
  cuesInfos : ICuesGroup,
  start : number,
  end : number
) : [ICuesGroup, ICuesGroup] {
  const endCuesInfos1 = Math.max(cuesInfos.start, start);
  const cues1 = getCuesBefore(cuesInfos.cues, start);
  const cuesInfos1 = { start: cuesInfos.start,
                       end: endCuesInfos1,
                       cues: cues1 };

  const startCuesInfos2 = Math.min(end, cuesInfos.end);
  const cues2 = getCuesAfter(cuesInfos.cues, end);
  const cuesInfos2 = { start: startCuesInfos2,
                       end: cuesInfos.end,
                       cues: cues2 };
  return [cuesInfos1, cuesInfos2];
}
