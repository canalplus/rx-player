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

import { ISegment } from "../../../../../manifest";
import { IEMSG } from "../../../../containers/isobmff";
import {
  calculateRepeat,
  IIndexSegment,
  toIndexTime,
} from "../../../utils/index_helpers";
import { createDashUrlDetokenizer } from "./tokens";

/**
 * For the given start time and duration of a timeline element, calculate how
 * much this element should be repeated to contain the time given.
 * 0 being the same element, 1 being the next one etc.
 * @param {Number} segmentStartTime
 * @param {Number} segmentDuration
 * @param {Number} wantedTime
 * @returns {Number}
 */
function getWantedRepeatIndex(
  segmentStartTime : number,
  segmentDuration : number,
  wantedTime : number
) : number {
  const diff = wantedTime - segmentStartTime;
  return diff > 0 ? Math.floor(diff / segmentDuration) :
                    0;
}

/**
 * Get a list of Segments for the time range wanted.
 * @param {Object} index - index object, constructed by parsing the manifest.
 * @param {number} from - starting timestamp wanted, in seconds
 * @param {number} durationWanted - duration wanted, in seconds
 * @param {function} isEMSGWhitelisted
 * @param {number|undefined} maximumTime
 * @returns {Array.<Object>}
 */
export default function getSegmentsFromTimeline(
  index : { availabilityTimeComplete? : boolean | undefined;
            segmentUrlTemplate : string | null;
            startNumber? : number | undefined;
            endNumber? : number | undefined;
            timeline : IIndexSegment[];
            timescale : number;
            indexTimeOffset : number; },
  from : number,
  durationWanted : number,
  isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean,
  maximumTime? : number
) : ISegment[] {
  const scaledUp = toIndexTime(from, index);
  const scaledTo = toIndexTime(from + durationWanted, index);
  const { timeline, timescale, segmentUrlTemplate, startNumber, endNumber } = index;

  let currentNumber = startNumber ?? 1;
  const segments : ISegment[] = [];

  const timelineLength = timeline.length;

  for (let i = 0; i < timelineLength; i++) {
    const timelineItem = timeline[i];
    const { duration, start, range } = timelineItem;

    const repeat = calculateRepeat(timelineItem, timeline[i + 1], maximumTime);
    const complete = index.availabilityTimeComplete !== false ||
                     i !== timelineLength - 1 &&
                     repeat !== 0;
    let segmentNumberInCurrentRange = getWantedRepeatIndex(start, duration, scaledUp);
    let segmentTime = start + segmentNumberInCurrentRange * duration;
    while (segmentTime < scaledTo && segmentNumberInCurrentRange <= repeat) {
      const segmentNumber = currentNumber + segmentNumberInCurrentRange;
      if (endNumber !== undefined && segmentNumber > endNumber) {
        break;
      }

      const detokenizedURL = segmentUrlTemplate === null ?
        null :
        createDashUrlDetokenizer(segmentTime, segmentNumber)(segmentUrlTemplate);

      let time = segmentTime - index.indexTimeOffset;
      let realDuration = duration;
      if (time < 0) {
        realDuration = duration + time; // Remove from duration the part before `0`
        time = 0;
      }

      const segment = { id: String(segmentTime),
                        time: time / timescale,
                        end: (time + realDuration) / timescale,
                        duration: realDuration / timescale,
                        isInit: false,
                        range,
                        timescale: 1 as const,
                        url: detokenizedURL,
                        number: segmentNumber,
                        timestampOffset: -(index.indexTimeOffset / timescale),
                        complete,
                        privateInfos: { isEMSGWhitelisted } };
      segments.push(segment);

      // update segment number and segment time for the next segment
      segmentNumberInCurrentRange++;
      segmentTime = start + segmentNumberInCurrentRange * duration;
    }

    if (segmentTime >= scaledTo) {
      // we reached ``scaledTo``, we're done
      return segments;
    }

    currentNumber += repeat + 1;
    if (endNumber !== undefined && currentNumber > endNumber) {
      return segments;
    }
  }

  return segments;
}
