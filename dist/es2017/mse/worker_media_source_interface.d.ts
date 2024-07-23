import { SourceBufferError } from "../errors";
import type { ISerializedSourceBufferError } from "../errors/source_buffer_error";
import type { IAbortBufferWorkerMessage, IAddSourceBufferWorkerMessage, IAppendBufferWorkerMessage, ICreateMediaSourceWorkerMessage, IDisposeMediaSourceWorkerMessage, IEndOfStreamWorkerMessage, IInterruptMediaSourceDurationWorkerMessage, IRemoveBufferWorkerMessage, IStopEndOfStreamWorkerMessage, IUpdateMediaSourceDurationWorkerMessage } from "../multithread_types";
import EventEmitter from "../utils/event_emitter";
import type { IRange } from "../utils/ranges";
import { CancellationError } from "../utils/task_canceller";
import type { IMediaSourceInterface, IMediaSourceInterfaceEvents, ISourceBufferInterface, ISourceBufferInterfaceAppendBufferParameters, SourceBufferType } from "./types";
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
export default class WorkerMediaSourceInterface extends EventEmitter<IMediaSourceInterfaceEvents> implements IMediaSourceInterface {
    id: string;
    handle: undefined;
    sourceBuffers: WorkerSourceBufferInterface[];
    readyState: ReadyState;
    private _canceller;
    private _messageSender;
    constructor(id: string, contentId: string, messageSender: IWorkerMediaSourceInterfaceMessageSender);
    onMediaSourceReadyStateChanged(readyState: ReadyState): void;
    addSourceBuffer(sbType: SourceBufferType, codec: string): ISourceBufferInterface;
    setDuration(newDuration: number, isRealEndKnown: boolean): void;
    interruptDurationSetting(): void;
    maintainEndOfStream(): void;
    stopEndOfStream(): void;
    dispose(): void;
}
export type IWorkerMediaSourceInterfaceMessageSender = (msg: IAppendBufferWorkerMessage | IRemoveBufferWorkerMessage | IAbortBufferWorkerMessage | ICreateMediaSourceWorkerMessage | IAddSourceBufferWorkerMessage | IUpdateMediaSourceDurationWorkerMessage | IInterruptMediaSourceDurationWorkerMessage | IEndOfStreamWorkerMessage | IStopEndOfStreamWorkerMessage | IDisposeMediaSourceWorkerMessage, transferables?: Transferable[]) => void;
export declare class WorkerSourceBufferInterface implements ISourceBufferInterface {
    /** Last codec linked to that `WorkerSourceBufferInterface`. */
    codec: string;
    /**
     * Media type handled by that `WorkerSourceBufferInterface`.
     * Equal to `Video` as long as it contains video, even if it also contains
     * audio.
     */
    type: SourceBufferType;
    /**
     * Push and remove operations which have not yet been sent to avoid
     * overwhelming the main thread.
     * @see `MAX_WORKER_SOURCE_BUFFER_QUEUE_SIZE`
     */
    _queuedOperations: ISbiQueuedOperation[];
    /**
     * Operations currently running in the main thread for which we are awaiting
     * a response.
     */
    _pendingOperations: Map<string, {
        resolve: (ranges: IRange[]) => void;
        reject: (err: CancellationError | SourceBufferError) => void;
    }>;
    /**
     * Identifier Identifying this `WorkerSourceBufferInterface` in-between
     * threads.
     */
    private _mediaSourceId;
    /**
     * When it emits, clean-up all resources taken by the
     * WorkerSourceBufferInterface.
     */
    private _canceller;
    /** Allows to send messages to the main thread. */
    private _messageSender;
    constructor(sbType: SourceBufferType, codec: string, mediaSourceId: string, messageSender: IWorkerMediaSourceInterfaceMessageSender);
    onOperationSuccess(operationId: string, ranges: IRange[]): void;
    onOperationFailure(operationId: string, error: ISerializedSourceBufferError | {
        errorName: "CancellationError";
    }): void;
    appendBuffer(data: BufferSource, params: ISourceBufferInterfaceAppendBufferParameters): Promise<IRange[]>;
    remove(start: number, end: number): Promise<IRange[]>;
    abort(): void;
    dispose(): void;
    getBuffered(): undefined;
    private _addOperationToQueue;
    private _performNextQueuedOperationIfItExists;
}
type ISbiQueuedOperation = IQueuedSbiPush | IQueuedSbiRemove;
/**
 * Enum used by a SourceBufferInterface as a discriminant in its queue of
 * "operations".
 */
declare const enum SbiOperationName {
    Push = 0,
    Remove = 1
}
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
export {};
//# sourceMappingURL=worker_media_source_interface.d.ts.map