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
  ICompatSourceBuffer,
  tryToChangeSourceBufferType,
} from "../../../../compat";
import config from "../../../../config";
import log from "../../../../log";
import { getLoggableSegmentId } from "../../../../manifest";
import assertUnreachable from "../../../../utils/assert_unreachable";
import createCancellablePromise from "../../../../utils/create_cancellable_promise";
import noop from "../../../../utils/noop";
import objectAssign from "../../../../utils/object_assign";
import TaskCanceller, {
  CancellationError,
  CancellationSignal,
} from "../../../../utils/task_canceller";
import { IInsertedChunkInfos } from "../../inventory";
import {
  IEndOfSegmentInfos,
  IEndOfSegmentOperation,
  IPushChunkInfos,
  IPushedChunkData,
  IPushOperation,
  IRemoveOperation,
  ISBOperation,
  SegmentBuffer,
  SegmentBufferOperation,
} from "../types";


/**
 * Item added to the AudioVideoSegmentBuffer's queue before being processed into
 * a task (see `IAVSBPendingTask`).
 *
 * Here we add `resolve` and `reject` callbacks to anounce when the task is
 * finished.
 */
type IAVSBQueueItem = ISBOperation<BufferSource> & {
  resolve : () => void;
  reject : (err : Error) => void;
};

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
                        IRemoveOperation & {
                          resolve : () => void;
                          reject : (err : Error) => void;
                        } |
                        IEndOfSegmentOperation & {
                          resolve : () => void;
                          reject : (err : Error) => void;
                        };

/** Structure of a `IAVSBPendingTask` item corresponding to a "Push" operation. */
type IPushTask = IPushOperation<BufferSource> & {
  /**
   * Data that needs to be actually pushed.
   * Here it is an array because we might need either to push only the
   * given chunk or both its initialization segment then the chunk (depending on
   * the last pushed initialization segment).
   */
  data : BufferSource[];
  /**
   * The data that will be inserted to the inventory after that chunk is pushed.
   * If `null`, no data will be pushed.
   */
  inventoryData : IInsertedChunkInfos |
                  null;
  /** Callback to call when the push operation succeed. */
  resolve : () => void;
  /** Callback to call when the push operation fails. */
  reject : (err : Error) => void;
};

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
export default class AudioVideoSegmentBuffer extends SegmentBuffer {
  /** "Type" of the buffer concerned. */
  public readonly bufferType : "audio" | "video";

  /** SourceBuffer implementation. */
  private readonly _sourceBuffer : ICompatSourceBuffer;

  /**
   * Helps to clean-up resource taken at the AudioVideoSegmentBuffer creation.
   */
  private _canceller : TaskCanceller;

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
   * Keep track of the unique identifier of the  of the latest init segment
   * pushed to the linked SourceBuffer.
   *
   * Such identifiers are first declared through the `declareInitSegment`
   * method and the corresponding initialization segment is then pushed through
   * the `pushChunk` method.
   *
   * Keeping track of this allows to be sure the right initialization segment is
   * pushed before any chunk is.
   *
   * `null` if no initialization segment have been pushed to the
   * `AudioVideoSegmentBuffer` yet.
   */
  private _lastInitSegmentUniqueId : string | null;

  /**
   * Link unique identifiers for initialization segments (as communicated by
   * `declareInitSegment`) to the corresponding initialization data.
   */
  private _initSegmentsMap : Map<string, BufferSource>;

  /**
   * @constructor
   * @param {string} bufferType
   * @param {string} codec
   * @param {MediaSource} mediaSource
   */
  constructor(
    bufferType : "audio" | "video",
    codec : string,
    mediaSource : MediaSource
  ) {
    super();
    log.info("AVSB: calling `mediaSource.addSourceBuffer`", codec);
    const sourceBuffer = mediaSource.addSourceBuffer(codec);

    this._canceller = new TaskCanceller();
    this.bufferType = bufferType;
    this._mediaSource = mediaSource;
    this._sourceBuffer = sourceBuffer;
    this._queue = [];
    this._pendingTask = null;
    this._lastInitSegmentUniqueId = null;
    this.codec = codec;
    this._initSegmentsMap = new Map();

    const onError = this._onPendingTaskError.bind(this);
    const reCheck = this._flush.bind(this);

    // Some browsers (happened with firefox 66) sometimes "forget" to send us
    // `update` or `updateend` events.
    // In that case, we're completely unable to continue the queue here and
    // stay locked in a waiting state.
    // This interval is here to check at regular intervals if the underlying
    // SourceBuffer is currently updating.
    const { SOURCE_BUFFER_FLUSHING_INTERVAL } = config.getCurrent();
    const intervalId = setInterval(reCheck, SOURCE_BUFFER_FLUSHING_INTERVAL);
    this._sourceBuffer.addEventListener("error", onError);
    this._sourceBuffer.addEventListener("updateend", reCheck);

    this._canceller.signal.register(() => {
      clearInterval(intervalId);
      this._sourceBuffer.removeEventListener("error", onError);
      this._sourceBuffer.removeEventListener("updateend", reCheck);
    });
  }

  public declareInitSegment(
    uniqueId : string,
    initSegmentData : unknown
  ) : void {
    assertDataIsBufferSource(initSegmentData);
    this._initSegmentsMap.set(uniqueId, initSegmentData);
  }

  public freeInitSegment(
    uniqueId : string
  ) : void {
    this._initSegmentsMap.delete(uniqueId);
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
   * @param {Object} cancellationSignal
   * @returns {Promise}
   */
  public pushChunk(
    infos : IPushChunkInfos<unknown>,
    cancellationSignal : CancellationSignal
  ) : Promise<void> {
    assertDataIsBufferSource(infos.data.chunk);
    log.debug("AVSB: receiving order to push data to the SourceBuffer",
              this.bufferType,
              getLoggableSegmentId(infos.inventoryInfos));
    return this._addToQueue({ type: SegmentBufferOperation.Push,
                              value: infos as IPushChunkInfos<BufferSource> },
                            cancellationSignal);
  }

  /**
   * Remove buffered data (added to the same FIFO queue than `pushChunk`).
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @param {Object} cancellationSignal
   * @returns {Promise}
   */
  public removeBuffer(
    start : number,
    end : number,
    cancellationSignal : CancellationSignal
  ) : Promise<void> {
    log.debug("AVSB: receiving order to remove data from the SourceBuffer",
              this.bufferType,
              start,
              end);
    return this._addToQueue({ type: SegmentBufferOperation.Remove,
                              value: { start, end } },
                            cancellationSignal);
  }

  /**
   * Indicate that every chunks from a Segment has been given to pushChunk so
   * far.
   * This will update our internal Segment inventory accordingly.
   * The returned Promise will resolve once the whole segment has been pushed
   * and this indication is acknowledged.
   * @param {Object} infos
   * @returns {Promise}
   */
  public endOfSegment(
    infos : IEndOfSegmentInfos,
    cancellationSignal : CancellationSignal
  ) : Promise<void> {
    log.debug("AVSB: receiving order for validating end of segment",
              this.bufferType,
              getLoggableSegmentId(infos));
    return this._addToQueue({ type: SegmentBufferOperation.EndOfSegment,
                              value: infos },
                            cancellationSignal);
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
        // Had to be written that way for TypeScript
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
    this._canceller.cancel();

    if (this._pendingTask !== null) {
      this._pendingTask.reject(new CancellationError());
      this._pendingTask = null;
    }

    while (this._queue.length > 0) {
      const nextElement = this._queue.shift();
      if (nextElement !== undefined) {
        nextElement.reject(new CancellationError());
      }
    }

    if (this._mediaSource.readyState === "open") {
      try {
        log.debug("AVSB: Calling `abort` on the SourceBuffer");
        this._sourceBuffer.abort();
      } catch (e) {
        log.warn(`AVSB: Failed to abort a ${this.bufferType} SourceBuffer:`,
                 e instanceof Error ? e : "");
      }
    }
  }

  /**
   * Called when an error arised that made the current task fail.
   * @param {Event} err
   */
  private _onPendingTaskError(err : unknown) : void {
    this._lastInitSegmentUniqueId = null; // initialize init segment as a security
    if (this._pendingTask !== null) {
      const error = err instanceof Error ?
                      err :
                      new Error("An unknown error occured when doing operations " +
                                "on the SourceBuffer");
      const task = this._pendingTask;
      if (task.type === SegmentBufferOperation.Push &&
          task.data.length === 0 &&
          task.inventoryData !== null)
      {
        this._segmentInventory.insertChunk(task.inventoryData, false);
      }
      this._pendingTask = null;
      task.reject(error);
    }
  }

  /**
   * @private
   * @param {Object} operation
   * @param {Object} cancellationSignal
   * @returns {Promise}
   */
  private _addToQueue(
    operation : ISBOperation<BufferSource>,
    cancellationSignal : CancellationSignal
  ) : Promise<void> {
    return createCancellablePromise(cancellationSignal, (resolve, reject) => {
      const shouldRestartQueue = this._queue.length === 0 &&
                                 this._pendingTask === null;
      const queueItem = objectAssign({ resolve, reject }, operation);
      this._queue.push(queueItem);
      if (shouldRestartQueue) {
        this._flush();
      }
      return () => {
        // Remove the corresponding element from the AudioVideoSegmentBuffer's
        // queue.
        // If the operation was a pending task, it should still continue to not
        // let the AudioVideoSegmentBuffer in a weird state.
        const index = this._queue.indexOf(queueItem);
        if (index >= 0) {
          this._queue.splice(index, 1);
        }
        queueItem.resolve = noop;
        queueItem.reject = noop;
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

    if (this._pendingTask !== null) {
      const task = this._pendingTask;
      if (task.type !== SegmentBufferOperation.Push || task.data.length === 0) {
        // If we're here, we've finished processing the task
        switch (task.type) {
          case SegmentBufferOperation.Push:
            if (task.inventoryData !== null) {
              this._segmentInventory.insertChunk(task.inventoryData, true);
            }
            break;
          case SegmentBufferOperation.EndOfSegment:
            this._segmentInventory.completeSegment(task.value, this.getBufferedRanges());
            break;
          case SegmentBufferOperation.Remove:
            this.synchronizeInventory();
            break;
          default:
            assertUnreachable(task);
        }

        const { resolve } = task;
        this._pendingTask = null;
        resolve();
        this._flush(); // Go to next item in queue
        return;
      }
    } else { // if this._pendingTask is null, go to next item in queue
      const nextItem = this._queue.shift();
      if (nextItem === undefined) {
        return; // we have nothing left to do
      } else if (nextItem.type !== SegmentBufferOperation.Push) {
        this._pendingTask = nextItem;
      } else {
        const itemValue = nextItem.value;

        let dataToPush : BufferSource[];
        try {
          dataToPush = this._preparePushOperation(itemValue.data);
        } catch (e) {
          this._pendingTask = objectAssign({ data: [],
                                             inventoryData: itemValue.inventoryInfos },
                                           nextItem);
          const error = e instanceof Error ?
            e :
            new Error("An unknown error occured when preparing a push operation");
          this._lastInitSegmentUniqueId = null; // initialize init segment as a security
          nextItem.reject(error);
          return;
        }

        this._pendingTask = objectAssign({ data: dataToPush,
                                           inventoryData: itemValue.inventoryInfos },
                                         nextItem);
      }
    }

    try {
      switch (this._pendingTask.type) {
        case SegmentBufferOperation.EndOfSegment:
          // nothing to do, we will just acknowledge the segment.
          log.debug("AVSB: Acknowledging complete segment",
                    getLoggableSegmentId(this._pendingTask.value));
          this._flush();
          return;

        case SegmentBufferOperation.Push:
          const segmentData = this._pendingTask.data.shift();
          if (segmentData === undefined) {
            this._flush();
            return;
          }
          log.debug("AVSB: pushing segment",
                    this.bufferType,
                    getLoggableSegmentId(this._pendingTask.inventoryData));
          this._sourceBuffer.appendBuffer(segmentData);
          break;

        case SegmentBufferOperation.Remove:
          const { start, end } = this._pendingTask.value;
          log.debug("AVSB: removing data from SourceBuffer",
                    this.bufferType,
                    start,
                    end);
          this._sourceBuffer.remove(start, end);
          break;

        default:
          assertUnreachable(this._pendingTask);
      }
    } catch (e) {
      this._onPendingTaskError(e);
    }
  }

  /**
   * A push Operation might necessitate to mutate some `SourceBuffer` and/or
   * `AudioVideoSegmentBuffer` properties and also might need to be divided into
   * multiple segments to push (exemple: when first pushing the initialization
   * data before the segment data).
   *
   * This method allows to "prepare" that push operation so that all is left is
   * to push the returned segment data one after the other (from first to last).
   * @param {Object} data
   * @returns {Object}
   */
  private _preparePushOperation(
    data : IPushedChunkData<BufferSource>
  ) : BufferSource[] {
    // Push operation with both an init segment and a regular segment might
    // need to be separated into two steps
    const dataToPush = [];
    const { codec,
            timestampOffset,
            appendWindow } = data;
    let hasUpdatedSourceBufferType : boolean = false;

    if (codec !== undefined && codec !== this.codec) {
      log.debug("AVSB: updating codec", codec);
      hasUpdatedSourceBufferType = tryToChangeSourceBufferType(this._sourceBuffer,
                                                               codec);
      if (hasUpdatedSourceBufferType) {
        this.codec = codec;
      } else {
        log.debug("AVSB: could not update codec", codec, this.codec);
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
        log.debug("AVSB: re-setting `appendWindowStart` to `0`");
        this._sourceBuffer.appendWindowStart = 0;
      }
    } else if (appendWindow[0] !== this._sourceBuffer.appendWindowStart) {
      if (appendWindow[0] >= this._sourceBuffer.appendWindowEnd) {
        const newTmpEnd = appendWindow[0] + 1;
        log.debug("AVSB: pre-updating `appendWindowEnd`", newTmpEnd);
        this._sourceBuffer.appendWindowEnd = newTmpEnd;
      }
      log.debug("AVSB: setting `appendWindowStart`", appendWindow[0]);
      this._sourceBuffer.appendWindowStart = appendWindow[0];
    }

    if (appendWindow[1] === undefined) {
      if (this._sourceBuffer.appendWindowEnd !== Infinity) {
        log.debug("AVSB: re-setting `appendWindowEnd` to `Infinity`");
        this._sourceBuffer.appendWindowEnd = Infinity;
      }
    } else if (appendWindow[1] !== this._sourceBuffer.appendWindowEnd) {
      log.debug("AVSB: setting `appendWindowEnd`", appendWindow[1]);
      this._sourceBuffer.appendWindowEnd = appendWindow[1];
    }

    if (data.initSegmentUniqueId !== null &&
        (hasUpdatedSourceBufferType ||
         !this._isLastInitSegment(data.initSegmentUniqueId)))
    {
      // Push initialization segment before the media segment
      const segmentData = this._initSegmentsMap.get(data.initSegmentUniqueId);
      if (segmentData === undefined) {
        throw new Error("Invalid initialization segment uniqueId");
      }
      dataToPush.push(segmentData);
      this._lastInitSegmentUniqueId = data.initSegmentUniqueId;
    }

    if (data.chunk !== null) {
      dataToPush.push(data.chunk);
    }

    return dataToPush;
  }

 /**
  * Return `true` if the given `uniqueId` is the identifier of the last
  * initialization segment pushed to the `AudioVideoSegmentBuffer`.
  * @param {string} uniqueId
  * @returns {boolean}
  */
  private _isLastInitSegment(uniqueId : string) : boolean {
    if (this._lastInitSegmentUniqueId === null) {
      return false;
    }
    return this._lastInitSegmentUniqueId === uniqueId;
  }
}

/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} data
 */
function assertDataIsBufferSource(
  data : unknown
) : asserts data is BufferSource {
  if (__ENVIRONMENT__.CURRENT_ENV as number === __ENVIRONMENT__.PRODUCTION as number) {
    return;
  }
  if (
    typeof data !== "object" ||
    (
      data !== null &&
      !(data instanceof ArrayBuffer) &&
      !((data as ArrayBufferView).buffer instanceof ArrayBuffer)
    )
  ) {
    throw new Error("Invalid data given to the AudioVideoSegmentBuffer");
  }
}
