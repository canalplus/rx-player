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
  defer as observableDefer,
  Observable,
  ReplaySubject,
} from "rxjs";
import {
  IBufferType,
  IEndOfSegmentInfos,
  IPushChunkInfos,
  ISBOperation,
  SegmentBuffer,
  SegmentBufferOperation,
} from "./types";
import ManualTimeRanges from "./utils/manual_time_ranges";

export default class TemporarySegmentBuffer<T> extends SegmentBuffer<T> {
  /** "Type" of the buffer concerned. */
  public readonly bufferType : IBufferType;

  private readonly _currentQueue : Array<ISBOperation<T>>;

  private readonly _emptyTimeRanges : ManualTimeRanges;

  private readonly _destroy$ : ReplaySubject<void>;

  /**
   * @constructor
   * @param {string} bufferType
   * @param {string} codec
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(bufferType : IBufferType) {
    super();
    this.bufferType = bufferType;
    this._currentQueue = [];
    this._emptyTimeRanges = new ManualTimeRanges();
    this._destroy$ = new ReplaySubject<void>(1);
  }

  /**
   * @param {Object} infos
   * @returns {Observable}
   */
  public pushChunk(infos : IPushChunkInfos<T>) : Observable<void> {
    return observableDefer(() => {
      this._currentQueue.push({ type: SegmentBufferOperation.Push,
                                value: infos });
      return this._destroy$;
    });
  }

  /**
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<void> {
    return observableDefer(() => {
      this._currentQueue.push({ type: SegmentBufferOperation.Remove,
                                value: { start, end } });
      return this._destroy$;
    });
  }

  /**
   * @param {Object} infos
   * @returns {Observable}
   */
  public endOfSegment(infos : IEndOfSegmentInfos) : Observable<void> {
    return observableDefer(() => {
      this._currentQueue.push({ type: SegmentBufferOperation.EndOfSegment,
                                value: infos });
      return this._destroy$;
    });
  }

  /**
   * @returns {TimeRanges}
   */
  public getBufferedRanges() : TimeRanges {
    return this._emptyTimeRanges;
  }

  /**
   * @returns {Array.<Object>}
   */
  public getPendingOperations() : Array<ISBOperation<T>> {
    return this._currentQueue;
  }

  public dispose() : void {
    this._currentQueue.length = 0;
    this._destroy$.next();
  }
}
