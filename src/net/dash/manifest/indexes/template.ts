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
import log from "../../../../utils/log";
import {
  getInitSegment,
  normalizeRange,
} from "./helpers";

export interface ITemplateIndex {
  indexType : "template";
  duration : number;
  indexRange?: [number, number];
  initialization: { media?: string; range?: [number, number] };
  media? : string;
  presentationTimeOffset? : number;
  startNumber? : number;
  timescale : number;
}

export default class TemplateRepresentationIndex implements IRepresentationIndex {
  private _index : ITemplateIndex;

  /**
   * @param {Object} index
   */
  constructor(index : ITemplateIndex) {
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
   * @param {Number} _up
   * @param {Number} _to
   * @returns {Array.<Object>}
   */
  getSegments(_up : number, _to : number) : ISegment[] {
    const index = this._index;
    const { up, to } = normalizeRange(index, _up, _to);
    if (to <= up) {
      return [];
    }

    const {
      duration,
      startNumber,
      timescale,
      media,
      presentationTimeOffset,
    } = index;

    const segments : ISegment[] = [];
    for (let baseTime = up; baseTime <= to; baseTime += duration) {
      const number = Math.floor(baseTime / duration) +
        (startNumber == null ? 1 : startNumber);

      const time = (number -
        (startNumber == null ? 1 : startNumber)
      ) * duration + (presentationTimeOffset || 0);

      const args = {
        id: "" + number,
        number,
        time,
        isInit: false,
        duration,
        timescale,
        media,
      };
      segments.push(args);
    }

    return segments;
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
   * We never have to refresh a SegmentTemplate-based manifest.
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
  _addSegments() : void {
    if (__DEV__) {
      log.warn("Tried to add Segments to a template RepresentationIndex");
    }
  }

  /**
   * @param {Object}
   */
  _update(
    newIndex : TemplateRepresentationIndex /* TODO @ index refacto */
  ) : void {
    this._index = newIndex._index;
  }
}
