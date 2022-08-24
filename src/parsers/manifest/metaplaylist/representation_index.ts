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
  IBaseContentInfos,
  IRepresentationIndex,
  ISegment,
} from "../../../manifest";
import { IPlayerError } from "../../../public_types";
import objectAssign from "../../../utils/object_assign";

/**
 * The MetaRepresentationIndex is wrapper for all kind of RepresentationIndex (from
 * dash, smooth, etc)
 *
 * It wraps methods from original RepresentationIndex, while taking into account
 * the time offset introduced by the MetaPlaylist content.
 *
 * It makes a bridge between the MetaPlaylist timeline, and the original
 * timeline of content. (e.g. the segment whose "meta" time is 1500, is actually a
 * segment whose original time is 200, played with an offset of 1300)
 * @class MetaRepresentationIndex
 */
export default class MetaRepresentationIndex implements IRepresentationIndex {
  /** Real underlying RepresentationIndex implementation. */
  protected _wrappedIndex : IRepresentationIndex;
  /** Offset time to add to the start of the Representation, in seconds. */
  private _timeOffset : number;
  /** Absolute end of the Representation, in the seconds. */
  private _contentEnd : number | undefined;
  /** Underlying transport for the Representation (e.g. "dash" or "smooth"). */
  private _transport : string;
  /** Various information about the real underlying Representation. */
  private _baseContentInfos : IBaseContentInfos;

  /**
   * Create a new `MetaRepresentationIndex`.
   * @param {Object} wrappedIndex - "Real" RepresentationIndex implementation of
   * the concerned Representation.
   * @param {Array.<number|undefined>} contentBounds - Start time and end time
   * the Representation will be played between, in seconds.
   * @param {string} transport - Transport for the "real" RepresentationIndex
   * (e.g. "dash" or "smooth").
   * @param {Object} baseContentInfos - Various information about the "real"
   * Representation.
   */
  constructor(
    wrappedIndex: IRepresentationIndex,
    contentBounds: [number, number|undefined],
    transport: string,
    baseContentInfos: IBaseContentInfos
  ) {
    this._wrappedIndex = wrappedIndex;
    this._timeOffset = contentBounds[0];
    this._contentEnd = contentBounds[1];
    this._transport = transport;
    this._baseContentInfos = baseContentInfos;
  }

  /**
   * Returns information about the initialization segment.
   */
  public getInitSegment() : ISegment | null {
    const segment = this._wrappedIndex.getInitSegment();
    if (segment === null) {
      return null;
    }
    return this._cloneWithPrivateInfos(segment);
  }

  /**
   * Returns information about the segments asked.
   * @param {number} up - Starting time wanted, in seconds.
   * @param {Number} duration - Amount of time wanted, in seconds
   * @returns {Array.<Object>}
   */
  public getSegments(up : number, duration : number) : ISegment[] {
    return this._wrappedIndex.getSegments(up - this._timeOffset, duration)
      .map((segment) => {
        const clonedSegment = this._cloneWithPrivateInfos(segment);
        clonedSegment.time += this._timeOffset;
        clonedSegment.end += this._timeOffset;
        return clonedSegment;
      });
  }

  /**
   * Whether this RepresentationIndex should be refreshed now.
   * Returns `false` as MetaPlaylist contents do not support underlying live
   * contents yet.
   * @returns {Boolean}
   */
  public shouldRefresh() : false {
    return false;
  }

  /**
   * Returns first possible position the first segment plays at, in seconds.
   * `undefined` if we do not know this value.
   * @return {Number|undefined}
   */
  public getFirstAvailablePosition(): number|undefined {
    const wrappedFirstPosition = this._wrappedIndex.getFirstAvailablePosition();
    return wrappedFirstPosition != null ? wrappedFirstPosition + this._timeOffset :
                                          undefined;
  }

  /**
   * Returns last possible position the last segment plays at, in seconds.
   * `undefined` if we do not know this value.
   * @return {Number|undefined}
   */
  public getLastAvailablePosition(): number|undefined {
    const wrappedLastPosition = this._wrappedIndex.getLastAvailablePosition();
    return wrappedLastPosition != null ? wrappedLastPosition + this._timeOffset :
                                         undefined;
  }

  /**
   * Returns the absolute end in seconds this RepresentationIndex can reach once
   * all segments are available.
   * @returns {number|null|undefined}
   */
  public getEnd(): number|undefined|null {
    const wrappedEnd = this._wrappedIndex.getEnd();
    return wrappedEnd != null ? wrappedEnd + this._timeOffset :
                                undefined;
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
  public awaitSegmentBetween(start: number, end: number): boolean | undefined {
    return this._wrappedIndex.awaitSegmentBetween(start - this._timeOffset,
                                                  end - this._timeOffset);
  }

  /**
   * Returns `false` if that segment is not currently available in the Manifest
   * (e.g. it corresponds to a segment which is before the current buffer
   * depth).
   * @param {Object} segment
   * @returns {boolean|undefined}
   */
  public isSegmentStillAvailable(segment : ISegment) : boolean | undefined {
    if (segment.privateInfos?.metaplaylistInfos === undefined) {
      return false;
    }
    const { originalSegment } = segment.privateInfos.metaplaylistInfos;
    return this._wrappedIndex.isSegmentStillAvailable(originalSegment);
  }

  /**
   * @param {Error} error
   * @param {Object} segment
   * @returns {Boolean}
   */
  public canBeOutOfSyncError(error : IPlayerError, segment : ISegment) : boolean {
    if (segment.privateInfos?.metaplaylistInfos === undefined) {
      return false;
    }
    const { originalSegment } = segment.privateInfos.metaplaylistInfos;
    return this._wrappedIndex.canBeOutOfSyncError(error, originalSegment);
  }

  /**
   *
   * @param {Number} time
   * @returns {Number | null}
   */
  public checkDiscontinuity(time: number): number | null {
    return this._wrappedIndex.checkDiscontinuity(time - this._timeOffset);
  }

  /**
   * @returns {Boolean}
   */
  public isFinished() : boolean {
    return this._wrappedIndex.isFinished();
  }

  /**
   * @returns {Boolean}
   */
  public isInitialized() : boolean {
    return this._wrappedIndex.isInitialized();
  }

  /**
   * @param {Object} newIndex
   */
  public _replace(newIndex : IRepresentationIndex): void {
    if (!(newIndex instanceof MetaRepresentationIndex)) {
      throw new Error("A MetaPlaylist can only be replaced with another MetaPlaylist");
    }
    this._wrappedIndex._replace(newIndex._wrappedIndex);
  }

  /**
   * @param {Object} newIndex
   */
  public _update(newIndex : IRepresentationIndex): void {
    if (!(newIndex instanceof MetaRepresentationIndex)) {
      throw new Error("A MetaPlaylist can only be updated with another MetaPlaylist");
    }
    this._wrappedIndex._update(newIndex._wrappedIndex);
  }

  /**
   * Clone the given segment, presumably coming from its original
   * RepresentationIndex, and add the linked metaplaylist privateInfos to it.
   * Return that cloned and enhanced segment.
   * @param {Object} segment
   * @returns {Object}
   */
  private _cloneWithPrivateInfos(segment : ISegment) : ISegment {
    const clonedSegment = objectAssign({}, segment);
    if (clonedSegment.privateInfos === undefined) {
      clonedSegment.privateInfos = {};
    }
    clonedSegment.privateInfos.metaplaylistInfos = {
      transportType: this._transport,
      baseContent: this._baseContentInfos,
      contentStart: this._timeOffset,
      contentEnd: this._contentEnd,
      originalSegment: segment,
    };
    return clonedSegment;
  }
}
