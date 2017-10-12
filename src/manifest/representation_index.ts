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

import getRightIndexHelpers from "./indexes/index";
import Segment from "./segment";

interface IRepresentationIndexArguments {
  index : any; // TODO @ index refacto
  rootId : string|number;
}

class RepresentationIndex {
  private _index : any; // TODO @ index refacto
  private _rootId : any; // TODO @ index refacto
  private _indexHelpers : any; // TODO @ index refacto

  /**
   * @constructor
   * @param {Object} args
   * @param {Object} args.index
   * @param {string|Number} args.rootId
   */
  constructor(args : IRepresentationIndexArguments) {
    this._index = args.index;
    this._rootId = args.rootId;
    this._indexHelpers = getRightIndexHelpers(this._index);
  }

  getInitSegment() : Segment {
    return this._indexHelpers.getInitSegment(this._rootId, this._index);
  }

  getSegments(up : number, duration : number) : Segment[] {
    return this._indexHelpers.getSegments(
      this._rootId,
      this._index,
      up,
      duration
    );
  }

  shouldRefresh(time : number, up : number, to : number) : boolean {
    return this._indexHelpers.shouldRefresh(this._index, time, up, to);
  }

  getFirstPosition() : number|undefined {
    return this._indexHelpers.getFirstPosition(this._index);
  }

  getLastPosition() : number|undefined {
    return this._indexHelpers.getLastPosition(this._index);
  }

  checkDiscontinuity(time : number) : number {
    return this._indexHelpers.checkDiscontinuity(this._index, time);
  }

  /**
   * Returns time given scaled into seconds.
   * @param {Number} time
   * @returns {Number}
   */
  scale(time : number) : number {
    return this._indexHelpers.scale(this._index, time);
  }

  /**
   * Update the timescale used (for all segments).
   * @param {Number} timescale
   */
  setTimescale(timescale : number) : any /* TODO @ index refacto */ {
    return this._indexHelpers.setTimescale(this._index, timescale);
  }

  _addSegments(
    nextSegments : Array<{
      duration : number,
      time : number,
      timescale : number
    }>,
    currentSegment : { duration : number, time : number, timescale : number}
  ) : any /* XXX TODO */ {
    const addedSegments : any[] = [];
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

  update(newIndex : any /* TODO @ index refacto */) : void {
    this._index = newIndex._index;
  }

  getType() : string {
    return this._index.indexType || "";
  }
}

export default RepresentationIndex;
