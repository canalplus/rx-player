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
import assert from "../../../../utils/assert";

interface IIndexSegment {
  ts: number; // start timestamp
  d: number; // duration
  r: number; // repeat counter
  range?: [number, number];
}

/**
 * Calculate the number of times a segment repeat based on the next segment.
 * @param {Object} seg
 * @param {Object} nextSeg
 * @returns {Number}
 */
function calculateRepeat(seg : IIndexSegment, nextSeg : IIndexSegment) : number {
  let rep = seg.r || 0;

  // A negative value of the @r attribute of the S element indicates
  // that the duration indicated in @d attribute repeats until the
  // start of the next S element, the end of the Period or until the
  // next MPD update.
  if (rep < 0) {
    const repEnd = nextSeg ? nextSeg.ts : Infinity;
    rep = Math.ceil((repEnd - seg.ts) / seg.d) - 1;
  }

  return rep;
}

/**
 * Convert second-based start time and duration to the timescale of the
 * manifest's index.
 * @param {Object} index
 * @param {Number} ts
 * @param {Number} duration
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
function normalizeRange(
  index: { presentationTimeOffset?: number; timescale?: number }, // TODO
  ts: number,
  duration: number
): {
  up: number;
  to: number;
} {
  const pto = index.presentationTimeOffset || 0;
  const timescale = index.timescale || 1;

  return {
    up: (ts) * timescale - pto,
    to: (ts + duration) * timescale - pto,
  };
}

/**
 * Get start of the given index range, timescaled.
 * @param {Object} range
 * @param {Number} range.ts - the range's start time
 * @param {Number} range.d - the range's duration
 * @param {Number} range.r - the range's count. 0 for a single element, 1 for
 * 2 elements etc.
 * @returns {Number} - absolute start time of the range
 */
function getTimelineRangeStart({ ts, d, r }: IIndexSegment): number {
  return d === -1 ? ts : ts + r * d;
}

/**
 * Get end of the given index range, timescaled.
 * @param {Object} range
 * @param {Number} range.ts - the range's start time
 * @param {Number} range.d - the range's duration
 * @param {Number} range.r - the range's count. 0 for a single element, 1 for
 * 2 elements etc.
 * @returns {Number} - absolute end time of the range
 */
function getTimelineRangeEnd({ ts, d, r }: IIndexSegment): number {
  return d === -1 ? ts : ts + (r + 1) * d;
}

/**
 * Construct init segment for the given index.
 * @param {Object} index
 * @param {Number} index.timescale
 * @param {Object} [index.initialization={}]
 * @param {Array.<Number>|null} [index.initialization.range=null]
 * @param {Array.<Number>|null} [index.initialization.indexRange=null]
 * @param {string} [index.initialization.media]
 * @returns {Object}
 */
function getInitSegment(
  index: {
    timescale: number;
    initialization: { media?: string; range?: [number, number] };
    indexRange?: [number, number];
  }
): ISegment {
  const { initialization = {} } = index;

  return {
    id: "init",
    isInit: true,
    time: 0,
    range: initialization.range || undefined,
    indexRange: index.indexRange || undefined,
    media: initialization.media,
    timescale: index.timescale,
  };
}

/**
 * Re-scale a given time from timescaled information to second-based.
 * @param {Object} index
 * @param {Number} time
 * @returns {Number}
 */
function scale(index: { timescale: number }, time: number): number {
  if (__DEV__) {
    assert(index.timescale > 0);
  }

  return time / index.timescale;
}

/**
 * @param {Number} ts
 * @param {Number} up
 * @param {Number} duration
 * @returns {Number}
 */
function getSegmentNumber(
  ts : number,
  up : number,
  duration : number
) : number {
  const diff = up - ts;
  if (diff > 0) {
    return Math.floor(diff / duration);
  } else {
    return 0;
  }
}

function getSegmentsFromTimeline(
  index : {
    media? : string;
    startNumber? : number;
    timeline : IIndexSegment[];
    timescale : number;
  },
  _up : number,
  _to : number
) : ISegment[] {
  const { up, to } = normalizeRange(index, _up, _to);
  const { timeline, timescale, media, startNumber } = index;

  let currentNumber = startNumber != null ? startNumber : undefined;

  const segments : ISegment[] = [];

  const timelineLength = timeline.length;

  // TODO(pierre): use @maxSegmentDuration if possible
  let maxEncounteredDuration = (timeline.length && timeline[0].d) || 0;

  for (let i = 0; i < timelineLength; i++) {
    const segmentRange = timeline[i];
    const { d, ts, range } = segmentRange;

    maxEncounteredDuration = Math.max(maxEncounteredDuration, d);

    // live-added segments have @d attribute equals to -1
    if (d < 0) {
      // TODO what? May be to play it safe and avoid adding segments which are
      // not completely generated
      if (ts + maxEncounteredDuration < to) {
        const segment = {
          id: "" + ts,
          time: ts,
          isInit: false,
          range,
          duration: undefined,
          timescale,
          media,
          number: currentNumber != null ? currentNumber : undefined,
        };
        segments.push(segment);
      }
      return segments;
    }

    const repeat = calculateRepeat(segmentRange, timeline[i + 1]);
    let segmentNumberInCurrentRange = getSegmentNumber(ts, up, d);
    let segmentTime = ts + segmentNumberInCurrentRange * d;
    while (segmentTime < to && segmentNumberInCurrentRange <= repeat) {
      const segment = {
        id: "" + segmentTime,
        time: segmentTime,
        isInit: false,
        range,
        duration: d,
        timescale,
        media,
        number: currentNumber != null ?
        currentNumber + segmentNumberInCurrentRange : undefined,
      };
      segments.push(segment);

      // update segment number and segment time for the next segment
      segmentNumberInCurrentRange++;
      segmentTime = ts + segmentNumberInCurrentRange * d;
    }

    if (segmentTime >= to) {
      // we reached ``to``, we're done
      return segments;
    }

    if (currentNumber != null) {
      currentNumber += repeat + 1;
    }
  }

  return segments;
}

export {
  normalizeRange,
  getSegmentsFromTimeline,
  getTimelineRangeStart,
  getTimelineRangeEnd,
  getInitSegment,
  IIndexSegment,
  scale,
};
