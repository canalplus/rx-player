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

import config from "../../../../config";
import log from "../../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../../manifest";
import ManifestBoundsCalculator from "../manifest_bounds_calculator";
import getInitSegment from "./get_init_segment";
import {
  createIndexURL,
  replaceSegmentDASHTokens,
} from "./tokens";

const { MINIMUM_SEGMENT_SIZE } = config;

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
  aggressiveMode : boolean; // If `true`, this index will return segments which
                            // which had time to be started but not finished.
                            // This is at the basis of Low-latency contents via
                            // Chunk encoding
  availabilityStartTime : number; // Time from which the content starts
                                  // i.e. The `0` time is at that timestamp
  manifestBoundsCalculator : ManifestBoundsCalculator; // Allows to obtain the
                                                       // minimum and maximum
                                                       // of a content
  clockOffset? : number; // If set, offset to add to `performance.now()`
                         // to obtain the current server's time, in milliseconds
  isDynamic : boolean; // if true, the MPD can be updated over time
  manifestReceivedTime? : number; // time (in terms of `performance.now`) at
                                   // which the Manifest file was received
  periodEnd : number|undefined; // End of the Period concerned by this
                                // RepresentationIndex, in seconds
  periodStart : number; // Start of the Period concerned by this
                        // RepresentationIndex, in seconds
  representationBaseURL : string; // Base URL for the Representation concerned
                                  // i.e. Common beginning of the URL
  representationBitrate? : number; // Bitrate of the Representation concerned
  representationId? : string; // ID of the Representation concerned
}

/**
 * IRepresentationIndex implementation for DASH' SegmentTemplate without a
 * SegmentTimeline.
 * @class TemplateRepresentationIndex
 */
export default class TemplateRepresentationIndex implements IRepresentationIndex {
  private _aggressiveMode : boolean;
  private _index : ITemplateIndex;
  private _liveEdgeOffset? : number;
  private _manifestBoundsCalculator : ManifestBoundsCalculator;
  private _periodStart : number;
  private _relativePeriodEnd? : number;

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
    const { aggressiveMode,
            availabilityStartTime,
            manifestBoundsCalculator,
            clockOffset,
            isDynamic,
            periodEnd,
            periodStart,
            representationBaseURL,
            representationId,
            representationBitrate } = context;

    this._manifestBoundsCalculator = manifestBoundsCalculator;
    this._aggressiveMode = aggressiveMode;
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
        const securityLiveGap = this._aggressiveMode ? 0 :
                                                       10;
        log.warn("DASH Parser: no clock synchronization mechanism found." +
                 (securityLiveGap > 0) ?
                   ` Setting a live gap of ${securityLiveGap} seconds as a security.` :
                   "");
        const now = Date.now() - securityLiveGap * 1000;
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
    const scaledEnd = this._relativePeriodEnd == null ?
      undefined :
      this._relativePeriodEnd * timescale;

    // Convert the asked position to the right timescales, and consider them
    // relatively to the Period's start.
    const upFromPeriodStart = fromTime * timescale - scaledStart;
    const toFromPeriodStart = (fromTime + dur) * timescale - scaledStart;
    const firstSegmentStart = this._getFirstSegmentStart();
    const lastSegmentStart = this._getLastSegmentStart();
    if (firstSegmentStart == null || lastSegmentStart == null) {
      return [];
    }
    const startPosition = Math.max(firstSegmentStart, upFromPeriodStart);
    const lastWantedStartPosition = Math.min(lastSegmentStart, toFromPeriodStart);
    if ((lastWantedStartPosition + duration) <= startPosition) {
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

      const realDuration = scaledEnd != null &&
                           timeFromPeriodStart + duration > scaledEnd ?
                             scaledEnd - timeFromPeriodStart :
                             duration;
      const realTime = timeFromPeriodStart + scaledStart;
      const manifestTime = timeFromPeriodStart + this._index.presentationTimeOffset;
      const realURL = replaceSegmentDASHTokens(mediaURL, manifestTime, realNumber);
      const args = { id: "" + realNumber,
                     number: realNumber,
                     time: realTime,
                     isInit: false,
                     duration: realDuration,
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
   * @returns {number|null|undefined}
   */
  getFirstPosition() : number | null | undefined {
    const firstSegmentStart = this._getFirstSegmentStart();
    if (firstSegmentStart == null) {
      return firstSegmentStart; // return undefined or null
    }
    return (firstSegmentStart / this._index.timescale) + this._periodStart;
  }

  /**
   * Returns last possible position in the index.
   * @returns {number|null}
   */
  getLastPosition() : number|null|undefined {
    const lastSegmentStart = this._getLastSegmentStart();
    if (lastSegmentStart == null) {
      // In that case (null or undefined), getLastPosition should reflect
      // the result of getLastSegmentStart, as the meaning is the same for
      // the two functions. So, we return the result of the latter.
      return lastSegmentStart;
    }
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
    const lastSegmentStart = this._getLastSegmentStart();
    if (firstSegmentStart === undefined || lastSegmentStart === undefined) {
      return undefined;
    }
    if (firstSegmentStart === null || lastSegmentStart === null) {
      return false;
    }
    if (timeRelativeToPeriodStart < firstSegmentStart) {
      return false;
    }
    if (timeRelativeToPeriodStart > lastSegmentStart ||
        segment.duration !== this._index.duration) {
      return false;
    }

    return (timeRelativeToPeriodStart / this._index.duration) % 1 === 0;
  }

  /**
   * SegmentTemplate without a SegmentTimeline should not be updated.
   * @returns {Boolean}
   */
  canBeOutOfSyncError() : false {
    return false;
  }

  /**
   * @returns {Boolean}
   */
  isFinished() : boolean {
    if (!this._isDynamic) {
      return true;
    }
    if (this._relativePeriodEnd == null) {
      return false;
    }

    const { timescale } = this._index;
    const lastSegmentStart = this._getLastSegmentStart();

    // As last segment start is null if live time is before
    // current period, consider the index not to be finished.
    if (lastSegmentStart == null) {
      return false;
    }
    const lastSegmentEnd = lastSegmentStart + this._index.duration;

    // (1 / 60 for possible rounding errors)
    const roundingError = (1 / 60) * timescale;
    return (lastSegmentEnd + roundingError) >=
           (this._relativePeriodEnd * timescale);
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
   * @returns {number | null | undefined}
   */
  private _getFirstSegmentStart() : number | null | undefined {
    if (!this._isDynamic) {
      return 0; // it is the start of the Period
    }

    // 1 - check that this index is already available
    if (!this._relativePeriodEnd && this._liveEdgeOffset != null) {
      // /!\ The scaled max position augments continuously and might not
      // reflect exactly the real server-side value. As segments are
      // generated discretely.
      const scaledMaxPosition = this._liveEdgeOffset + (performance.now() / 1000);
      // Maximum position is before this period.
      // No segment is yet available here
      if (scaledMaxPosition < 0) {
        return null;
      }
    }

    const { duration, timescale } = this._index;
    const firstPosition = this._manifestBoundsCalculator.getMinimumBound();
    if (firstPosition === undefined) {
      return undefined;
    }

    const segmentTime = firstPosition > this._periodStart ?
      (firstPosition - this._periodStart) * timescale :
      0;
    const numberIndexedToZero = Math.floor(segmentTime / duration);
    return numberIndexedToZero * duration;
  }

  /**
   * Returns the timescaled start of the last segment that should be available,
   * relatively to the start of the Period.
   * Returns null if live time is before current period.
   * @returns {number|null|undefined}
   */
  private _getLastSegmentStart() : number | null | undefined {
    const { duration, timescale } = this._index;

    if (this._isDynamic) {
      const lastPos = this._manifestBoundsCalculator.getMaximumBound();
      if (lastPos === undefined) {
        return undefined;
      }
      // /!\ The scaled max position augments continuously and might not
      // reflect exactly the real server-side value. As segments are
      // generated discretely.
      const scaledMaxPosition = (this._relativePeriodEnd != null ?
        Math.min(lastPos - this._periodStart, this._relativePeriodEnd) :
        lastPos - this._periodStart) * timescale;

      // Maximum position is before this period.
      // No segment is yet available here
      if (scaledMaxPosition < 0) {
        return null;
      }
      const maxPossibleStart = Math.max(scaledMaxPosition - duration, 0);
      const numberIndexedToZero = this._aggressiveMode ?
        Math.ceil(maxPossibleStart / duration) :
        Math.floor(maxPossibleStart / duration);
      return numberIndexedToZero * duration;
    } else {
      const maximumTime = (this._relativePeriodEnd || 0) * timescale;
      const numberIndexedToZero = Math.ceil(maximumTime / duration) - 1;
      const regularLastSegmentStart = numberIndexedToZero * duration;

      // In some SegmentTemplate, we could think that there is one more
      // segment that there actually is due to a very little difference between
      // the period's duration and a multiple of a segment's duration.
      // Check that we're within a good margin
      const minimumDuration = MINIMUM_SEGMENT_SIZE * timescale;
      if (maximumTime - regularLastSegmentStart > minimumDuration ||
          numberIndexedToZero === 0)
      {
        return regularLastSegmentStart;
      }
      return (numberIndexedToZero - 1) * duration;
    }
  }
}
