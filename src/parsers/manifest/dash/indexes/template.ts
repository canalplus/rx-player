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
  getInitSegment,
  getTimescaledRange,
  replaceSegmentDASHTokens,
} from "./helpers";

// index property defined for a SegmentTemplate RepresentationIndex
export interface ITemplateIndex {
  duration : number; // duration of each element in the timeline, in the
                     // timescale given (see timescale and timeline)
  timescale : number; // timescale to convert a time given here into seconds.
                      // This is done by this simple operation:
                      // ``timeInSeconds = timeInIndex * timescale``

  indexRange?: [number, number]; // byte range for a possible index of segments
                                 // in the server
  initialization?: { // informations on the initialization segment
    mediaURL: string; // URL to access the initialization segment
    range?: [number, number]; // possible byte range to request it
  };
  mediaURL : string; // base URL to access any segment. Can contain token to
                     // replace to convert it to a real URL
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
                                    // The time given here is in the timescale
                                    // given (see timescale)
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
  startNumber? : number; // number from which the first segments in this index
                         // starts with
}

// `index` Argument for a SegmentTemplate RepresentationIndex
// All of the properties here are already defined in ITemplateIndex.
export interface ITemplateIndexIndexArgument {
  duration : number;
  timescale : number;

  indexRange?: [number, number];
  initialization?: { media? : string; range? : [number, number] };
  media? : string;
  presentationTimeOffset? : number;
  startNumber? : number;
}

// Aditional argument for a SegmentTemplate RepresentationIndex
export interface ITemplateIndexContextArgument {
  availabilityStartTime : number; // Time from which the content starts
  clockOffset? : number; // If set, offset to add to `performance.now()`
                         // to obtain the current server's time
  isDynamic : boolean; // if true, the MPD can update over time
  periodStart : number; // Start of the period concerned by this
                        // RepresentationIndex, in seconds
  periodEnd : number|undefined; // End of the period concerned by this
                                // RepresentationIndex, in seconds
  representationBaseURL : string; // Base URL for the Representation concerned
  representationId? : string; // ID of the Representation concerned
  representationBitrate? : number; // Bitrate of the Representation concerned
}

/**
 * Get maximum timescaled position from this point in time.
 * @param {number|undefined} periodEnd
 * @param {number|undefined} liveEdgeOffset
 * @returns {number}
 */
function getMaximumPosition(
  periodEnd : number|undefined,
  liveEdgeOffset : number|undefined,
  timescale : number
) : number {
  if (periodEnd != null) {
    return periodEnd * timescale;
  }
  if (liveEdgeOffset != null) {
    return performance.now() + liveEdgeOffset;
  }
  return Number.MAX_VALUE;
}

export default class TemplateRepresentationIndex implements IRepresentationIndex {
  private _index : ITemplateIndex;
  private _periodStart : number;
  private _periodEnd? : number;
  private _liveEdgeOffset? : number;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITemplateIndexIndexArgument,
    context : ITemplateIndexContextArgument
  ) {
    const { availabilityStartTime,
            clockOffset,
            isDynamic,
            periodEnd,
            periodStart,
            representationBaseURL,
            representationId,
            representationBitrate } = context;

    this._periodStart = periodStart;
    this._periodEnd = periodEnd;
    const presentationTimeOffset = index.presentationTimeOffset != null ?
                                     index.presentationTimeOffset :
                                     0;
    const indexTimeOffset = presentationTimeOffset - periodStart * index.timescale;

    this._index = { duration: index.duration,
                    timescale: index.timescale,
                    indexRange: index.indexRange,
                    indexTimeOffset,
                    initialization: index.initialization && {
                      mediaURL: createIndexURL(representationBaseURL,
                                               index.initialization.media,
                                               representationId,
                                               representationBitrate),
                      range: index.initialization.range,
                    },
                    mediaURL: createIndexURL(representationBaseURL,
                                             index.media,
                                             representationId,
                                             representationBitrate),
                    presentationTimeOffset,
                    startNumber: index.startNumber };

    if (isDynamic && periodEnd == null) {
      if (clockOffset != null) {
        this._liveEdgeOffset = clockOffset - availabilityStartTime;
      } else {
        log.warn("DASH Parser: no clock synchronization mechanism found." +
                 " Setting a live gap of 10 seconds as a security.");
        const now = Date.now() - 10000;
        const maximumSegmentTime = now / 1000 - availabilityStartTime;
        this._liveEdgeOffset = maximumSegmentTime - performance.now();
      }
    }
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
    const { duration, startNumber, timescale, mediaURL } = index;
    const { up, to } = getTimescaledRange(index, fromTime, dur);
    const scaledMaxPosition = getMaximumPosition(this._periodEnd,
                                                 this._liveEdgeOffset,
                                                 timescale);
    const endPosition = Math.min(scaledMaxPosition, to);
    if (endPosition <= up) {
      return [];
    }

    const segments : ISegment[] = [];
    const scaledStart = this._periodStart * this._index.timescale;

    const relativeStart = up - scaledStart;
    const numberOffset = startNumber == null ? 1 :
                                               startNumber;
    let numberIndexedToZero = Math.floor(relativeStart / duration);

    for (let presentationTime = numberIndexedToZero * duration + scaledStart;
         presentationTime < endPosition;
         presentationTime += duration)
    {
      const manifestTime = numberIndexedToZero * duration +
                           (this._index.presentationTimeOffset || 0);

      const realNumber = numberIndexedToZero + numberOffset;
      const realURL = replaceSegmentDASHTokens(mediaURL, manifestTime, realNumber);
      const args = { id: "" + realNumber,
                     number: realNumber,
                     time: presentationTime,
                     isInit: false,
                     duration,
                     timescale,
                     mediaURL: realURL,
                     timestampOffset: -(index.indexTimeOffset / timescale) };
      segments.push(args);
      numberIndexedToZero++;
    }

    return segments;
  }

  /**
   * Returns first position in index.
   * @returns {undefined}
   */
  getFirstPosition() : undefined {
    return ;
  }

  /**
   * Returns last position in index.
   * @returns {undefined}
   */
  getLastPosition() : undefined {
    return ;
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
  _update(newIndex : TemplateRepresentationIndex) : void {
    this._index = newIndex._index;
  }
}
