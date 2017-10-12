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

// TODO This file should probably be moved somewhere in the net folder
// TODO Should also probably a class implementing an interface e.g.
// IIndexManager (with the index in state?)

import Segment from "../segment";
import {
  normalizeRange,
  getInitSegment,
  setTimescale,
  scale,
  IIndexSegment,
} from "./helpers";

interface ITemplateIndex {
  presentationTimeOffset? : number;
  timescale : number;
  media : string;
  duration : number;
  startNumber : number;
  timeline : IIndexSegment[];
}

export default {
  getInitSegment,
  setTimescale,
  scale,

  /**
   * @param {string|Number} repId
   * @param {Object} index
   * @param {Number} _up
   * @param {Number} _to
   * @returns {Array.<Segment>}
   */
  getSegments(
    repId : string|number,
    index : ITemplateIndex,
    _up : number,
    _to : number
  ) : Segment[] {
    const { up, to } = normalizeRange(index, _up, _to);

    const { duration, startNumber, timescale, media } = index;

    const segments : Segment[] = [];
    for (let time = up; time <= to; time += duration) {
      const number = Math.floor(time / duration) +
        (startNumber == null ? 1 : startNumber);

      const args = {
        id: "" + repId + "_" + number,
        number,
        time: number * duration,
        init: false,
        duration,
        range: null,
        indexRange: null,
        timescale,
        media,
      };
      segments.push(new Segment(args));
    }

    return segments;
  },

  /**
   * Returns first position in index.
   * @returns {undefined}
   */
  getFirstPosition() : undefined {
    return undefined;
  },

  /**
   * Returns last position in index.
   * @returns {undefined}
   */
  getLastPosition() : undefined {
    return undefined;
  },

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * We never have to refresh a SegmentTemplate-based manifest.
   * @returns {Boolean}
   */
  shouldRefresh() : false {
    return false;
  },

  /**
   * We cannot check for discontinuity in SegmentTemplate-based indexes.
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  },

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * Return false in any case.
   * @returns {Boolean}
   */
  _addSegmentInfos() : false {
    return false;
  },
};
