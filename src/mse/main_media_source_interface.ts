import type { IMediaSource, ISourceBuffer } from "../compat/browser_compatibility_types";
import { MediaSource_ } from "../compat/browser_compatibility_types";
import tryToChangeSourceBufferType from "../compat/change_source_buffer_type";
import { onSourceClose, onSourceEnded, onSourceOpen } from "../compat/event_listeners";
import { MediaError, SourceBufferError } from "../errors";
import log from "../log";
import { concat } from "../utils/byte_parsing";
import EventEmitter from "../utils/event_emitter";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import objectAssign from "../utils/object_assign";
import type { IRange } from "../utils/ranges";
import { convertToRanges } from "../utils/ranges";
import TaskCanceller, { CancellationError } from "../utils/task_canceller";
import type {
  IMediaSourceHandle,
  IMediaSourceInterface,
  IMediaSourceInterfaceEvents,
  ISourceBufferInterface,
  ISourceBufferInterfaceAppendBufferParameters,
  SourceBufferType,
} from "./types";
import { maintainEndOfStream } from "./utils/end_of_stream";
import MediaSourceDurationUpdater from "./utils/media_source_duration_updater";

/*
 * `IMediaSourceInterface` object for when the MSE API are directly available.
 * @see IMediaSourceInterface
 * @class {MainMediaSourceInterface}
 */
export default class MainMediaSourceInterface
  extends EventEmitter<IMediaSourceInterfaceEvents>
  implements IMediaSourceInterface
{
  /** @see IMediaSourceInterface */
  public id: string;
  /**
   * @see IMediaSourceInterface
   *
   * Note: A `MainMediaSourceInterface`'s handle is never `undefined`.
   * It can thus always be relied on when linking it to an `HTMLMediaElement`.
   */
  public handle: IMediaSourceHandle;
  /** @see IMediaSourceInterface */
  public sourceBuffers: MainSourceBufferInterface[];
  /** @see IMediaSourceInterface */
  public readyState: "open" | "closed" | "ended";
  /** The MSE `MediaSource` instance linked to that `IMediaSourceInterface`. */
  private _mediaSource: IMediaSource;
  /**
   * Abstraction allowing to set and update the MediaSource's duration.
   */
  private _durationUpdater: MediaSourceDurationUpdater;
  /**
   * Only set if there is an `endOfStream` operation pending.
   *
   * Allows to abort it.
   */
  private _endOfStreamCanceller: TaskCanceller | null;
  /**
   * Allows to clean-up long-running operation when the `IMediaSourceInterface`
   * is dispossed
   */
  private _canceller: TaskCanceller;

  /**
   * Creates a new `MainMediaSourceInterface` alongside its `MediaSource` MSE
   * object.
   *
   * You can then obtain a link to that `MediaSource`, for example to link it
   * to an `HTMLMediaElement`, through the `handle` property.
   *
   * @param {string} id
   */
  constructor(id: string, forcedMediaSource?: new () => IMediaSource) {
    super();
    this.id = id;
    this.sourceBuffers = [];
    this._canceller = new TaskCanceller();

    if (isNullOrUndefined(MediaSource_)) {
      throw new MediaError(
        "MEDIA_SOURCE_NOT_SUPPORTED",
        "No MediaSource Object was found in the current browser.",
      );
    }

    log.info("Init: Creating MediaSource");
    const mediaSource =
      forcedMediaSource !== undefined ? new forcedMediaSource() : new MediaSource_();
    const handle = (mediaSource as unknown as { handle: MediaProvider }).handle;
    this.handle = isNullOrUndefined(handle)
      ? /* eslint-disable-next-line @typescript-eslint/no-restricted-types */
        { type: "media-source", value: mediaSource as unknown as MediaSource }
      : { type: "handle", value: handle };
    this._mediaSource = mediaSource;
    this.readyState = mediaSource.readyState;
    this._durationUpdater = new MediaSourceDurationUpdater(mediaSource);
    this._endOfStreamCanceller = null;
    onSourceOpen(mediaSource, this._onSourceOpen.bind(this), this._canceller.signal);
    onSourceEnded(mediaSource, this._onSourceEnded.bind(this), this._canceller.signal);
    onSourceClose(mediaSource, this._onSourceClose.bind(this), this._canceller.signal);
  }

  private _onSourceOpen(): void {
    this.readyState = this._mediaSource.readyState;
    this.trigger("mediaSourceOpen", null);
  }

  private _onSourceEnded(): void {
    this.readyState = this._mediaSource.readyState;
    this.trigger("mediaSourceEnded", null);
  }

  private _onSourceClose(): void {
    this.readyState = this._mediaSource.readyState;
    this.trigger("mediaSourceClose", null);
  }

  /** @see IMediaSourceInterface */
  public addSourceBuffer(
    sbType: SourceBufferType,
    codec: string,
  ): MainSourceBufferInterface {
    const sourceBuffer = this._mediaSource.addSourceBuffer(codec);
    const sb = new MainSourceBufferInterface(sbType, codec, sourceBuffer);
    this.sourceBuffers.push(sb);
    return sb;
  }

  /** @see IMediaSourceInterface */
  public setDuration(newDuration: number, isRealEndKnown: boolean): void {
    this._durationUpdater.updateDuration(newDuration, isRealEndKnown);
  }

  /** @see IMediaSourceInterface */
  public interruptDurationSetting() {
    this._durationUpdater.stopUpdating();
  }

  /** @see IMediaSourceInterface */
  public maintainEndOfStream() {
    if (this._endOfStreamCanceller === null) {
      this._endOfStreamCanceller = new TaskCanceller();
      this._endOfStreamCanceller.linkToSignal(this._canceller.signal);
      log.debug("Init: end-of-stream order received.");
      maintainEndOfStream(this._mediaSource, this._endOfStreamCanceller.signal);
    }
  }

  /** @see IMediaSourceInterface */
  public stopEndOfStream() {
    if (this._endOfStreamCanceller !== null) {
      log.debug("Init: resume-stream order received.");
      this._endOfStreamCanceller.cancel();
      this._endOfStreamCanceller = null;
    }
  }

  /** @see IMediaSourceInterface */
  public dispose() {
    this.sourceBuffers.forEach((s) => s.dispose());
    this._canceller.cancel();
    resetMediaSource(this._mediaSource);
  }
}

/**
 * `ISourceBufferInterface` object for when the MSE API are directly available.
 * @see ISourceBufferInterface
 * @class {MainSourceBufferInterface}
 */
export class MainSourceBufferInterface implements ISourceBufferInterface {
  /** @see ISourceBufferInterface */
  public codec: string;
  /** @see ISourceBufferInterface */
  public type: SourceBufferType;
  /**
   * Allows to clean-up long-running operation when the `ISourceBufferInterface`
   * is dispossed
   */
  private _canceller: TaskCanceller;
  /** The MSE `SourceBuffer` instance linked to that `ISourceBufferInterface`. */
  private _sourceBuffer: ISourceBuffer;
  /**
   * Queue of operations, from the most to the least urgent, currently waiting
   * their turn to be performed on the `SourceBuffer`.
   */
  private _operationQueue: ISbiQueuedOperation[];
  /**
   * Operation currently performed on the `SourceBuffer`, for which we're
   * awaiting an event to be notified of its success or failure.
   *
   * `null` if no known operation is pending.
   */
  private _currentOperations: Array<Omit<ISbiQueuedOperation, "params">>;
  private _isTransferring: boolean;

  /**
   * Creates a new `SourceBufferInterface` linked to the given `SourceBuffer`
   * instance.
   * @param {string} sbType
   * @param {string} codec
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(sbType: SourceBufferType, codec: string, sourceBuffer: ISourceBuffer) {
    this.type = sbType;
    this.codec = codec;
    this._canceller = new TaskCanceller();
    this._sourceBuffer = sourceBuffer;
    this._operationQueue = [];
    this._currentOperations = [];
    this._isTransferring = false;

    const onError = this._onError.bind(this);
    const onUpdateEnd = this._onUpdateEnd.bind(this);
    sourceBuffer.addEventListener("updateend", onUpdateEnd);
    sourceBuffer.addEventListener("error", onError);
    this._canceller.signal.register(() => {
      sourceBuffer.removeEventListener("updateend", onUpdateEnd);
      sourceBuffer.removeEventListener("error", onError);
    });
  }

  /** @see ISourceBufferInterface */
  public appendBuffer(
    ...args: Parameters<ISourceBufferInterface["appendBuffer"]>
  ): Promise<IRange[]> {
    log.debug("SBI: receiving order to push data to the SourceBuffer", this.type);
    return this._addToQueue({
      operationName: SbiOperationName.Push,
      params: args,
    });
  }

  /** @see ISourceBufferInterface */
  public remove(start: number, end: number): Promise<IRange[]> {
    log.debug(
      "SBI: receiving order to remove data from the SourceBuffer",
      this.type,
      start,
      end,
    );
    return this._addToQueue({
      operationName: SbiOperationName.Remove,
      params: [start, end],
    });
  }

  /** @see ISourceBufferInterface */
  public getBuffered(): IRange[] | undefined {
    if (this._isTransferring) {
      return undefined;
    }
    try {
      return convertToRanges(this._sourceBuffer.buffered);
    } catch (err) {
      log.error(
        "Failed to get buffered time range of SourceBuffer",
        this.type,
        err instanceof Error ? err : null,
      );
      return [];
    }
  }

  /** @see ISourceBufferInterface */
  public abort(): void {
    try {
      this._sourceBuffer.abort();
    } catch (err) {
      log.debug("Init: Failed to abort SourceBuffer:", err instanceof Error ? err : null);
    }
    this._emptyCurrentQueue();
  }

  /** @see ISourceBufferInterface */
  public dispose(): void {
    try {
      this._sourceBuffer.abort();
    } catch (_) {
      // we don't care
    }
    this._emptyCurrentQueue();
    this._canceller.cancel();
  }

  private _onError(evt: Event) {
    let error: Error;
    if ((evt as unknown as Error) instanceof Error) {
      error = evt as unknown as Error;
    } else if ((evt as unknown as { error: Error }).error instanceof Error) {
      error = (evt as unknown as { error: Error }).error;
    } else {
      error = new Error("Unknown SourceBuffer Error");
    }
    const currentOps = this._currentOperations;
    this._currentOperations = [];
    if (currentOps.length === 0) {
      log.error("SBI: error for an unknown operation", error);
    } else {
      const rejected = new SourceBufferError(
        error.name,
        error.message,
        error.name === "QuotaExceededError",
      );
      for (const op of currentOps) {
        op.reject(rejected);
      }
    }
  }

  private _onUpdateEnd() {
    const currentOps = this._currentOperations;
    this._currentOperations = [];
    try {
      for (const op of currentOps) {
        op.resolve(convertToRanges(this._sourceBuffer.buffered));
      }
    } catch (err) {
      for (const op of currentOps) {
        if (err instanceof Error && err.name === "InvalidStateError") {
          // Most likely the SourceBuffer just has been removed from the
          // `MediaSource`.
          // Just return an empty buffered range.
          op.resolve([]);
        } else {
          op.reject(err);
        }
      }
    }
    this._performNextOperation();
  }

  private _emptyCurrentQueue(): void {
    const error = new CancellationError();
    if (this._currentOperations.length > 0) {
      this._currentOperations.forEach((op) => {
        op.reject(error);
      });
      this._currentOperations = [];
    }
    if (this._operationQueue.length > 0) {
      this._operationQueue.forEach((op) => {
        op.reject(error);
      });
      this._operationQueue = [];
    }
  }

  private _addToQueue(
    operation: Pick<ISbiQueuedOperation, "operationName" | "params">,
  ): Promise<IRange[]> {
    return new Promise<IRange[]>((resolve, reject) => {
      const shouldRestartQueue =
        this._operationQueue.length === 0 && this._currentOperations.length === 0;
      const queueItem = objectAssign(
        { resolve, reject },
        operation,
      ) as ISbiQueuedOperation;
      this._operationQueue.push(queueItem);
      if (shouldRestartQueue) {
        this._performNextOperation();
      }
    });
  }

  private _performNextOperation(): void {
    if (
      this._currentOperations.length !== 0 ||
      this._sourceBuffer.updating ||
      this._isTransferring
    ) {
      return;
    }
    const nextElem = this._operationQueue.shift();
    if (nextElem === undefined) {
      return;
    } else if (nextElem.operationName === SbiOperationName.Push) {
      this._currentOperations = [
        {
          operationName: SbiOperationName.Push,
          resolve: nextElem.resolve,
          reject: nextElem.reject,
        },
      ];
      const ogData = nextElem.params[0];
      const params = nextElem.params[1];
      let segmentData: BufferSource = ogData;

      // In some cases with very poor performances, tens of appendBuffer
      // requests could be waiting for their turn here.
      //
      // Instead of pushing each one, one by one, waiting in-between for each
      // one's `"updateend"` event (which would probably have lot of time
      // overhead involved, even more considering that we're probably
      // encountering performance issues), the idea is to concatenate all
      // similar push operations into one huge segment.
      //
      // This seems to have a very large positive effect on the more
      // extreme scenario, such as low-latency CMAF with very small chunks and
      // huge CPU usage in the thread doing the push operation.
      //
      // Because this should still be relatively rare, we pre-check here
      // the condition.
      if (
        this._operationQueue.length > 0 &&
        this._operationQueue[0].operationName === SbiOperationName.Push
      ) {
        let prevU8;
        if (ogData instanceof ArrayBuffer) {
          prevU8 = new Uint8Array(ogData);
        } else if (ogData instanceof Uint8Array) {
          prevU8 = ogData;
        } else {
          prevU8 = new Uint8Array(ogData.buffer);
        }
        const toConcat = [prevU8];
        while (this._operationQueue[0]?.operationName === SbiOperationName.Push) {
          const followingElem = this._operationQueue[0];
          const cAw = params.appendWindow ?? [undefined, undefined];
          const fAw = followingElem.params[1].appendWindow ?? [undefined, undefined];
          const cTo = params.timestampOffset ?? 0;
          const fTo = followingElem.params[1].timestampOffset ?? 0;
          if (
            cAw[0] === fAw[0] &&
            cAw[1] === fAw[1] &&
            params.codec === followingElem.params[1].codec &&
            cTo === fTo
          ) {
            const newData = followingElem.params[0];
            let newU8;
            if (newData instanceof ArrayBuffer) {
              newU8 = new Uint8Array(newData);
            } else if (newData instanceof Uint8Array) {
              newU8 = newData;
            } else {
              newU8 = new Uint8Array(newData.buffer);
            }
            toConcat.push(newU8);
            this._operationQueue.splice(0, 1);
            this._currentOperations.push({
              operationName: SbiOperationName.Push,
              resolve: followingElem.resolve,
              reject: followingElem.reject,
            });
          } else {
            break;
          }
        }
        if (toConcat.length > 1) {
          log.info(
            `MMSI: Merging ${toConcat.length} segments together for perf`,
            this.type,
          );
          segmentData = concat(...toConcat);
        }
      }
      try {
        this._appendBufferNow(segmentData, params);
      } catch (err) {
        const error =
          err instanceof Error
            ? new SourceBufferError(
                err.name,
                err.message,
                err.name === "QuotaExceededError",
              )
            : new SourceBufferError(
                "Error",
                "Unknown SourceBuffer Error during appendBuffer",
                false,
              );
        this._currentOperations.forEach((op) => {
          op.reject(error);
        });
        this._currentOperations = [];
      }
    } else {
      // TODO merge contiguous removes?
      this._currentOperations = [nextElem];
      const [start, end] = nextElem.params;
      log.debug("SBI: removing data from SourceBuffer", this.type, start, end);
      try {
        this._sourceBuffer.remove(start, end);
      } catch (err) {
        const error =
          err instanceof Error
            ? new SourceBufferError(err.name, err.message, false)
            : new SourceBufferError(
                "Error",
                "Unknown SourceBuffer Error during remove",
                false,
              );
        nextElem.reject(error);
        this._currentOperations = [];
      }
    }
  }

  private _appendBufferNow(
    data: BufferSource,
    params: ISourceBufferInterfaceAppendBufferParameters,
  ): void {
    const sourceBuffer = this._sourceBuffer;
    const { codec, timestampOffset, appendWindow = [] } = params;
    if (codec !== undefined && codec !== this.codec) {
      log.debug("SBI: updating codec", codec);
      const hasUpdatedSourceBufferType = tryToChangeSourceBufferType(sourceBuffer, codec);
      if (hasUpdatedSourceBufferType) {
        this.codec = codec;
      } else {
        log.debug("SBI: could not update codec", codec, this.codec);
      }
    }

    if (
      timestampOffset !== undefined &&
      sourceBuffer.timestampOffset !== timestampOffset
    ) {
      const newTimestampOffset = timestampOffset;
      log.debug(
        "SBI: updating timestampOffset",
        codec,
        sourceBuffer.timestampOffset,
        newTimestampOffset,
      );
      sourceBuffer.timestampOffset = newTimestampOffset;
    }

    if (appendWindow[0] === undefined) {
      if (sourceBuffer.appendWindowStart > 0) {
        log.debug("SBI: re-setting `appendWindowStart` to `0`");
        sourceBuffer.appendWindowStart = 0;
      }
    } else if (appendWindow[0] !== sourceBuffer.appendWindowStart) {
      if (appendWindow[0] >= sourceBuffer.appendWindowEnd) {
        const newTmpEnd = appendWindow[0] + 1;
        log.debug("SBI: pre-updating `appendWindowEnd`", newTmpEnd);
        sourceBuffer.appendWindowEnd = newTmpEnd;
      }
      log.debug("SBI: setting `appendWindowStart`", appendWindow[0]);
      sourceBuffer.appendWindowStart = appendWindow[0];
    }

    if (appendWindow[1] === undefined) {
      if (sourceBuffer.appendWindowEnd !== Infinity) {
        log.debug("SBI: re-setting `appendWindowEnd` to `Infinity`");
        sourceBuffer.appendWindowEnd = Infinity;
      }
    } else if (appendWindow[1] !== sourceBuffer.appendWindowEnd) {
      log.debug("SBI: setting `appendWindowEnd`", appendWindow[1]);
      sourceBuffer.appendWindowEnd = appendWindow[1];
    }
    log.debug("SBI: pushing segment", this.type);
    sourceBuffer.appendBuffer(data);
  }
}

function resetMediaSource(mediaSource: IMediaSource): void {
  if (mediaSource.readyState !== "closed") {
    const { readyState, sourceBuffers } = mediaSource;
    for (let i = sourceBuffers.length - 1; i >= 0; i--) {
      const sourceBuffer = sourceBuffers[i];
      try {
        if (readyState === "open") {
          log.info("Init: Aborting SourceBuffer before removing");
          try {
            sourceBuffer.abort();
          } catch (_) {
            // We actually don't care at all when resetting
          }
        }
        log.info("Init: Removing SourceBuffer from mediaSource");
        mediaSource.removeSourceBuffer(sourceBuffer);
      } catch (_) {
        // We actually don't care at all when resetting
      }
    }
    if (sourceBuffers.length > 0) {
      log.info("Init: Not all SourceBuffers could have been removed.");
    }
  }
}

/**
 * Enum used by a SourceBufferInterface as a discriminant in its queue of
 * "operations".
 */
const enum SbiOperationName {
  Push,
  Remove,
}

type ISbiQueuedOperation = IQueuedSbiPush | IQueuedSbiRemove;

interface IQueuedSbiPush {
  operationName: SbiOperationName.Push;
  params: Parameters<ISourceBufferInterface["appendBuffer"]>;
  resolve: (ranges: IRange[]) => void;
  reject: (error: unknown) => void;
}

interface IQueuedSbiRemove {
  operationName: SbiOperationName.Remove;
  params: Parameters<ISourceBufferInterface["remove"]>;
  resolve: (ranges: IRange[]) => void;
  reject: (error: unknown) => void;
}
