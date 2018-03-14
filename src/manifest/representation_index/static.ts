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

import log from "../../utils/log";
import IRepresentationIndex, {
  ISegment,
} from "./interfaces";

interface IStaticIndex {
  media: string;
}

/**
 * Simple RepresentationIndex implementation for static files.
 * @class StaticRepresentationIndex
 */
export default class StaticRepresentationIndex implements IRepresentationIndex {
  private _index: IStaticIndex;

  constructor(index: IStaticIndex) {
    this._index = index;
  }

  /**
   * @returns {Object}
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
      time: 0,
      duration: Number.MAX_VALUE,
      timescale: 1,
      media: this._index.media,
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
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  }

  /**
   * @returns {Array}
   */
  _addSegments() : void {
    if (__DEV__) {
      log.warn("Tried add Segments to a static RepresentationIndex");
    }
  }

  _update() : void {
    log.warn("Tried to update a static RepresentationIndex");
  }
}
