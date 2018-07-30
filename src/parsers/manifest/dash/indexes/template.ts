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

import log from "../../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../../manifest";
import {
  createIndexURL,
  replaceSegmentDASHTokens,
} from "../helpers";
import {
  getInitSegment,
  getTimescaledRange,
} from "./helpers";

export interface ITemplateIndex {
  duration : number;
  timescale : number;

  indexRange?: [number, number];
  initialization?: { mediaURL: string; range?: [number, number] };
  mediaURL : string;
  presentationTimeOffset? : number;
  startNumber? : number;
}

export interface ITemplateIndexIndexArgument {
  duration : number;
  timescale : number;

  indexRange?: [number, number];
  initialization?: { media? : string; range? : [number, number] };
  media? : string;
  presentationTimeOffset? : number;
  startNumber? : number;
}

export interface ITemplateIndexContextArgument {
  periodStart : number;
  representationURL : string;
  representationId? : string;
  representationBitrate? : number;
}

export default class TemplateRepresentationIndex implements IRepresentationIndex {
  protected _manifestTimeOffset : number;
  private _index : ITemplateIndex;
  private _periodStart : number;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITemplateIndexIndexArgument,
    context : ITemplateIndexContextArgument
  ) {
    const {
      periodStart,
      representationURL,
      representationId,
      representationBitrate,
    } = context;

    this._periodStart = periodStart;
    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;
    this._manifestTimeOffset =
      presentationTimeOffset - periodStart * index.timescale;

    this._index = {
      duration: index.duration,
      timescale: index.timescale,
      indexRange: index.indexRange,
      initialization: index.initialization && {
        mediaURL: createIndexURL(
          representationURL,
          index.initialization.media,
          representationId,
          representationBitrate
        ),
        range: index.initialization.range,
      },
      mediaURL: createIndexURL(
        representationURL,
        index.media,
        representationId,
        representationBitrate
      ),
      presentationTimeOffset,
      startNumber: index.startNumber,
    };
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index);
  }

  /**
   * @param {Number} fromTime
   * @param {Number} dur
   * @returns {Array.<Object>}
   */
  getSegments(fromTime : number, dur : number) : ISegment[] {
    const index = this._index;
    const { up, to } = getTimescaledRange(index, fromTime, dur);
    if (to <= up) {
      return [];
    }

    const {
      duration,
      startNumber,
      timescale,
      mediaURL,
    } = index;

    const segments : ISegment[] = [];
    for (let baseTime = up; baseTime <= to; baseTime += duration) {

      const periodRelativeStart = baseTime - (this._periodStart * timescale);
      const baseNumber = Math.floor((periodRelativeStart / duration));
      const number = baseNumber + (startNumber == null ? 1 : startNumber);

      const manifestTime = (baseNumber * duration) +
        (this._index.presentationTimeOffset || 0);
      const presentationTime = baseNumber * duration +
        this._periodStart * this._index.timescale;

      const args = {
        id: "" + number,
        number,
        time: presentationTime,
        isInit: false,
        duration,
        timescale,
        mediaURL: replaceSegmentDASHTokens(mediaURL, manifestTime, number),
        timestampOffset: -(this._manifestTimeOffset / timescale),
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
   * @param {Object} newIndex
   */
  _update(
    newIndex : TemplateRepresentationIndex /* TODO @ index refacto */
  ) : void {
    this._index = newIndex._index;
  }
}
