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

import log from "./log";
import assert from "./assert";

type listenerFunction<T> = (payload : T) => void;
interface IListeners<T> {
  [propName: string] : Array<listenerFunction<T>>;
}

export default class EventEmitter {
  public on = this.addEventListener;
  public off = this.removeEventListener;
  private _listeners : IListeners<any>;

  constructor() {
    this._listeners = {};
  }

  public addEventListener(evt : string, fn : listenerFunction<any>) : void {
    assert(typeof fn === "function",
           "eventemitter: second argument should be a function");
    if (!this._listeners[evt]) {
      this._listeners[evt] = [];
    }
    this._listeners[evt].push(fn);
  }

  public removeEventListener(evt : string, fn : listenerFunction<any>) : void {
    if (arguments.length === 0) {
      this._listeners = {};
      return;
    }
    if (!this._listeners.hasOwnProperty(evt)) {
      return;
    }
    if (arguments.length === 1) {
      delete this._listeners[evt];
      return;
    }
    const listeners = this._listeners[evt];
    const index = listeners.indexOf(fn);
    if (~index) {
      listeners.splice(index, 1);
    }
    if (!listeners.length) {
      delete this._listeners[evt];
    }
  }

  public trigger(evt : string, arg? : any) : void {
    if (!this._listeners.hasOwnProperty(evt)) {
      return;
    }
    const listeners = this._listeners[evt].slice();
    listeners.forEach((listener) => {
      try {
        listener(arg);
      } catch (e) {
        log.error(e, e.stack);
      }
    });
  }
}
