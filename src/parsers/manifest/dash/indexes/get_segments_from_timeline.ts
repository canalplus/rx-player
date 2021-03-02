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

import { ISegment } from "../../../../manifest";
import { IEMSG } from "../../../containers/isobmff";
import {
  calculateRepeat,
  IIndexSegment,
  toIndexTime,
} from "../../utils/index_helpers";
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
  index : { mediaURLs : string[] | null;
            startNumber? : number;
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
  const { timeline, timescale, mediaURLs, startNumber } = index;

  let currentNumber = startNumber != null ? startNumber :
                                            undefined;

  const segments : ISegment[] = [];

  const timelineLength = timeline.length;

  // TODO(pierre): use @maxSegmentDuration if possible
  let maxEncounteredDuration = timeline.length > 0 &&
                               timeline[0].duration != null ? timeline[0].duration :
                                                               0;

  for (let i = 0; i < timelineLength; i++) {
    const timelineItem = timeline[i];
    const { duration, start, range } = timelineItem;

    maxEncounteredDuration = Math.max(maxEncounteredDuration, duration);

    const repeat = calculateRepeat(timelineItem, timeline[i + 1], maximumTime);
    let segmentNumberInCurrentRange = getWantedRepeatIndex(start, duration, scaledUp);
    let segmentTime = start + segmentNumberInCurrentRange * duration;
    while (segmentTime < scaledTo && segmentNumberInCurrentRange <= repeat) {
      const segmentNumber = currentNumber != null ?
        currentNumber + segmentNumberInCurrentRange : undefined;

      const detokenizedURLs = mediaURLs === null ?
        null :
        mediaURLs.map(createDashUrlDetokenizer(segmentTime, segmentNumber));

      const time = segmentTime - index.indexTimeOffset;
      const segment = { id: String(segmentTime),
                        time: time / timescale,
                        end: (time + duration) / timescale,
                        duration: duration / timescale,
                        isInit: false,
                        range,
                        timescale: 1 as const,
                        mediaURLs: detokenizedURLs,
                        number: segmentNumber,
                        timestampOffset: -(index.indexTimeOffset / timescale),
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

    if (currentNumber != null) {
      currentNumber += repeat + 1;
    }
  }

  return segments;
}
