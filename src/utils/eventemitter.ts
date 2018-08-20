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

import log from "../log";

type IListeners<T extends string, U> =
  Partial<Record<
    T,
    Array<listenerFunction<U>>
  >>;
type listenerFunction<U> = (payload : U) => void;

export interface IEventEmitter<T extends string, U> {
  addEventListener(evt : T, fn : listenerFunction<U>) : void;
  removeEventListener(evt? : T, fn? : listenerFunction<U>) : void;
}

/**
 * Simple EventEmitted implementation.
 * @class EventEmitter
 */
export default class EventEmitter<T extends string, U>
  implements IEventEmitter<T, U> {
  /**
   * @type {Object}
   * @private
   */
  private _listeners : IListeners<T, U>;

  constructor() {
    this._listeners = {};
  }

  /**
   * Register a new callback for an event.
   *
   * @param {string} evt - The event to register a callback to
   * @param {Function} fn - The callback to call as that event is triggered.
   * The callback will take as argument the eventual payload of the event
   * (single argument).
   */
  public addEventListener(evt : T, fn : listenerFunction<U>) : void {
    const listeners = this._listeners[evt];
    if (!listeners) {
      // TS Bug?
      (this._listeners[evt] as Array<listenerFunction<U>>) = [fn];
    } else {
      listeners.push(fn);
    }
  }

  /**
   * Unregister callbacks linked to events.
   * @param {string} [evt] - The event for which the callback[s] should be
   * unregistered. Set it to null or undefined to remove all callbacks
   * currently registered (for any event).
   * @param {Function} [fn] - The callback to unregister. If set to null
   * or undefined while the evt argument is set, all callbacks linked to that
   * event will be unregistered.
   */
  public removeEventListener(evt? : T, fn? : listenerFunction<U>) : void {
    if (evt == null) {
      this._listeners = {};
      return;
    }

    const listeners = this._listeners[evt];
    if (!listeners) {
      return;
    }
    if (fn == null) {
      delete this._listeners[evt];
      return;
    }

    const index = listeners.indexOf(fn);
    if (~index) {
      listeners.splice(index, 1);
    }

    if (!listeners.length) {
      delete this._listeners[evt];
    }
  }

  /**
   * Trigger every registered callbacks for a given event
   * @param {string} evt - The event to trigger
   * @param {*} arg - The eventual payload for that event. All triggered
   * callbacks will recieve this payload as argument.
   */
  public trigger(evt : T, arg : U) : void {
    const listeners = this._listeners[evt];
    if (!listeners) {
      return;
    }

    listeners.slice().forEach((listener) => {
      try {
        listener(arg);
      } catch (e) {
        log.error(e, e.stack);
      }
    });
  }
}
