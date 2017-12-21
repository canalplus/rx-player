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

import QueuedSourceBuffer from "../source_buffers/queued_source_buffer";
import SegmentBookkeeper from "../source_buffers/segment_bookkeeper";

/**
 * Keep track of a single SegmentBookkeeper per QueuedSourceBuffer.
 *
 * @example
 * ```js
 * const segmentBookkeepers = new SegmentBookkeeperManager();
 * const AudioSegmentBookkeeper = segmentBookkeepers.get(queuedSourceBuffer);
 *
 * //...
 *
 * segmentBookkeepers.destroy(queuedSourceBuffer);
 * ```
 *
 * @class SegmentBookkeeperManager
 */
export default class SegmentBookkeeperManager {
  private _segmentBookkeeperMemory : WeakMap<QueuedSourceBuffer<any>, SegmentBookkeeper>;

  constructor() {
    this._segmentBookkeeperMemory = new WeakMap();
  }

  /**
   * Retrieve a SegmentBookkeeper if already created, creates one if not, and
   * return it.
   * @param {string} bufferType
   * @returns {SegmentBookkeeper}
   */
  get(queuedSourceBuffer : QueuedSourceBuffer<any>) : SegmentBookkeeper {
    const fromMemory = this._segmentBookkeeperMemory.get(queuedSourceBuffer);
    if (!fromMemory) {
      const segmentBookkeeper = new SegmentBookkeeper();
      this._segmentBookkeeperMemory.set(queuedSourceBuffer, segmentBookkeeper);
      return segmentBookkeeper;
    } else {
      return fromMemory;
    }
  }

  /**
   * Destroy a SegmentBookkeeper from a specific type if already created through
   * this instance.
   * @param {string} bufferType
   */
  destroy(queuedSourceBuffer : QueuedSourceBuffer<any>) {
    const fromMemory = this._segmentBookkeeperMemory.get(queuedSourceBuffer);
    if (fromMemory) {
      fromMemory.reset();
    }
    this._segmentBookkeeperMemory.delete(queuedSourceBuffer);
  }
}
