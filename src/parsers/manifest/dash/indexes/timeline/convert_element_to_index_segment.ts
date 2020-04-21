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

import log from "../../../../../log";
import { IIndexSegment } from "../../../utils/index_helpers";

/**
 * Translate parsed `S` node into Segment compatible with this index:
 * Find out the start, repeatCount and duration of each of these.
 *
 * @param {Object} item - parsed `S` node
 * @param {Object|null} previousItem - the previously parsed Segment (related
 * to the `S` node coming just before). If `null`, we're talking about the first
 * segment.
 * @param {Object|null} nextItem - the `S` node coming next. If `null`, we're
 * talking about the last segment.
 * @param {number} timelineStart - Absolute start for the timeline. In the same
 * timescale than the given `S` nodes.
 * @returns {Object|null}
 */
export default function convertElementsToIndexSegment(
  item : { start? : number; repeatCount? : number; duration? : number },
  previousItem : IIndexSegment|null,
  nextItem : { start? : number; repeatCount? : number; duration? : number }|null,
  timelineStart : number
) : IIndexSegment|null {
  let start = item.start;
  let duration = item.duration;
  const repeatCount = item.repeatCount;
  if (start == null) {
    if (previousItem == null) {
      start = timelineStart;
    } else if (previousItem.duration != null) {
      start = previousItem.start +
              (previousItem.duration * (previousItem.repeatCount + 1));
    }
  }
  if ((duration == null || isNaN(duration)) &&
      nextItem != null && nextItem.start != null && !isNaN(nextItem.start) &&
      start != null && !isNaN(start)
  ) {
    duration = nextItem.start - start;
  }
  if ((start != null && !isNaN(start)) &&
      (duration != null && !isNaN(duration)) &&
      (repeatCount == null || !isNaN(repeatCount))
  ) {
    return { start,
             duration,
             repeatCount: repeatCount === undefined ? 0 :
                                                      repeatCount };
  }
  log.warn("DASH: A \"S\" Element could not have been parsed.");
  return null;
}
