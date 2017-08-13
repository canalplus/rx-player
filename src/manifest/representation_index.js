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

import { getRightIndexHelpers } from "./indexes/index.js";

class RepresentationIndex {
  /**
   * @constructor
   * @param {Object} args
   * @param {Object} args.index
   * @param {string|Number} args.rootId
   */
  constructor(args) {
    this._index = args.index;
    this._rootId = args.rootId;
    this._indexHelpers = getRightIndexHelpers(this._index);
  }

  getInitSegment() {
    return this._indexHelpers.getInitSegment(this._rootId, this._index);
  }

  getSegments(up, duration) {
    return this._indexHelpers.getSegments(
      this._rootId,
      this._index,
      up,
      duration
    );
  }

  shouldRefresh(time, up, to) {
    return this._indexHelpers.shouldRefresh(this._index, time, up, to);
  }

  getFirstPosition() {
    return this._indexHelpers.getFirstPosition(this._index);
  }

  getLastPosition() {
    return this._indexHelpers.getLastPosition(this._index);
  }

  checkDiscontinuity(time) {
    return this._indexHelpers.checkDiscontinuity(this._index, time);
  }

  /**
   * Returns time given scaled into seconds.
   * @param {Number} time
   * @returns {Number}
   */
  scale(time) {
    return this._indexHelpers.scale(this._index, time);
  }

  /**
   * Update the timescale used (for all segments).
   * @param {Number} timescale
   */
  setTimescale(timescale) {
    return this._indexHelpers.setTimescale(this._index, timescale);
  }

  _addSegments(nextSegments, currentSegment) {
    const addedSegments = [];
    for (let i = 0; i < nextSegments.length; i++) {
      if (
        this._indexHelpers._addSegmentInfos(
          this._index,
          nextSegments[i],
          currentSegment
        )
      ) {
        addedSegments.push(nextSegments[i]);
      }
    }
    return addedSegments;
  }

  update(newIndex) {
    this._index = newIndex._index;
  }

  getType() {
    return this._index.indexType || "";
  }
}

export default RepresentationIndex;
