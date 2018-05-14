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
  Observable,
  Subject,
} from "rxjs";
import log from "../../utils/log";
import { ICustomSourceBuffer } from "./abstract_source_buffer";
import ICustomTimeRanges from "./time_ranges";

enum SourceBufferAction { Append, Remove }

/**
 * Action to append a new Segment to the SourceBuffer.
 * T is the type of the segment pushed.
 */
interface ISourceBufferAppendQueueElement<T> {
  type : SourceBufferAction.Append;
  args : T;
  subject : Subject<Event>|null;
}

/**
 * Action to remove some buffer from the SourceBuffer.
 */
interface ISourceBufferRemoveQueueElement {
  type : SourceBufferAction.Remove;
  args : {
    start : number;
    end : number;
  };
  subject : Subject<Event>;
}

/**
 * Action performed on a QueuedSourceBuffer
 *
 * T is the type of the segments pushed.
 */
type ISourceBufferQueueElement<T> =
  ISourceBufferAppendQueueElement<T> | ISourceBufferRemoveQueueElement;

/**
 * Wrap a SourceBuffer and append/remove segments in it in a queue.
 *
 * Wait for the previous buffer action to be finished (updateend event) to
 * perform the next in the queue.
 *
 * To work correctly, only a single QueuedSourceBuffer per SourceBuffer should
 * be created.
 *
 * @class QueuedSourceBuffer
 */
export default class QueuedSourceBuffer<T> {
  /**
   * SourceBuffer implementation.
   * Type it as ICustomSourceBuffer to allow more permissive custom
   * implementations.
   * @private
   * @type {Object}
   */
  private readonly _buffer : ICustomSourceBuffer<T>;

  /**
   * Binded reference to the _onUpdate private method.
   * Used for binding/removing an event listener.
   * @private
   * @type {Function}
   */
  private readonly __onUpdate : (x: Event) => void;

  /**
   * Binded reference to the _onError private method.
   * Used for binding/removing an event listener.
   * @private
   * @type {Function}
   */
  private readonly __onError : (x : Event) => void;

  /**
   * Binded reference to the _flush private method.
   * Used for binding/removing an event listener.
   * @private
   * @type {Function}
   */
  private readonly __flush : () => void;

  /**
   * Queue of awaited buffer actions.
   *
   * The last element in this array will be the first action to perform.
   * See ISourceBufferQueueElement for more infos on those actions.
   * @private
   * @type {Array.<Object>}
   */
  private _queue : Array<ISourceBufferQueueElement<T>>;

  /**
   * Subject linked to the current buffer action.
   * @private
   * @type {Subject}
   */
  private _flushing : Subject<Event>|null;

  /**
   * Keep track of the latest init segment pushed in the current queue.
   * @private
   * @type {*}
   */
  private _lastInitSegment : T|null;

  /**
   * @constructor
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(sourceBuffer : ICustomSourceBuffer<T>) {
    this._buffer = sourceBuffer;
    this._queue = [];
    this._flushing = null;
    this._lastInitSegment = null;

    this.__onUpdate = this._onUpdate.bind(this);
    this.__onError = this._onError.bind(this);
    this.__flush = this._flush.bind(this);

    this._buffer.addEventListener("update", this.__onUpdate);
    this._buffer.addEventListener("error", this.__onError);
    this._buffer.addEventListener("updateend", this.__flush);
  }

  /**
   * Append media segment to the attached SourceBuffer, in a FIFO queue.
   *
   * Depending on the type of data appended, this might need an associated
   * initialization segment.
   *
   * Such initialization segment will be pushed in the SourceBuffer if the
   * last segment pushed was associated to another initialization segment.
   * This detection is entirely reference-based so make sure that the same
   * initSegment argument given share the same reference.
   *
   * You can deactivate the usage of initialization segment by setting the
   * initSegment argument to null.
   *
   * You can also only push an initialization segment by setting the segment
   * argument to null.
   * @param {*|null} initSegment
   * @param {*|null} segment
   * @returns {Observable}
   */
  public appendBuffer(
    initSegment : T|null,
    segment : T|null
  ) : Observable<void> {
    return Observable.defer(() =>
      this._queueAction({
        type: SourceBufferAction.Append,
        segment,
        initSegment,
      })
    );
  }

  /**
   * Remove data from the attached SourceBuffer, in a FIFO queue.
   * @param {Object} range
   * @param {Number} range.start - start position, in seconds
   * @param {Number} range.end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(
    { start, end } : {
      start : number;
      end : number;
    }
  ) : Observable<void> {
    return Observable.defer(() =>
      this._queueAction({
        type: SourceBufferAction.Remove,
        start,
        end,
      })
    );
  }

  /**
   * Abort the linked SourceBuffer and dispose of the ressources used by this
   * QueuedSourceBuffer.
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   * @private
   */
  public abort() : void {
    this.dispose();
    this._buffer.abort();
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBuffered() : TimeRanges|ICustomTimeRanges {
    return this._buffer.buffered;
  }

  /**
   * Free up ressources used by this class.
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   */
  public dispose() : void {
    this._buffer.removeEventListener("update", this.__onUpdate);
    this._buffer.removeEventListener("error", this.__onError);
    this._buffer.removeEventListener("updateend", this.__flush);
    this._queue.length = 0;
    this._flushing = null;
  }

  /**
   * Callback used for the 'update' event, as a segment has been added/removed.
   *
   * Emit and complete the corresponding subject to inform the action caller
   * of completion.
   *
   * @private
   */
  private _onUpdate() : void {
    if (this._flushing) {
      this._flushing.next(undefined);
      this._flushing.complete();
      this._flushing = null;
    }
  }

  /**
   * Callback used for the 'error' event from the SourceBuffer.
   *
   * Emit the error through the corresponding subject to inform the action
   * caller.
   *
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
   * @param {Object} action
   * @returns {Subject} - Can be used to follow the buffer action advancement.
   */
  private _queueAction(action :
    {
      type : SourceBufferAction.Append;
      segment : T|null;
      initSegment: T|null;
    } | {
      type : SourceBufferAction.Remove;
      start : number;
      end : number;
    }
  ) : Observable<void> {
    const shouldFlush = !this._queue.length;
    const subject = new Subject<Event>();

    if (action.type === SourceBufferAction.Append) {
      const { segment, initSegment } = action;

      if (initSegment === null && segment === null) {
        log.warn("QueuedSourceBuffer: no segment appended.");
        return Observable.of(undefined);
      }

      if (initSegment === null) {
        this._queue.unshift({
          type: SourceBufferAction.Append,
          args: segment as T, // TODO Make it clear to TS that that's always the
                              // case
          subject,
        });
      } else if (segment === null) {
        if (this._lastInitSegment === initSegment) {
          return Observable.of(undefined);
        }
        this._queue.unshift({
          type: SourceBufferAction.Append,
          args: initSegment,
          subject,
        });
      } else {
        if (this._lastInitSegment !== initSegment) {
          this._queue.unshift({
            type: SourceBufferAction.Append,
            args: initSegment,
            subject: null,
          });
        }
        this._queue.unshift({
          type: SourceBufferAction.Append,
          args: segment,
          subject,
        });
      }

      this._lastInitSegment = initSegment;
    } else if (action.type === SourceBufferAction.Remove) {
      this._queue.unshift({
        type: SourceBufferAction.Remove,
        args: {
          start: action.start,
          end: action.end,
        },
        subject,
      });
    } else {
      throw new Error("QueuedSourceBuffer: unrecognized action");
    }

    if (shouldFlush) {
      this._flush();
    }

    return subject.mapTo(undefined);
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
    this._flushing = queueElement.subject;
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
