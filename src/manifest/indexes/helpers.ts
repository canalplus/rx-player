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

import assert from "../../utils/assert";
import Segment from "../segment";

export interface IIndexSegment {
  ts: number; // start timestamp
  d: number; // duration
  r: number; // repeat counter
  range?: [number, number];
}

interface ITimelineIndex {
  presentationTimeOffset?: number;
  timescale: number;
  media: string;
  timeline: IIndexSegment[];
  startNumber?: number;
}

interface ITemplateIndex {
  presentationTimeOffset?: number;
  timescale: number;
  media: string;
  duration: number;
  startNumber: number;
  timeline: IIndexSegment[];
}

interface IListIndex {
  presentationTimeOffset? : number;
  duration : number;
  timescale : number;
  media : string;
  list : IListIndexListItem[];
}

export interface IListIndexListItem {
  media : string;
  mediaRange? : [ number, number ];
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
 * @param {string} rootId
 * @param {Object} index
 * @param {Number} index.timescale
 * @param {Object} [index.initialization={}]
 * @param {Array.<Number>|null} [index.initialization.range=null]
 * @param {Array.<Number>|null} [index.initialization.indexRange=null]
 * @param {string} [index.initialization.media]
 * @returns {Segment}
 */
function getInitSegment(
  rootId: string,
  index: {
    timescale: number;
    initialization: { media?: string; range?: [number, number] };
    indexRange?: [number, number];
  }
): Segment {
  const { initialization = {} } = index;

  const args = {
    id: "" + rootId + "_init",
    init: true,
    time: 0,
    range: initialization.range || null,
    indexRange: index.indexRange || null,
    media: initialization.media,
    timescale: index.timescale,
  };
  return new Segment(args);
}

/**
 * Update the timescale used (for all segments).
 * TODO This should probably update all previous segments to the newly set
 * Timescale.
 *
 * /!\ Mutates the given index
 * @param {Object} index
 * @param {Number} timescale
 * @returns {Object}
 */
const setTimescale = (
  index: { timescale?: number },
  timescale: number
): { timescale: number } => {
  if (__DEV__) {
    assert(typeof timescale === "number");
    assert(timescale > 0);
  }

  if (index.timescale !== timescale) {
    index.timescale = timescale;
  }

  return {
    timescale: index.timescale === timescale ?
      timescale : index.timescale,
  };
};

/**
 * Re-scale a given time from timescaled information to second-based.
 * @param {Object} index
 * @param {Number} time
 * @returns {Number}
 */
const scale = (
  index: { timescale: number },
  time: number
): number => {
  if (__DEV__) {
    assert(index.timescale > 0);
  }

  return time / index.timescale;
};

interface ISegmentHelpers<T> {
  getInitSegment: (
    rootId: string,
    index: {
      timescale: number;
      initialization: {
        media?: string;
        range?: [number, number];
      };
      indexRange?: [number, number];
    }) => Segment;
  setTimescale: (
    index: { timescale?: number },
    timescale: number
  ) => { timescale: number };
  scale: (
    index: { timescale: number },
    time: number
  ) => number;
  getSegments: (
    repId: string | number,
    index: T,
    _up: number,
    _to: number
  ) => Segment[];
  shouldRefresh: (
    index: T,
    parsedSegments: Segment[],
    up: number,
    to: number
  ) => boolean;
  getFirstPosition: (index: T) => number | undefined;
  getLastPosition: (index: T) => number | undefined;
  checkDiscontinuity: (
    index: T,
    _time: number
  ) => number;
  _addSegmentInfos: (
    index: T,
    newSegment: {
      time: number;
      duration: number;
      timescale: number;
      count: number;
      range: [number, number];
    },
    currentSegment: {
      time: number;
      duration: number;
      timescale: number;
    }
  ) => boolean;
}

export {
  calculateRepeat,
  normalizeRange,
  getTimelineRangeStart,
  getTimelineRangeEnd,
  getInitSegment,
  setTimescale,
  scale,
  ITimelineIndex,
  ITemplateIndex,
  ISegmentHelpers,
  IListIndex,
};
