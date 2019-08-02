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
import getInitSegment from "./get_init_segment";
import {
  createIndexURL,
  replaceSegmentDASHTokens,
} from "./tokens";

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
  presentationTimeOffset : number; // Time, in the timescale, at which the first
                                   // segment of the Period is declared.
                                   // This value should be substracted from the
                                   // media time to produce the presentation
                                   // time.
  startNumber? : number; // number from which the first segments in this index
                         // starts with
}

// `index` Argument for a SegmentTemplate RepresentationIndex
// All of the properties here are already defined in ITemplateIndex.
export interface ITemplateIndexIndexArgument {
  duration : number;
  timescale : number;

  indexRange?: [number, number];
  initialization?: { media? : string;
                     range? : [number, number]; };
  media? : string;
  presentationTimeOffset? : number;
  startNumber? : number;
}

// Aditional argument for a SegmentTemplate RepresentationIndex
export interface ITemplateIndexContextArgument {
  availabilityStartTime : number; // Time from which the content starts
                                  // i.e. The `0` time is at that timestamp
  clockOffset? : number; // If set, offset to add to `performance.now()`
                         // to obtain the current server's time, in milliseconds
  isDynamic : boolean; // if true, the MPD can be updated over time
  periodEnd : number|undefined; // End of the Period concerned by this
                                // RepresentationIndex, in seconds
  periodStart : number; // Start of the Period concerned by this
                        // RepresentationIndex, in seconds
  representationBaseURL : string; // Base URL for the Representation concerned
                                  // i.e. Common beginning of the URL
  representationBitrate? : number; // Bitrate of the Representation concerned
  representationId? : string; // ID of the Representation concerned
  timeShiftBufferDepth? : number; // Depth of the buffer for the whole content,
                                  // in seconds
  manifestReceivedTime? : number; // time (in terms of `performance.now`) at
                                   // which the Manifest file was received
}

/**
 * Get maximum timescaled position relatively to the start of the Period.
 * /!\ This number augments continuously and might not reflect exactly the real
 * server-side value. As segments are generated discretely.
 * @param {number|undefined} relativePeriodEnd - Period end relative to the
 * start of the Period, in the right timescale.
 * @param {number|undefined} liveEdgeOffset - Value we can add `performance.now`
 * converted in seconds to to obtain the edge of the live.
 * @returns {number}
 */
function getMaximumRelativePosition(
  relativePeriodEnd : number|undefined,
  liveEdgeOffset : number|undefined
) : number {
  if (relativePeriodEnd != null) {
    return relativePeriodEnd;
  }
  if (liveEdgeOffset != null) {
    return liveEdgeOffset + (performance.now() / 1000);
  }
  return Number.MAX_VALUE;
}

/**
 * IRepresentationIndex implementation for DASH' SegmentTemplate without a
 * SegmentTimeline.
 * @class TemplateRepresentationIndex
 */
export default class TemplateRepresentationIndex implements IRepresentationIndex {
  private _index : ITemplateIndex;
  private _periodStart : number;
  private _relativePeriodEnd? : number;
  private _liveEdgeOffset? : number;
  private _scaledBufferDepth? : number;

  // Whether this RepresentationIndex can change over time.
  private _isDynamic : boolean;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITemplateIndexIndexArgument,
    context : ITemplateIndexContextArgument
  ) {
    const { timescale } = index;
    const { availabilityStartTime,
            clockOffset,
            isDynamic,
            periodEnd,
            periodStart,
            representationBaseURL,
            representationId,
            representationBitrate,
            timeShiftBufferDepth } = context;

    this._scaledBufferDepth = timeShiftBufferDepth == null ?
      undefined :
      timeShiftBufferDepth * timescale;
    const presentationTimeOffset = index.presentationTimeOffset != null ?
                                     index.presentationTimeOffset :
                                     0;

    const scaledStart = periodStart * timescale;
    const indexTimeOffset = presentationTimeOffset - scaledStart;

    this._index = { duration: index.duration,
                    timescale,
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
    this._isDynamic = isDynamic;
    this._periodStart = periodStart;
    this._relativePeriodEnd = periodEnd == null ? undefined :
                                                periodEnd - periodStart;
    if (isDynamic && periodEnd == null) {
      if (clockOffset != null) {
        const perfOffset = (clockOffset / 1000) - availabilityStartTime;
        this._liveEdgeOffset = perfOffset - periodStart;
      } else {
        log.warn("DASH Parser: no clock synchronization mechanism found." +
                 " Setting a live gap of 10 seconds as a security.");
        const now = Date.now() - 10000;
        const maximumSegmentTimeInSec = now / 1000 - availabilityStartTime;
        const receivedTime = context.manifestReceivedTime == null ?
                               performance.now() :
                               context.manifestReceivedTime;
        const perfOffset =  maximumSegmentTimeInSec - (receivedTime / 1000);
        this._liveEdgeOffset = perfOffset - periodStart;
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
    const { duration,
            startNumber,
            timescale,
            mediaURL } = index;

    const scaledStart = this._periodStart * timescale;

    // Convert the asked position to the right timescales, and consider them
    // relatively to the Period's start.
    const upFromPeriodStart = fromTime * timescale - scaledStart;
    const toFromPeriodStart = (fromTime + dur) * timescale - scaledStart;
    const firstSegmentStart = this._getFirstSegmentStart();
    const lastSegmentStart = this._getLastSegmentStart();
    const startPosition = Math.max(firstSegmentStart, upFromPeriodStart);
    const lastWantedStartPosition = Math.min(lastSegmentStart, toFromPeriodStart);
    if (lastWantedStartPosition <= startPosition) {
      return [];
    }

    const segments : ISegment[] = [];

    // number corresponding to the Period's start
    const numberOffset = startNumber == null ? 1 :
                                               startNumber;

    // calcul initial time from Period start, where the first segment would have
    // the `0` number
    let numberIndexedToZero = Math.floor(startPosition / duration);

    for (let timeFromPeriodStart = numberIndexedToZero * duration;
         timeFromPeriodStart <= lastWantedStartPosition;
         timeFromPeriodStart += duration)
    {
      // To obtain the real number, adds the real number from the Period's start
      const realNumber = numberIndexedToZero + numberOffset;

      const realTime = timeFromPeriodStart + scaledStart;
      const manifestTime = timeFromPeriodStart + this._index.presentationTimeOffset;
      const realURL = replaceSegmentDASHTokens(mediaURL, manifestTime, realNumber);
      const args = { id: "" + realNumber,
                     number: realNumber,
                     time: realTime,
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
   * Returns first possible position in the index.
   * @returns {number}
   */
  getFirstPosition() : number {
    return (this._getFirstSegmentStart() / this._index.timescale) + this._periodStart;
  }

  /**
   * Returns last possible position in the index.
   * @returns {undefined}
   */
  getLastPosition() : number {
    const lastSegmentStart = this._getLastSegmentStart();
    const lastSegmentEnd = lastSegmentStart + this._index.duration;
    return (lastSegmentEnd / this._index.timescale) + this._periodStart;
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

  isSegmentStillAvailable(segment : ISegment) : boolean|undefined {
    if (segment.isInit) {
      return true;
    }
    if (segment.timescale !== this._index.timescale) {
      return undefined;
    }

    const { timescale } = segment;
    const timeRelativeToPeriodStart = segment.time - (this._periodStart * timescale);

    const firstSegmentStart = this._getFirstSegmentStart();
    if (timeRelativeToPeriodStart < firstSegmentStart) {
      return false;
    }

    const lastSegmentStart = this._getLastSegmentStart();
    if (timeRelativeToPeriodStart > lastSegmentStart ||
        segment.duration !== this._index.duration) {
      return false;
    }

    return (timeRelativeToPeriodStart / this._index.duration) % 1 === 0;
  }

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * @returns {Array}
   */
  _addSegments() : void {
    log.warn("Tried to add Segments to a template RepresentationIndex");
  }

  /**
   * @param {Object} newIndex
   */
  _update(newIndex : TemplateRepresentationIndex) : void {
    this._index = newIndex._index;
  }

  /**
   * Returns the timescaled start of the first segment that should be available,
   * relatively to the start of the Period.
   * @returns {number}
   */
  private _getFirstSegmentStart() : number {
    if (!this._isDynamic) {
      return 0; // it is the start of the Period
    }

    const { duration } = this._index;
    let scaledMinimum : number;

    if (this._scaledBufferDepth == null) {
      scaledMinimum = 0;
    } else {
      const lastSegmentStart = this._getLastSegmentStart();
      const lastSegmentEnd = lastSegmentStart + this._index.duration;
      scaledMinimum = Math.max(lastSegmentEnd - this._scaledBufferDepth,
                               0);
    }
    const numberIndexedToZero = Math.floor(scaledMinimum / duration);
    return numberIndexedToZero * duration;
  }

  /**
   * Returns the timescaled start of the last segment that should be available,
   * relatively to the start of the Period.
   * @returns {number}
   */
  private _getLastSegmentStart() : number {
    if (!this._isDynamic) {
      return (this._relativePeriodEnd || 0) * this._index.timescale;
    }
    const { duration, timescale } = this._index;
    const scaledMaxPosition = getMaximumRelativePosition(this._relativePeriodEnd,
                                                         this._liveEdgeOffset)
                              * timescale;
    const maxPossibleStart = Math.max(scaledMaxPosition - duration, 0);
    const numberIndexedToZero = Math.floor(maxPossibleStart / duration);
    return numberIndexedToZero * duration;
  }
}
