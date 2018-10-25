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

import nextTick from "next-tick";
import {
  Observable,
  of as observableOf,
} from "rxjs";
import EventEmitter from "../../utils/eventemitter";
import tryCatch from "../../utils/rx-tryCatch";
import ManualTimeRanges from "./time_ranges";

export interface ICustomSourceBuffer<T> {
  addEventListener : (eventName : string, cb : (arg : any) => void) => void;
  removeEventListener : (
    eventName : string,
    callback : (arg : any) => void
  ) => void;
  buffered : TimeRanges;
  updating : boolean;
  timestampOffset : number;
  appendBuffer(data : T) : void;
  remove(from : number, to : number) : void;
  abort() : void;
}

/**
 * Abstract class for a custom SourceBuffer implementation.
 * @class AbstractSourceBuffer
 * @extends EventEmitter
 */
export default abstract class AbstractSourceBuffer<T>
  extends EventEmitter<string, any>
  implements ICustomSourceBuffer<T>
{
  public timestampOffset : number;
  public updating : boolean;
  public buffered : ManualTimeRanges;
  public readyState : string;

  constructor() {
    super();
    this.updating = false;
    this.readyState = "opened";
    this.buffered = new ManualTimeRanges();
    this.timestampOffset = 0;
  }

  /**
   * Mimic the SourceBuffer _appendBuffer_ method: Append a segment to the
   * buffer.
   * @param {*} data
   */
  appendBuffer(data : T) : void {
    this._lock(() => this._append(data));
  }

  /**
   * Mimic the SourceBuffer _remove_ method: remove buffered segments.
   * @param {Number} from
   * @param {Number} to
   */
  remove(from : number, to : number) : void {
    this._lock(() => this._remove(from, to));
  }

  /**
   * Mimic the SourceBuffer _abort_ method.
   */
  abort() : void {
    this.remove(0, Infinity);
    this.updating = false;
    this.readyState = "closed";
    this._abort();
  }

  protected abstract _append(_data : T) : void;
  protected abstract _remove(_from : number, _to : number) : void;
  protected abstract _abort() : void;

  /**
   * Active a lock, execute the given function, unlock when finished (on
   * nextTick).
   * Throws if multiple lock are active at the same time.
   * Also triggers the right events on start, error and end
   * @param {Function} func
   */
  private _lock(func : () => void) : void {
    if (this.updating) {
      throw new Error("SourceBuffer: SourceBuffer already updating.");
    }
    this.updating = true;
    this.trigger("updatestart", undefined);
    const result : Observable<void> = tryCatch(() => {
      func();
      return observableOf(undefined);
    });
    result.subscribe(
      ()  => nextTick(() => {
        this.updating = false;
        this.trigger("update", undefined);
        this.trigger("updateend", undefined);
      }),
      (e) => nextTick(() => {
        this.updating = false;
        this.trigger("error", e);
        this.trigger("updateend", undefined);
      })
    );
  }
}
