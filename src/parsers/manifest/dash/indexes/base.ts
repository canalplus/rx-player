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
  fromIndexTime,
  getInitSegment,
  getSegmentsFromTimeline,
  getTimelineItemRangeStart,
  IIndexSegment,
} from "./helpers";

// index property defined for a SegmentBase RepresentationIndex
export interface IBaseIndex {
  mediaURL : string; // base URL to access any segment. Can contain token to
                     // replace to convert it to a real URL
  timeline : IIndexSegment[]; // Every segments defined in this index
  timescale : number; // timescale to convert a time given here into seconds.
                      // This is done by this simple operation:
                      // ``timeInSeconds = timeInIndex * timescale``
  indexTimeOffset : number; // Temporal offset, in the current timescale (see
                            // timescale), to add to the presentation time
                            // (time a segment has at decoding time) to
                            // obtain the corresponding media time (original
                            // time of the media segment in the index and on
                            // the media file).
                            // For example, to look for a segment beginning at
                            // a second `T` on a HTMLMediaElement, we
                            // actually will look for a segment in the index
                            // beginning at:
                            // ``` T * timescale + indexTimeOffset ```

  duration? : number; // duration of each element in the timeline, in the
                      // timescale given (see timescale and timeline)
  indexRange?: [number, number]; // byte range for a possible index of segments
                                 // in the server
  initialization? : { // informations on the initialization segment
    mediaURL: string; // URL to access the initialization segment
    range?: [number, number]; // possible byte range to request it
  };
  startNumber? : number; // number from which the first segments in this index
                         // starts with
}

// `index` Argument for a SegmentBase RepresentationIndex
// Most of the properties here are already defined in IBaseIndex.
export interface IBaseIndexIndexArgument {
  timeline : IIndexSegment[];
  timescale : number;
  duration? : number;
  media? : string;
  indexRange?: [number, number];
  initialization?: { media?: string; range?: [number, number] };
  startNumber? : number;
  presentationTimeOffset? : number; // Offset present in the index to convert
                                    // from the mediaTime (time declared in the
                                    // media segments and in this index) to the
                                    // presentationTime (time wanted when
                                    // decoding the segment).
                                    // Basically by doing something along the
                                    // line of:
                                    // ```
                                    // presentationTimeInSeconds =
                                    //   mediaTimeInSeconds -
                                    //   presentationTimeOffsetInSeconds *
                                    //   periodStartInSeconds
                                    // ```
                                    // The time given here is in the current
                                    // timescale (see timescale)
}

// Aditional argument for a SegmentBase RepresentationIndex
export interface IBaseIndexContextArgument {
  periodStart : number; // Start of the period concerned by this
                        // RepresentationIndex, in seconds
  representationURL : string; // Base URL for the Representation concerned
  representationId? : string; // ID of the Representation concerned
  representationBitrate? : number; // Bitrate of the Representation concerned
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
      start: (segmentInfos.time / segmentInfos.timescale) * timescale,
      d: (segmentInfos.duration / segmentInfos.timescale) * timescale,
      r: segmentInfos.count || 0,
      range: segmentInfos.range,
    });
  } else {
    index.timeline.push({
      start: segmentInfos.time,
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

    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;

    const indexTimeOffset =
      presentationTimeOffset - periodStart * index.timescale;

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
      indexTimeOffset,
      indexRange: index.indexRange,
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
    return fromIndexTime(index, index.timeline[0].start);
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
    return fromIndexTime(index, getTimelineItemRangeStart(lastTimelineElement));
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
