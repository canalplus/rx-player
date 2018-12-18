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
import { replaceSegmentDASHTokens } from "../helpers";

interface IIndexSegment {
  start: number;
  duration: number;
  repeatCount: number; // repeat counter
  range?: [number, number];
}

/**
 * Calculate the number of times a timeline element repeat.
 * @param {Object} element
 * @param {Object} nextElement
 * @param {number} timelineEnd
 * @returns {Number}
 */
function calculateRepeat(
  element : IIndexSegment,
  nextElement? : IIndexSegment|null,
  timelineEnd? : number
) : number {
  const { repeatCount } = element;

  if (repeatCount >= 0) {
    return repeatCount;
  }

  // A negative value of the @r attribute of the S element indicates
  // that the duration indicated in @d attribute repeats until the
  // start of the next S element, the end of the Period or until the
  // next MPD update.
  let segmentEnd : number;
  if (nextElement != null) {
    segmentEnd = nextElement.start;
  } else if (timelineEnd != null) {
    segmentEnd = timelineEnd;
  } else {
    segmentEnd = Number.MAX_VALUE;
  }
  return Math.ceil((segmentEnd - element.start) / element.duration) - 1;
}

/**
 * Convert from `presentationTime`, the time of the segment at the moment it
 * is decoded to `mediaTime`, the original time the segments point at.
 * @param {Object} index
 * @param {number} time
 * @returns {number}
 */
function toIndexTime(
  index : { timescale : number; indexTimeOffset : number },
  time : number
) {
  return time * index.timescale + index.indexTimeOffset;
}

/**
 * Convert from `mediaTime`, the original time the segments point at to
 * `presentationTime`, the time of the segment at the moment it is decoded.
 * @param {Object} index
 * @param {number} time
 * @returns {number}
 */
function fromIndexTime(
  index : { timescale : number; indexTimeOffset : number },
  time : number
) {
  return (time - index.indexTimeOffset) / index.timescale;
}

/**
 * @param {Object} index
 * @param {Number} start
 * @param {Number} duration
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
function getTimescaledRange(
  index: { timescale?: number },
  start: number,
  duration: number
) : {
  up: number;
  to: number;
} {
  const timescale = index.timescale || 1;

  return {
    up: (start) * timescale,
    to: (start + duration) * timescale,
  };
}

/**
 * @param {Object} segment
 * @param {Object|null} [nextSegment]
 * @param {number} timelineEnd
 * @returns {Number}
 */
function getIndexSegmentEnd(
  segment : IIndexSegment,
  nextSegment : IIndexSegment|null,
  timelineEnd : number|undefined
) : number {
  const { start, duration } = segment;
  if (duration === -1) {
    return start;
  }

  const repeat = calculateRepeat(segment, nextSegment, timelineEnd);
  return start + (repeat + 1) * duration;
}

/**
 * Construct init segment for the given index.
 * @param {Object} index
 * @returns {Object}
 */
function getInitSegment(
  index: {
    timescale: number;
    initialization?: { mediaURL: string; range?: [number, number] };
    indexRange?: [number, number];
    indexTimeOffset : number;
  }
) : ISegment {
  const { initialization } = index;

  return {
    id: "init",
    isInit: true,
    time: 0,
    range: initialization ? initialization.range || undefined : undefined,
    indexRange: index.indexRange || undefined,
    mediaURL: initialization ? initialization.mediaURL : null,
    timescale: index.timescale,
    timestampOffset: -(index.indexTimeOffset / index.timescale),
  };
}

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
  if (diff > 0) {
    return Math.floor(diff / segmentDuration);
  } else {
    return 0;
  }
}

/**
 * Get a list of Segments for the time range wanted.
 * @param {Object} index - index object, constructed by parsing the manifest.
 * @param {number} from - starting timestamp wanted, in seconds
 * @param {number} durationWanted - duration wanted, in seconds
 * @returns {Array.<Object>}
 */
function getSegmentsFromTimeline(
  index : {
    mediaURL : string;
    startNumber? : number;
    timeline : IIndexSegment[];
    timescale : number;
    indexTimeOffset : number;
    timelineEnd? : number;
  },
  from : number,
  durationWanted : number
) : ISegment[] {
  const scaledUp = toIndexTime(index, from);
  const scaledTo = toIndexTime(index, from + durationWanted);
  const { timeline, timescale, mediaURL, startNumber, timelineEnd } = index;

  let currentNumber = startNumber != null ? startNumber : undefined;

  const segments : ISegment[] = [];

  const timelineLength = timeline.length;

  // TODO(pierre): use @maxSegmentDuration if possible
  let maxEncounteredDuration = (timeline.length && timeline[0].duration) || 0;

  for (let i = 0; i < timelineLength; i++) {
    const timelineItem = timeline[i];
    const { duration, start, range } = timelineItem;

    maxEncounteredDuration = Math.max(maxEncounteredDuration, duration);

    // live-added segments have @d attribute equals to -1
    if (duration < 0) {
      // what? May be to play it safe and avoid adding segments which are
      // not completely generated
      if (start + maxEncounteredDuration < scaledTo) {
        const segmentNumber = currentNumber != null ? currentNumber : undefined;
        const segment = {
          id: "" + start,
          time: start - index.indexTimeOffset,
          isInit: false,
          range,
          duration: undefined,
          timescale,
          mediaURL: replaceSegmentDASHTokens(mediaURL, start, segmentNumber),
          number: segmentNumber,
          timestampOffset: -(index.indexTimeOffset / timescale),
        };
        segments.push(segment);
      }
      return segments;
    }

    const repeat = calculateRepeat(timelineItem, timeline[i + 1], timelineEnd);
    let segmentNumberInCurrentRange = getWantedRepeatIndex(start, duration, scaledUp);
    let segmentTime = start + segmentNumberInCurrentRange * duration;
    while (segmentTime < scaledTo && segmentNumberInCurrentRange <= repeat) {
      const segmentNumber = currentNumber != null ?
        currentNumber + segmentNumberInCurrentRange : undefined;
      const segment = {
        id: "" + segmentTime,
        time: segmentTime - index.indexTimeOffset,
        isInit: false,
        range,
        duration,
        timescale,
        mediaURL: replaceSegmentDASHTokens(mediaURL, segmentTime, segmentNumber),
        number: segmentNumber,
        timestampOffset: -(index.indexTimeOffset / timescale),
      };
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

export {
  calculateRepeat,
  fromIndexTime,
  getIndexSegmentEnd,
  getInitSegment,
  getSegmentsFromTimeline,
  getTimescaledRange,
  IIndexSegment,
  toIndexTime,
};
