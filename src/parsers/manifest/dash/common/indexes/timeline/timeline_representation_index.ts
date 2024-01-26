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

import config from "../../../../../../config";
import { NetworkError } from "../../../../../../errors";
import log from "../../../../../../log";
import type {
  IRepresentationIndex,
  ISegment,
  IRepresentation,
} from "../../../../../../manifest";
import type { IPlayerError } from "../../../../../../public_types";
import assert from "../../../../../../utils/assert";
import isNullOrUndefined from "../../../../../../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../../../../../../utils/monotonic_timestamp";
import type { IEMSG } from "../../../../../containers/isobmff";
import clearTimelineFromPosition from "../../../../utils/clear_timeline_from_position";
import type {
  IIndexSegment } from "../../../../utils/index_helpers";
import {
  checkDiscontinuity,
  fromIndexTime,
  getIndexSegmentEnd,
  toIndexTime,
} from "../../../../utils/index_helpers";
import updateSegmentTimeline from "../../../../utils/update_segment_timeline";
import type { ISegmentTimelineElement } from "../../../node_parser_types";
import type ManifestBoundsCalculator from "../../manifest_bounds_calculator";
import getInitSegment from "../get_init_segment";
import getSegmentsFromTimeline from "../get_segments_from_timeline";
import { constructRepresentationUrl } from "../tokens";
import { getSegmentTimeRoundingError } from "../utils";
import constructTimelineFromElements from "./construct_timeline_from_elements";
// eslint-disable-next-line max-len
import constructTimelineFromPreviousTimeline from "./construct_timeline_from_previous_timeline";

/**
 * Index property defined for a SegmentTimeline RepresentationIndex
 * This object contains every property needed to generate an ISegment for a
 * given media time.
 */
export interface ITimelineIndex {
  /** If `false`, the last segment anounced might be still incomplete. */
  availabilityTimeComplete : boolean;
  /** Minimum availabilityTimeOffset concerning the segments of this Representation. */
  availabilityTimeOffset : number;
  /** Byte range for a possible index of segments in the server. */
  indexRange?: [number, number] | undefined;
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
  /** Information on the initialization segment. */
  initialization? : {
    /**
     * URL path, to add to the wanted CDN, to access the initialization segment.
     * `null` if no URL exists.
     */
    url: string | null;
    /** possible byte range to request it. */
    range?: [number, number] | undefined;
  } | undefined;
  /**
   * Template for the URL suffix (to concatenate to the wanted CDN), to access any
   * media segment.
   * Can contain tokens to replace to convert it to real URLs.
   *
   * `null` if no URL exists.
   */
  segmentUrlTemplate : string | null ;
  /** Number from which the first segments in this index starts with. */
  startNumber? : number | undefined;
  /** Number associated to the last segment in this index. */
  endNumber? : number | undefined;
  /**
   * Every segments defined in this index.
   * `null` at the beginning as this property is parsed lazily (only when first
   * needed) for performances reasons.
   *
   * /!\ Please note that this structure should follow the exact same structure
   * than a SegmentTimeline element in the corresponding MPD.
   * This means:
   *   - It should have the same amount of elements in its array than there was
   *     `<S>` elements in the SegmentTimeline.
   *   - Each of those same elements should have the same start time, the same
   *     duration and the same repeat counter than what could be deduced from
   *     the SegmentTimeline.
   * This is needed to be able to run parsing optimization when refreshing the
   * MPD. Not doing so could lead to the RxPlayer not being able to play the
   * stream anymore.
   */
  timeline : IIndexSegment[] | null;
  /**
   * Timescale to convert a time given here into seconds.
   * This is done by this simple operation:
   * ``timeInSeconds = timeInIndex * timescale``
   */
  timescale : number;
}

/**
 * `index` Argument for a SegmentTimeline RepresentationIndex.
 * Most of the properties here are already defined in ITimelineIndex.
 */
export interface ITimelineIndexIndexArgument {
  indexRange?: [number, number] | undefined;
  initialization? : { media? : string | undefined;
                      range?: [number, number] | undefined; } |
                    undefined;
  media? : string | undefined;
  startNumber? : number | undefined;
  endNumber? : number | undefined;
  timescale? : number | undefined;
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
  presentationTimeOffset? : number | undefined;

  timelineParser? : (() => HTMLCollection) | undefined;
  timeline? : ISegmentTimelineElement[] | undefined;
}

/** Aditional context needed by a SegmentTimeline RepresentationIndex. */
export interface ITimelineIndexContextArgument {
  /**
   * If `false`, declared segments in the MPD might still be not completely generated.
   * If `true`, they are completely generated.
   *
   * If `undefined`, the corresponding property was not set in the MPD and it is
   * thus assumed that they are all generated.
   * It might however be semantically different than `true` in the RxPlayer as it
   * means that the packager didn't include that information in the MPD.
   */
  availabilityTimeComplete : boolean | undefined;
  /**
   * availability time offset of the concerned Adaptation.
   *
   * If `undefined`, the corresponding property was not set in the MPD and it is
   * thus assumed to be equal to `0`.
   * It might however be semantically different than `0` in the RxPlayer as it
   * means that the packager didn't include that information in the MPD.
   */
  availabilityTimeOffset : number | undefined;
  /** Allows to obtain the minimum and maximum positions of a content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /** Start of the period linked to this RepresentationIndex, in seconds. */
  periodStart : number;
  /** End of the period linked to this RepresentationIndex, in seconds. */
  periodEnd : number|undefined;
  /** Whether the corresponding Manifest can be updated and changed. */
  isDynamic : boolean;
  /**
   * Time at which the XML file containing this index was received.
   */
  receivedTime? : number | undefined;
  /** ID of the Representation concerned. */
  representationId? : string | undefined;
  /** Bitrate of the Representation concerned. */
  representationBitrate? : number | undefined;
  /**
   * The parser should take this previous version of the
   * `TimelineRepresentationIndex` - which was from the same Representation
   * parsed at an earlier time - as a base to speed-up the parsing process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousRepresentation : IRepresentation | null;
  /** Function that tells if an EMSG is whitelisted by the manifest */
  isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;
  /**
   * Set to `true` if the linked Period is the chronologically last one in the
   * Manifest.
   */
  isLastPeriod : boolean;
}

export interface ILastSegmentInformation {
  /** End of the timeline on `time`, timescaled. */
  lastPosition? : number | undefined;

  /** Defines the time at which `lastPosition` was last calculated. */
  time : number;
}

/**
 * `IRepresentationIndex` implementation for a DASH `SegmentTimeline` segment
 * indexing scheme.
 * @class TimelineRepresentationIndex
 */
export default class TimelineRepresentationIndex implements IRepresentationIndex {
  /** Underlying structure to retrieve segment information. */
  protected _index : ITimelineIndex;

  /**
   * Time of the last Manifest update.
   * The unit is the monotonically-raising timestamp used by the RxPlayer.
   */
  private _lastUpdate : number;

  /** Absolute start of the period, timescaled and converted to index time. */
  private _scaledPeriodStart : number;

  /** Absolute end of the period, timescaled and converted to index time. */
  private _scaledPeriodEnd : number | undefined;

  /** Whether this RepresentationIndex can change over time. */
  private _isDynamic : boolean;

  /** Retrieve the maximum and minimum position of the whole content. */
  private _manifestBoundsCalculator : ManifestBoundsCalculator;

  /**
   * Lazily get the S elements from this timeline.
   * `null` once this call has been done once, to free memory.
   */
  private _parseTimeline : (() => HTMLCollection) | null;

  /**
   * This variable represents the same `TimelineRepresentationIndex` at the
   * previous Manifest update.
   * Note that it is not always set.
   * This can be used as a base to speed-up the creation of the underlying
   * index structure as it can be really heavy for long Manifests.
   * To avoid taking too much memory, this variable is reset to `null` once used.
   */
  private _unsafelyBaseOnPreviousIndex : TimelineRepresentationIndex | null;

  /* Function that tells if an EMSG is whitelisted by the manifest */
  private _isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;

  /** `true` if the linked Period is the chronologically last one in the Manifest. */
  private _isLastPeriod: boolean;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITimelineIndexIndexArgument,
    context : ITimelineIndexContextArgument
  ) {
    if (!TimelineRepresentationIndex.isTimelineIndexArgument(index)) {
      throw new Error("The given index is not compatible with a " +
                      "TimelineRepresentationIndex.");
    }
    const { availabilityTimeComplete,
            availabilityTimeOffset,
            manifestBoundsCalculator,
            isDynamic,
            isLastPeriod,
            representationId,
            representationBitrate,
            periodStart,
            periodEnd,
            isEMSGWhitelisted } = context;
    const timescale = index.timescale ?? 1;

    const presentationTimeOffset = index.presentationTimeOffset ?? 0;
    const scaledStart = periodStart * timescale;
    const indexTimeOffset = presentationTimeOffset - scaledStart;

    this._manifestBoundsCalculator = manifestBoundsCalculator;

    this._isEMSGWhitelisted = isEMSGWhitelisted;
    this._isLastPeriod = isLastPeriod;
    this._lastUpdate = context.receivedTime ?? getMonotonicTimeStamp();

    this._unsafelyBaseOnPreviousIndex = null;
    if (context.unsafelyBaseOnPreviousRepresentation !== null &&
        context.unsafelyBaseOnPreviousRepresentation.index
          instanceof TimelineRepresentationIndex)
    {
      // avoid too much nested references, to keep memory down
      context.unsafelyBaseOnPreviousRepresentation
        .index._unsafelyBaseOnPreviousIndex = null;
      this._unsafelyBaseOnPreviousIndex = context
        .unsafelyBaseOnPreviousRepresentation.index;
    }

    this._isDynamic = isDynamic;
    this._parseTimeline = index.timelineParser ?? null;
    const initializationUrl = index.initialization?.media === undefined ?
      null :
      constructRepresentationUrl(index.initialization.media,
                                 representationId,
                                 representationBitrate);

    const segmentUrlTemplate = index.media === undefined ?
      null :
      constructRepresentationUrl(index.media, representationId, representationBitrate);

    let actualAvailabilityTimeOffset;
    // Technically, it seems (although it is not clear) that an MPD may contain
    // future segments and it's the job of a player to not request segments later
    // than the time at which they should be available.
    // In practice, we don't do that for various reasons: precision issues,
    // various DASH spec interpretations by packagers and players...
    //
    // So as a compromise, if nothing in the MPD indicates that future segments
    // may be announced (see code below), we will act as if ALL segments in this
    // TimelineRepresentationIndex are requestable
    if (
      availabilityTimeOffset === undefined &&
      availabilityTimeComplete === undefined
    ) {
      actualAvailabilityTimeOffset = Infinity; // Meaning: we can request
                                               // everything in the index
    } else {
      actualAvailabilityTimeOffset = availabilityTimeOffset ?? 0;
    }

    this._index = { availabilityTimeComplete: availabilityTimeComplete ?? true,
                    availabilityTimeOffset: actualAvailabilityTimeOffset,
                    indexRange: index.indexRange,
                    indexTimeOffset,
                    initialization: isNullOrUndefined(index.initialization) ?
                      undefined :
                      {
                        url: initializationUrl,
                        range: index.initialization.range,
                      },
                    segmentUrlTemplate,
                    startNumber: index.startNumber,
                    endNumber: index.endNumber,
                    timeline: index.timeline === undefined ?
                      null :
                      updateTimelineFromEndNumber(index.timeline,
                                                  index.startNumber,
                                                  index.endNumber),
                    timescale };

    this._scaledPeriodStart = toIndexTime(periodStart, this._index);
    this._scaledPeriodEnd = periodEnd === undefined ? undefined :
                                                      toIndexTime(periodEnd, this._index);
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index, this._isEMSGWhitelisted);
  }

  /**
   * Asks for segments to download for a given time range.
   * @param {Number} from - Beginning of the time wanted, in seconds
   * @param {Number} duration - duration wanted, in seconds
   * @returns {Array.<Object>}
   */
  getSegments(from : number, duration : number) : ISegment[] {
    this._refreshTimeline(); // clear timeline if needed
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }

    // destructuring to please TypeScript
    const { segmentUrlTemplate,
            startNumber,
            endNumber,
            timeline,
            timescale,
            indexTimeOffset } = this._index;
    return getSegmentsFromTimeline({ segmentUrlTemplate,
                                     startNumber,
                                     endNumber,
                                     timeline,
                                     timescale,
                                     indexTimeOffset },
                                   from,
                                   duration,
                                   this._manifestBoundsCalculator,
                                   this._scaledPeriodEnd,
                                   this._isEMSGWhitelisted);
  }

  /**
   * Returns true if the index should be refreshed.
   * @returns {Boolean}
   */
  shouldRefresh() : false {
    // DASH Manifest based on a SegmentTimeline should have minimumUpdatePeriod
    // attribute which should be sufficient to know when to refresh it.
    return false;
  }

  /**
   * Returns the starting time, in seconds, of the earliest segment currently
   * available.
   * Returns null if nothing is in the index
   * @returns {Number|null}
   */
  getFirstAvailablePosition(): number | null {
    this._refreshTimeline();
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    const timeline = this._index.timeline;
    return timeline.length === 0 ? null :
                                   fromIndexTime(Math.max(this._scaledPeriodStart,
                                                          timeline[0].start),
                                                 this._index);
  }

  /**
   * Returns the ending time, in seconds, of the last segment currently
   * available.
   * Returns null if nothing is in the index
   * @returns {Number|null}
   */
  getLastAvailablePosition(): number | null {
    this._refreshTimeline();
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }

    const lastReqSegInfo = getLastRequestableSegmentInfo(
      // Needed typecast for TypeScript
      this._index as typeof this._index & { timeline: IIndexSegment[] },
      this._manifestBoundsCalculator,
      this._scaledPeriodEnd
    );
    if (lastReqSegInfo === null) {
      return null;
    }
    const lastScaledPosition = Math.min(lastReqSegInfo.end,
                                        this._scaledPeriodEnd ?? Infinity);
    return fromIndexTime(lastScaledPosition, this._index);
  }

  /**
   * Returns the absolute end in seconds this RepresentationIndex can reach once
   * all segments are available.
   * @returns {number|null|undefined}
   */
  getEnd(): number | undefined | null {
    if (this._isDynamic && !this._isLastPeriod) {
      return undefined;
    }

    this._refreshTimeline();
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    if (this._index.timeline.length <= 0) {
      return null;
    }
    const lastSegment = this._index.timeline[this._index.timeline.length - 1];
    const lastTime = Math.min(getIndexSegmentEnd(lastSegment,
                                                 null,
                                                 this._scaledPeriodEnd),
                              this._scaledPeriodEnd ?? Infinity);
    return fromIndexTime(lastTime, this._index);
  }

  /**
   * Returns:
   *   - `true` if in the given time interval, at least one new segment is
   *     expected to be available in the future.
   *   - `false` either if all segments in that time interval are already
   *     available for download or if none will ever be available for it.
   *   - `undefined` when it is not possible to tell.
   * @param {number} start
   * @param {number} end
   * @returns {boolean|undefined}
   */
  awaitSegmentBetween(start: number, end: number): boolean | undefined {
    assert(start <= end);
    if (!this._isDynamic) {
      return false; // No segment will be newly available in the future
    }

    this._refreshTimeline();
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    const { timescale, timeline } = this._index;
    const segmentTimeRounding = getSegmentTimeRoundingError(timescale);
    const scaledWantedEnd = toIndexTime(end, this._index);
    const lastReqSegInfo = getLastRequestableSegmentInfo(
      // Needed typecast for TypeScript
      this._index as typeof this._index & { timeline: IIndexSegment[] },
      this._manifestBoundsCalculator,
      this._scaledPeriodEnd
    );
    if (lastReqSegInfo !== null) {
      const lastReqSegmentEnd = Math.min(lastReqSegInfo.end,
                                         this._scaledPeriodEnd ?? Infinity);
      const roundedReqSegmentEnd = lastReqSegmentEnd + segmentTimeRounding;
      if (roundedReqSegmentEnd >= Math.min(scaledWantedEnd,
                                           this._scaledPeriodEnd ?? Infinity))
      {
        return false; // everything up to that point is already requestable
      }
    }

    const scaledWantedStart = toIndexTime(start, this._index);
    if (timeline.length > 0 &&
        lastReqSegInfo !== null &&
        !lastReqSegInfo.isLastOfTimeline)
    {
      // There are some future segments already anounced in the MPD

      const lastSegment = timeline[timeline.length - 1];
      const lastSegmentEnd = getIndexSegmentEnd(lastSegment,
                                                null,
                                                this._scaledPeriodEnd);
      const roundedLastSegEnd = lastSegmentEnd + segmentTimeRounding;
      if (scaledWantedStart < roundedLastSegEnd + segmentTimeRounding) {
        return true; // The MPD's timeline already contains one such element,
                     // It is just not requestable yet
      }
    }

    if (!this._isLastPeriod) {
      // Let's consider - perhaps wrongly, that Periods which aren't the last
      // one have all of their segments announced.
      return false;
    }

    if (this._scaledPeriodEnd === undefined) {
      return (scaledWantedEnd + segmentTimeRounding) > this._scaledPeriodStart ?
        undefined : // There may be future segments at this point
        false; // Before the current Period
    }

    // `true` if within the boundaries of this Period. `false` otherwise.
    return (scaledWantedStart - segmentTimeRounding) < this._scaledPeriodEnd &&
           (scaledWantedEnd + segmentTimeRounding) > this._scaledPeriodStart;
  }

  /**
   * Returns true if a Segment returned by this index is still considered
   * available.
   * Returns false if it is not available anymore.
   * Returns undefined if we cannot know whether it is still available or not.
   * @param {Object} segment
   * @returns {Boolean|undefined}
   */
  isSegmentStillAvailable(segment : ISegment) : boolean | undefined {
    if (segment.isInit) {
      return true;
    }
    this._refreshTimeline();
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    return isSegmentStillAvailable(segment,
                                   // Needed typecast for TypeScript
                                   this._index as typeof this._index & {
                                     timeline: IIndexSegment[];
                                   },
                                   this._manifestBoundsCalculator,
                                   this._scaledPeriodEnd);
  }

  /**
   * Checks if the time given is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Number} time
   * @returns {Number|null}
   */
  checkDiscontinuity(time : number) : number | null {
    this._refreshTimeline();
    let timeline = this._index.timeline;
    if (timeline === null) {
      timeline = this._getTimeline();
      this._index.timeline = timeline;
    }
    return checkDiscontinuity({ timeline,
                                timescale: this._index.timescale,
                                indexTimeOffset: this._index.indexTimeOffset },
                              time,
                              this._scaledPeriodEnd);
  }

  /**
   * @param {Error} error
   * @returns {Boolean}
   */
  canBeOutOfSyncError(error : IPlayerError) : boolean {
    if (!this._isDynamic) {
      return false;
    }
    return error instanceof NetworkError &&
           error.isHttpError(404);
  }

  /**
   * Replace this RepresentationIndex with one from a new version of the
   * Manifest.
   * @param {Object} newIndex
   */
  _replace(newIndex : TimelineRepresentationIndex) : void {
    this._parseTimeline = newIndex._parseTimeline;
    this._index = newIndex._index;
    this._isDynamic = newIndex._isDynamic;
    this._scaledPeriodStart = newIndex._scaledPeriodStart;
    this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
    this._lastUpdate = newIndex._lastUpdate;
    this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
    this._isLastPeriod = newIndex._isLastPeriod;
  }

  /**
   * Update this RepresentationIndex with a shorter version of it coming from a
   * new version of the MPD.
   * @param {Object} newIndex
   */
  _update(newIndex : TimelineRepresentationIndex) : void {
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    if (newIndex._index.timeline === null) {
      newIndex._index.timeline = newIndex._getTimeline();
    }
    const hasReplaced = updateSegmentTimeline(this._index.timeline,
                                              newIndex._index.timeline);
    if (hasReplaced) {
      this._index.startNumber = newIndex._index.startNumber;
    }
    this._index.availabilityTimeOffset = newIndex._index.availabilityTimeOffset;
    this._index.availabilityTimeComplete = newIndex._index.availabilityTimeComplete;
    this._index.endNumber = newIndex._index.endNumber;
    this._isDynamic = newIndex._isDynamic;
    this._scaledPeriodStart = newIndex._scaledPeriodStart;
    this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
    this._lastUpdate = newIndex._lastUpdate;
    this._isLastPeriod = newIndex._isLastPeriod;
  }

  /**
   * Returns `false` if this RepresentationIndex currently contains its last
   * segment.
   * Returns `true` if it's still pending.
   * @returns {Boolean}
   */
  isStillAwaitingFutureSegments() : boolean {
    if (!this._isDynamic) {
      return false;
    }

    this._refreshTimeline();
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }

    const { timeline } = this._index;
    if (timeline.length === 0) {
      // No segment announced in this Period
      if (this._scaledPeriodEnd !== undefined) {
        const liveEdge = this._manifestBoundsCalculator.getEstimatedLiveEdge();
        if (liveEdge !== undefined &&
            toIndexTime(liveEdge, this._index) > this._scaledPeriodEnd)
        {
          // This Period is over, we're not awaiting anything
          return false;
        }
      }
      // Let's just consider that we're awaiting only for when this is the last Period.
      return this._isLastPeriod;
    }

    const segmentTimeRounding = getSegmentTimeRoundingError(this._index.timescale);
    const lastReqSegInfo = getLastRequestableSegmentInfo(
      // Needed typecast for TypeScript
      this._index as typeof this._index & { timeline: IIndexSegment[] },
      this._manifestBoundsCalculator,
      this._scaledPeriodEnd
    );

    if (lastReqSegInfo !== null && !lastReqSegInfo.isLastOfTimeline) {
      // There might be non-yet requestable segments in the manifest
      const lastReqSegmentEnd = Math.min(lastReqSegInfo.end,
                                         this._scaledPeriodEnd ?? Infinity);
      if (this._scaledPeriodEnd !== undefined &&
          lastReqSegmentEnd + segmentTimeRounding >= this._scaledPeriodEnd)
      {
        // The last requestable segment ends after the end of the Period anyway
        return false;
      }
      return true; // There are not-yet requestable segments
    }

    if (!this._isLastPeriod) {
      // This index is not linked to the current last Period in the MPD, in
      // which case it is inferred that all segments have been announced.
      //
      // Note that this condition might break very very rare use cases where old
      // Periods are still being generated, yet it should fix more cases than it
      // breaks.
      return false;
    }

    if (this._scaledPeriodEnd === undefined) {
      // This is the last Period of a dynamic content whose end is unknown.
      // Just return true.
      return true;
    }
    const lastSegment = timeline[timeline.length - 1];
    const lastSegmentEnd = getIndexSegmentEnd(lastSegment,
                                              null,
                                              this._scaledPeriodEnd);
    // We're awaiting future segments only if the current end is before the end
    // of the Period
    return (lastSegmentEnd + segmentTimeRounding) < this._scaledPeriodEnd;
  }

  /**
   * @returns {Boolean}
   */
  isInitialized() : true {
    return true;
  }

  initialize() : void {
    log.error("A `TimelineRepresentationIndex` does not need to be initialized");
  }

  addPredictedSegments() : void {
    log.warn("Cannot add predicted segments to a `TimelineRepresentationIndex`");
  }

  /**
   * Returns `true` if the given object can be used as an "index" argument to
   * create a new `TimelineRepresentationIndex`.
   * @param {Object} index
   * @returns {boolean}
   */
  static isTimelineIndexArgument(index : ITimelineIndexIndexArgument) : boolean {
    return typeof index.timelineParser === "function" ||
           Array.isArray(index.timeline);
  }

  /**
   * Clean-up timeline to remove segment information which should not be
   * available due to timeshifting.
   */
  private _refreshTimeline() : void {
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    if (!this._isDynamic) {
      return;
    }
    const firstPosition = this._manifestBoundsCalculator
      .getEstimatedMinimumSegmentTime();
    if (isNullOrUndefined(firstPosition)) {
      return; // we don't know yet
    }
    const scaledFirstPosition = toIndexTime(firstPosition, this._index);
    const nbEltsRemoved = clearTimelineFromPosition(this._index.timeline,
                                                    scaledFirstPosition);
    if (this._index.startNumber !== undefined) {
      this._index.startNumber += nbEltsRemoved;
    } else if (this._index.endNumber !== undefined) {
      this._index.startNumber = nbEltsRemoved + 1;
    }
  }

  /**
   * Allows to generate the "timeline" for this RepresentationIndex.
   * Call this function when the timeline is unknown.
   * This function was added to only perform that task lazily, i.e. only when
   * first needed.
   * After calling it, every now unneeded variable will be freed from memory.
   * This means that calling _getTimeline more than once will just return an
   * empty array.
   *
   * /!\ Please note that this structure should follow the exact same structure
   * than a SegmentTimeline element in the corresponding MPD.
   * This means:
   *   - It should have the same amount of elements in its array than there was
   *     `<S>` elements in the SegmentTimeline.
   *   - Each of those same elements should have the same start time, the same
   *     duration and the same repeat counter than what could be deduced from
   *     the SegmentTimeline.
   * This is needed to be able to run parsing optimization when refreshing the
   * MPD. Not doing so could lead to the RxPlayer not being able to play the
   * stream anymore.
   * @returns {Array.<Object>}
   */
  private _getTimeline() : IIndexSegment[] {
    if (this._parseTimeline === null) {
      if (this._index.timeline !== null) {
        return this._index.timeline;
      }
      log.error("DASH: Timeline already lazily parsed.");
      return [];
    }

    const newElements = this._parseTimeline();
    this._parseTimeline = null; // Free memory

    const { MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY } = config.getCurrent();
    if (this._unsafelyBaseOnPreviousIndex === null ||
        newElements.length < MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY)
    {
      // Just completely parse the current timeline
      return updateTimelineFromEndNumber(constructTimelineFromElements(newElements),
                                         this._index.startNumber,
                                         this._index.endNumber);
    }

    // Construct previously parsed timeline if not already done
    let prevTimeline : IIndexSegment[];
    if (this._unsafelyBaseOnPreviousIndex._index.timeline === null) {
      prevTimeline = this._unsafelyBaseOnPreviousIndex._getTimeline();
      this._unsafelyBaseOnPreviousIndex._index.timeline = prevTimeline;
    } else {
      prevTimeline = this._unsafelyBaseOnPreviousIndex._index.timeline;
    }
    this._unsafelyBaseOnPreviousIndex = null; // Free memory

    return updateTimelineFromEndNumber(
      constructTimelineFromPreviousTimeline(newElements, prevTimeline),
      this._index.startNumber,
      this._index.endNumber);

  }
}

/**
 * Take the original SegmentTimeline's parsed timeline and, if an `endNumber` is
 * specified, filter segments which possess a number superior to that number.
 *
 * This should only be useful in only rare and broken MPDs, but we aim to
 * respect the specification even in those cases.
 *
 * @param {Array.<Object>} timeline
 * @param {number|undefined} startNumber
 * @param {Array.<Object>} endNumber
 * @returns {number|undefined}
 */
function updateTimelineFromEndNumber(
  timeline : IIndexSegment[],
  startNumber : number | undefined,
  endNumber : number | undefined
) : IIndexSegment[] {
  if (endNumber === undefined) {
    return timeline;
  }
  let currNumber = startNumber ?? 1;
  for (let idx = 0; idx < timeline.length; idx++) {
    const seg = timeline[idx];
    currNumber += seg.repeatCount + 1;
    if (currNumber > endNumber) {
      if (currNumber === endNumber + 1) {
        return timeline.slice(0, idx + 1);
      } else {
        const newTimeline = timeline.slice(0, idx);
        const lastElt = { ...seg };
        const beginningNumber = currNumber - seg.repeatCount - 1;
        lastElt.repeatCount = Math.max(0, endNumber - beginningNumber);
        newTimeline.push(lastElt);
        return newTimeline;
      }
    }
  }
  return timeline;
}

/**
 * Returns true if a Segment returned by the corresponding index is still
 * considered available.
 * Returns false if it is not available anymore.
 * Returns undefined if we cannot know whether it is still available or not.
 * /!\ We do not check the mediaURLs of the segment.
 * @param {Object} segment
 * @param {Object} index
 * @param {Object} manifestBoundsCalculator
 * @param {number|undefined} scaledPeriodEnd
 * @returns {Boolean|undefined}
 */
export function isSegmentStillAvailable(
  segment : ISegment,
  index: { availabilityTimeOffset : number;
           timeline : IIndexSegment[];
           indexTimeOffset: number;
           timescale : number; },
  manifestBoundsCalculator : ManifestBoundsCalculator,
  scaledPeriodEnd : number | undefined
) : boolean | undefined {
  const lastReqSegInfo = getLastRequestableSegmentInfo(index,
                                                       manifestBoundsCalculator,
                                                       scaledPeriodEnd);
  if (lastReqSegInfo === null) {
    return false;
  }

  for (let i = 0; i < index.timeline.length; i++) {
    if (lastReqSegInfo.timelineIdx < i) {
      return false;
    }
    const tSegment = index.timeline[i];
    const tSegmentTime = (tSegment.start - index.indexTimeOffset) / index.timescale;
    if (tSegmentTime > segment.time) {
      return false; // We went over it without finding it
    } else if (tSegmentTime === segment.time) {
      if (tSegment.range === undefined) {
        return segment.range === undefined;
      }
      return !isNullOrUndefined(segment.range) &&
             tSegment.range[0] === segment.range[0] &&
             tSegment.range[1] === segment.range[1];
    } else { // tSegment.start < segment.time
      if (tSegment.repeatCount >= 0 && tSegment.duration !== undefined) {
        const timeDiff = tSegmentTime - tSegment.start;
        const repeat = (timeDiff / tSegment.duration) - 1;
        return repeat % 1 === 0 && repeat <= lastReqSegInfo.newRepeatCount;
      }
    }
  }
  return false;
}

/**
 * Returns from the given RepresentationIndex information on the last segment
 * that may be requested currently.
 *
 * Returns `null` if there's no such segment.
 * @param {Object} index
 * @param {Object} manifestBoundsCalculator
 * @param {number|undefined} scaledPeriodEnd
 * @returns {number|null}
 */
export function getLastRequestableSegmentInfo(
  index: { availabilityTimeOffset : number;
           timeline : IIndexSegment[];
           timescale : number; },
  manifestBoundsCalculator : ManifestBoundsCalculator,
  scaledPeriodEnd : number | undefined
) : ILastRequestableSegmentInfo | null {
  if (index.timeline.length <= 0) {
    return null;
  }

  if (index.availabilityTimeOffset === Infinity) {
    // availabilityTimeOffset to Infinity == Everything is requestable in the timeline.
    const lastIndex = index.timeline.length - 1;
    const lastElem = index.timeline[lastIndex];
    return { isLastOfTimeline: true,
             timelineIdx: lastIndex,
             newRepeatCount: lastElem.repeatCount,
             end: getIndexSegmentEnd(lastElem, null, scaledPeriodEnd) };
  }

  const adjustedMaxSeconds = manifestBoundsCalculator.getEstimatedMaximumPosition(
    index.availabilityTimeOffset
  );
  if (adjustedMaxSeconds === undefined) {
    const lastIndex = index.timeline.length - 1;
    const lastElem = index.timeline[lastIndex];
    return { isLastOfTimeline: true,
             timelineIdx: lastIndex,
             newRepeatCount: lastElem.repeatCount,
             end: getIndexSegmentEnd(lastElem, null, scaledPeriodEnd) };
  }
  for (let i = index.timeline.length - 1; i >= index.timeline.length; i--) {
    const element = index.timeline[i];
    const endOfFirstOccurence = element.start + element.duration;
    if (fromIndexTime(endOfFirstOccurence, index) <= adjustedMaxSeconds) {
      const endTime = getIndexSegmentEnd(element, index.timeline[i + 1], scaledPeriodEnd);
      if (fromIndexTime(endTime, index) <= adjustedMaxSeconds) {
        return { isLastOfTimeline: i === index.timeline.length - 1,
                 timelineIdx: i,
                 newRepeatCount: element.repeatCount,
                 end: endOfFirstOccurence };
      } else {
        // We have to find the right repeatCount
        const maxIndexTime = toIndexTime(adjustedMaxSeconds, index);
        const diffToSegStart = maxIndexTime - element.start;
        const nbOfSegs = Math.floor(diffToSegStart / element.duration);
        assert(nbOfSegs >= 1);
        return { isLastOfTimeline: false,
                 timelineIdx: i,
                 newRepeatCount: nbOfSegs - 1,
                 end: element.start + nbOfSegs * element.duration };
      }
    }
  }
  return null;
}

/**
 * Information on the last requestable segment deduced from a timeline array of
 * segment information.
 */
export interface ILastRequestableSegmentInfo {
  /**
   * If `true`, we know that the last requestable segment is equal to the last
   * segment that can be deduced from the corresponding given timeline.
   * Written another way, there seem to be no segment announced in the timeline
   * that are not yet requestable.
   *
   * If `false`, we know that the last requestable segment is not the last
   * segment that can be deduced from the corresponding timeline.
   * Written another way, there are supplementary segments in the timeline which
   * are not yet requestable.
   *
   * Note that if the last requestable segment has its information from the last
   * element from the timeline but it's not the last segment that would be
   * deduced from the `repeatCount` property, then this value is set to `false`.
   */
  isLastOfTimeline: boolean;
  /**
   * End time at which the last requestable segment ends, in the corresponding
   * index timescale (__NOT__ in seconds).
   */
  end: number;
  /**
   * The index in `timeline` of the last requestable segment.
   * Note that its `repeatCount` may be updated and put as `newRepeatCount`.
   */
  timelineIdx: number;
  /**
   * The new `repeatCount` value for that last segment. May be equal or
   * different from the timeline element found at `timelineIdx`.
   */
  newRepeatCount: number;
}
