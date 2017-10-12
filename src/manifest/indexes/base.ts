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

import TimelineIndex from "./timeline";
import {
  getInitSegment,
  setTimescale,
  scale,
  IIndexSegment,
} from "./helpers";

interface IBaseIndex {
  timescale : number;
  media : string;
  timeline : IIndexSegment[];
}

/**
 * Provide helpers for SegmentBase-based indexes.
 * @type {Object}
 * TODO weird that everything is inherited from Timeline...
 * Reimplement from scratch
 */
export default {
  getInitSegment,
  setTimescale,
  scale,
  getSegments: TimelineIndex.getSegments,
  getFirstPosition: TimelineIndex.getFirstPosition,
  getLastPosition: TimelineIndex.getLastPosition,
  checkDiscontinuity: TimelineIndex.checkDiscontinuity,

  /**
   * Add a new segment to the index.
   *
   * /!\ Mutate the given index
   * @param {Object} index
   * @param {Object} segmentInfos
   * @param {Number} segmentInfos.timescale
   * @param {Number} segmentInfos.duration
   * @param {Number} segmentInfos.count
   * @param {*} segmentInfos.range - TODO check type
   * @returns {Boolean} - true if the segment has been added
   */
  _addSegmentInfos(
    index : IBaseIndex,
    segmentInfos : any
  ) : boolean {
    if (segmentInfos.timescale !== index.timescale) {
      const { timescale } = index;
      index.timeline.push({
        ts: (segmentInfos.time / segmentInfos.timescale) * timescale,
        d: (segmentInfos.duration / segmentInfos.timescale) * timescale,
        r: segmentInfos.count,
        range: segmentInfos.range,
      });
    } else {
      index.timeline.push({
        ts: segmentInfos.time,
        d: segmentInfos.duration,
        r: segmentInfos.count,
        range: segmentInfos.range,
      });
    }
    return true;
  },

  /**
   * Returns false as no Segment-Base based index should need to be refreshed.
   * @returns {Boolean}
   */
  shouldRefresh() : false {
    return false;
  },
};
