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
  ICompatSourceBuffer,
  tryToChangeSourceBufferType,
} from "../../../../compat";
import config from "../../../../config";
import log from "../../../../log";
import areArraysOfNumbersEqual from "../../../../utils/are_arrays_of_numbers_equal";
import assertUnreachable from "../../../../utils/assert_unreachable";
import { toUint8Array } from "../../../../utils/byte_parsing";
import hashBuffer from "../../../../utils/hash_buffer";
import objectAssign from "../../../../utils/object_assign";
import { IInsertedChunkInfos } from "../../segment_inventory";
import {
  IEndOfSegmentInfos,
  IEndOfSegmentOperation,
  IPushChunkInfos,
  IPushOperation,
  IRemoveOperation,
  ISBOperation,
  SegmentBuffer,
  SegmentBufferOperation,
} from "../types";

const { SOURCE_BUFFER_FLUSHING_INTERVAL } = config;

/**
 * Item added to the AudioVideoSegmentBuffer's queue before being processed into
 * a task (see `IAVSBPendingTask`).
 *
 * Here we add the `subject` property which will allow the
 * AudioVideoSegmentBuffer to emit an event when the corresponding queued
 * operation is completely processed.
 */
type IAVSBQueueItem = ISBOperation<BufferSource> & { subject: Subject<void> };

/**
 * Task currently processed by the AudioVideoSegmentBuffer.
 *
 * A task is first pushed to the AudioVideoSegmentBuffer's queue as a
 * `IAVSBQueueItem` object before being transformed into a `IAVSBPendingTask`
 * when it is started.
 * This new object only make changes for the `IPushOperation`, as it can be
 * split up into multiple tasks depending on the need to push an initialization
 * segment before the wanted media segment.
 */
type IAVSBPendingTask = IPushTask |
                        IRemoveOperation & { subject: Subject<void> } |
                        IEndOfSegmentOperation & { subject: Subject<void> };

/** Structure of a `IAVSBPendingTask` item corresponding to a "Push" operation. */
type IPushTask = IPushOperation<BufferSource> & {
  /**
   * Data that needs to be actually pushed, per sequential steps.
   * Here it is in plural form because we might need either to push only the
   * given chunk or both its initialization segment then the chunk (depending on
   * the last pushed initialization segment).
   */
  steps : IPushData[];
  /**
   * The data that will be inserted to the inventory after that chunk is pushed.
   * If `null`, no data will be pushed.
   */
  inventoryData : IInsertedChunkInfos |
                  null;
  /** Subject used to emit an event to the caller when the operation is finished. */
  subject : Subject<void>;
};

/** Data of a single chunk/segment the AudioVideoSegmentBuffer needs to push. */
interface IPushData {
  /** `true` if it is an initialization segment. `false` otherwise. */
  isInit : boolean;
  /** The data of the chunk/segment that needs to be pushed. */
  segmentData : BufferSource;
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
 * Allows to push and remove new segments to a SourceBuffer in a FIFO queue (not
 * doing so can lead to browser Errors) while keeping an inventory of what has
 * been pushed and what is being pushed.
 *
 * To work correctly, only a single AudioVideoSegmentBuffer per SourceBuffer
 * should be created.
 *
 * @class AudioVideoSegmentBuffer
 */
export default class AudioVideoSegmentBuffer
                 extends SegmentBuffer<BufferSource> {
  /** "Type" of the buffer concerned. */
  public readonly bufferType : "audio" | "video";

  /** SourceBuffer implementation. */
  private readonly _sourceBuffer : ICompatSourceBuffer;

  /**
   * Subject triggered when this AudioVideoSegmentBuffer is disposed.
   * Helps to clean-up Observables created at its creation.
   */
  private _destroy$ : Subject<void>;

  /**
   * Queue of awaited buffer "operations".
   * The first element in this array will be the first performed.
   */
  private _queue : IAVSBQueueItem[];

  /** MediaSource on which the SourceBuffer object is attached. */
  private readonly _mediaSource : MediaSource;

  /**
   * Information about the current operation processed by the
   * AudioVideoSegmentBuffer.
   * If equal to null, it means that no operation from the queue is currently
   * being processed.
   */
  private _pendingTask : IAVSBPendingTask | null;

  /**
   * Keep track of the of the latest init segment pushed in the linked
   * SourceBuffer.
   *
   * This allows to be sure the right initialization segment is pushed before
   * any chunk is.
   *
   * `null` if no initialization segment have been pushed to the
   * `AudioVideoSegmentBuffer` yet.
   */
  private _lastInitSegment : { /** The initSegment itself. */
                               data : Uint8Array;
                               /** Hash of the initSegment for fast comparison */
                               hash : number; } |
                             null;

  /**
   * @constructor
   * @param {string} bufferType
   * @param {string} codec
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(
    bufferType : "audio" | "video",
    codec : string,
    mediaSource : MediaSource
  ) {
    super();
    const sourceBuffer = mediaSource.addSourceBuffer(codec);

    this._destroy$ = new Subject<void>();
    this.bufferType = bufferType;
    this._mediaSource = mediaSource;
    this._sourceBuffer = sourceBuffer;
    this._queue = [];
    this._pendingTask = null;
    this._lastInitSegment = null;
    this.codec = codec;

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
   * This detection rely on the initialization segment's reference so you need
   * to avoid mutating in-place a initialization segment given to that function
   * (to avoid having two different values which have the same reference).
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
  public pushChunk(infos : IPushChunkInfos<BufferSource>) : Observable<void> {
    log.debug("AVSB: receiving order to push data to the SourceBuffer",
              this.bufferType,
              infos);
    return this._addToQueue({ type: SegmentBufferOperation.Push,
                              value: infos });
  }

  /**
   * Remove buffered data (added to the same FIFO queue than `pushChunk`).
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<void> {
    log.debug("AVSB: receiving order to remove data from the SourceBuffer",
              this.bufferType,
              start,
              end);
    return this._addToQueue({ type: SegmentBufferOperation.Remove,
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
    log.debug("AVSB: receiving order for validating end of segment",
              this.bufferType,
              infos.segment);
    return this._addToQueue({ type: SegmentBufferOperation.EndOfSegment,
                              value: infos });
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBufferedRanges() : TimeRanges {
    return this._sourceBuffer.buffered;
  }

  /**
   * Returns the list of every operations that the `AudioVideoSegmentBuffer` is
   * still processing. From the one with the highest priority (like the one
   * being processed)
   * @returns {Array.<Object>}
   */
  public getPendingOperations() : Array<ISBOperation<BufferSource>> {
    const parseQueuedOperation =
      (op : IAVSBQueueItem | IAVSBPendingTask) : ISBOperation<BufferSource> => {
        // Had to be written that way for TypeScrypt
        switch (op.type) {
          case SegmentBufferOperation.Push:
            return { type: op.type, value: op.value };
          case SegmentBufferOperation.Remove:
            return { type: op.type, value: op.value };
          case SegmentBufferOperation.EndOfSegment:
            return { type: op.type, value: op.value };
        }
      };
    const queued = this._queue.map(parseQueuedOperation);
    return this._pendingTask === null ?
      queued :
      [parseQueuedOperation(this._pendingTask)].concat(queued);
  }

  /**
   * Dispose of the resources used by this AudioVideoSegmentBuffer.
   *
   * /!\ You won't be able to use the AudioVideoSegmentBuffer after calling this
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

    if (this._mediaSource.readyState === "open") {
      try {
        this._sourceBuffer.abort();
      } catch (e) {
        log.warn(`AVSB: Failed to abort a ${this.bufferType} SourceBuffer:`, e);
      }
    }
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
  private _addToQueue(operation : ISBOperation<BufferSource>) : Observable<void> {
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

        // Remove the corresponding element from the AudioVideoSegmentBuffer's
        // queue.
        // If the operation was a pending task, it should still continue to not
        // let the AudioVideoSegmentBuffer in a weird state.
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
      if (this._pendingTask.type !== SegmentBufferOperation.Push ||
          this._pendingTask.steps.length === 0)
      {
        switch (this._pendingTask.type) {
          case SegmentBufferOperation.Push:
            if (this._pendingTask.inventoryData !== null) {
              this._segmentInventory.insertChunk(this._pendingTask.inventoryData);
            }
            break;
          case SegmentBufferOperation.EndOfSegment:
            this._segmentInventory.completeSegment(this._pendingTask.value);
            break;
          case SegmentBufferOperation.Remove:
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
        throw new Error("An item from the AudioVideoSegmentBuffer queue was not defined");
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
        case SegmentBufferOperation.EndOfSegment:
          // nothing to do, we will just acknowledge the segment.
          log.debug("AVSB: Acknowledging complete segment", task.value);
          this._flush();
          return;

        case SegmentBufferOperation.Push:
          const nextStep = task.steps.shift();
          if (nextStep === undefined ||
              (nextStep.isInit && this._isLastInitSegment(nextStep.segmentData)))
          {
            this._flush();
            return;
          }
          this._pushSegmentData(nextStep);
          break;

        case SegmentBufferOperation.Remove:
          const { start, end } = task.value;
          log.debug("AVSB: removing data from SourceBuffer",
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
  private _pushSegmentData(data : IPushData) : void {
    const { isInit,
            segmentData,
            timestampOffset,
            appendWindow,
            codec } = data;
    if (this.codec !== codec) {
      log.debug("AVSB: updating codec");
      const couldUpdateType = tryToChangeSourceBufferType(this._sourceBuffer,
                                                          codec);
      if (couldUpdateType) {
        this.codec = codec;
      } else {
        log.warn("AVSB: could not update codec", codec, this.codec);
      }
    }

    if (this._sourceBuffer.timestampOffset !== timestampOffset) {
      const newTimestampOffset = timestampOffset;
      log.debug("AVSB: updating timestampOffset",
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

    log.debug("AVSB: pushing new data to SourceBuffer", this.bufferType);
    if (isInit) {
      const initU8 = toUint8Array(segmentData);
      this._lastInitSegment = { data: initU8,
                                hash: hashBuffer(initU8) };
    }
    this._sourceBuffer.appendBuffer(segmentData);
  }

 /**
  * Return `true` if the given `segmentData` is the same segment than the last
  * initialization segment pushed to the `AudioVideoSegmentBuffer`.
  * @param {BufferSource} segmentData
  * @returns {boolean}
  */
  private _isLastInitSegment(segmentData : BufferSource) : boolean {
    if (this._lastInitSegment === null) {
      return false;
    }
    if (this._lastInitSegment.data === segmentData) {
      return true;
    }
    const oldInit = this._lastInitSegment.data;
    if (oldInit.byteLength === segmentData.byteLength) {
      const newInitU8 = toUint8Array(segmentData);
      if (hashBuffer(newInitU8) === this._lastInitSegment.hash &&
          areArraysOfNumbersEqual(oldInit, newInitU8))
      {
        return true;
      }
    }
    return false;
  }
}

/**
 * @param {Object} item
 * @returns {Object|null}
 */
function convertQueueItemToTask(
  item : IAVSBQueueItem
) : IAVSBPendingTask | null {
  switch (item.type) {
    case SegmentBufferOperation.Push:
      // Push operation with both an init segment and a regular segment need
      // to be separated into two steps
      const steps = [];
      const itemValue = item.value;
      const { data, inventoryInfos } = itemValue;

      if (data.initSegment !== null) {
        steps.push({ isInit: true,
                     segmentData: data.initSegment,
                     codec: data.codec,
                     timestampOffset: data.timestampOffset,
                     appendWindow: data.appendWindow });
      }
      if (data.chunk !== null) {
        steps.push({ isInit: false,
                     segmentData: data.chunk,
                     codec: data.codec,
                     timestampOffset: data.timestampOffset,
                     appendWindow: data.appendWindow });
      }
      if (steps.length === 0) {
        return null;
      }

      const inventoryData = inventoryInfos;
      return objectAssign({ steps, inventoryData }, item);

    case SegmentBufferOperation.Remove:
    case SegmentBufferOperation.EndOfSegment:
      return item;
    default:
      assertUnreachable(item);
  }
}
