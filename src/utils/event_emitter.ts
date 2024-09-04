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

import isNullOrUndefined from "./is_null_or_undefined";
import type { CancellationSignal } from "./task_canceller";

export interface IEventEmitter<T> {
  addEventListener<TEventName extends keyof T>(
    evt: TEventName,
    fn: IListener<T, TEventName>,
  ): void;
  removeEventListener<TEventName extends keyof T>(
    evt: TEventName,
    fn: IListener<T, TEventName>,
  ): void;
}

// Type of the argument in the listener's callback
export type IEventPayload<
  TEventRecord,
  TEventName extends keyof TEventRecord,
> = TEventRecord[TEventName];

// Type of the listener function
export type IListener<TEventRecord, TEventName extends keyof TEventRecord> = (
  args: IEventPayload<TEventRecord, TEventName>,
) => void;

type IListeners<TEventRecord> = {
  [P in keyof TEventRecord]?: Array<IListener<TEventRecord, P>>;
};

/**
 * Simple but fully type-safe EventEmitter implementation.
 * @class EventEmitter
 */
export default class EventEmitter<T> implements IEventEmitter<T> {
  /**
   * @type {Object}
   * @private
   */
  private _listeners: IListeners<T>;

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
   * @param {Object | undefined} cancellationSignal - When that signal emits,
   * the event listener is automatically removed.
   */
  public addEventListener<TEventName extends keyof T>(
    evt: TEventName,
    fn: IListener<T, TEventName>,
    cancellationSignal?: CancellationSignal,
  ): void {
    const listeners = this._listeners[evt];
    if (!Array.isArray(listeners)) {
      this._listeners[evt] = [fn];
    } else {
      listeners.push(fn);
    }
    if (cancellationSignal !== undefined) {
      cancellationSignal.register(() => {
        this.removeEventListener(evt, fn);
      });
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
  public removeEventListener<TEventName extends keyof T>(
    evt?: TEventName,
    fn?: IListener<T, TEventName>,
  ): void {
    if (isNullOrUndefined(evt)) {
      this._listeners = {};
      return;
    }

    const listeners = this._listeners[evt];
    if (!Array.isArray(listeners)) {
      return;
    }
    if (isNullOrUndefined(fn)) {
      delete this._listeners[evt];
      return;
    }

    const index = listeners.indexOf(fn);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      delete this._listeners[evt];
    }
  }

  /**
   * Trigger every registered callbacks for a given event
   * @param {string} evt - The event to trigger
   * @param {*} arg - The eventual payload for that event. All triggered
   * callbacks will recieve this payload as argument.
   */
  protected trigger<TEventName extends keyof T>(
    evt: TEventName,
    arg: IEventPayload<T, TEventName>,
  ): void {
    const listeners = this._listeners[evt];
    if (!Array.isArray(listeners)) {
      return;
    }

    listeners.slice().forEach((listener) => {
      try {
        listener(arg);
      } catch (e) {
        if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
          throw e instanceof Error ? e : new Error("EventEmitter: listener error");
        }
        // Cannot use our logger here sadly because our logger is an `EventEmitter`
        // itself.
        // eslint-disable-next-line no-console
        console.error("RxPlayer: EventEmitter error", e instanceof Error ? e : null);
      }
    });
  }
}
