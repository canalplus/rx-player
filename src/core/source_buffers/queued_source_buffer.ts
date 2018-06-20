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
  fromEvent,
  interval,
  Observable,
  Observer,
  Subject,
} from "rxjs";
import {
  takeUntil,
  tap,
} from "rxjs/operators";
import {
  ICustomSourceBuffer,
  tryToChangeSourceBufferType,
} from "../../compat";
import config from "../../config";
import log from "../../log";
import ICustomTimeRanges from "./time_ranges";

const { SOURCE_BUFFER_FLUSHING_INTERVAL } = config;

// Every QueuedSourceBuffer types
export type IBufferType = "audio" |
                          "video" |
                          "text" |
                          "image" |
                          "overlay";

enum SourceBufferAction { Append,
                          Remove }

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
interface IAppendQueueItem<T> { type : SourceBufferAction.Append;
                                value : { initSegment : T|null;
                                          segment : T|null;
                                          codec : string;
                                          timestampOffset? : number; };
                                subject : Subject<unknown>; }

// Item waiting in the queue to remove segment(s) from the SourceBuffer.
// T is the type of the segment pushed.
interface IRemoveQueueItem { type : SourceBufferAction.Remove;
                             value : { start : number;
                                       end : number; };
                             subject : Subject<unknown>; }

// Item waiting in a queue to perform updates on a SourceBuffer.
// T is the type of the segments pushed.
type IQSBQueueItems<T> = IAppendQueueItem<T> |
                         IRemoveQueueItem;

// Order created by the QueuedSourceBuffer to append a Segment.
interface IAppendOrder<T> { type : SourceBufferAction.Append;
                            value : IAppendBufferInfos<T>; }

// Order created by the QueuedSourceBuffer to remove Segment(s).
interface IRemoveOrder { type : SourceBufferAction.Remove;
                         value : { start : number;
                                   end : number; }; }

interface IAppendAction<T> { type : SourceBufferAction.Append;
                             value : { segment : T;
                                       isInit : boolean;
                                       codec : string;
                                       timestampOffset? : number; }; }

interface IRemoveAction { type : SourceBufferAction.Remove;
                          value : { start : number;
                                    end : number; }; }

// Orders understood by the QueuedSourceBuffer
type IQSBOrders<T> = IAppendOrder<T> |
                     IRemoveOrder;

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
   * e.g. "audio", "video", "text", "image"
   * @type {string}
   */
  public readonly bufferType : IBufferType;

  /**
   * SourceBuffer implementation.
   * @private
   * @type {Object}
   */
  private readonly _sourceBuffer : ICustomSourceBuffer<T>;

  /**
   * Subject triggered when this QueuedSourceBuffer is disposed.
   * Helps to clean-up Observables created at its creation.
   * @type {Subject}
   */
  private _destroy$ : Subject<void>;

  /**
   * Queue of awaited buffer orders.
   * The first element in this array will be the first performed.
   * @private
   * @type {Array.<Object>}
   */
  private _queue : Array<IQSBQueueItems<T>>;

  /**
   * Informations about the current order processed by the QueuedSourceBuffer.
   * If equal to null, it means that no order from the queue is currently
   * being processed.
   * @private
   * @type {Object|null}
   */
  private _currentOrder : {
    tasks : Array<IAppendAction<T>|IRemoveAction>; // remaining tasks to perform
                                                   // to complete this order
    subject : Subject<unknown>; // the corresponding order's Subject
  } | null;

  /**
   * Keep track of the latest init segment pushed in the linked SourceBuffer.
   * @private
   * @type {*}
   */
  private _lastInitSegment : T | null;

  /**
   * Current `type` of the underlying SourceBuffer.
   * Might be changed for codec-switching purposes.
   * @private
   * @type {string}
   */
  private _currentCodec : string;

  /**
   * Public access to the SourceBuffer's current codec.
   * @returns {string}
   */
  public get codec() : string {
    return this._currentCodec;
  }

  /**
   * @constructor
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(
    bufferType : IBufferType,
    codec : string,
    sourceBuffer : ICustomSourceBuffer<T>
  ) {
    this._destroy$ = new Subject<void>();
    this.bufferType = bufferType;
    this._sourceBuffer = sourceBuffer;
    this._queue = [];
    this._currentOrder = null;
    this._lastInitSegment = null;
    this._currentCodec = codec;

    // Some browsers (happened with firefox 66) sometimes "forget" to send us
    // `update` or `updateend` events.
    // In that case, we're completely unable to continue the queue here and
    // stay locked in a waiting state.
    // This interval is here to check at regular intervals if the underlying
    // SourceBuffer is currently updating.
    interval(SOURCE_BUFFER_FLUSHING_INTERVAL).pipe(
      tap(() => this._flush()),
      takeUntil(this._destroy$)
    ).subscribe();

    fromEvent(this._sourceBuffer, "error").pipe(
      tap((err) => this._onErrorEvent(err)),
      takeUntil(this._destroy$)
    ).subscribe();
    fromEvent(this._sourceBuffer, "updateend").pipe(
      tap(() => this._flush()),
      takeUntil(this._destroy$)
    ).subscribe();
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
  public appendBuffer(infos : IAppendBufferInfos<T>) : Observable<unknown> {
    log.debug("QSB: receiving order to push data to the SourceBuffer",
              this.bufferType);
    return this._addToQueue({ type: SourceBufferAction.Append,
                              value: infos });
  }

  /**
   * Remove data from the attached SourceBuffer, in a FIFO queue.
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<unknown> {
    log.debug("QSB: receiving order to remove data from the SourceBuffer",
              this.bufferType);
    return this._addToQueue({ type: SourceBufferAction.Remove,
                              value: { start, end } });
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBuffered() : TimeRanges|ICustomTimeRanges {
    return this._sourceBuffer.buffered;
  }

  /**
   * Dispose of the resources used by this QueuedSourceBuffer.
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   * @private
   */
  public dispose() : void {
    this._destroy$.next();
    this._destroy$.complete();

    if (this._currentOrder != null) {
      this._currentOrder.subject.complete();
      this._currentOrder = null;
    }

    while (this._queue.length) {
      const nextElement = this._queue.shift();
      if (nextElement != null) {
        nextElement.subject.complete();
      }
    }
  }

  /**
   * Abort the linked SourceBuffer.
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   * @private
   */
  public abort() {
    this._sourceBuffer.abort();
  }

  /**
   * Callback used for the 'error' event from the SourceBuffer.
   * @private
   * @param {Event} error
   */
  private _onError(error : Error) : void {
    this._lastInitSegment = null; // initialize init segment as a security
    if (this._currentOrder != null) {
      this._currentOrder.subject.error(error);
    }
  }

  /**
   * Handle error events from SourceBuffers.
   * @private
   * @param {Error|Event} err
   */
  private _onErrorEvent(err: unknown) : void {
    // According to w3c, these events are emitted when an error occurred during
    // the append.
    this._onError(err instanceof Error ?
                    err :
                    new Error("An unknown error occured when appending buffer"));
  }

  /**
   * When the returned observable is subscribed:
   *   1. Add your order to the queue.
   *   2. Begin the queue if not pending.
   *
   * Cancel queued order on unsubscription.
   * @private
   * @param {Object} order
   * @returns {Observable}
   */
  private _addToQueue(order : IQSBOrders<T>) : Observable<unknown> {
    return new Observable((obs : Observer<unknown>) => {
      const shouldRestartQueue = this._queue.length === 0 && this._currentOrder == null;
      let queueItem : IQSBQueueItems<T>;
      const subject = new Subject<unknown>();

      if (order.type === SourceBufferAction.Append) {
        const { segment, initSegment, timestampOffset, codec } = order.value;
        if (initSegment === null && segment === null) {
          log.warn("QSB: no segment to append.", this.bufferType);
          obs.next(null);
          obs.complete();
          return undefined;
        }
        queueItem = { type: SourceBufferAction.Append,
                      value: { initSegment,
                               segment,
                               timestampOffset,
                               codec },
                      subject };
      } else if (order.type === SourceBufferAction.Remove) {
        queueItem = { type: SourceBufferAction.Remove,
                      value: order.value,
                      subject };
      } else {
        throw new Error("QSB: unrecognized order");
      }

      this._queue.push(queueItem);

      const subscription = subject.subscribe(obs);
      if (shouldRestartQueue) {
        this._flush();
      }

      return () => {
        subscription.unsubscribe();
        const index = this._queue.indexOf(queueItem);
        if (index >= 0) {
          this._queue.splice(index, 1);
        }
      };
    });
  }

  /**
   * Perform next task if one.
   * @private
   */
  private _flush() : void {
    if (this._sourceBuffer.updating) {
      return;
    }

    if (this._currentOrder == null) {
      if (this._queue.length === 0) {
        return;
      }

      // TODO TypeScrypt do not get the previous length check? Find solution /
      // open issue
      const newQueueItem = this._queue.shift() as IQSBQueueItems<T>;

      const tasks : Array<IAppendAction<T>|IRemoveAction> = [];
      if (newQueueItem.type === SourceBufferAction.Append) {
        if (newQueueItem.value.initSegment !== null) {
          tasks.push({ type: SourceBufferAction.Append,
                       value: { isInit: true,
                                segment: newQueueItem.value.initSegment,
                                codec: newQueueItem.value.codec,
                                timestampOffset: newQueueItem.value.timestampOffset } });
        } else if (newQueueItem.value.segment === null) {
          newQueueItem.subject.next();
          newQueueItem.subject.complete();
        }
        if (newQueueItem.value.segment !== null) {
          tasks.push({ type: SourceBufferAction.Append,
                       value: { segment: newQueueItem.value.segment,
                                isInit: false,
                                codec: newQueueItem.value.codec,
                                timestampOffset: newQueueItem.value.timestampOffset },
          });
        }
      } else {
        tasks.push({ type: SourceBufferAction.Remove,
                     value: newQueueItem.value });
      }
      this._currentOrder = { tasks,
                             subject: newQueueItem.subject };
    }

    const task = this._currentOrder.tasks.shift();
    if (task == null) {
      const { subject } = this._currentOrder;
      this._currentOrder = null;
      subject.next();
      subject.complete();

      if (this._queue.length > 0) {
        this._flush();
      }
      return;
    }
    try {
      switch (task.type) {
        case SourceBufferAction.Append:
          const { segment, isInit, timestampOffset = 0, codec } = task.value;
          if (isInit && this._lastInitSegment === segment) {
            this._flush(); // nothing to do
            return;
          }

          if (this._currentCodec !== codec) {
            log.debug("QSB: updating codec");
            const couldUpdateType =
              tryToChangeSourceBufferType(this._sourceBuffer, codec);
            if (couldUpdateType) {
              this._currentCodec = codec;
            } else {
              log.warn("QSB: could not update codec", codec, this._currentCodec);
            }
          }

          if (this._sourceBuffer.timestampOffset !== timestampOffset) {
            const newTimestampOffset = timestampOffset || 0;
            log.debug("QSB: updating timestampOffset",
                      this.bufferType,
                      this._sourceBuffer.timestampOffset,
                      newTimestampOffset);
            this._sourceBuffer.timestampOffset = newTimestampOffset;
          }

          log.debug("QSB: pushing new data to SourceBuffer", this.bufferType);
          if (isInit) {
            this._lastInitSegment = segment;
          }
          this._sourceBuffer.appendBuffer(segment);
          break;
        case SourceBufferAction.Remove:
          const { start, end } = task.value;
          log.debug("QSB: removing data from SourceBuffer",
                    this.bufferType,
                    start,
                    end);
          this._sourceBuffer.remove(start, end);
          break;
      }
    } catch (e) {
      this._onError(e);
    }
  }
}
