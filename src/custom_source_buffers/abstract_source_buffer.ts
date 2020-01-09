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
import { ICustomSourceBuffer } from "../compat";
import EventEmitter from "../utils/event_emitter";
import tryCatch from "../utils/rx-try_catch";
import ManualTimeRanges from "./time_ranges";

interface IAbstractSourceBufferEvent { updatestart : undefined;
                                       update : undefined;
                                       updateend : undefined;

                                       // FIXME
                                       // The W3C specification indicates that
                                       // an "Event" object should be sent with
                                       // the error event. This is the only
                                       // difference with our custom
                                       // implementation where an `Error` will
                                       // generally be sent instead. Waiting for
                                       // a better solution, we for now put an
                                       // `any` type here and will treat any
                                       // error as an `unknown` type at the
                                       // other side.
                                       error : any; }

/**
 * Abstract class for a custom SourceBuffer implementation.
 * @class AbstractSourceBuffer
 * @extends EventEmitter
 */
export default abstract class AbstractSourceBuffer<T>
                        extends EventEmitter<IAbstractSourceBufferEvent>
                        implements ICustomSourceBuffer<T>
{
  public timestampOffset : number;
  public updating : boolean;
  public buffered : ManualTimeRanges;
  public readyState : string;
  public appendWindowStart : number;
  public appendWindowEnd : number;

  constructor() {
    super();
    this.updating = false;
    this.readyState = "opened";
    this.buffered = new ManualTimeRanges();
    this.timestampOffset = 0;
    this.appendWindowStart = 0;
    this.appendWindowEnd = Infinity;
  }

  /**
   * Mimic the SourceBuffer _appendBuffer_ method: Append a segment to the
   * buffer.
   * @param {*} data
   */
  public appendBuffer(data : T) : void {
    this._lock(() => this._append(data));
  }

  /**
   * Mimic the SourceBuffer _remove_ method: remove buffered segments.
   * @param {Number} from
   * @param {Number} to
   */
  public remove(from : number, to : number) : void {
    this._lock(() => this._remove(from, to));
  }

  /**
   * Call `appendBuffer` synchronously (do not wait for nextTick).
   * @param {*} data
   */
  public appendBufferSync(data : T) : void {
    this._lockSync(() => this._append(data));
  }

  /**
   * Call `remove` synchronously (do not wait for nextTick).
   * @param {Number} from
   * @param {Number} to
   */
  public removeSync(from : number, to : number) : void {
    this._lockSync(() => this._remove(from, to));
  }

  /**
   * Mimic the SourceBuffer _abort_ method.
   */
  public abort() : void {
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
    }, undefined);
    result.subscribe(()  => nextTick(() => {
                       this.updating = false;
                       this.trigger("update", undefined);
                       this.trigger("updateend", undefined);
                     }),
                     (e : unknown) => nextTick(() => {
                       this.updating = false;
                       this.trigger("error", e);
                       this.trigger("updateend", undefined);
                     }));
  }

  /**
   * Call SourceBuffer function but throw errors and emit events synchronously.
   * Throws if another function is already active.
   * Also triggers the right events on start, error and end
   * @param {Function} func
   * @param {*} data
   */
  private _lockSync(func : () => void) : void {
    if (this.updating) {
      throw new Error("SourceBuffer: SourceBuffer already updating.");
    }
    this.updating = true;
    this.trigger("updatestart", undefined);

    try {
      func();
    } catch (e) {
      this.updating = false;
      this.trigger("error", e);
      this.trigger("updateend", undefined);
      throw e;
    }
    this.updating = false;
    this.trigger("update", undefined);
    this.trigger("updateend", undefined);
  }
}
