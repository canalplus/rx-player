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
  defer as observableDefer,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import { mapTo } from "rxjs/operators";
import {
  ICustomSourceBuffer,
  tryToChangeSourceBufferType,
} from "../../compat";
import log from "../../log";
import ICustomTimeRanges from "./time_ranges";

// Every QueuedSourceBuffer types
export type IBufferType = "audio"|"video"|"text"|"image";

enum SourceBufferAction { Append, Remove }

// Informations to give when appending a new segment.
export interface IAppendBufferInfos<T> {
  initSegment : T|null; // initialization segment related to the segment.
                        // null if none.
  segment : T|null; // Segment you want to push
                    // null if you just want to push the initialization segment.
  codec : string; // string corresponding to the mime-type + codec to set the
                  // underlying SourceBuffer to.
  timestampOffset : number; // time offset in seconds to apply to this segment.
}

// Item waiting in the queue to append a new segment to the SourceBuffer.
// T is the type of the segment pushed.
interface IAppendQueueItem<T> {
  type : SourceBufferAction.Append;
  args : {
    segment : T;
    codec : string;
    timestampOffset? : number;
  };
  subject : Subject<Event>|null;
}

// Item waiting in the queue to remove segment(s) from the SourceBuffer.
// T is the type of the segment pushed.
interface IRemoveQueueItem {
  type : SourceBufferAction.Remove;
  args : {
    start : number;
    end : number;
  };
  subject : Subject<Event>;
}

// Item waiting in a queue to perform updates on a SourceBuffer.
// T is the type of the segments pushed.
type IQSBQueueItems<T> =
  IAppendQueueItem<T> | IRemoveQueueItem;

// Order created by the QueuedSourceBuffer to append a Segment.
interface IAppendOrder<T> {
  type : SourceBufferAction.Append;
  value : IAppendBufferInfos<T>;
}

// Order created by the QueuedSourceBuffer to remove Segment(s).
interface IRemoveOrder {
  type : SourceBufferAction.Remove;
  value : {
    start : number;
    end : number;
  };
}

// Orders understood by the QueuedSourceBuffer
type IQSBOrders<T> =
  IAppendOrder<T> | IRemoveOrder;

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
   * "Type" of the buffer.
   * @type {string}
   */
  public readonly bufferType : IBufferType;

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
   * See IQSBQueueItems for more infos on those actions.
   * @private
   * @type {Array.<Object>}
   */
  private _queue : Array<IQSBQueueItems<T>>;

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
   * Current `type` of the underlying SourceBuffer.
   * Might be changed for codec-switching purposes.
   * @private
   * @type {string}
   */
  private _currentCodec : string;

  /**
   * @constructor
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(
    bufferType : IBufferType,
    codec : string,
    sourceBuffer : ICustomSourceBuffer<T>
  ) {
    this.bufferType = bufferType;
    this._buffer = sourceBuffer;
    this._queue = [];
    this._flushing = null;
    this._lastInitSegment = null;
    this._currentCodec = codec;

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
   * infos.initSegment argument to null.
   *
   * You can also only push an initialization segment by setting the
   * infos.segment argument to null.
   *
   * @param {string} codec
   * @param {Object} infos
   * @returns {Observable}
   */
  public appendBuffer(infos : IAppendBufferInfos<T>) : Observable<void> {
    return observableDefer(() =>
      this._addToQueue({ type: SourceBufferAction.Append, value: infos })
    );
  }

  /**
   * Remove data from the attached SourceBuffer, in a FIFO queue.
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<void> {
    return observableDefer(() =>
      this._addToQueue({ type: SourceBufferAction.Remove, value: { start, end } })
    );
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBuffered() : TimeRanges|ICustomTimeRanges {
    return this._buffer.buffered;
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
    this._buffer.removeEventListener("update", this.__onUpdate);
    this._buffer.removeEventListener("error", this.__onError);
    this._buffer.removeEventListener("updateend", this.__flush);
    this._queue.length = 0;
    this._flushing = null;
    this._buffer.abort();
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

      // security against side-effects from the previous `next` instruction
      if (this._flushing) {
        this._flushing.complete();
        this._flushing = null;
      }
    }
  }

  /**
   * Callback used for the 'error' event from the SourceBuffer.
   *
   * Emit the error through the corresponding subject to inform the action
   * caller.
   *
   * @private
   * @param {Event} error
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
   * @returns {Observable} - Can be used to follow the buffer action
   * advancement.
   */
  private _addToQueue(action : IQSBOrders<T>) : Observable<void> {
    const shouldFlush = !this._queue.length;
    const subject = new Subject<Event>();

    if (action.type === SourceBufferAction.Append) {
      const { segment, initSegment, timestampOffset, codec } = action.value;

      if (initSegment === null && segment === null) {
        log.warn("QSB: no segment appended.", this.bufferType);
        return observableOf(undefined);
      }

      if (initSegment === null) {
        this._queue.unshift({
          type: SourceBufferAction.Append,
          args: { segment: segment as T, timestampOffset, codec },
          subject,
        });
      } else if (segment === null) {
        if (this._lastInitSegment === initSegment) {
          return observableOf(undefined);
        }
        this._queue.unshift({
          type: SourceBufferAction.Append,
          args: { segment: initSegment, timestampOffset, codec },
          subject,
        });
      } else {
        if (this._lastInitSegment !== initSegment) {
          this._queue.unshift({
            type: SourceBufferAction.Append,
            args: { segment: initSegment, timestampOffset, codec },
            subject: null,
          });
        }
        this._queue.unshift({
          type: SourceBufferAction.Append,
          args: { segment, timestampOffset, codec },
          subject,
        });
      }

      this._lastInitSegment = initSegment;
    } else if (action.type === SourceBufferAction.Remove) {
      this._queue.unshift({
        type: SourceBufferAction.Remove,
        args: action.value,
        subject,
      });
    } else {
      throw new Error("QueuedSourceBuffer: unrecognized action");
    }

    if (shouldFlush) {
      this._flush();
    }

    return subject.pipe(mapTo(undefined));
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
    const queueItem = this._queue.pop() as IQSBQueueItems<T>;
    this._flushing = queueItem.subject;
    try {
      switch (queueItem.type) {
        case SourceBufferAction.Append:
          const { segment, timestampOffset = 0, codec } = queueItem.args;
          if (this._currentCodec !== codec) {
            const couldUpdateType = tryToChangeSourceBufferType(this._buffer, codec);
            if (couldUpdateType) {
              this._currentCodec = codec;
            }
          }
          if (this._buffer.timestampOffset !== timestampOffset) {
            const newTimestampOffset = timestampOffset || 0;
            log.debug("QSB: updating timestampOffset",
              this.bufferType, this._buffer.timestampOffset, newTimestampOffset);
            this._buffer.timestampOffset = newTimestampOffset;
          }

          log.debug("QSB: pushing new data to source buffer", this.bufferType);
          this._buffer.appendBuffer(segment);
          break;
        case SourceBufferAction.Remove:
          const { start, end } = queueItem.args;
          log.debug("QSB: removing data from source buffer", this.bufferType, start, end);
          this._buffer.remove(start, end);
          break;
      }
    } catch (e) {
      this._onError(e);
    }
  }
}
