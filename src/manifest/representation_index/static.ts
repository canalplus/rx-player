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

import IRepresentationIndex, {
  ISegment,
  ISegmentPrivateInfos,
} from "./interfaces";

/**
 * Simple RepresentationIndex implementation for static files.
 * @class StaticRepresentationIndex
 */
export default class StaticRepresentationIndex<
  T extends ISegmentPrivateInfos
> implements IRepresentationIndex {
  private _privateInfos? : T;

  /**
   * Create a new index, with additional privateInfos.
   * @param {*} privateInfos
   */
  constructor(privateInfos? : T) {
    this._privateInfos = privateInfos;
  }

  /**
   * @returns {Object}
   * TODO getInitSegment should probably return null instead when no init
   * Segment exists.
   */
  getInitSegment() : ISegment {
    return {
      id: "init",
      isInit: true,
      time: 0,
      timescale: 1,
      privateInfos: this._privateInfos,
    };
  }

  /**
   * Convert a time from a generated Segment to seconds.
   * @param {Number} time
   * @returns {Number}
   */
  scale(time : number) : number {
    return time;
  }

  /**
   * Returns the only Segment available here.
   * @returns {Array.<Object>}
   */
  getSegments() : ISegment[] {
    return [{
      id: "0",
      isInit: false,
      number: 0,
      time: 0,
      duration: Number.MAX_VALUE,
      timescale: 1,
      privateInfos: this._privateInfos,
    }];
  }

  /**
   * Returns first position in index.
   * @returns {undefined}
   */
  getFirstPosition() : undefined {
    // TODO tslint bug? Document.
    /* tslint:disable return-undefined */
    return undefined;
    /* tslint:enable return-undefined */
  }

  /**
   * Returns last position in index.
   * @returns {undefined}
   */
  getLastPosition() : undefined {
    // TODO tslint bug? Document.
    /* tslint:disable return-undefined */
    return undefined;
    /* tslint:enable return-undefined */
  }

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * @returns {Boolean}
   */
  shouldRefresh() : false {
    return false;
  }

  /**
   * We cannot check for discontinuity in SegmentTemplate-based indexes.
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  }

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * @returns {Array}
   */
  _addSegments() : never[] {
    if (__DEV__) {
      throw new Error("Cannot add Segments to a static RepresentationIndex");
    }
    return [];
  }

  update() : void {
    if (__DEV__) {
      throw new Error("Cannot update a static RepresentationIndex");
    }
    return;
  }

  getType() : string { // TODO Remove
    return "manual";
  }
}
