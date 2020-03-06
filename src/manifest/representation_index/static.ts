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
} from "./types";

export interface IStaticRepresentationIndexInfos { media: string; }

/**
 * Simple RepresentationIndex implementation for static files.
 * @class StaticRepresentationIndex
 */
export default class StaticRepresentationIndex implements IRepresentationIndex {
  // URL of the content
  private readonly _mediaURLs: string;

  /**
   * @param {Object} infos
   */
  constructor(infos : IStaticRepresentationIndexInfos) {
    this._mediaURLs = infos.media;
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
    return [{ id: "0",
              isInit: false,
              number: 0,
              time: 0,
              duration: Number.MAX_VALUE,
              timescale: 1,
              mediaURLs: [this._mediaURLs] }];
  }

  /**
   * Returns first position in index.
   * @returns {undefined}
   */
  getFirstPosition() : undefined {
    return ;
    /* tslint:enable return-undefined */
  }

  /**
   * Returns last position in index.
   * @returns {undefined}
   */
  getLastPosition() : undefined {
    return ;
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

  /**
   * Returns true as a static file should never need lose availability.
   * @returns {Boolean}
   */
  isSegmentStillAvailable() : true {
    return true;
  }

  /**
   * @returns {Boolean}
   */
  canBeOutOfSyncError() : false {
    return false;
  }

  /**
   * @returns {Boolean}
   */
  isFinished() : true {
    return true;
  }

  _addSegments() : void {
    log.warn("Tried add Segments to a static RepresentationIndex");
  }

  _replace() : void {
    log.warn("Tried to replace a static RepresentationIndex");
  }

  _update() : void {
    log.warn("Tried to update a static RepresentationIndex");
  }
}
