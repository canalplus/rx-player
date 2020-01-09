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

import { getIndexSegmentEnd } from "../../utils/index_helpers";

export interface IIndexSegment { start : number;
                                 duration : number;
                                 repeatCount: number; }

export interface ITimelineIndex { timescale : number;
                                  timeline : IIndexSegment[]; }

/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} newSegment
 * @param {Object} currentSegment
 * @returns {Boolean} - true if the segment has been added
 */
export default function _addSegmentInfos(
  index : ITimelineIndex,
  newSegment : { time : number;
                 duration : number;
                 timescale : number; },
  currentSegment : { time : number;
                     duration : number;
                     timescale : number; }
) : boolean {
  const { timeline, timescale } = index;
  const timelineLength = timeline.length;
  const last = timeline[timelineLength - 1];

  const scaledNewSegment = newSegment.timescale === timescale ?
    { time: newSegment.time,
      duration: newSegment.duration, } :
    { time: (newSegment.time / newSegment.timescale) * timescale,
      duration: (newSegment.duration / newSegment.timescale) * timescale };

  let scaledCurrentTime;

  if (currentSegment.timescale !== 0) {
    scaledCurrentTime = currentSegment.timescale === timescale ?
      currentSegment.time :
      (currentSegment.time / currentSegment.timescale) * timescale;
  }

  // in some circumstances, the new segment information are only duration
  // information that we could use to deduct the start of the next segment.
  // This is the case where the new segment are associated to a current
  // segment and have the same start.
  // However, we prefer to be sure of the duration of the new segments
  // before adding such segments.
  const shouldDeductNextSegment = scaledCurrentTime != null &&
    (scaledNewSegment.time === scaledCurrentTime);
  if (shouldDeductNextSegment) {
    return false;
  } else if (scaledNewSegment.time >= getIndexSegmentEnd(last, null)) {
    // if the given timing has a timestamp after the timeline end we
    // just need to push a new element in the timeline, or increase
    // the @r attribute of the last element.
    if (last.duration === scaledNewSegment.duration) {
      last.repeatCount++;
    } else {
      index.timeline.push({ duration: scaledNewSegment.duration,
                            start: scaledNewSegment.time,
                            repeatCount: 0 });
    }
    return true;
  }

  return false;
}
