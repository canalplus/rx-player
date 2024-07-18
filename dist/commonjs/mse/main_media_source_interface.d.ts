import EventEmitter from "../utils/event_emitter";
import type { IRange } from "../utils/ranges";
import type { IMediaSourceHandle, IMediaSourceInterface, IMediaSourceInterfaceEvents, ISourceBufferInterface, SourceBufferType } from "./types";
/**
 * `IMediaSourceInterface` object for when the MSE API are directly available.
 * @see IMediaSourceInterface
 * @class {MainMediaSourceInterface}
 */
export default class MainMediaSourceInterface extends EventEmitter<IMediaSourceInterfaceEvents> implements IMediaSourceInterface {
    /** @see IMediaSourceInterface */
    id: string;
    /**
     * @see IMediaSourceInterface
     *
     * Note: A `MainMediaSourceInterface`'s handle is never `undefined`.
     * It can thus always be relied on when linking it to an `HTMLMediaElement`.
     */
    handle: IMediaSourceHandle;
    /** @see IMediaSourceInterface */
    sourceBuffers: MainSourceBufferInterface[];
    /** @see IMediaSourceInterface */
    readyState: ReadyState;
    /** The MSE `MediaSource` instance linked to that `IMediaSourceInterface`. */
    private _mediaSource;
    /**
     * Abstraction allowing to set and update the MediaSource's duration.
     */
    private _durationUpdater;
    /**
     * Only set if there is an `endOfStream` operation pending.
     *
     * Allows to abort it.
     */
    private _endOfStreamCanceller;
    /**
     * Allows to clean-up long-running operation when the `IMediaSourceInterface`
     * is dispossed
     */
    private _canceller;
    /**
     * Creates a new `MainMediaSourceInterface` alongside its `MediaSource` MSE
     * object.
     *
     * You can then obtain a link to that `MediaSource`, for example to link it
     * to an `HTMLMediaElement`, through the `handle` property.
     */
    constructor(id: string);
    /** @see IMediaSourceInterface */
    addSourceBuffer(sbType: SourceBufferType, codec: string): MainSourceBufferInterface;
    /** @see IMediaSourceInterface */
    setDuration(newDuration: number, isRealEndKnown: boolean): void;
    /** @see IMediaSourceInterface */
    interruptDurationSetting(): void;
    /** @see IMediaSourceInterface */
    maintainEndOfStream(): void;
    /** @see IMediaSourceInterface */
    stopEndOfStream(): void;
    /** @see IMediaSourceInterface */
    dispose(): void;
}
/**
 * `ISourceBufferInterface` object for when the MSE API are directly available.
 * @see ISourceBufferInterface
 * @class {MainSourceBufferInterface}
 */
export declare class MainSourceBufferInterface implements ISourceBufferInterface {
    /** @see ISourceBufferInterface */
    codec: string;
    /** @see ISourceBufferInterface */
    type: SourceBufferType;
    /**
     * Allows to clean-up long-running operation when the `ISourceBufferInterface`
     * is dispossed
     */
    private _canceller;
    /** The MSE `SourceBuffer` instance linked to that `ISourceBufferInterface`. */
    private _sourceBuffer;
    /**
     * Queue of operations, from the most to the least urgent, currently waiting
     * their turn to be performed on the `SourceBuffer`.
     */
    private _operationQueue;
    /**
     * Operation currently performed on the `SourceBuffer`, for which we're
     * awaiting an event to be notified of its success or failure.
     *
     * `null` if no known operation is pending.
     */
    private _currentOperations;
    /**
     * Creates a new `SourceBufferInterface` linked to the given `SourceBuffer`
     * instance.
     * @param {string} sbType
     * @param {string} codec
     * @param {SourceBuffer} sourceBuffer
     */
    constructor(sbType: SourceBufferType, codec: string, sourceBuffer: SourceBuffer);
    /** @see ISourceBufferInterface */
    appendBuffer(...args: Parameters<ISourceBufferInterface["appendBuffer"]>): Promise<IRange[]>;
    /** @see ISourceBufferInterface */
    remove(start: number, end: number): Promise<IRange[]>;
    /** @see ISourceBufferInterface */
    getBuffered(): IRange[];
    /** @see ISourceBufferInterface */
    abort(): void;
    /** @see ISourceBufferInterface */
    dispose(): void;
    private _emptyCurrentQueue;
    private _addToQueue;
    private _performNextOperation;
    private _appendBufferNow;
}
//# sourceMappingURL=main_media_source_interface.d.ts.map