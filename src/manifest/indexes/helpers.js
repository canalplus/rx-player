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

const normalizeRange = (index, ts, duration) => {
  const pto = index.presentationTimeOffset || 0;
  const timescale = index.timescale || 1;

  return {
    up: (ts) * timescale - pto,
    to: (ts + duration) * timescale - pto,
  };
};

const getTimelineRangeStart = ({ ts, d, r }) =>
  d === -1 ? ts : ts + r * d ;

const getTimelineRangeEnd = ({ ts, d, r }) =>
  d === -1 ? ts : ts + (r+1) * d;

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
 * @param {Number} timescale
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
