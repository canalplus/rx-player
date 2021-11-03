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

import isNullOrUndefined from "../../../utils/is_null_or_undefined";

/** Generic way to represent segments in an index of segments. */
export interface IIndexSegment {
  /** The segment starting presentation time. */
  start: number;
  /** Difference between the last and first presentation time. */
  duration: number;
  /**
   * Repeat counter.
   * 1 === Repeat 1 time == 2 consecutive segments of this same duration.
   */
  repeatCount: number;
  /** Optional byte-range the segment is available at when requested. */
  range?: [number, number];
}

/**
 * Calculate the number of times a timeline element repeats based on the next
 * element.
 * @param {Object} element
 * @param {Object|null|undefined} nextElement
 * @param {number|undefined} maxPosition
 * @returns {Number}
 */
export function calculateRepeat(
  element : IIndexSegment,
  nextElement? : IIndexSegment | null | undefined,
  maxPosition? : number
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
  if (!isNullOrUndefined(nextElement)) {
    segmentEnd = nextElement.start;
  } else if (maxPosition !== undefined) {
    segmentEnd = maxPosition;
  } else {
    segmentEnd = Number.MAX_VALUE;
  }
  return Math.ceil((segmentEnd - element.start) / element.duration) - 1;
}

/**
 * Returns end of the segment given, in index time.
 * @param {Object} segment
 * @param {Object|null} [nextSegment]
 * @param {number} maxPosition
 * @returns {Number}
 */
export function getIndexSegmentEnd(
  segment : IIndexSegment,
  nextSegment : IIndexSegment|null,
  maxPosition? : number
) : number {
  const { start, duration } = segment;
  if (duration <= 0) {
    return start;
  }

  const repeat = calculateRepeat(segment, nextSegment, maxPosition);
  return start + (repeat + 1) * duration;
}

/**
 * Convert from `presentationTime`, the time of the segment at the moment it
 * is decoded to `mediaTime`, the original time the segments point at.
 * @param {number} time
 * @param {Object} indexOptions
 * @returns {number}
 */
export function toIndexTime(
  time : number,
  indexOptions : { timescale : number; indexTimeOffset? : number }
) : number {
  return time * indexOptions.timescale + (indexOptions.indexTimeOffset ?? 0);
}

/**
 * Convert from `mediaTime`, the original time the segments point at to
 * `presentationTime`, the time of the segment at the moment it is decoded.
 * @param {number} time
 * @param {Object} indexOptions
 * @returns {number}
 */
export function fromIndexTime(
  time : number,
  indexOptions : { timescale : number; indexTimeOffset? : number }
) : number {
  return (time - (indexOptions.indexTimeOffset ?? 0)) / indexOptions.timescale;
}

/**
 * @param {Number} start
 * @param {Number} duration
 * @param {Number} timescale
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
export function getTimescaledRange(
  start: number,
  duration: number,
  timescale : number
) : [number, number] {
  return [ start * timescale,
           (start + duration) * timescale ];
}

/**
 * Get index of the last segment in the timeline starting before/at the given
 * timescaled time.
 * Returns -1 if the given time is lower than the start of the first available
 * segment.
 * @param {Object} index
 * @param {Number} timeTScaled
 * @returns {Number}
 */
function getIndexOfLastObjectBefore(
  timeline : IIndexSegment[],
  timeTScaled : number
) : number {
  let low = 0;
  let high = timeline.length;

  while (low < high) {
    const mid = (low + high) >>> 1; // Divide by two + floor
    if (timeline[mid].start <= timeTScaled) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low - 1;
}

/**
 * @param {Object} index
 * @param {number} timeSec
 * @param {number} [maxPosition]
 * @returns {number|null}
 */
export function checkDiscontinuity(
  index : { timeline : IIndexSegment[];
            timescale : number;
            indexTimeOffset? : number; },
  timeSec : number,
  maxPosition? : number
) : number | null {
  const { timeline } = index;
  const scaledTime = toIndexTime(timeSec, index);

  if (scaledTime < 0) {
    return null;
  }

  const segmentIndex = getIndexOfLastObjectBefore(timeline, scaledTime);
  if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
    return null;
  }

  const timelineItem = timeline[segmentIndex];
  if (timelineItem.duration <= 0) {
    return null;
  }

  const nextTimelineItem = timeline[segmentIndex + 1];
  if (nextTimelineItem === undefined) {
    return null;
  }

  const nextStart = nextTimelineItem.start;
  const segmentEnd = getIndexSegmentEnd(timelineItem,
                                        nextTimelineItem,
                                        maxPosition);
  return scaledTime >= segmentEnd &&
         scaledTime < nextStart ? fromIndexTime(nextStart, index) :
                                  null;
}
