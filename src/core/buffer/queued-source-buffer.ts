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

import { Subject } from "rxjs/Subject";
import {
  ICustomSourceBuffer,
  ICustomTimeRanges,
} from "../stream/source_buffers";

const BUFFER_APPEND = "append";
const BUFFER_REMOVE = "remove";

interface ISourceBufferQueueElement {
  type : "append"|"remove"; // type of action that will be performed
  args : any; // args for the corresponding action
  subj : Subject<Event>; // Subject via which the response will be emitted
}

/**
 * Append/Remove from sourceBuffer in a queue.
 * Wait for the previous buffer action to be finished (updateend event) to
 * perform the next in the queue.
 * @class QueuedSourceBuffer
 */
export default class QueuedSourceBuffer {
  private buffer : ICustomSourceBuffer;
  private queue : ISourceBufferQueueElement[];
  private flushing : Subject<Event>|null;
  private __onUpdate : (x: Event) => void;
  private __onError : (x : Event) => void;
  private __flush : () => void;

  /**
   * @constructor
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(sourceBuffer : ICustomSourceBuffer) {
    this.buffer = sourceBuffer;
    this.queue = [];
    this.flushing = null;

    this.__onUpdate = this._onUpdate.bind(this);
    this.__onError = this._onError.bind(this);
    this.__flush = this._flush.bind(this);

    this.buffer.addEventListener("update", this.__onUpdate);
    this.buffer.addEventListener("error", this.__onError);
    this.buffer.addEventListener("updateend", this.__flush);
  }

  /**
   * Append media segment to the attached SourceBuffer, in a FIFO queue.
   * @param {ArrayBuffer} buffer
   * @returns {Observable}
   */
  appendBuffer(buffer : any) : Subject<Event> {
    return this._queueAction(BUFFER_APPEND, buffer);
  }

  /**
   * Remove data from the attached SourceBuffer, in a FIFO queue.
   * @param {Object} range
   * @param {Number} range.start - start position, in seconds
   * @param {Number} range.end - end position, in seconds
   * @returns {Observable}
   */
  removeBuffer(
    { start, end } : { start : number, end : number }
  ) : Subject<Event> {
    return this._queueAction(BUFFER_REMOVE, { start, end });
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  getBuffered() : TimeRanges|ICustomTimeRanges {
    return this.buffer.buffered;
  }

  /**
   * Free up ressources used by this class.
   */
  dispose() : void {
    this.buffer.removeEventListener("update", this.__onUpdate);
    this.buffer.removeEventListener("error", this.__onError);
    this.buffer.removeEventListener("updateend", this.__flush);
    this.queue.length = 0;
    this.flushing = null;
  }

  /**
   * @private
   * @param {Event} evt
   */
  _onUpdate(evt : Event) : void {
    if (this.flushing) {
      this.flushing.next(evt);
      this.flushing.complete();
      this.flushing = null;
    }
  }

  /**
   * @private
   * @param {Error} error
   */
  _onError(error : Event) : void {
    if (this.flushing) {
      this.flushing.error(error);
      this.flushing = null;
    }
  }

  /**
   * Queue a new action.
   * Begin flushing if no action were previously in the queue.
   * @private
   * @param {string} type
   * @param {*} args
   * @returns {Subject} - Can be used to follow the buffer action advancement.
   */
  _queueAction(type : "append"|"remove", args : any /* TODO? */) : Subject<Event> {
    const subj : Subject<Event> = new Subject();
    const length = this.queue.unshift({ type, args, subj });
    if (length === 1) {
      this._flush();
    }
    return subj;
  }

  /**
   * Perform next queued action if one and none are pending.
   * @private
   */
  _flush() : void {
    if (this.flushing || this.queue.length === 0 || this.buffer.updating) {
      return;
    }

    // TODO TypeScrypt do not get the previous length check? Find solution /
    // open issue
    const { type, args, subj } = this.queue.pop() as ISourceBufferQueueElement;
    this.flushing = subj;
    try {
      switch (type) {
        case BUFFER_APPEND:
          this.buffer.appendBuffer(args);
          break;
        case BUFFER_REMOVE:
          this.buffer.remove(args.start, args.end); break;
      }
    } catch (e) {
      this._onError(e);
    }
  }
}
