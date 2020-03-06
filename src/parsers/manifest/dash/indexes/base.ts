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
  fromIndexTime,
  getIndexSegmentEnd,
  IIndexSegment,
  toIndexTime,
} from "../../utils/index_helpers";
import getInitSegment from "./get_init_segment";
import getSegmentsFromTimeline from "./get_segments_from_timeline";
import { createIndexURLs } from "./tokens";

// index property defined for a SegmentBase RepresentationIndex
export interface IBaseIndex {
  indexRange?: [number, number]; // byte range for a possible index of segments
                                 // in the server
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
  initialization? : { // information on the initialization segment
    mediaURLs: string[] | null; // URLs to access the initialization segment
    range?: [number, number]; // possible byte range to request it
  };
  mediaURLs : string[] | null; // base URLs to access any segment. Can contain token to
                              // replace to convert it to a real URL
  startNumber? : number; // number from which the first segments in this index
                         // starts with
  timeline : IIndexSegment[]; // Every segments defined in this index
  timescale : number; // timescale to convert a time given here into seconds.
                      // This is done by this simple operation:
                      // ``timeInSeconds = timeInIndex * timescale``
}

// `index` Argument for a SegmentBase RepresentationIndex
// Most of the properties here are already defined in IBaseIndex.
export interface IBaseIndexIndexArgument {
  timeline : IIndexSegment[];
  timescale : number;
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
  periodEnd : number|undefined; // End of the period concerned by this
                                // RepresentationIndex, in seconds
  representationBaseURLs : string[]; // Base URLs for the Representation concerned
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
  segmentInfos : { time : number;
                   duration : number;
                   timescale : number;
                   count?: number;
                   range?: [number, number]; }
) : boolean {
  if (segmentInfos.timescale !== index.timescale) {
    const { timescale } = index;
    index.timeline.push({ start: (segmentInfos.time / segmentInfos.timescale)
                                 * timescale,
                          duration: (segmentInfos.duration / segmentInfos.timescale)
                                    * timescale,
                          repeatCount: segmentInfos.count === undefined ?
                            0 :
                            segmentInfos.count,
                          range: segmentInfos.range });
  } else {
    index.timeline.push({ start: segmentInfos.time,
                          duration: segmentInfos.duration,
                          repeatCount: segmentInfos.count === undefined ?
                            0 :
                            segmentInfos.count,
                          range: segmentInfos.range });
  }
  return true;
}

/**
 * Provide helpers for SegmentBase-based indexes.
 * @type {Object}
 */
export default class BaseRepresentationIndex implements IRepresentationIndex {
  private _index : IBaseIndex;

  // absolute end of the period, timescaled and converted to index time
  private _scaledPeriodEnd : number | undefined;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(index : IBaseIndexIndexArgument, context : IBaseIndexContextArgument) {
    const { periodStart,
            periodEnd,
            representationBaseURLs,
            representationId,
            representationBitrate } = context;
    const { timescale } = index;

    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;

    const indexTimeOffset = presentationTimeOffset - periodStart * timescale;

    const mediaURLs = createIndexURLs(representationBaseURLs,
                                     index.initialization !== undefined ?
                                       index.initialization.media :
                                       undefined,
                                    representationId,
                                    representationBitrate);

    // TODO If indexRange is either undefined or behind the initialization segment
    // the following logic will not work.
    // However taking the nth first bytes like `dash.js` does (where n = 1500) is
    // not straightforward as we would need to clean-up the segment after that.
    // The following logic corresponds to 100% of tested cases, so good enough for
    // now.
    const range : [number, number] | undefined =
      index.initialization !== undefined ? index.initialization.range :
      index.indexRange !== undefined ? [0, index.indexRange[0] - 1] :
                                       undefined;

    this._index = { indexRange: index.indexRange,
                    indexTimeOffset,
                    initialization: { mediaURLs, range },
                    mediaURLs: createIndexURLs(representationBaseURLs,
                                               index.media,
                                               representationId,
                                               representationBitrate),
                    startNumber: index.startNumber,
                    timeline: index.timeline,
                    timescale };
    this._scaledPeriodEnd = periodEnd == null ? undefined :
                                                toIndexTime(periodEnd, this._index);
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
    return getSegmentsFromTimeline(this._index, _up, _to, this._scaledPeriodEnd);
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
   * @returns {Number|null}
   */
  getFirstPosition() : number|null {
    const index = this._index;
    if (index.timeline.length === 0) {
      return null;
    }
    return fromIndexTime(index.timeline[0].start, index);
  }

  /**
   * Returns last position in index.
   * @returns {Number|null}
   */
  getLastPosition() : number|null {
    const { timeline } = this._index;
    if (timeline.length === 0) {
      return null;
    }
    const lastTimelineElement = timeline[timeline.length - 1];
    const lastTime = getIndexSegmentEnd(lastTimelineElement,
                                        null,
                                        this._scaledPeriodEnd);
    return fromIndexTime(lastTime, this._index);
  }

  /**
   * Segments in a segmentBase scheme should stay available.
   * @returns {Boolean|undefined}
   */
  isSegmentStillAvailable() : true {
    return true;
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
  _addSegments(nextSegments : Array<{ time : number;
                                      duration : number;
                                      timescale : number;
                                      count? : number;
                                      range? : [number, number]; }>
  ) : void {
    for (let i = 0; i < nextSegments.length; i++) {
      _addSegmentInfos(this._index, nextSegments[i]);
    }
  }

  /**
   * SegmentBase should not be updated.
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

  /**
   * @param {Object} newIndex
   */
  _replace(newIndex : BaseRepresentationIndex) : void {
    this._index = newIndex._index;
  }

  _update() : void {
    log.error("Base RepresentationIndex: Cannot update a SegmentList");
  }
}
