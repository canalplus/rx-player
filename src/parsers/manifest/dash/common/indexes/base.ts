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

import log from "../../../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../../../manifest";
import { ISegmentInformation } from "../../../../../transports";
import { IEMSG } from "../../../../containers/isobmff";
import {
  fromIndexTime,
  getIndexSegmentEnd,
  IIndexSegment,
  toIndexTime,
} from "../../../utils/index_helpers";
import { IResolvedBaseUrl } from "../resolve_base_urls";
import getInitSegment from "./get_init_segment";
import getSegmentsFromTimeline from "./get_segments_from_timeline";
import { createIndexURLs } from "./tokens";

/**
 * Index property defined for a SegmentBase RepresentationIndex
 * This object contains every property needed to generate an ISegment for a
 * given media time.
 */
export interface IBaseIndex {
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
  mediaURLs : string[] | null;
  /** Number from which the first segments in this index starts with. */
  startNumber? : number | undefined;
  /** Every segments defined in this index. */
  timeline : IIndexSegment[];
  /**
   * Timescale to convert a time given here into seconds.
   * This is done by this simple operation:
   * ``timeInSeconds = timeInIndex * timescale``
   */
  timescale : number;
}

/**
 * `index` Argument for a SegmentBase RepresentationIndex.
 * Most of the properties here are already defined in IBaseIndex.
 */
export interface IBaseIndexIndexArgument {
  timeline? : IIndexSegment[];
  timescale? : number;
  media? : string;
  indexRange?: [number, number];
  initialization?: { media?: string; range?: [number, number] };
  startNumber? : number;
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
  presentationTimeOffset? : number;
}

/** Aditional context needed by a SegmentBase RepresentationIndex. */
export interface IBaseIndexContextArgument {
  /** Start of the period concerned by this RepresentationIndex, in seconds. */
  periodStart : number;
  /** End of the period concerned by this RepresentationIndex, in seconds. */
  periodEnd : number|undefined;
  /** Base URL for the Representation concerned. */
  representationBaseURLs : IResolvedBaseUrl[];
  /** ID of the Representation concerned. */
  representationId? : string | undefined;
  /** Bitrate of the Representation concerned. */
  representationBitrate? : number | undefined;
  /* Function that tells if an EMSG is whitelisted by the manifest */
  isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;
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

export default class BaseRepresentationIndex implements IRepresentationIndex {
  /**
   * `true` if the list of segments is already known.
   * `false` if the initialization segment should be loaded (and the segments
   * added) first.
   * @see isInitialized method
   */
  private _isInitialized : boolean;

  /** Underlying structure to retrieve segment information. */
  private _index : IBaseIndex;

  /** Absolute start of the period, timescaled and converted to index time. */
  private _scaledPeriodStart : number;

  /** Absolute end of the period, timescaled and converted to index time. */
  private _scaledPeriodEnd : number | undefined;

  /* Function that tells if an EMSG is whitelisted by the manifest */
  private _isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(index : IBaseIndexIndexArgument, context : IBaseIndexContextArgument) {
    const { periodStart,
            periodEnd,
            representationBaseURLs,
            representationId,
            representationBitrate,
            isEMSGWhitelisted } = context;
    const timescale = index.timescale ?? 1;

    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;

    const indexTimeOffset = presentationTimeOffset - periodStart * timescale;

    const urlSources : string[] = representationBaseURLs.map(b => b.url);
    const mediaURLs = createIndexURLs(urlSources,
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
                    mediaURLs: createIndexURLs(urlSources,
                                               index.media,
                                               representationId,
                                               representationBitrate),
                    startNumber: index.startNumber,
                    timeline: index.timeline ?? [],
                    timescale };
    this._scaledPeriodStart = toIndexTime(periodStart, this._index);
    this._scaledPeriodEnd = periodEnd == null ? undefined :
                                                toIndexTime(periodEnd, this._index);
    this._isInitialized = this._index.timeline.length > 0;
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
   * Get the list of segments that are currently available from the `from`
   * position, in seconds, ending `dur` seconds after that position.
   *
   * Note that if not already done, you might need to "initialize" the
   * `BaseRepresentationIndex` first so that the list of available segments
   * is known.
   *
   * @see isInitialized for more information on `BaseRepresentationIndex`
   * initialization.
   * @param {Number} from
   * @param {Number} dur
   * @returns {Array.<Object>}
   */
  getSegments(from : number, dur : number) : ISegment[] {
    return getSegmentsFromTimeline(this._index,
                                   from,
                                   dur,
                                   this._isEMSGWhitelisted,
                                   this._scaledPeriodEnd);
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
    return fromIndexTime(Math.max(this._scaledPeriodStart,
                                  index.timeline[0].start),
                         index);
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
    const lastTime = Math.min(getIndexSegmentEnd(lastTimelineElement,
                                                 null,
                                                 this._scaledPeriodEnd),
                              this._scaledPeriodEnd ?? Infinity);
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
   * @returns {null}
   */
  checkDiscontinuity() : null {
    return null;
  }

  /**
   * `BaseRepresentationIndex` should just already all be generated.
   * Return `true` as a default value here.
   * @returns {boolean}
   */
  areSegmentsChronologicallyGenerated() : true {
    return true;
  }

  /**
   * Returns `false` as a `BaseRepresentationIndex` should not be dynamic and as
   * such segments should never fall out-of-sync.
   * @returns {Boolean}
   */
  canBeOutOfSyncError() : false {
    return false;
  }

  /**
   * Returns `true` as SegmentBase are not dynamic and as such no new segment
   * should become available in the future.
   * @returns {Boolean}
   */
  isFinished() : true {
    return true;
  }

  /**
   * No segment in a `BaseRepresentationIndex` are known initially.
   * It is only defined generally in an "index segment" that will thus need to
   * be first loaded and parsed.
   *
   * Once the index segment or equivalent has been parsed, the `initializeIndex`
   * method have to be called with the corresponding segment information so the
   * `BaseRepresentationIndex` can be considered as "initialized" (and so this
   * method can return `true`).
   * Until then this method will return `false` and segments linked to that
   * Representation may be missing.
   * @returns {Boolean}
   */
  isInitialized() : boolean {
    return this._isInitialized;
  }

  /**
   * No segment in a `BaseRepresentationIndex` are known initially.
   *
   * It is only defined generally in an "index segment" that will thus need to
   * be first loaded and parsed.
   * Until then, this `BaseRepresentationIndex` is considered as `uninitialized`
   * (@see isInitialized).
   *
   * Once that those information are available, the present
   * `BaseRepresentationIndex` can be "initialized" by adding that parsed
   * segment information through this method.
   * @param {Array.<Object>} indexSegments
   * @returns {Array.<Object>}
   */
  initialize(indexSegments : ISegmentInformation[]) : void {
    if (this._isInitialized) {
      return ;
    }
    for (let i = 0; i < indexSegments.length; i++) {
      _addSegmentInfos(this._index, indexSegments[i]);
    }
    this._isInitialized = true;
  }

  addPredictedSegments() : void {
    log.warn("Cannot add predicted segments to a `BaseRepresentationIndex`");
  }

  /**
   * Replace in-place this `BaseRepresentationIndex` information by the
   * information from another one.
   * @param {Object} newIndex
   */
  _replace(newIndex : BaseRepresentationIndex) : void {
    this._index = newIndex._index;
    this._isInitialized = newIndex._isInitialized;
    this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
    this._isEMSGWhitelisted = newIndex._isEMSGWhitelisted;
  }

  _update() : void {
    log.error("Base RepresentationIndex: Cannot update a SegmentList");
  }
}
