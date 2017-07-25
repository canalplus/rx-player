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

import Segment from "../segment.js";
import {
  normalizeRange,
  getInitSegment,
  setTimescale,
  scale,
} from "./helpers.js";

export default {
  getInitSegment,
  setTimescale,
  scale,

  getSegments(repId, index, _up, _to) {
    const { up, to } = normalizeRange(index, _up, _to);

    const { duration, startNumber, timescale, media } = index;

    const segments = [];
    for (let time = up; time <= to; time += duration) {
      const number = Math.floor(time / duration) +
        (startNumber == null ? 1 : startNumber);
      const time = number * duration;

      const args = {
        id: "" + repId + "_" + number,
        number: number,
        time: time,
        init: false,
        duration: duration,
        range: null,
        indexRange: null,
        timescale,
        media,
      };
      segments.push(new Segment(args));
    }

    return segments;
  },

  getFirstPosition() {
    return undefined;
  },

  getLastPosition() {
    return undefined;
  },

  shouldRefresh() {
    return false;
  },

  checkDiscontinuity() {
    return -1;
  },

  _addSegmentInfos() {
    return false;
  },
};
