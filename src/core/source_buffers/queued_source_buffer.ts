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
import { ManualTimeRanges } from "../../custom_source_buffers";
import log from "../../log";
import {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import assertUnreachable from "../../utils/assert_unreachable";
import objectAssign from "../../utils/object_assign";
import SegmentInventory, {
  IBufferedChunk,
  IInsertedChunkInfos,
} from "./segment_inventory";

const { APPEND_WINDOW_SECURITIES,
        SOURCE_BUFFER_FLUSHING_INTERVAL, } = config;

/** Every QueuedSourceBuffer types. */
export type IBufferType = "audio" |
                          "video" |
                          "text" |
                          "image";

/**
 * Enum used by the QueuedSourceBuffer as a discriminant in its queue of
 * "operations".
 */
export enum SourceBufferOperation { Push,
                                    Remove,
                                    EndOfSegment }

/**
 * Content of the `data` property when pushing a new chunk.
 *
 * This will contain all necessary information to decode the media data.
 * Type parameter `T` is the format of the chunk's data.
 */
export interface IPushedChunkData<T> {
  /**
   * The whole initialization segment's data related to the chunk you want to
   * push.
   * `null` if none.
   */
  initSegment: T | null;
  /**
   * Chunk you want to push.
   * This can be the whole decodable segment's data or just a decodable sub-part
   * of it.
   * `null` if you just want to push the initialization segment.
   */
  chunk : T | null;
  /**
   * String corresponding to the mime-type + codec to set the underlying
   * SourceBuffer to.
   * This is then used in "native" SourceBuffers to infer the right codec to use.
   */
  codec : string;
  /**
   * Time offset in seconds to apply to this segment.
   * A `timestampOffset` set to `5` will mean that the segment will be decoded
   * 5 seconds after its decode time which was found from the segment data
   * itself.
   */
  timestampOffset : number;
  /**
   * Append windows for the segment. This is a tuple of two elements.
   *
   * The first indicates the "start append window". The media data of that
   * segment that should have been decoded BEFORE that time (after taking the
   * `timestampOffset` property in consideration) will be ignored.
   * This can be set to `0` or `undefined` to not apply any start append window
   * to that chunk.
   *
   * The second indicates the "end append window". The media data of that
   * segment that should have been decoded AFTER that time (after taking the
   * `timestampOffset` property in consideration) will be ignored.
   * This can be set to `0` or `undefined` to not apply any end append window
   * to that chunk.
   */
  appendWindow: [ number | undefined,
                  number | undefined ];
}

/**
 * Content of the `inventoryInfos` property when pushing a new chunk
 * This data will only be needed for inventory purposes in the QueuedSourceBuffer.
 */
export interface IPushedChunkInventoryInfos {
  /** Adaptation object linked to the chunk. */
  adaptation : Adaptation;
  /** Period object linked to the chunk. */
  period : Period;
  /** Representation object linked to the chunk. */
  representation : Representation;
  /** The segment object linked to the pushed chunk. */
  segment : ISegment;
  /**
   * Estimated precize start time, in seconds, the chunk starts at when decoded
   * (this should include any possible `timestampOffset` value but should not
   * take into account the append windows). TODO simplify those rules?
   */
  estimatedStart? : number;
  /**
   * Estimated precize difference, in seconds, between the last decodable
   * and the first decodable position in the chunk.
   * (this should include any possible `timestampOffset` value but should not
   * take into account the append windows). TODO simplify those rules?
   */
  estimatedDuration? : number; // Estimated end time, in s, of the chunk
}

/**
 * Information to give when pushing a new chunk via the `pushChunk` method.
 * Type parameter `T` is the format of the chunk's data.
 */
export interface IPushChunkInfos<T> { data : IPushedChunkData<T>;
                                      inventoryInfos : IPushedChunkInventoryInfos; }

/**
 * Information to give when indicating a whole segment has been pushed via the
 * `endOfSegment` method.
 */
export interface IEndOfSegmentInfos {
  /** Adaptation object linked to the chunk. */
  adaptation : Adaptation;
  /** Period object linked to the chunk. */
  period : Period;
  /** Representation object linked to the chunk. */
  representation : Representation;
  /** The segment object linked to the pushed chunk. */
  segment : ISegment;
}

/**
 * "Operation" created by the `QueuedSourceBuffer` when asked to push a chunk.
 *
 * It represents a queued "Push" operation (created due to a `pushChunk` method
 * call) that is not yet fully processed by the `QueuedSourceBuffer`.
 */
export interface IPushOperation<T> {
  /** Discriminant (allows to tell its a "Push operation"). */
  type : SourceBufferOperation.Push;
  /** Arguments for that push. */
  value : IPushChunkInfos<T>;
}

/**
 * "Operation" created by the QueuedSourceBuffer when asked to remove buffer.
 *
 * It represents a queued "Remove" operation (created due to a `removeBuffer`
 * method call) that is not yet fully processed by the QueuedSourceBuffer.
 */
export interface IRemoveOperation {
  /** Discriminant (allows to tell its a "Remove operation"). */
  type : SourceBufferOperation.Remove;
  /** Arguments for that remove (absolute start and end time, in seconds). */
  value : { start : number;
            end : number; }; }

/**
 * "Operation" created by the `QueuedSourceBuffer` when asked to validate that
 * a full segment has been pushed through earlier `Push` operations.
 *
 * It represents a queued "EndOfSegment" operation (created due to a
 * `endOfSegment` method call) that is not yet fully processed by the
 * `QueuedSourceBuffer.`
 */
export interface IEndOfSegmentOperation {
  /** Discriminant (allows to tell its an "EndOfSegment operation"). */
  type : SourceBufferOperation.EndOfSegment;
  /** Arguments for that operation. */
  value : IEndOfSegmentInfos;
}

/** "Operations" scheduled by the QueuedSourceBuffer. */
export type IQSBOperation<T> = IPushOperation<T> |
                               IRemoveOperation |
                               IEndOfSegmentOperation;

/**
 * Enumeration of every item that can be added to the QueuedSourceBuffer's queue
 * before being processed into a task (see IQSBPendingTask).
 *
 * Here we add the `subject` Subject which will allows the QueuedSourceBuffer to
 * emit an item when the corresponding queued operation is completely processed.
 *
 * Type parameter `T` is the format of the chunk's data.
 */
type IQSBQueueItem<T> = IQSBOperation<T> & { subject: Subject<void> };

/** Type of task currently processed by the QueuedSourceBuffer. */
type IQSBPendingTask<T> = IPushTask<T> |
                          IRemoveOperation & { subject: Subject<void> } |
                          IEndOfSegmentOperation & { subject: Subject<void> };

/** Structure of a `IQSBPendingTask` item corresponding to a "Push" operation. */
type IPushTask<T> = IPushOperation<T> & {
  /**
   * Data that needs to be actually pushed, per sequential steps.
   * Here it is in plural form because we might need either to push only the
   * given chunk or both its initialization segment then the chunk (depending on
   * the last pushed initialization segment).
   */
  steps : Array<IPushData<T>>;
  /**
   * Processed `inventoryInfos` given through a `pushChunk` method call which
   * will actually be sent to the SegmentInventory.
   */
  inventoryData : IInsertedChunkInfos;
  /** Subject used to emit an event to the caller when the operation is finished. */
  subject : Subject<void>;
};

/** Data of a single chunk/segment the QueuedSourceBuffer needs to push. */
interface IPushData<T> {
  /** `true` if it is an initialization segment. `false` otherwise. */
  isInit : boolean;
  /** The data of the chunk/segment that needs to be pushed. */
  segmentData : T;
  /** The codec used to decode the segment. */
  codec : string;
  /**
   * An offset in seconds that has to be added to the segment's presentation
   * time before decoding. Can be set to `0` to not set any offset.
   */
  timestampOffset : number;
  /**
   * Start and end append windows for this chunk/segment, `undefined` if no start
   * and/or end append windows are wanted.
   */
  appendWindow : [ number | undefined,
                   number | undefined ];
}

/**
 * Allows to push and remove new Segments to a SourceBuffer in a FIFO queue (not
 * doing so can lead to browser Errors) while keeping an inventory of what has
 * been pushed and what is being pushed.
 *
 * To work correctly, only a single QueuedSourceBuffer per SourceBuffer should
 * be created.
 *
 * @class QueuedSourceBuffer
 */
export default class QueuedSourceBuffer<T> {
  /** "Type" of the buffer (e.g. "audio", "video", "text", "image"). */
  public readonly bufferType : IBufferType;

  /** SourceBuffer implementation. */
  private readonly _sourceBuffer : ICustomSourceBuffer<T>;

  /** Inventory of buffered segments. */
  private readonly _segmentInventory : SegmentInventory;

  /**
   * Subject triggered when this QueuedSourceBuffer is disposed.
   * Helps to clean-up Observables created at its creation.
   */
  private _destroy$ : Subject<void>;

  /**
   * Queue of awaited buffer "operations".
   * The first element in this array will be the first performed.
   */
  private _queue : Array<IQSBQueueItem<T>>;

  /**
   * Information about the current operation processed by the QueuedSourceBuffer.
   * If equal to null, it means that no operation from the queue is currently
   * being processed.
   */
  private _pendingTask : IQSBPendingTask<T> | null;

  /**
   * Keep track of the reference of the latest init segment pushed in the
   * linked SourceBuffer.
   */
  private _lastInitSegment : T | null;

  /**
   * Current `type` of the underlying SourceBuffer.
   * Might be changed for codec-switching purposes.
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
   * @param {string} bufferType
   * @param {string} codec
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
    this._pendingTask = null;
    this._lastInitSegment = null;
    this._currentCodec = codec;
    this._segmentInventory = new SegmentInventory();

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
      tap((err) => this._onError(err)),
      takeUntil(this._destroy$)
    ).subscribe();
    fromEvent(this._sourceBuffer, "updateend").pipe(
      tap(() => this._flush()),
      takeUntil(this._destroy$)
    ).subscribe();
  }

  /**
   * Push a chunk of the media segment given to the attached SourceBuffer, in a
   * FIFO queue.
   *
   * Once all chunks of a single Segment have been given to `pushChunk`, you
   * should call `endOfSegment` to indicate that the whole Segment has been
   * pushed.
   *
   * Depending on the type of data appended, the pushed chunk might rely on an
   * initialization segment, given through the `data.initSegment` property.
   *
   * Such initialization segment will be first pushed to the SourceBuffer if the
   * last pushed segment was associated to another initialization segment.
   * This detection is entirely reference-based so make sure that the same
   * `data.initSegment` argument given share the same reference (in the opposite
   * case, we would just unnecessarily push again the same initialization
   * segment).
   *
   * If you don't need any initialization segment to push the wanted chunk, you
   * can just set `data.initSegment` to `null`.
   *
   * You can also only push an initialization segment by setting the
   * `data.chunk` argument to null.
   *
   * @param {Object} infos
   * @returns {Observable}
   */
  public pushChunk(infos : IPushChunkInfos<T>) : Observable<void> {
    log.debug("QSB: receiving order to push data to the SourceBuffer",
              this.bufferType,
              infos);
    return this._addToQueue({ type: SourceBufferOperation.Push,
                              value: infos });
  }

  /**
   * Remove buffered data (added to the same FIFO queue than `pushChunk`).
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<void> {
    log.debug("QSB: receiving order to remove data from the SourceBuffer",
              this.bufferType,
              start,
              end);
    return this._addToQueue({ type: SourceBufferOperation.Remove,
                              value: { start, end } });
  }

  /**
   * Indicate that every chunks from a Segment has been given to pushChunk so
   * far.
   * This will update our internal Segment inventory accordingly.
   * The returned Observable will emit and complete successively once the whole
   * segment has been pushed and this indication is acknowledged.
   * @param {Object} infos
   * @returns {Observable}
   */
  public endOfSegment(infos : IEndOfSegmentInfos) : Observable<void> {
    log.debug("QSB: receiving order for validating end of segment",
              this.bufferType,
              infos.segment);
    return this._addToQueue({ type: SourceBufferOperation.EndOfSegment,
                              value: infos });
  }

  /**
   * The maintained inventory can fall out of sync from garbage collection or
   * other events.
   *
   * This methods allow to manually trigger a synchronization. It should be
   * called before retrieving Segment information from it (e.g. with
   * `getInventory`).
   */
  public synchronizeInventory() : void {
    this._segmentInventory.synchronizeBuffered(this.getBufferedRanges());
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBufferedRanges() : TimeRanges | ManualTimeRanges {
    return this._sourceBuffer.buffered;
  }

  /**
   * Returns the currently buffered data for which the content is known with
   * the corresponding content information.
   * /!\ This data can fall out of sync with the real buffered ranges. Please
   * call `synchronizeInventory` before to make sure it is correctly
   * synchronized.
   * @returns {Array.<Object>}
   */
  public getInventory() : IBufferedChunk[] {
    return this._segmentInventory.getInventory();
  }

  /**
   * Returns the list of every operations that the `QueuedSourceBuffer` is still
   * processing. From the one with the highest priority (like the one being
   * processed)
   * @returns {Array.<Object>}
   */
  public getPendingOperations() : Array<IQSBOperation<T>> {
    const parseQueuedOperation =
      (op : IQSBQueueItem<T> | IQSBPendingTask<T>) : IQSBOperation<T> => {
        // Had to be written that way for TypeScrypt
        switch (op.type) {
          case SourceBufferOperation.Push:
            return { type: op.type, value: op.value };
          case SourceBufferOperation.Remove:
            return { type: op.type, value: op.value };
          case SourceBufferOperation.EndOfSegment:
            return { type: op.type, value: op.value };
        }
      };
    const queued = this._queue.map(parseQueuedOperation);
    return this._pendingTask === null ?
      queued :
      [parseQueuedOperation(this._pendingTask)].concat(queued);
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

    if (this._pendingTask !== null) {
      this._pendingTask.subject.complete();
      this._pendingTask = null;
    }

    while (this._queue.length > 0) {
      const nextElement = this._queue.shift();
      if (nextElement !== undefined) {
        nextElement.subject.complete();
      }
    }
  }

  /**
   * Abort the linked SourceBuffer.
   * You should call this only if the linked MediaSource is still "open".
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   * @private
   */
  public abort() {
    this._sourceBuffer.abort();
  }

  /**
   * @private
   * @param {Event} error
   */
  private _onError(err : unknown) : void {
    const error = err instanceof Error ?
                    err :
                    new Error("An unknown error occured when appending buffer");
    this._lastInitSegment = null; // initialize init segment as a security
    if (this._pendingTask !== null) {
      this._pendingTask.subject.error(error);
    }
  }

  /**
   * When the returned observable is subscribed:
   *   1. Add your operation to the queue.
   *   2. Begin the queue if not pending.
   *
   * Cancel queued operation on unsubscription.
   * @private
   * @param {Object} operation
   * @returns {Observable}
   */
  private _addToQueue(operation : IQSBOperation<T>) : Observable<void> {
    return new Observable((obs : Observer<void>) => {
      const shouldRestartQueue = this._queue.length === 0 &&
                                 this._pendingTask === null;
      const subject = new Subject<void>();
      const queueItem = objectAssign({ subject }, operation);
      this._queue.push(queueItem);

      const subscription = subject.subscribe(obs);
      if (shouldRestartQueue) {
        this._flush();
      }

      return () => {
        subscription.unsubscribe();

        // Remove the corresponding element from the QueuedSourceBuffer's queue.
        // If the operation was a pending task, it should still continue to not
        // let the QueuedSourceBuffer in a weird state.
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
      return; // still processing `this._pendingTask`
    }

    // handle end of previous task if needed
    if (this._pendingTask !== null) {
      if (this._pendingTask.type !== SourceBufferOperation.Push ||
          this._pendingTask.steps.length === 0)
      {
        switch (this._pendingTask.type) {
          case SourceBufferOperation.Push:
            this._segmentInventory.insertChunk(this._pendingTask.inventoryData);
            break;
          case SourceBufferOperation.EndOfSegment:
            this._segmentInventory.completeSegment(this._pendingTask.value);
            break;
          case SourceBufferOperation.Remove:
            this.synchronizeInventory();
            break;
          default:
            assertUnreachable(this._pendingTask);
        }
        const { subject } = this._pendingTask;
        this._pendingTask = null;
        subject.next();
        subject.complete();
        if (this._queue.length > 0) {
          this._flush();
        }
        return;
      }
    } else if (this._queue.length === 0) {
      return; // we have nothing left to do
    } else {
      const newQueueItem = this._queue.shift();
      if (newQueueItem === undefined) {
        // TODO TypeScrypt do not get the previous length check. Find solution /
        // open issue
        throw new Error("An item from the QueuedSourceBuffer queue was not defined");
      }
      this._pendingTask = convertQueueItemToTask(newQueueItem);
      if (this._pendingTask === null) { // nothing to do, complete and go to next item
        newQueueItem.subject.next();
        newQueueItem.subject.complete();
        this._flush();
        return;
      }
    }

    // now handle current task
    const task = this._pendingTask;
    try {
      switch (task.type) {
        case SourceBufferOperation.EndOfSegment:
          // nothing to do, we will just acknowledge the segment.
          log.debug("QSB: Acknowledging complete segment", task.value);
          this._flush();
          return;

        case SourceBufferOperation.Push:
          const nextStep = task.steps.shift();
          if (nextStep === undefined ||
              (nextStep.isInit && this._lastInitSegment === nextStep.segmentData))
          {
            this._flush();
            return;
          }
          this._pushSegmentData(nextStep);
          break;

        case SourceBufferOperation.Remove:
          const { start, end } = task.value;
          log.debug("QSB: removing data from SourceBuffer",
                    this.bufferType,
                    start,
                    end);
          this._sourceBuffer.remove(start, end);
          break;

        default:
          assertUnreachable(task);
      }
    } catch (e) {
      this._onError(e);
    }
  }

  /**
   * Push given data to the underlying SourceBuffer.
   * /!\ Heavily mutates the private state.
   * @param {Object} task
   */
  private _pushSegmentData(data : IPushData<T>) : void {
    const { isInit,
            segmentData,
            timestampOffset,
            appendWindow,
            codec } = data;
    if (this._currentCodec !== codec) {
      log.debug("QSB: updating codec");
      const couldUpdateType = tryToChangeSourceBufferType(this._sourceBuffer,
                                                          codec);
      if (couldUpdateType) {
        this._currentCodec = codec;
      } else {
        log.warn("QSB: could not update codec", codec, this._currentCodec);
      }
    }

    if (this._sourceBuffer.timestampOffset !== timestampOffset) {
      const newTimestampOffset = timestampOffset;
      log.debug("QSB: updating timestampOffset",
                this.bufferType,
                this._sourceBuffer.timestampOffset,
                newTimestampOffset);
      this._sourceBuffer.timestampOffset = newTimestampOffset;
    }

    if (appendWindow[0] === undefined) {
      if (this._sourceBuffer.appendWindowStart > 0) {
        this._sourceBuffer.appendWindowStart = 0;
      }
    } else if (appendWindow[0] !== this._sourceBuffer.appendWindowStart) {
      if (appendWindow[0] >= this._sourceBuffer.appendWindowEnd) {
        this._sourceBuffer.appendWindowEnd = appendWindow[0] + 1;
      }
      this._sourceBuffer.appendWindowStart = appendWindow[0];
    }

    if (appendWindow[1] === undefined) {
      if (this._sourceBuffer.appendWindowEnd !== Infinity) {
        this._sourceBuffer.appendWindowEnd = Infinity;
      }
    } else if (appendWindow[1] !== this._sourceBuffer.appendWindowEnd) {
      this._sourceBuffer.appendWindowEnd = appendWindow[1];
    }

    log.debug("QSB: pushing new data to SourceBuffer", this.bufferType);
    if (isInit) {
      this._lastInitSegment = segmentData;
    }
    this._sourceBuffer.appendBuffer(segmentData);
  }
}

/**
 * @param {Object} item
 * @returns {Object|null}
 */
function convertQueueItemToTask<T>(
  item : IQSBQueueItem<T>
) : IQSBPendingTask<T> | null {
  switch (item.type) {
    case SourceBufferOperation.Push:
      // Push operation with both an init segment and a regular segment need
      // to be separated into two steps
      const steps = [];
      const itemValue = item.value;
      const { data, inventoryInfos } = itemValue;
      const { estimatedDuration, estimatedStart, segment } = inventoryInfos;

      // Cutting exactly at the start or end of the appendWindow can lead to
      // cases of infinite rebuffering due to how browser handle such windows.
      // To work-around that, we add a small offset before and after those.
      const safeAppendWindow : [ number | undefined, number | undefined ] = [
        data.appendWindow[0] !== undefined ?
          Math.max(0, data.appendWindow[0] - APPEND_WINDOW_SECURITIES.START) :
          undefined,
        data.appendWindow[1] !== undefined ?
          data.appendWindow[1] + APPEND_WINDOW_SECURITIES.END :
          undefined,
      ];

      if (data.initSegment !== null) {
        steps.push({ isInit: true,
                     segmentData: data.initSegment,
                     codec: data.codec,
                     timestampOffset: data.timestampOffset,
                     appendWindow: safeAppendWindow });
      }
      if (data.chunk !== null) {
        steps.push({ isInit: false,
                     segmentData: data.chunk,
                     codec: data.codec,
                     timestampOffset: data.timestampOffset,
                     appendWindow: safeAppendWindow });
      }
      if (steps.length === 0) {
        return null;
      }

      let start = estimatedStart === undefined ? segment.time / segment.timescale :
                                                 estimatedStart;
      const duration = estimatedDuration === undefined ?
        segment.duration / segment.timescale :
        estimatedDuration;
      let end = start + duration;

      if (safeAppendWindow[0] !== undefined) {
        start = Math.max(start, safeAppendWindow[0]);
      }
      if (safeAppendWindow[1] !== undefined) {
        end = Math.min(end, safeAppendWindow[1]);
      }

      const inventoryData = { period: inventoryInfos.period,
                              adaptation: inventoryInfos.adaptation,
                              representation: inventoryInfos.representation,
                              segment: inventoryInfos.segment,
                              start,
                              end };
      return objectAssign({ steps, inventoryData }, item);

    case SourceBufferOperation.Remove:
    case SourceBufferOperation.EndOfSegment:
      return item;
    default:
      assertUnreachable(item);
  }
}

export { IBufferedChunk };
