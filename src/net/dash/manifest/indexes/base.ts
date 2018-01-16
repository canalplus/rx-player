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

import { IRepresentationIndex } from "../../../../manifest";
import { IIndexSegment } from "./helpers";
import TimelineIndex from "./timeline";

interface IBaseIndex {
  timescale : number;
  media : string;
  timeline : IIndexSegment[];
}

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
function _addSegmentInfos(
  index : IBaseIndex,
  segmentInfos : {
    time : number;
    duration : number;
    timescale : number;
    count: number;
    range: [number, number];
  }
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
}

/**
 * Provide helpers for SegmentBase-based indexes.
 * @type {Object}
 * TODO weird that everything is inherited from Timeline...
 * Reimplement from scratch
 */
export default class BaseRepresentationIndex extends TimelineIndex
  implements IRepresentationIndex {

    _addSegments(nextSegments : any[]) : any[] { // TODO
      const addedSegments : any[] = [];
      for (let i = 0; i < nextSegments.length; i++) {
        if (
          _addSegmentInfos(this._index, nextSegments[i])
        ) {
          addedSegments.push(nextSegments[i]);
        }
      }
      return addedSegments;
    }

    /**
     * Returns false as no Segment-Base based index should need to be refreshed.
     * @returns {Boolean}
     */
    shouldRefresh() : false {
      return false;
    }

    getType() : string { // TODO Remove
      return "base";
    }
}
