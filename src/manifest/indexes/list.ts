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
} from "./helpers";

export interface IListIndexListItem {
  media : string;
  range? : [ number, number ];
}

interface IListIndex {
  presentationTimeOffset? : number;
  duration : number;
  timescale : number;
  media : string;
  list : IListIndexListItem[];
}

/**
 * NEEDED IN INDEX
 * duration
 * list []
 *   ?range
 * timescale
 */

/**
 * Provide helpers for SegmentList-based indexes.
 * @type {Object}
 */
const ListIndexHelpers = {
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
    index : IListIndex,
    _up : number,
    _to : number
  ) : Segment[] {
    const { up, to } = normalizeRange(index, _up, _to);

    const { duration, list, timescale } = index;
    const length = Math.min(list.length - 1, Math.floor(to / duration));
    const segments : Segment[] = [];
    let i = Math.floor(up / duration);
    while (i <= length) {
      const range = list[i].range;
      const media = list[i].media;
      const args = {
        id: "" + repId + "_" + i,
        time: i * duration,
        init: false,
        range,
        duration,
        indexRange: null,
        timescale,
        media,
      };
      segments.push(new Segment(args));
      i++;
    }
    return segments;
  },

  /**
   * Returns first position in index.
   * @returns {Number}
   */
  getFirstPosition() : number {
    return 0;
  },

  /**
   * Returns last position in index.
   * @param {Object} index
   * @returns {Number}
   */
  getLastPosition(index : IListIndex) : number {
    const { duration, list } = index;
    return (list.length * duration) / index.timescale;
  },

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * (If we should re-fetch the manifest)
   * @param {Object} index
   * @param {Number} up
   * @param {Number} to
   * @returns {Boolean}
   */
  shouldRefresh(
    index : IListIndex,
    _ : number,
    _up : number,
    to : number
  ) : boolean {
    const {
      timescale,
      duration,
      list,
      presentationTimeOffset = 0,
    } = index;

    const scaledTo = to * timescale - presentationTimeOffset;
    const i = Math.floor(scaledTo / duration);
    return !(i >= 0 && i < list.length);
  },

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * Return false in any case.
   * @returns {Boolean}
   */
  _addSegmentInfos() : false {
    return false;
  },

  /**
   * We do not check for discontinuity in SegmentList-based indexes.
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  },
};

export default ListIndexHelpers;
