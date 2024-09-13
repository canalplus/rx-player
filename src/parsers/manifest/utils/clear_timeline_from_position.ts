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

import type { IIndexSegment } from "./index_helpers";

/**
 * Remove segments which starts before the given `firstAvailablePosition` from
 * the timeline. `firstAvailablePosition` has to be time scaled.
 * @param {Array.<Object>}
 * @returns {number} - Returns the number of removed segments. This includes
 * potential implicit segment from decremented `repeatCount` attributes.
 */
export default function clearTimelineFromPosition(
  timeline: IIndexSegment[],
  firstAvailablePosition: number,
): number {
  let nbEltsRemoved = 0;
  while (timeline.length > 0) {
    const firstElt = timeline[0];
    if (firstElt.start >= firstAvailablePosition) {
      return nbEltsRemoved; // all clear
    }

    if (firstElt.repeatCount === -1) {
      return nbEltsRemoved;
    } else if (firstElt.repeatCount === 0) {
      timeline.shift();
      nbEltsRemoved += 1;
    } else {
      // we have a segment repetition
      const nextElt = timeline[1];
      if (nextElt !== undefined && nextElt.start <= firstAvailablePosition) {
        timeline.shift();
        nbEltsRemoved += 1;
      } else {
        // no next segment or next segment is available
        if (firstElt.duration <= 0) {
          return nbEltsRemoved;
        }

        let nextStart = firstElt.start + firstElt.duration;
        let nextRepeat = 1;
        while (nextStart < firstAvailablePosition && nextRepeat <= firstElt.repeatCount) {
          nextStart += firstElt.duration;
          nextRepeat++;
        }
        if (nextRepeat > firstElt.repeatCount) {
          // every start is before
          timeline.shift();
          nbEltsRemoved = firstElt.repeatCount + 1;
        } else {
          // some repetitions start after and some before
          const newRepeat = firstElt.repeatCount - nextRepeat;
          firstElt.start = nextStart;
          firstElt.repeatCount = newRepeat;
          nbEltsRemoved += nextRepeat;
          return nbEltsRemoved;
        }
      }
    }
  }
  return nbEltsRemoved;
}
