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

import config from "../../../../../config";
import log from "../../../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../../../manifest";
import assert from "../../../../../utils/assert";
import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import { IEMSG } from "../../../../containers/isobmff";
import ManifestBoundsCalculator from "../manifest_bounds_calculator";
import getInitSegment from "./get_init_segment";
import {
  createDashUrlDetokenizer,
  constructRepresentationUrl,
} from "./tokens";
import { getSegmentTimeRoundingError } from "./utils";


/**
 * Index property defined for a SegmentTemplate RepresentationIndex
 * This object contains every property needed to generate an ISegment for a
 * given media time.
 */
export interface ITemplateIndex {
  /**
   * Duration of each segment, in the timescale given (see timescale property).
   * timescale and list properties.)
   */
  duration : number;
  /**
   * Timescale to convert a time given here into seconds.
   * This is done by this simple operation:
   * ``timeInSeconds = timeInIndex * timescale``
   */
  timescale : number;
  /** Byte range for a possible index of segments in the server. */
  indexRange?: [number, number] | undefined;
  /** Information on the initialization segment. */
  initialization? : {
    /**
     * URL path, to add to the wanted CDN, to access the initialization segment.
     */
    url: string | null;
    /** possible byte range to request it. */
    range?: [number, number] | undefined;
  } | undefined;
  /**
   * URL base to access any segment.
   * Can contain token to replace to convert it to real URLs.
   * `null` if no URL exists.
   */
  url : string | null;
  /**
   * Temporal offset, in the current timescale (see timescale), to add to the
   * presentation time (time a segment has at decoding time) to obtain the
   * corresponding media time (original time of the media segment in the index
   * and on the media file).
   * For example, to look for a segment beginning at a second `T` on a
   * HTMLMediaElement, we actually will look for a segment in the index
   * beginning at:
   * ```
   * T * timescale + indexTimeOffset
   * ```
   */
  indexTimeOffset : number;
  /**
   * Offset present in the index to convert from the mediaTime (time declared in
   * the media segments and in this index) to the presentationTime (time wanted
   * when decoding the segment).  Basically by doing something along the line
   * of:
   * ```
   * presentationTimeInSeconds =
   *   mediaTimeInSeconds -
   *   presentationTimeOffsetInSeconds +
   *   periodStartInSeconds
   * ```
   * The time given here is in the current
   * timescale (see timescale)
   */
  presentationTimeOffset : number;
  /** Number from which the first segments in this index starts with. */
  startNumber? : number | undefined;
  /** Number associated to the last segment in this index. */
  endNumber? : number | undefined;
}

/**
 * `index` Argument for a SegmentTemplate RepresentationIndex.
 * Most of the properties here are already defined in ITemplateIndex.
 */
export interface ITemplateIndexIndexArgument {
  duration? : number | undefined;
  indexRange?: [number, number] | undefined;
  initialization?: { media? : string | undefined;
                     range? : [number, number] | undefined; } |
                   undefined;
  media? : string | undefined;
  presentationTimeOffset? : number | undefined;
  startNumber? : number | undefined;
  endNumber? : number | undefined;
  timescale? : number | undefined;
}

/** Aditional context needed by a SegmentTemplate RepresentationIndex. */
export interface ITemplateIndexContextArgument {
  /** Minimum availabilityTimeOffset concerning the segments of this Representation. */
  availabilityTimeOffset : number;
  /** Allows to obtain the minimum and maximum positions of a content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /** Start of the period concerned by this RepresentationIndex, in seconds. */
  periodStart : number;
  /** End of the period concerned by this RepresentationIndex, in seconds. */
  periodEnd : number|undefined;
  /** Whether the corresponding Manifest can be updated and changed. */
  isDynamic : boolean;
  /** ID of the Representation concerned. */
  representationId? : string | undefined;
  /** Bitrate of the Representation concerned. */
  representationBitrate? : number | undefined;
  /* Function that tells if an EMSG is whitelisted by the manifest */
  isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;
}

/**
 * IRepresentationIndex implementation for DASH' SegmentTemplate without a
 * SegmentTimeline.
 * @class TemplateRepresentationIndex
 */
export default class TemplateRepresentationIndex implements IRepresentationIndex {
  /** Underlying structure to retrieve segment information. */
  private _index : ITemplateIndex;
  /** Retrieve the maximum and minimum position of the whole content. */
  private _manifestBoundsCalculator : ManifestBoundsCalculator;
  /** Absolute start of the Period, in seconds. */
  private _periodStart : number;
  /** Difference between the end time of the Period and its start time, in timescale. */
  private _scaledRelativePeriodEnd : number | undefined;
  /** Minimum availabilityTimeOffset concerning the segments of this Representation. */
  private _availabilityTimeOffset : number | undefined;
  /** Whether the corresponding Manifest can be updated and changed. */
  private _isDynamic : boolean;
  /* Function that tells if an EMSG is whitelisted by the manifest */
  private _isEMSGWhitelisted : (inbandEvent: IEMSG) => boolean;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITemplateIndexIndexArgument,
    context : ITemplateIndexContextArgument
  ) {
    const { availabilityTimeOffset,
            manifestBoundsCalculator,
            isDynamic,
            periodEnd,
            periodStart,
            representationId,
            representationBitrate,
            isEMSGWhitelisted } = context;
    const timescale = index.timescale ?? 1;

    this._availabilityTimeOffset = availabilityTimeOffset;

    this._manifestBoundsCalculator = manifestBoundsCalculator;
    const presentationTimeOffset = index.presentationTimeOffset != null ?
                                     index.presentationTimeOffset :
                                     0;

    const scaledStart = periodStart * timescale;
    const indexTimeOffset = presentationTimeOffset - scaledStart;

    if (index.duration === undefined) {
      throw new Error("Invalid SegmentTemplate: no duration");
    }

    const initializationUrl = index.initialization?.media === undefined ?
      null :
      constructRepresentationUrl(index.initialization.media,
                                 representationId,
                                 representationBitrate);

    const segmentUrlTemplate = index.media === undefined ?
      null :
      constructRepresentationUrl(index.media, representationId, representationBitrate);

    this._index = { duration: index.duration,
                    timescale,
                    indexRange: index.indexRange,
                    indexTimeOffset,
                    initialization: index.initialization == null ?
                      undefined :
                      { url: initializationUrl,
                        range: index.initialization.range },
                    url: segmentUrlTemplate,
                    presentationTimeOffset,
                    startNumber: index.startNumber,
                    endNumber: index.endNumber };
    this._isDynamic = isDynamic;
    this._periodStart = periodStart;
    this._scaledRelativePeriodEnd = periodEnd === undefined ?
      undefined :
      (periodEnd - periodStart) * timescale;
    this._isEMSGWhitelisted = isEMSGWhitelisted;
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index, this._isEMSGWhitelisted);
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
            endNumber,
            timescale,
            url } = index;

    const scaledStart = this._periodStart * timescale;
    const scaledEnd = this._scaledRelativePeriodEnd;

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
    const numberOffset = startNumber ?? 1;

    // calcul initial time from Period start, where the first segment would have
    // the `0` number
    let numberIndexedToZero = Math.floor(startPosition / duration);

    for (
      let timeFromPeriodStart = numberIndexedToZero * duration;
      timeFromPeriodStart <= lastWantedStartPosition;
      timeFromPeriodStart += duration
    ) {
      // To obtain the real number, adds the real number from the Period's start
      const realNumber = numberIndexedToZero + numberOffset;
      if (endNumber !== undefined && realNumber > endNumber) {
        return segments;
      }

      const realDuration = scaledEnd != null &&
                           timeFromPeriodStart + duration > scaledEnd ?
                             scaledEnd - timeFromPeriodStart :
                             duration;
      const realTime = timeFromPeriodStart + scaledStart;
      const manifestTime = timeFromPeriodStart + this._index.presentationTimeOffset;

      const detokenizedURL = url === null ?
        null :
        createDashUrlDetokenizer(manifestTime, realNumber)(url);

      const args = { id: String(realNumber),
                     number: realNumber,
                     time: realTime / timescale,
                     end: (realTime + realDuration) / timescale,
                     duration: realDuration / timescale,
                     timescale: 1 as const,
                     isInit: false,
                     scaledDuration: realDuration / timescale,
                     url: detokenizedURL,
                     timestampOffset: -(index.indexTimeOffset / timescale),
                     complete: true,
                     privateInfos: {
                       isEMSGWhitelisted: this._isEMSGWhitelisted,
                     } };
      segments.push(args);
      numberIndexedToZero++;
    }

    return segments;
  }

  /**
   * Returns first possible position in the index, in seconds.
   * @returns {number|null|undefined}
   */
  getFirstAvailablePosition() : number | null | undefined {
    const firstSegmentStart = this._getFirstSegmentStart();
    if (firstSegmentStart == null) {
      return firstSegmentStart; // return undefined or null
    }
    return (firstSegmentStart / this._index.timescale) + this._periodStart;
  }

  /**
   * Returns last possible position in the index, in seconds.
   * @returns {number|null}
   */
  getLastAvailablePosition() : number|null|undefined {
    const lastSegmentStart = this._getLastSegmentStart();
    if (isNullOrUndefined(lastSegmentStart)) {
      // In that case (null or undefined), getLastAvailablePosition should reflect
      // the result of getLastSegmentStart, as the meaning is the same for
      // the two functions. So, we return the result of the latter.
      return lastSegmentStart;
    }

    const scaledRelativeIndexEnd = this._estimateRelativeScaledEnd();
    const lastSegmentEnd = Math.min(lastSegmentStart + this._index.duration,
                                    scaledRelativeIndexEnd ?? Infinity);
    return (lastSegmentEnd / this._index.timescale) + this._periodStart;
  }

  /**
   * Returns the absolute end in seconds this RepresentationIndex can reach once
   * all segments are available.
   * @returns {number|null|undefined}
   */
  getEnd(): number | null | undefined {
    if (!this._isDynamic) {
      return this.getLastAvailablePosition();
    }
    const scaledRelativeIndexEnd = this._estimateRelativeScaledEnd();
    if (scaledRelativeIndexEnd === undefined) {
      return undefined;
    }
    const { timescale } = this._index;
    const absoluteScaledIndexEnd = (scaledRelativeIndexEnd +
                                     this._periodStart * timescale);
    return  absoluteScaledIndexEnd / timescale;
  }

  /**
   * Returns:
   *   - `true` if in the given time interval, at least one new segment is
   *     expected to be available in the future.
   *   - `false` either if all segments in that time interval are already
   *     available for download or if none will ever be available for it.
   *   - `undefined` when it is not possible to tell.
   *
   * Always `false` in a `BaseRepresentationIndex` because all segments should
   * be directly available.
   * @returns {boolean}
   */
  awaitSegmentBetween(start: number, end: number): boolean | undefined {
    assert(start <= end);
    if (!this._isDynamic) {
      return false;
    }

    const { timescale } = this._index;
    const segmentTimeRounding = getSegmentTimeRoundingError(timescale);
    const scaledPeriodStart = this._periodStart * timescale;
    const scaledRelativeEnd = end * timescale - scaledPeriodStart;

    const relativeScaledIndexEnd = this._estimateRelativeScaledEnd();
    if (relativeScaledIndexEnd === undefined) {
      return (scaledRelativeEnd + segmentTimeRounding) >= 0;
    }
    const scaledRelativeStart = start * timescale - scaledPeriodStart;
    return (scaledRelativeStart - segmentTimeRounding) < relativeScaledIndexEnd;
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
   * @returns {null}
   */
  checkDiscontinuity() : null {
    return null;
  }

  /**
   * Returns `true` if the given segment should still be available as of now
   * (not removed since and still request-able).
   * Returns `false` if that's not the case.
   * Returns `undefined` if we do not know whether that's the case or not.
   * @param {Object} segment
   * @returns {boolean|undefined}
   */
  isSegmentStillAvailable(segment : ISegment) : boolean|undefined {
    if (segment.isInit) {
      return true;
    }
    const segmentsForTime = this.getSegments(segment.time, 0.1);
    if (segmentsForTime.length === 0) {
      return false;
    }
    return segmentsForTime[0].time === segment.time &&
           segmentsForTime[0].end === segment.end &&
           segmentsForTime[0].number === segment.number;
  }

  /**
   * SegmentTemplate without a SegmentTimeline should not be updated.
   * @returns {Boolean}
   */
  canBeOutOfSyncError() : false {
    return false;
  }

  /**
   * Returns `true` if the last segments in this index have already been
   * generated so that we can freely go to the next period.
   * Returns `false` if the index is still waiting on future segments to be
   * generated.
   * @returns {Boolean}
   */
  isFinished() : boolean {
    if (!this._isDynamic) {
      return true;
    }

    const scaledRelativeIndexEnd = this._estimateRelativeScaledEnd();
    if (scaledRelativeIndexEnd === undefined) {
      return false;
    }

    const { timescale } = this._index;
    const lastSegmentStart = this._getLastSegmentStart();

    // As last segment start is null if live time is before
    // current period, consider the index not to be finished.
    if (isNullOrUndefined(lastSegmentStart)) {
      return false;
    }
    const lastSegmentEnd = lastSegmentStart + this._index.duration;
    const segmentTimeRounding = getSegmentTimeRoundingError(timescale);
    return (lastSegmentEnd + segmentTimeRounding) >= scaledRelativeIndexEnd;
  }

  /**
   * @returns {Boolean}
   */
  isInitialized() : true {
    return true;
  }

  initialize() : void {
    log.error("A `TemplateRepresentationIndex` does not need to be initialized");
  }

  addPredictedSegments() : void {
    log.warn("Cannot add predicted segments to a `TemplateRepresentationIndex`");
  }

  /**
   * @param {Object} newIndex
   */
  _replace(newIndex : TemplateRepresentationIndex) : void {
    this._index = newIndex._index;
    this._isDynamic = newIndex._isDynamic;
    this._periodStart = newIndex._periodStart;
    this._scaledRelativePeriodEnd = newIndex._scaledRelativePeriodEnd;
    this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
  }

  /**
   * @param {Object} newIndex
   */
  _update(newIndex : TemplateRepresentationIndex) : void {
    // As segments are not declared individually, as long as this Representation
    // is present, we have every information we need
    this._replace(newIndex);
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
    if (this._scaledRelativePeriodEnd === 0 ||
        this._scaledRelativePeriodEnd === undefined)
    {
      // /!\ The scaled max position augments continuously and might not
      // reflect exactly the real server-side value. As segments are
      // generated discretely.
      const maximumBound = this._manifestBoundsCalculator.estimateMaximumBound();
      if (maximumBound !== undefined && maximumBound < this._periodStart) {
        // Maximum position is before this period.
        // No segment is yet available here
        return null;
      }
    }

    const { duration, timescale } = this._index;
    const firstPosition = this._manifestBoundsCalculator.estimateMinimumBound();
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
    const { duration, timescale, endNumber, startNumber = 1 } = this._index;

    if (this._isDynamic) {
      const lastPos = this._manifestBoundsCalculator.estimateMaximumBound();
      if (lastPos === undefined) {
        return undefined;
      }
      if (this._scaledRelativePeriodEnd !== undefined &&
          this._scaledRelativePeriodEnd <
            (lastPos - this._periodStart) * this._index.timescale) {

        let numberOfSegments = Math.ceil(this._scaledRelativePeriodEnd / duration);
        if (endNumber !== undefined && (endNumber - startNumber + 1) < numberOfSegments) {
          numberOfSegments = endNumber - startNumber + 1;
        }
        return (numberOfSegments - 1)  * duration;
      }
      // /!\ The scaled last position augments continuously and might not
      // reflect exactly the real server-side value. As segments are
      // generated discretely.
      const scaledLastPosition = (lastPos - this._periodStart) * timescale;

      // Maximum position is before this period.
      // No segment is yet available here
      if (scaledLastPosition < 0) {
        return null;
      }

      const availabilityTimeOffset =
        ((this._availabilityTimeOffset !== undefined ? this._availabilityTimeOffset : 0))
        * timescale;

      let numberOfSegmentsAvailable =
        Math.floor((scaledLastPosition + availabilityTimeOffset) / duration);

      if (endNumber !== undefined &&
          (endNumber - startNumber + 1) < numberOfSegmentsAvailable) {
        numberOfSegmentsAvailable = endNumber - startNumber + 1;
      }
      return numberOfSegmentsAvailable <= 0 ?
               null :
               (numberOfSegmentsAvailable - 1) * duration;
    } else {
      const maximumTime = this._scaledRelativePeriodEnd ?? 0;
      let numberOfSegments = Math.ceil(maximumTime / duration);
      if (endNumber !== undefined && (endNumber - startNumber + 1) < numberOfSegments) {
        numberOfSegments = endNumber - startNumber + 1;
      }

      const regularLastSegmentStart = (numberOfSegments - 1)  * duration;

      // In some SegmentTemplate, we could think that there is one more
      // segment that there actually is due to a very little difference between
      // the period's duration and a multiple of a segment's duration.
      // Check that we're within a good margin
      const minimumDuration = config.getCurrent().MINIMUM_SEGMENT_SIZE * timescale;
      if (endNumber !== undefined ||
          maximumTime - regularLastSegmentStart > minimumDuration ||
          numberOfSegments < 2)
      {
        return regularLastSegmentStart;
      }
      return (numberOfSegments - 2) * duration;
    }
  }

  /**
   * Returns an estimate of the last available position in this
   * `RepresentationIndex` based on attributes such as the Period's end and
   * the `endNumber` attribute.
   * If the estimate cannot be made (e.g. this Period's segments are still being
   * generated and its end is yet unknown), returns `undefined`.
   * @returns {number|undefined}
   */
  private _estimateRelativeScaledEnd() : number | undefined {
    if (this._index.endNumber !== undefined) {
      const numberOfSegments =
        this._index.endNumber - (this._index.startNumber ?? 1) + 1;
      return Math.max(Math.min(numberOfSegments * this._index.duration,
                               this._scaledRelativePeriodEnd ?? Infinity),
                      0);
    }

    if (this._scaledRelativePeriodEnd === undefined) {
      return undefined;
    }

    return Math.max(this._scaledRelativePeriodEnd, 0);
  }
}
