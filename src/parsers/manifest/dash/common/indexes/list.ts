/*
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
import { IEMSG } from "../../../../containers/isobmff";
import { getTimescaledRange } from "../../../utils/index_helpers";
import { IResolvedBaseUrl } from "../resolve_base_urls";
import getInitSegment from "./get_init_segment";
import { createIndexURLs } from "./tokens";

/**
 * Index property defined for a SegmentList RepresentationIndex
 * This object contains every property needed to generate an ISegment for a
 * given media time.
 */
export interface IListIndex {
  /**
   * Duration of each element in the list, in the timescale given (see
   * timescale and list properties.)
   */
  duration : number;
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
  /** Information on the list of segments for this index. */
  list: Array<{
    /**
     * URLs of the segment.
     * `null` if no URL exists.
     */
    mediaURLs : string[] | null;
    /** Possible byte-range of the segment. */
    mediaRange? : [number, number] | undefined;
  }>;
  /**
   * Timescale to convert a time given here into seconds.
   * This is done by this simple operation:
   * ``timeInSeconds = timeInIndex * timescale``
   */
  timescale : number;
}

/**
 * `index` Argument for a SegmentList RepresentationIndex.
 * Most of the properties here are already defined in IListIndex.
 */
export interface IListIndexIndexArgument {
  duration? : number | undefined;
  indexRange?: [number, number] | undefined;
  initialization?: { media? : string | undefined;
                     range? : [number, number] | undefined; };
  list: Array<{ media? : string | undefined;
                mediaRange? : [number, number] | undefined; }>;
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
  timescale? : number | undefined;
}

/** Aditional context needed by a SegmentList RepresentationIndex. */
export interface IListIndexContextArgument {
  /** Start of the period concerned by this RepresentationIndex, in seconds. */
  periodStart : number;
  /** End of the period concerned by this RepresentationIndex, in seconds. */
  periodEnd : number | undefined;
  /** Base URL for the Representation concerned. */
  representationBaseURLs : IResolvedBaseUrl[];
  /** ID of the Representation concerned. */
  representationId? : string | undefined;
  /** Bitrate of the Representation concerned. */
  representationBitrate? : number | undefined;
  /* Function that tells if an EMSG is whitelisted by the manifest */
  isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;
}

export default class ListRepresentationIndex implements IRepresentationIndex {
  /** Underlying structure to retrieve segment information. */
  private _index : IListIndex;
  /** Start of the period concerned by this RepresentationIndex, in seconds. */
  protected _periodStart : number;
  /** End of the period concerned by this RepresentationIndex, in seconds. */
  protected _periodEnd : number | undefined;
  /* Function that tells if an EMSG is whitelisted by the manifest */
  private _isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(index : IListIndexIndexArgument, context : IListIndexContextArgument) {
    if (index.duration === undefined) {
      throw new Error("Invalid SegmentList: no duration");
    }

    const { periodStart,
            periodEnd,
            representationBaseURLs,
            representationId,
            representationBitrate,
            isEMSGWhitelisted } = context;
    this._isEMSGWhitelisted = isEMSGWhitelisted;
    this._periodStart = periodStart;
    this._periodEnd = periodEnd;
    const presentationTimeOffset =
      index.presentationTimeOffset != null ? index.presentationTimeOffset :
                                             0;
    const timescale = index.timescale ?? 1;
    const indexTimeOffset = presentationTimeOffset - periodStart * timescale;

    const urlSources : string[] = representationBaseURLs.map(b => b.url);
    const list = index.list.map((lItem) => ({
      mediaURLs: createIndexURLs(urlSources,
                                 lItem.media,
                                 representationId,
                                 representationBitrate),
      mediaRange: lItem.mediaRange }));
    this._index = { list,
                    timescale,
                    duration: index.duration,
                    indexTimeOffset,
                    indexRange: index.indexRange,
                    initialization: index.initialization == null ?
                      undefined :
                      { mediaURLs: createIndexURLs(urlSources,
                                                   index.initialization.media,
                                                   representationId,
                                                   representationBitrate),
                        range: index.initialization.range } };
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    const initSegment = getInitSegment(this._index);
    if (initSegment.privateInfos === undefined) {
      initSegment.privateInfos = {};
    }
    initSegment.privateInfos.isEMSGWhitelisted = this._isEMSGWhitelisted;
    return initSegment;
  }

  /**
   * @param {Number} fromTime
   * @param {Number} dur
   * @returns {Array.<Object>}
   */
  getSegments(fromTime : number, dur : number) : ISegment[] {
    const index = this._index;
    const { duration, list, timescale } = index;
    const durationInSeconds = duration / timescale;
    const fromTimeInPeriod = fromTime - this._periodStart;
    const [ up, to ] = getTimescaledRange(fromTimeInPeriod, dur, timescale);

    const length = Math.min(list.length - 1, Math.floor(to / duration));
    const segments : ISegment[] = [];
    let i = Math.floor(up / duration);
    while (i <= length) {
      const range = list[i].mediaRange;
      const mediaURLs = list[i].mediaURLs;
      const time = i * durationInSeconds + this._periodStart;
      const segment =
        { id: String(i),
          time,
          isInit: false,
          range,
          duration: durationInSeconds,
          timescale: 1 as const,
          end: time + durationInSeconds,
          mediaURLs,
          timestampOffset: -(index.indexTimeOffset / timescale),
          complete: true,
          privateInfos: { isEMSGWhitelisted:
                            this._isEMSGWhitelisted } };
      segments.push(segment);
      i++;
    }
    return segments;
  }

  /**
   * Returns whether the Manifest should be refreshed based on the
   * `ListRepresentationIndex`'s state and the time range the player is
   * currently considering.
   * @param {Number} _fromTime
   * @param {Number} _toTime
   * @returns {Boolean}
   */
  shouldRefresh(_fromTime : number, _toTime : number) : boolean {
    // DASH Manifests are usually refreshed through other means, i.e. thanks to
    // the `minimumUpdatePeriod` attribute.
    // Moreover, SegmentList are usually only found in static MPDs.
    return false;
  }

  /**
   * Returns first position in this index, in seconds.
   * @returns {Number}
   */
  getFirstAvailablePosition() : number {
    return this._periodStart;
  }

  /**
   * Returns last position in this index, in seconds.
   * @returns {Number}
   */
  getLastAvailablePosition() : number {
    const index = this._index;
    const { duration, list } = index;
    return Math.min(((list.length * duration) / index.timescale) + this._periodStart,
                    this._periodEnd ?? Infinity);
  }

  /**
   * Returns the absolute end in seconds this RepresentationIndex can reach once
   * all segments are available.
   * @returns {number|null|undefined}
   */
  getEnd(): number | null {
    return this.getLastAvailablePosition();
  }

  /**
   * Returns:
   *   - `true` if in the given time interval, at least one new segment is
   *     expected to be available in the future.
   *   - `false` either if all segments in that time interval are already
   *     available for download or if none will ever be available for it.
   *   - `undefined` when it is not possible to tell.
   *
   * Always `false` in a `ListRepresentationIndex` because all segments should
   * be directly available.
   * @returns {boolean}
   */
  awaitSegmentBetween(): false {
    return false;
  }

  /**
   * Returns true if a Segment returned by this index is still considered
   * available.
   * @returns {Boolean}
   */
  isSegmentStillAvailable() : true {
    return true;
  }


  /**
   * We do not check for discontinuity in SegmentList-based indexes.
   * @returns {null}
   */
  checkDiscontinuity() : null {
    return null;
  }

  /**
   * SegmentList should not be updated.
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
   * @returns {Boolean}
   */
  isInitialized() : true {
    return true;
  }

  initialize() : void {
    log.error("A `ListRepresentationIndex` does not need to be initialized");
  }

  /**
   * @param {Object} newIndex
   */
  _replace(newIndex : ListRepresentationIndex) : void {
    this._index = newIndex._index;
  }

  _update() : void {
    log.error("A `ListRepresentationIndex` cannot be updated");
  }
}
