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

import { Observable } from "rxjs/Observable";
import BufferGarbageCollector from "./garbage_collector";
import QueuedSourceBuffer from "./queued_source_buffer";

/**
 * Keep track of a single BufferGarbageCollector per QueuedSourceBuffer.
 *
 * @example
 * ```js
 * const garbageCollectors = new GarbageCollectorMemory();
 * const garbageCollector = garbageCollectors.get(queuedSourceBuffer);
 *
 * //...
 *
 * garbageCollectors.destroy(queuedSourceBuffer);
 * ```
 *
 * @class GarbageCollectorMemory
 */
export default class GarbageCollectorMemory {
  private _garbageCollectorMemory : WeakMap<QueuedSourceBuffer<any>, Observable<never>>;

  private _clock$ : Observable<number>;
  private _maxBufferBehind$ : Observable<number>;
  private _maxBufferAhead$ : Observable<number>;

  /**
   * @param {Observable} clock$ - emit the current time of the video each time
   * it needs clean-up.
   * @param {Observable} maxBufferBehind$
   * @param {Observable} maxBufferAhead$
   */
  constructor(
    clock$ : Observable<number>,
    maxBufferBehind$ : Observable<number>,
    maxBufferAhead$ : Observable<number>
  ) {
    this._garbageCollectorMemory = new WeakMap();
    this._clock$ = clock$;
    this._maxBufferBehind$ = maxBufferBehind$;
    this._maxBufferAhead$ = maxBufferAhead$;
  }

  /**
   * Retrieve a GarbageCollector if already created, creates one if not, and
   * return it.
   * @param {QueuedSourceBuffer} queuedSourceBuffer
   * @returns {Observable}
   */
  get(queuedSourceBuffer : QueuedSourceBuffer<any>) : Observable<never> {
    const fromMemory = this._garbageCollectorMemory.get(queuedSourceBuffer);
    if (!fromMemory) {
      const garbageCollector = BufferGarbageCollector({
        queuedSourceBuffer,
        clock$: this._clock$,
        maxBufferBehind$: this._maxBufferBehind$,
        maxBufferAhead$: this._maxBufferAhead$,
      });
      this._garbageCollectorMemory.set(queuedSourceBuffer, garbageCollector);
      return garbageCollector;
    } else {
      return fromMemory;
    }
  }

  /**
   * @param {string} bufferType
   */
  destroy(queuedSourceBuffer : QueuedSourceBuffer<any>) {
    this._garbageCollectorMemory.delete(queuedSourceBuffer);
  }
}
