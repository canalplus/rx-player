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

import log from "../../log";
import IRepresentationIndex, {
  ISegment,
} from "./interfaces";

export interface IStaticRepresentationIndexInfos {
  media: string;
  startTime: number;
  endTime: number;
}

/**
 * Simple RepresentationIndex implementation for static files.
 * @class StaticRepresentationIndex
 */
export default class StaticRepresentationIndex implements IRepresentationIndex {
  private readonly _media: string;
  private readonly _startTime: number;
  private readonly _endTime: number;

  /**
   * @param {Object} infos
   */
  constructor(infos : IStaticRepresentationIndexInfos) {
    this._media = infos.media;
    this._startTime = infos.startTime;
    this._endTime = infos.endTime;
  }

  /**
   * Static contents do not have any initialization segments.
   * Just return null.
   * @returns {null}
   */
  getInitSegment() : null {
    return null;
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
      time: this._startTime,
      duration: this._endTime - this._startTime,
      timescale: 1,
      mediaURL: this._media,
    }];
  }

  /**
   * Returns first position in index.
   * @returns {undefined}
   */
  getFirstPosition() : number {
    return this._startTime;
  }

  /**
   * Returns last position in index.
   * @returns {undefined}
   */
  getLastPosition() : number {
    return this._endTime;
  }

  /**
   * Returns false as a static file never need to be refreshed.
   * @returns {Boolean}
   */
  shouldRefresh() : false {
    return false;
  }

  /**
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  }

  _addSegments() : void {
    if (__DEV__) {
      log.warn("Tried add Segments to a static RepresentationIndex");
    }
  }

  _update() : void {
    log.warn("Tried to update a static RepresentationIndex");
  }
}
