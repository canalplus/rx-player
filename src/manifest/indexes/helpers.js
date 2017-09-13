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

import assert from "../../utils/assert.js";
import Segment from "../segment.js";

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
const normalizeRange = (index, ts, duration) => {
  const pto = index.presentationTimeOffset || 0;
  const timescale = index.timescale || 1;

  return {
    up: (ts) * timescale - pto,
    to: (ts + duration) * timescale - pto,
  };
};

/**
 * Get start of the given index range, timescaled.
 * @param {Object} range
 * @param {Number} range.ts - the range's start time
 * @param {Number} range.d - the range's duration
 * @param {Number} range.r - the range's count. 0 for a single element, 1 for
 * 2 elements etc.
 * @returns {Number} - absolute start time of the range
 */
const getTimelineRangeStart = ({ ts, d, r }) =>
  d === -1 ? ts : ts + r * d ;

/**
 * Get end of the given index range, timescaled.
 * @param {Object} range
 * @param {Number} range.ts - the range's start time
 * @param {Number} range.d - the range's duration
 * @param {Number} range.r - the range's count. 0 for a single element, 1 for
 * 2 elements etc.
 * @returns {Number} - absolute end time of the range
 */
const getTimelineRangeEnd = ({ ts, d, r }) =>
  d === -1 ? ts : ts + (r+1) * d;

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
const getInitSegment = (rootId, index) => {
  const { initialization = {} } = index;

  const args = {
    id: "" + rootId + "_init",
    init: true,
    range: initialization.range || null,
    indexRange: index.indexRange || null,
    media: initialization.media,
    timescale: index.timescale,
  };
  return new Segment(args);
};

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
const setTimescale = (index, timescale) => {
  if (__DEV__) {
    assert(typeof timescale == "number");
    assert(timescale > 0);
  }

  if (index.timescale !== timescale) {
    index.timescale = timescale;
  }

  return index;
};

/**
 * Re-scale a given time from timescaled information to second-based.
 * @param {Object} index
 * @param {Number} time
 * @returns {Number}
 */
const scale = (index, time)  => {
  if (__DEV__) {
    assert(index.timescale > 0);
  }

  return time / index.timescale;
};

export {
  normalizeRange,
  getTimelineRangeStart,
  getTimelineRangeEnd,
  getInitSegment,
  setTimescale,
  scale,
};
