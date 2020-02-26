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
import objectAssign from "../../utils/object_assign";
import SegmentInventory, {
  IBufferedChunk,
  IInsertedChunkInfos,
} from "./segment_inventory";

const { APPEND_WINDOW_SECURITIES,
        SOURCE_BUFFER_FLUSHING_INTERVAL, } = config;

// Every QueuedSourceBuffer types
export type IBufferType = "audio" |
                          "video" |
                          "text" |
                          "image";

enum SourceBufferAction { Push,
                          Remove,
                          EndOfSegment }

// Content of the `data` property when pushing a new chunk
// This will be the real data used with the underlying SourceBuffer.
export interface IPushedChunkData<T> {
  initSegment: T|null;  // initialization segment related to the
                        // chunk. `null` if none.
  chunk : T | null; // Chunk you want to push. `null` if you just
                    // want to push the initialization segment.
  codec : string; // string corresponding to the mime-type + codec to set the
                  // underlying SourceBuffer to.
  timestampOffset : number; // time offset in seconds to apply to this segment.
  appendWindow: [ number | undefined, // start appendWindow for the segment
                                      // (part of the segment before that time
                                      // will be ignored)
                  number | undefined ]; // end appendWindow for the segment
                                        // (part of the segment after that time
                                        // will be ignored)
}

// Content of the `inventoryInfos` property when pushing a new chunk
// This is what will be registered in the QueuedSourceBuffer's inventory.
// corresponding to this chunk.
export interface IPushedChunkInventoryInfos {
  adaptation : Adaptation;
  period : Period;
  representation : Representation;
  segment : ISegment; // The  segment object linked to the chunk.
  estimatedStart? : number; // Estimated start time, in s, of the chunk
  estimatedDuration? : number; // Estimated end time, in s, of the chunk
}

// Information to give when pushing a new chunk via the `pushChunk` method.
export interface IPushChunkInfos<T> { data : IPushedChunkData<T>;
                                      inventoryInfos : IPushedChunkInventoryInfos; }

// Information to give when indicating a whole segment has been pushed via the
// `endOfSegment` method.
export interface IEndOfSegmentInfos {
  adaptation : Adaptation; // The Adaptation linked to the segment.
  period : Period; // The Period linked to the segment.
  representation : Representation; // The Representation linked to the segment.
  segment : ISegment; // The corresponding Segment object.
}

// Action created by the QueuedSourceBuffer to push a chunk.
// Will be converted into an `IPushQueueItem` once in the queue
interface IPushAction<T> { type : SourceBufferAction.Push;
                           value : IPushChunkInfos<T>; }

// Action created by the QueuedSourceBuffer to remove Segment(s).
// Will be converted into an `IRemoveQueueItem` once in the queue
interface IRemoveAction { type : SourceBufferAction.Remove;
                          value : { start : number;
                                    end : number; }; }

// Action created by the QueuedSourceBuffer for validating that a complete
// Segment has been or is being pushed to it.
// Will be converted into an `IEndOfSegmentQueueItem` once in the queue
interface IEndOfSegmentAction { type : SourceBufferAction.EndOfSegment;
                                value : IEndOfSegmentInfos; }

// Actions understood by the QueuedSourceBuffer
type IQSBNewAction<T> = IPushAction<T> |
                        IRemoveAction |
                        IEndOfSegmentAction;

// Item waiting in the queue to push a new chunk to the SourceBuffer.
// T is the type of the segment pushed.
interface IPushQueueItem<T> extends IPushAction<T> { subject : Subject<unknown>; }

// Item waiting in the queue to remove segment(s) from the SourceBuffer.
interface IRemoveQueueItem extends IRemoveAction { subject : Subject<unknown>; }

// Item waiting in the queue to validate that the whole segment has been pushed
interface IEndOfSegmentQueueItem extends IEndOfSegmentAction {
  subject : Subject<unknown>;
}

// Action waiting in the queue.
// T is the type of the segments pushed.
type IQSBQueueItem<T> = IPushQueueItem<T> |
                         IRemoveQueueItem |
                         IEndOfSegmentQueueItem;

interface IPushData<T> { isInit : boolean;
                         segmentData : T;
                         codec : string;
                         timestampOffset : number;
                         appendWindow : [ number | undefined,
                                          number | undefined ]; }

// Once processed, Push queue items are separated into one or multiple tasks
interface IPushTask<T> { type : SourceBufferAction.Push;
                         steps : Array<IPushData<T>>;
                         inventoryData : IInsertedChunkInfos;
                         subject : Subject<unknown>; }

// Type of task currently processed by the QueuedSourceBuffer
type IPendingTask<T> = IPushTask<T> |
                       IRemoveQueueItem |
                       IEndOfSegmentQueueItem;

/**
 * Allows to push and remove new Segments to a SourceBuffer in a FIFO queue (not
 * doing so can lead to browser Errors) while keeping an inventory of what has
 * been pushed.
 *
 * To work correctly, only a single QueuedSourceBuffer per SourceBuffer should
 * be created.
 *
 * @class QueuedSourceBuffer
 */
export default class QueuedSourceBuffer<T> {
  // "Type" of the buffer (e.g. "audio", "video", "text", "image")
  public readonly bufferType : IBufferType;

  // SourceBuffer implementation.
  private readonly _sourceBuffer : ICustomSourceBuffer<T>;

  // Inventory of buffered segment
  private readonly _segmentInventory : SegmentInventory;

  // Subject triggered when this QueuedSourceBuffer is disposed.
  // Helps to clean-up Observables created at its creation.
  private _destroy$ : Subject<void>;

  // Queue of awaited buffer orders.
  // The first element in this array will be the first performed.
  private _queue : Array<IQSBQueueItem<T>>;

  // Information about the current action processed by the QueuedSourceBuffer.
  // If equal to null, it means that no action from the queue is currently
  // being processed.
  private _pendingTask : IPendingTask<T> | null;

  // Keep track of the latest init segment pushed in the linked SourceBuffer.
  private _lastInitSegment : T | null;

  // Current `type` of the underlying SourceBuffer.
  // Might be changed for codec-switching purposes.
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
   * Depending on the type of data appended, this might need an associated
   * initialization segment.
   *
   * Such initialization segment will be pushed in the SourceBuffer if the
   * last segment pushed was associated to another initialization segment.
   * This detection is entirely reference-based so make sure that the same
   * initSegment argument given share the same reference.
   *
   * You can disable the usage of initialization segment by setting the
   * `infos.data.initSegment` argument to null.
   *
   * You can also only push an initialization segment by setting the
   * `infos.data.chunk` argument to null.
   *
   * @param {Object} infos
   * @returns {Observable}
   */
  public pushChunk(infos : IPushChunkInfos<T>) : Observable<unknown> {
    log.debug("QSB: receiving order to push data to the SourceBuffer",
              this.bufferType,
              infos);
    return this._addToQueue({ type: SourceBufferAction.Push,
                              value: infos });
  }

  /**
   * Remove buffered data (added to the same FIFO queue than `pushChunk`).
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<unknown> {
    log.debug("QSB: receiving order to remove data from the SourceBuffer",
              this.bufferType,
              start,
              end);
    return this._addToQueue({ type: SourceBufferAction.Remove,
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
  public endOfSegment(infos : IEndOfSegmentInfos) : Observable<unknown> {
    log.debug("QSB: receiving order for validating end of segment",
              this.bufferType,
              infos.segment);
    return this._addToQueue({ type: SourceBufferAction.EndOfSegment,
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
   * Dispose of the resources used by this QueuedSourceBuffer.
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   * @private
   */
  public dispose() : void {
    this._destroy$.next();
    this._destroy$.complete();

    if (this._pendingTask != null) {
      this._pendingTask.subject.complete();
      this._pendingTask = null;
    }

    while (this._queue.length > 0) {
      const nextElement = this._queue.shift();
      if (nextElement != null) {
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
    if (this._pendingTask != null) {
      this._pendingTask.subject.error(error);
    }
  }

  /**
   * When the returned observable is subscribed:
   *   1. Add your action to the queue.
   *   2. Begin the queue if not pending.
   *
   * Cancel queued action on unsubscription.
   * @private
   * @param {Object} action
   * @returns {Observable}
   */
  private _addToQueue(action : IQSBNewAction<T>) : Observable<unknown> {
    return new Observable((obs : Observer<unknown>) => {
      const shouldRestartQueue = this._queue.length === 0 &&
                                 this._pendingTask == null;
      const subject = new Subject<unknown>();
      const queueItem = objectAssign({ subject }, action);
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
      return; // still processing `this._pendingTask`
    }

    // handle end of previous task if needed
    if (this._pendingTask != null) {
      if (this._pendingTask.type !== SourceBufferAction.Push ||
          this._pendingTask.steps.length === 0)
      {
        switch (this._pendingTask.type) {
          case SourceBufferAction.Push:
            this._segmentInventory.insertChunk(this._pendingTask.inventoryData);
            break;
          case SourceBufferAction.EndOfSegment:
            this._segmentInventory.completeSegment(this._pendingTask.value);
            break;
          case SourceBufferAction.Remove:
            this.synchronizeInventory();
            break;
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
      if (newQueueItem == null) {
        // TODO TypeScrypt do not get the previous length check. Find solution /
        // open issue
        throw new Error("An item from the QueuedSourceBuffer queue was not defined");
      }
      this._pendingTask = convertQueueItemToTask(newQueueItem);
      if (this._pendingTask == null) { // nothing to do, complete and go to next item
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
        case SourceBufferAction.EndOfSegment:
          // nothing to do, we will just acknowledge the segment.
          log.debug("QSB: Acknowledging complete segment", task.value);
          this._flush();
          return;
        case SourceBufferAction.Push:
          const nextStep = task.steps.shift();
          if (nextStep == null ||
              (nextStep.isInit && this._lastInitSegment === nextStep.segmentData))
          {
            this._flush();
            return;
          }
          this._pushSegmentData(nextStep);
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

    if (appendWindow[0] == null) {
      if (this._sourceBuffer.appendWindowStart > 0) {
        this._sourceBuffer.appendWindowStart = 0;
      }
    } else if (appendWindow[0] !== this._sourceBuffer.appendWindowStart) {
      if (appendWindow[0] >= this._sourceBuffer.appendWindowEnd) {
        this._sourceBuffer.appendWindowEnd = appendWindow[0] + 1;
      }
      this._sourceBuffer.appendWindowStart = appendWindow[0];
    }

    if (appendWindow[1] == null) {
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
) : IPendingTask<T> | null {
  switch (item.type) {
    case SourceBufferAction.Push:
      // Push actions with both an init segment and a regular segment need
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
      return { type: SourceBufferAction.Push,
               steps,
               inventoryData,
               subject: item.subject };

    case SourceBufferAction.Remove:
    case SourceBufferAction.EndOfSegment:
      return item;
  }
  return null;
}

export { IBufferedChunk };
