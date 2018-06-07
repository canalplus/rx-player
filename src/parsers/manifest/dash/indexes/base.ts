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
import { createIndexURL } from "../helpers";
import {
  getInitSegment,
  getSegmentsFromTimeline,
  getTimelineRangeEnd,
  IIndexSegment,
} from "./helpers";

export interface IBaseIndex {
  mediaURL : string;
  timeline : IIndexSegment[];
  timescale : number;
  // indexRangeExact : boolean;
  // availabilityTimeComplete : boolean;

  duration? : number;
  indexRange?: [number, number];
  initialization?: { mediaURL: string; range?: [number, number] };
  presentationTimeOffset? : number;
  startNumber? : number;
}

// Parsed Index in the MPD
export interface IBaseIndexIndexArgument {
  timeline : IIndexSegment[];
  timescale : number;
  duration? : number;
  media? : string;
  indexRange?: [number, number];
  initialization?: { media?: string; range?: [number, number] };
  presentationTimeOffset? : number;
  startNumber? : number;
}

// Context of the index
export interface IBaseIndexContextArgument {
  periodStart : number;
  representationURL : string;
  representationId? : string;
  representationBitrate? : number;
}

/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} segmentInfos
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(
  index : IBaseIndex,
  segmentInfos : {
    time : number;
    duration : number;
    timescale : number;
    count?: number;
    range?: [number, number];
  }
) : boolean {
  if (segmentInfos.timescale !== index.timescale) {
    const { timescale } = index;
    index.timeline.push({
      ts: (segmentInfos.time / segmentInfos.timescale) * timescale,
      d: (segmentInfos.duration / segmentInfos.timescale) * timescale,
      r: segmentInfos.count || 0,
      range: segmentInfos.range,
    });
  } else {
    index.timeline.push({
      ts: segmentInfos.time,
      d: segmentInfos.duration,
      r: segmentInfos.count || 0,
      range: segmentInfos.range,
    });
  }
  return true;
}

/**
 * Provide helpers for SegmentBase-based indexes.
 * @type {Object}
 * TODO weird that everything is inherited from Timeline...
 * Reimplement from scratch
 */
export default class BaseRepresentationIndex implements IRepresentationIndex {
  private _index : IBaseIndex;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(index : IBaseIndexIndexArgument, context : IBaseIndexContextArgument) {
    const {
      periodStart,
      representationURL,
      representationId,
      representationBitrate,
    } = context;
    if (index.presentationTimeOffset == null) {
      index.presentationTimeOffset = periodStart * index.timescale;
    }

    this._index = {
      mediaURL: createIndexURL(
        representationURL,
        index.media,
        representationId,
        representationBitrate
      ),
      timeline: index.timeline,
      timescale: index.timescale,
      duration: index.duration,
      indexRange: index.indexRange,
      presentationTimeOffset: index.presentationTimeOffset,
      startNumber: index.startNumber,
      initialization: index.initialization && {
        mediaURL: createIndexURL(
          representationURL,
          index.initialization.media,
          representationId,
          representationBitrate
        ),
        range: index.initialization.range,
      },
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
   * @param {Number} _up
   * @param {Number} _to
   * @returns {Array.<Object>}
   */
  getSegments(_up : number, _to : number) : ISegment[] {
    return getSegmentsFromTimeline(this._index, _up, _to);
  }

  /**
   * Returns false as no Segment-Base based index should need to be refreshed.
   * @returns {Boolean}
   */
  shouldRefresh() : false {
    return false;
  }

  /**
   * Returns first position in index.
   * @returns {Number|undefined}
   */
  getFirstPosition() : number|undefined {
    const index = this._index;
    if (!index.timeline.length) {
      return undefined;
    }
    return index.timeline[0].ts / index.timescale;
  }

  /**
   * Returns last position in index.
   * @returns {Number|undefined}
   */
  getLastPosition() : number|undefined {
    const index = this._index;
    if (!index.timeline.length) {
      return undefined;
    }
    const lastTimelineElement = index.timeline[index.timeline.length - 1];
    return (getTimelineRangeEnd(lastTimelineElement) / index.timescale);
  }

  /**
   * We do not check for discontinuity in SegmentBase-based indexes.
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  }

  /**
   * @param {Array.<Object>} nextSegments
   * @returns {Array.<Object>}
   */
  _addSegments(nextSegments : Array<{
    time : number;
    duration : number;
    timescale : number;
    count? : number;
    range? : [number, number];
  }>) : void {
    for (let i = 0; i < nextSegments.length; i++) {
      _addSegmentInfos(this._index, nextSegments[i]);
    }
  }

  /**
   * @param {Object} newIndex
   */
  _update(
    newIndex : BaseRepresentationIndex /* TODO @ index refacto */
  ) : void {
    this._index = newIndex._index;
  }
}
