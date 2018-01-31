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

import objectAssign = require("object-assign");
import { Subject } from "rxjs/Subject";
import log from "../../utils/log";
import {
  ICustomSourceBuffer,
  ICustomTimeRanges,
} from "./index";

enum SourceBufferAction { Append, Remove }

interface ISourceBufferAppendQueueElement<T> {
  type : SourceBufferAction.Append;
  args : T;
  subj : Subject<Event>;
}

interface ISourceBufferRemoveQueueElement {
  type : SourceBufferAction.Remove;
  args : {
    start : number;
    end : number;
  };
  subj : Subject<Event>;
}

type ISourceBufferQueueElement<T> =
  ISourceBufferAppendQueueElement<T> | ISourceBufferRemoveQueueElement;

/**
 * Wrap a SourceBuffer and append/remove segments in it in a queue.
 * Wait for the previous buffer action to be finished (updateend event) to
 * perform the next in the queue.
 *
 * @class QueuedSourceBuffer
 */
export default class QueuedSourceBuffer<T> {
  private _buffer : ICustomSourceBuffer<T>;
  private _queue : Array<ISourceBufferQueueElement<T>>;
  private _flushing : Subject<Event>|null;
  private __onUpdate : (x: Event) => void;
  private __onError : (x : Event) => void;
  private __flush : () => void;

  /**
   * @constructor
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(sourceBuffer : ICustomSourceBuffer<T>) {
    this._buffer = sourceBuffer;
    this._queue = [];
    this._flushing = null;

    this.__onUpdate = this._onUpdate.bind(this);
    this.__onError = this._onError.bind(this);
    this.__flush = this._flush.bind(this);

    this._buffer.addEventListener("update", this.__onUpdate);
    this._buffer.addEventListener("error", this.__onError);
    this._buffer.addEventListener("updateend", this.__flush);
  }

  /**
   * Append media segment to the attached SourceBuffer, in a FIFO queue.
   * @param {ArrayBuffer} buffer
   * @returns {Observable}
   */
  appendBuffer(buffer : T) : Subject<Event> {
    return this._queueAction({
      type: SourceBufferAction.Append,
      args: buffer,
    });
  }

  /**
   * Remove data from the attached SourceBuffer, in a FIFO queue.
   * @param {Object} range
   * @param {Number} range.start - start position, in seconds
   * @param {Number} range.end - end position, in seconds
   * @returns {Observable}
   */
  removeBuffer(
    { start, end } : {
      start : number;
      end : number;
    }
  ) : Subject<Event> {
    return this._queueAction({
      type: SourceBufferAction.Remove,
      args: { start, end },
    });
  }

  abort() {
    this.dispose();
    this._buffer.abort();
  }

  unwrap() : ICustomSourceBuffer<T> {
    return this._buffer;
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  getBuffered() : TimeRanges|ICustomTimeRanges {
    return this._buffer.buffered;
  }

  /**
   * Free up ressources used by this class.
   */
  dispose() : void {
    this._buffer.removeEventListener("update", this.__onUpdate);
    this._buffer.removeEventListener("error", this.__onError);
    this._buffer.removeEventListener("updateend", this.__flush);
    this._queue.length = 0;
    this._flushing = null;
  }

  /**
   * @private
   * @param {Event} evt
   */
  private _onUpdate(evt : Event) : void {
    if (this._flushing) {
      this._flushing.next(evt);
      this._flushing.complete();
      this._flushing = null;
    }
  }

  /**
   * @private
   * @param {Error} error
   */
  private _onError(error : Event) : void {
    if (this._flushing) {
      this._flushing.error(error);
      this._flushing = null;
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
  private _queueAction(action :
    {
      type : SourceBufferAction.Append;
      args : T;
    } | {
      type : SourceBufferAction.Remove;
      args : {
        start : number;
        end : number;
      };
    }
  ) : Subject<Event> {
    const subj = new Subject<Event>();
    const queueElement = objectAssign({ subj }, action);
    const length = this._queue.unshift(queueElement);
    if (length === 1) {
      this._flush();
    }
    return subj;
  }

  /**
   * Perform next queued action if one and none are pending.
   * @private
   */
  private _flush() : void {
    if (this._flushing || this._queue.length === 0 || this._buffer.updating) {
      return;
    }

    // TODO TypeScrypt do not get the previous length check? Find solution /
    // open issue
    const queueElement = this._queue.pop() as ISourceBufferQueueElement<T>;
    this._flushing = queueElement.subj;
    try {
      switch (queueElement.type) {
        case SourceBufferAction.Append:
          log.debug("pushing data to source buffer", queueElement.args);
          this._buffer.appendBuffer(queueElement.args);
          break;
        case SourceBufferAction.Remove:
          const { start, end } = queueElement.args;
          log.debug("removing data from source buffer", start, end);
          this._buffer.remove(start, end);
          break;
      }
    } catch (e) {
      this._onError(e);
    }
  }
}
