import { SourceBufferError } from "../errors";
import { ISerializedSourceBufferError } from "../errors/source_buffer_error";
import log from "../log";
import {
  IAbortBufferWorkerMessage,
  IAddSourceBufferWorkerMessage,
  IAppendBufferWorkerMessage,
  ICreateMediaSourceWorkerMessage,
  IDisposeMediaSourceWorkerMessage,
  IEndOfStreamWorkerMessage,
  IInterruptMediaSourceDurationWorkerMessage,
  IRemoveBufferWorkerMessage,
  IStopEndOfStreamWorkerMessage,
  IUpdateMediaSourceDurationWorkerMessage,
  WorkerMessageType,
} from "../multithread_types";
import EventEmitter from "../utils/event_emitter";
import idGenerator from "../utils/id_generator";
import { IRange } from "../utils/ranges";
import TaskCanceller, {
  CancellationError,
} from "../utils/task_canceller";
import {
  IMediaSourceInterface,
  IMediaSourceInterfaceEvents,
  ISourceBufferInterface,
  ISourceBufferInterfaceAppendBufferParameters,
  SourceBufferType,
} from "./types";

const generateMediaSourceId = idGenerator();
const generateSourceBufferOperationId = idGenerator();

/**
 * Interface to the MediaSource browser APIs of the Media Source Extentions for
 * a WebWorker environment where MSE API are not available (if MSE API are
 * available in WebWorker in the current environment you don't have to rely on
 * this class).
 *
 * What this class actually does for most MSE API is to post a message
 * corresponding to the wanted action - which will have to be processed on the
 * main thread.
 * @class {WorkerMediaSourceInterface}
 */
export default class WorkerMediaSourceInterface extends EventEmitter<
  IMediaSourceInterfaceEvents
> implements IMediaSourceInterface {
  public id: string;
  public handle: undefined;
  public sourceBuffers: WorkerSourceBufferInterface[];
  public readyState: ReadyState;
  private _canceller: TaskCanceller;
  private _messageSender: IWorkerMediaSourceInterfaceMessageSender;

  constructor(
    id: string,
    contentId: string,
    messageSender: IWorkerMediaSourceInterfaceMessageSender
  ) {
    super();
    this.id = id;
    this.sourceBuffers = [];
    this._canceller = new TaskCanceller();
    this.readyState = "closed";
    this._messageSender = messageSender;

    const mediaSourceId = generateMediaSourceId();
    this._messageSender({
      type: WorkerMessageType.CreateMediaSource,
      contentId,
      mediaSourceId,
    });
  }

  public onMediaSourceReadyStateChanged(readyState: ReadyState): void {
    switch (readyState) {
      case "closed":
        this.readyState = "closed";
        this.trigger("mediaSourceClose", null);
        break;
      case "open":
        this.readyState = "open";
        this.trigger("mediaSourceOpen", null);
        break;
      case "ended":
        this.readyState = "ended";
        this.trigger("mediaSourceEnded", null);
        break;
    }
  }

  public addSourceBuffer(
    sbType: SourceBufferType,
    codec: string
  ): ISourceBufferInterface {
    this._messageSender({
      type: WorkerMessageType.AddSourceBuffer,
      mediaSourceId: this.id,
      value: {
        sourceBufferType: sbType,
        codec,
      },
    });
    const sb = new WorkerSourceBufferInterface(sbType,
                                               codec,
                                               this.id,
                                               this._messageSender);
    this.sourceBuffers.push(sb);
    return sb;
  }

  public setDuration(
    newDuration: number,
    isRealEndKnown: boolean
  ) {
    this._messageSender({
      type: WorkerMessageType.UpdateMediaSourceDuration,
      mediaSourceId: this.id,
      value: {
        duration: newDuration,
        isRealEndKnown,
      },
    });
  }

  public interruptDurationSetting() {
    this._messageSender({
      type: WorkerMessageType.InterruptMediaSourceDurationUpdate,
      mediaSourceId: this.id,
      value: null,
    });
  }

  public maintainEndOfStream() {
    this._messageSender({
      type: WorkerMessageType.EndOfStream,
      mediaSourceId: this.id,
      value: null,
    });
  }

  public stopEndOfStream() {
    this._messageSender({
      type: WorkerMessageType.InterruptEndOfStream,
      mediaSourceId: this.id,
      value: null,
    });
  }

  public dispose() {
    this.sourceBuffers.forEach(s => s.dispose());
    this._canceller.cancel();
    this._messageSender({
      type: WorkerMessageType.DisposeMediaSource,
      mediaSourceId: this.id,
      value: null,
    });
  }
}

export type IWorkerMediaSourceInterfaceMessageSender = (
  msg : IAppendBufferWorkerMessage |
        IRemoveBufferWorkerMessage |
        IAbortBufferWorkerMessage |
        ICreateMediaSourceWorkerMessage |
        IAddSourceBufferWorkerMessage |
        IUpdateMediaSourceDurationWorkerMessage |
        IInterruptMediaSourceDurationWorkerMessage |
        IEndOfStreamWorkerMessage |
        IStopEndOfStreamWorkerMessage |
        IDisposeMediaSourceWorkerMessage,
  transferables? : Transferable[]
) => void;

export class WorkerSourceBufferInterface {
  public codec: string;
  public type: SourceBufferType;
  private _mediaSourceId: string;
  private _canceller: TaskCanceller;
  public _pendingOperations : Map<string, {
    resolve: (ranges: IRange[]) => void;
    reject: (err: CancellationError | SourceBufferError) => void;
  }>;
  private _messageSender: IWorkerMediaSourceInterfaceMessageSender;

  constructor(
    sbType: SourceBufferType,
    codec: string,
    mediaSourceId: string,
    messageSender: IWorkerMediaSourceInterfaceMessageSender
  ) {
    this.type = sbType;
    this.codec = codec;
    this._canceller = new TaskCanceller();
    this._mediaSourceId = mediaSourceId;
    this._pendingOperations = new Map();
    this._messageSender = messageSender;
  }

  public onOperationSuccess(
    operationId: string,
    ranges: IRange[]
  ) : void {
    const mapElt = this._pendingOperations.get(operationId);
    if (mapElt === undefined) {
      log.warn("SBI: unknown SourceBuffer operation succeeded");
    } else {
      this._pendingOperations.delete(operationId);
      mapElt.resolve(ranges);
    }
  }

  public onOperationFailure(
    operationId: string,
    error : ISerializedSourceBufferError |
            { errorName: "CancellationError" }
  ) : void {
    const formattedErr = error.errorName === "CancellationError" ?
      new CancellationError() :
      new SourceBufferError(error.errorName,
                            error.message,
                            error.isBufferFull);
    const mapElt = this._pendingOperations.get(operationId);
    if (mapElt === undefined) {
      log.info("SBI: unknown SourceBuffer operation failed", formattedErr);
    } else {
      this._pendingOperations.delete(operationId);
      mapElt.reject(formattedErr);
    }
  }

  public appendBuffer(
    data: BufferSource,
    params: ISourceBufferInterfaceAppendBufferParameters
  ): Promise<IRange[]> {
    return new Promise((resolve, reject) => {
      try {
        let segmentBufferPushed : ArrayBuffer;
        if (data instanceof ArrayBuffer) {
          segmentBufferPushed = data;
        } else if (data.byteLength === data.buffer.byteLength) {
          segmentBufferPushed = data.buffer;
        } else {
          segmentBufferPushed = data.buffer.slice(
            data.byteOffset,
            data.byteLength + data.byteOffset
          );
        }
        const operationId = generateSourceBufferOperationId();
        this._messageSender({
          type: WorkerMessageType.SourceBufferAppend,
          mediaSourceId: this._mediaSourceId,
          sourceBufferType: this.type,
          operationId,
          value: {
            data: segmentBufferPushed,
            params,
          },
        }, [segmentBufferPushed]);
        this._addOperationToQueue(operationId, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  public remove(
    start: number,
    end: number
  ): Promise<IRange[]> {
    return new Promise((resolve, reject) => {
      try {
        const operationId = generateSourceBufferOperationId();
        this._messageSender({
          type: WorkerMessageType.SourceBufferRemove,
          mediaSourceId: this._mediaSourceId,
          sourceBufferType: this.type,
          operationId,
          value: {
            start,
            end,
          },
        });
        this._addOperationToQueue(operationId, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  public abort(): void {
    this._messageSender({
      type: WorkerMessageType.AbortSourceBuffer,
      mediaSourceId: this._mediaSourceId,
      sourceBufferType: this.type,
      value: null,
    });
  }

  public dispose(): void {
    this.abort();
    this._canceller.cancel();
  }

  public getBuffered(): undefined {
    return ;
  }

  private _addOperationToQueue(
    operationId: string,
    resolve: (ranges: IRange[]) => void,
    reject: (err: unknown) => void
  ): void {
    this._pendingOperations.set(operationId, { resolve: onResolve,
                                               reject: onReject });
    const unbindCanceller = this._canceller.signal.register((error) => {
      this._pendingOperations.delete(operationId);
      reject(error);
    });
    function onResolve(ranges: IRange[]) {
      unbindCanceller();
      resolve(ranges);
    }
    function onReject(err: unknown) {
      unbindCanceller();
      reject(err);
    }
  }
}
