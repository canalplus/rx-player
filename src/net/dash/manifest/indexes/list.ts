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

import {
  IRepresentationIndex,
  ISegment,
} from "../../../../manifest";
import {
  getInitSegment,
  normalizeRange,
  scale,
} from "./helpers";

export interface IListIndex {
  indexType : "list";
  timescale: number;
  initialization: { media?: string; range?: [number, number] };
  indexRange?: [number, number];
  list: Array<{
    range? : [number, number];
    media? : string;
  }>;
  duration : number;
  presentationTimeOffset? : number;
}

/**
 * Provide helpers for SegmentList-based DASH indexes.
 * @type {Object}
 */
export default class ListRepresentationIndex implements IRepresentationIndex {
  private _index : IListIndex;

  /**
   * @param {Object} index
   */
  constructor(index : IListIndex) {
    this._index = index;
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index);
  }

  /**
   * Convert a time from a generated Segment to seconds.
   *
   * TODO What? Should be sufficient with a Segment alone. Check that.
   * @param {Number} time
   * @returns {Number}
   */
  scale(time : number) : number {
    return scale(this._index, time);
  }

  /**
   * @param {Number} _up
   * @param {Number} _to
   * @returns {Array.<Object>}
   */
  getSegments(_up : number, _to : number) : ISegment[] {
    const index = this._index;
    const { up, to } = normalizeRange(index, _up, _to);

    const { duration, list, timescale } = index;
    const length = Math.min(list.length - 1, Math.floor(to / duration));
    const segments : ISegment[] = [];
    let i = Math.floor(up / duration);
    while (i <= length) {
      const range = list[i].range;
      const media = list[i].media;
      const args = {
        id: "" + i,
        time: i * duration,
        isInit: false,
        range,
        duration,
        timescale,
        media,
      };
      segments.push(args);
      i++;
    }
    return segments;
  }

  /**
   * Returns first position in index.
   * @returns {Number}
   */
  getFirstPosition() : number {
    return 0;
  }

  /**
   * Returns last position in index.
   * @returns {Number}
   */
  getLastPosition() : number {
    const index = this._index;
    const { duration, list } = index;
    return (list.length * duration) / index.timescale;
  }

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * (If we should re-fetch the manifest)
   * @param {Array.<Object>} _
   * @param {Number} up
   * @param {Number} to
   * @returns {Boolean}
   */
  shouldRefresh(_ : ISegment[], _up : number, to : number) : boolean {
    const {
      timescale,
      duration,
      list,
      presentationTimeOffset = 0,
    } = this._index;

    const scaledTo = to * timescale - presentationTimeOffset;
    const i = Math.floor(scaledTo / duration);
    return !(i >= 0 && i < list.length);
  }

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * @returns {Array}
   */
  _addSegments() : never[] {
    return [];
  }

  /**
   * We do not check for discontinuity in SegmentList-based indexes.
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  }

  /**
   * @param {Object}
   */
  update(
    newIndex : ListRepresentationIndex /* TODO @ index refacto */
  ) : void {
    this._index = newIndex._index;
  }

  /**
   * @returns {string}
   */
  getType() : string { // TODO Remove
    return "list";
  }
}
