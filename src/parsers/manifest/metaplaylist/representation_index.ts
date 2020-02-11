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

import { ICustomError } from "../../../errors";
import {
  IBaseContentInfos,
  IRepresentationIndex,
  ISegment,
} from "../../../manifest";
import objectAssign from "../../../utils/object_assign";

/**
 * The MetaRepresentationIndex is wrapper for all kind of indexes (dash, smooth, etc)
 *
 * It wraps methods from origin indexes, while taking into account of the offset induced
 * by metaplaylist. It makes a bridge between the metaplaylist timeline, and the original
 * timeline of content. (e.g. the segment whose "meta" time is 1500, is actually a
 * segment whose original time is 200, played with an offset of 1300)
 */
export default class MetaRepresentationIndex implements IRepresentationIndex {
  protected _wrappedIndex : IRepresentationIndex;
  private _timeOffset : number;
  private _contentEnd : number | undefined;
  private _transport : string;
  private _baseContentInfos : IBaseContentInfos;

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

  public getInitSegment() {
    const segment = this._wrappedIndex.getInitSegment();
    if (segment === null) {
      return null;
    }
    if (segment.privateInfos === undefined) {
      segment.privateInfos = {};
    }
    segment.privateInfos.metaplaylistInfos = { transportType: this._transport,
                                               baseContent: this._baseContentInfos,
                                               contentStart: this._timeOffset,
                                               contentEnd: this._contentEnd };
    return segment;
  }

  public getSegments(up : number, duration : number) : ISegment[] {
    return this._wrappedIndex.getSegments(up - this._timeOffset, duration)
      .map((segment) => {
        if (segment.privateInfos === undefined) {
          segment.privateInfos = {};
        }
        segment.privateInfos.metaplaylistInfos = { transportType: this._transport,
                                                   baseContent: this._baseContentInfos,
                                                   contentStart: this._timeOffset,
                                                   contentEnd: this._contentEnd };
        segment.time += this._timeOffset * segment.timescale;
        return segment;
      });
  }

  public shouldRefresh() : boolean {
    return false;
  }

  public getFirstPosition(): number|undefined {
    const wrappedFirstPosition = this._wrappedIndex.getFirstPosition();
    return wrappedFirstPosition != null ? wrappedFirstPosition + this._timeOffset :
                                          undefined;
  }

  public getLastPosition(): number|undefined {
    const wrappedLastPosition = this._wrappedIndex.getLastPosition();
    return wrappedLastPosition != null ? wrappedLastPosition + this._timeOffset :
                                         undefined;
  }

  public isSegmentStillAvailable(segment : ISegment) : boolean | undefined {
    const offset = this._timeOffset * segment.timescale;
    const updatedSegment = objectAssign({},
                                        segment,
                                        { time: segment.time - offset });
    return this._wrappedIndex.isSegmentStillAvailable(updatedSegment);
  }

  /**
   * @param {Error} error
   * @returns {Boolean}
   */
  public canBeOutOfSyncError(error : ICustomError) : boolean {
    return this._wrappedIndex.canBeOutOfSyncError(error);
  }

  public checkDiscontinuity(time: number): number {
    return this._wrappedIndex.checkDiscontinuity(time - this._timeOffset);
  }

  public isFinished() : boolean {
    return this._wrappedIndex.isFinished();
  }

  public _replace(newIndex : IRepresentationIndex): void {
    if (!(newIndex instanceof MetaRepresentationIndex)) {
      throw new Error("A MetaPlaylist can only be replaced with another MetaPlaylist");
    }
    this._wrappedIndex._replace(newIndex._wrappedIndex);
  }

  public _update(newIndex : IRepresentationIndex): void {
    if (!(newIndex instanceof MetaRepresentationIndex)) {
      throw new Error("A MetaPlaylist can only be updated with another MetaPlaylist");
    }
    this._wrappedIndex._update(newIndex._wrappedIndex);
  }

  public _addSegments(
    nextSegments : Array<{ time : number;
                           duration : number;
                           timescale : number;
                           count? : number;
                           range? : [number, number]; }>,
    currentSegment? : { duration? : number;
                        time : number;
                        timescale? : number; }
  ): void {
    return this._wrappedIndex._addSegments(nextSegments, currentSegment);
  }
}
