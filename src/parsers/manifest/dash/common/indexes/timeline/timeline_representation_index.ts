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
import {
  IRepresentationIndex,
  ISegment,
  Representation,
} from "../../../../../../manifest";
import { IPlayerError } from "../../../../../../public_types";
import { IEMSG } from "../../../../../containers/isobmff";
import clearTimelineFromPosition from "../../../../utils/clear_timeline_from_position";
import {
  checkDiscontinuity,
  fromIndexTime,
  getIndexSegmentEnd,
  IIndexSegment,
  toIndexTime,
} from "../../../../utils/index_helpers";
import isSegmentStillAvailable from "../../../../utils/is_segment_still_available";
import updateSegmentTimeline from "../../../../utils/update_segment_timeline";
import { ISegmentTimelineElement } from "../../../node_parser_types";
import ManifestBoundsCalculator from "../../manifest_bounds_calculator";
import { IResolvedBaseUrl } from "../../resolve_base_urls";
import getInitSegment from "../get_init_segment";
import getSegmentsFromTimeline from "../get_segments_from_timeline";
import isPeriodFulfilled from "../is_period_fulfilled";
import { createIndexURLs } from "../tokens";
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
    /** URLs to access the initialization segment. */
    mediaURLs: string[] | null;
    /** possible byte range to request it. */
    range?: [number, number] | undefined;
  } | undefined;
  /**
   * Base URL(s) to access any segment. Can contain tokens to replace to convert
   * it to real URLs.
   */
  mediaURLs : string[] | null ;
  /** Number from which the first segments in this index starts with. */
  startNumber? : number | undefined;
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
  /** If `false`, the last segment anounced might be still incomplete. */
  availabilityTimeComplete : boolean;
  /** Allows to obtain the minimum and maximum positions of a content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /** Start of the period linked to this RepresentationIndex, in seconds. */
  periodStart : number;
  /** End of the period linked to this RepresentationIndex, in seconds. */
  periodEnd : number|undefined;
  /** Whether the corresponding Manifest can be updated and changed. */
  isDynamic : boolean;
  /**
   * Time (in terms of `performance.now`) at which the XML file containing this
   * index was received
   */
  receivedTime? : number | undefined;
  /** Base URL for the Representation concerned. */
  representationBaseURLs : IResolvedBaseUrl[];
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
  unsafelyBaseOnPreviousRepresentation : Representation | null;
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

export default class TimelineRepresentationIndex implements IRepresentationIndex {
  /** Underlying structure to retrieve segment information. */
  protected _index : ITimelineIndex;

  /** Time, in terms of `performance.now`, of the last Manifest update. */
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
            manifestBoundsCalculator,
            isDynamic,
            isLastPeriod,
            representationBaseURLs,
            representationId,
            representationBitrate,
            periodStart,
            periodEnd,
            isEMSGWhitelisted } = context;
    const timescale = index.timescale ?? 1;

    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset :
      0;

    const scaledStart = periodStart * timescale;
    const indexTimeOffset = presentationTimeOffset - scaledStart;

    this._manifestBoundsCalculator = manifestBoundsCalculator;

    this._isEMSGWhitelisted = isEMSGWhitelisted;
    this._isLastPeriod = isLastPeriod;
    this._lastUpdate = context.receivedTime == null ?
                                 performance.now() :
                                 context.receivedTime;

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
    const urlSources : string[] = representationBaseURLs.map(b => b.url);
    this._index = { availabilityTimeComplete,
                    indexRange: index.indexRange,
                    indexTimeOffset,
                    initialization: index.initialization == null ?
                      undefined :
                      {
                        mediaURLs: createIndexURLs(urlSources,
                                                   index.initialization.media,
                                                   representationId,
                                                   representationBitrate),
                        range: index.initialization.range,
                      },
                    mediaURLs: createIndexURLs(urlSources,
                                               index.media,
                                               representationId,
                                               representationBitrate),
                    startNumber: index.startNumber,
                    timeline: index.timeline ?? null,
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
    const { mediaURLs,
            startNumber,
            timeline,
            timescale,
            indexTimeOffset } = this._index;
    return getSegmentsFromTimeline({ mediaURLs,
                                     startNumber,
                                     timeline,
                                     timescale,
                                     indexTimeOffset },
                                   from,
                                   duration,
                                   this._isEMSGWhitelisted,
                                   this._scaledPeriodEnd);
  }

  /**
   * Returns true if the index should be refreshed.
   * @param {Number} _up
   * @param {Number} to
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
  getFirstPosition() : number|null {
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
  getLastPosition() : number|null {
    this._refreshTimeline();
    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    const lastTime = TimelineRepresentationIndex.getIndexEnd(this._index.timeline,
                                                             this._scaledPeriodEnd);
    return lastTime === null ? null :
                               fromIndexTime(lastTime, this._index);
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
    const { timeline, timescale, indexTimeOffset } = this._index;
    return isSegmentStillAvailable(segment, timeline, timescale, indexTimeOffset);
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

  areSegmentsChronologicallyGenerated() : boolean {
    return true;
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
    this._isDynamic = newIndex._isDynamic;
    this._scaledPeriodStart = newIndex._scaledPeriodStart;
    this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
    this._lastUpdate = newIndex._lastUpdate;
    this._isLastPeriod = newIndex._isLastPeriod;
  }

  /**
   * Returns `true` if this RepresentationIndex currently contains its last
   * segment.
   * Returns `false` if it's still pending.
   * @returns {Boolean}
   */
  isFinished() : boolean {
    if (!this._isDynamic || !this._isLastPeriod) {
      // Either the content is not dynamic, in which case no new segment will
      // be generated, either it is but this index is not linked to the current
      // last Period in the MPD, in which case it is inferred that it has been
      // completely generated. Note that this second condition might break very
      // very rare use cases where old Periods are still being generated, yet it
      // should fix more cases than it breaks.
      return true;
    }

    if (this._index.timeline === null) {
      this._index.timeline = this._getTimeline();
    }
    const { timeline } = this._index;
    if (this._scaledPeriodEnd === undefined || timeline.length === 0) {
      return false;
    }
    const lastTimelineElement = timeline[timeline.length - 1];
    const lastTime = getIndexSegmentEnd(lastTimelineElement,
                                        null,
                                        this._scaledPeriodEnd);
    return isPeriodFulfilled(this._index.timescale, lastTime, this._scaledPeriodEnd);
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
    const firstPosition = this._manifestBoundsCalculator.estimateMinimumBound();
    if (firstPosition == null) {
      return; // we don't know yet
    }
    const scaledFirstPosition = toIndexTime(firstPosition, this._index);
    const nbEltsRemoved = clearTimelineFromPosition(this._index.timeline,
                                                    scaledFirstPosition);
    if (this._index.startNumber !== undefined) {
      this._index.startNumber += nbEltsRemoved;
    }
  }

  static getIndexEnd(timeline : IIndexSegment[],
                     scaledPeriodEnd : number | undefined) : number | null {
    if (timeline.length <= 0) {
      return null;
    }
    return Math.min(getIndexSegmentEnd(timeline[timeline.length - 1],
                                       null,
                                       scaledPeriodEnd),
                    scaledPeriodEnd ?? Infinity);
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
      return constructTimelineFromElements(newElements);
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

    return constructTimelineFromPreviousTimeline(newElements, prevTimeline);

  }
}
