import type { ISerializedSourceBufferError } from "../errors/source_buffer_error";
import type EventEmitter from "../utils/event_emitter";
import type { IRange } from "../utils/ranges";

/**
 * Categorize a type of media associated to a `SourceBuffer` (the Media Source
 * Extensions Object).
 */
export const enum SourceBufferType {
  /** `SourceBuffer` for audio data only. */
  Audio = "audio",
  /** `SourceBuffer` for either video data only or both audio and video. */
  Video = "video",
}

/** Parameters associated to a chunk that should be pushed. */
export interface ISourceBufferInterfaceAppendBufferParameters {
  /** Mime-type + codec combination linked to that chunk. */
  codec?: string | undefined;
  /**
   * Tuple of:
   *   1. The `appendWindowStart` (the Media Source Extensions concept)
   *   2. The `appendWindowEnd` (the Media Source Extensions concept)
   *
   * `undefined` for each when no such value is set.
   */
  appendWindow?: [number | undefined, number | undefined] | undefined;
  /**
   * `timestampOffset` (the Media Source Extensions concept) that should be
   * associated that chunk.
   */
  timestampOffset?: number | undefined;
}

/**
 * Provide a more portable (as in both main thread and WebWorker compatible) and
 * more usable (Promise-based, no need to queue calls) abstraction over a
 * `SourceBuffer` Object from the Media Source Extensions.
 */
export interface ISourceBufferInterface {
  /** Mime-type + codec combination currently linked to that `ISourceBufferInterface`. */
  codec: string;
  /**
   * Type of media buffered by the underlying `SourceBuffer`.
   */
  type: SourceBufferType;
  /**
   * Append media data referenced by `data` to the `ISourceBufferInterface` with
   * the corresponding associated parameters.
   *
   * Returns a promise which resolves once the data has been pushed with success
   * with the new updated buffered range associated to the underlying
   * `SourceBuffer`.
   * Reject when either:
   *
   *   - The operation fails.
   *     In which case the value rejected should preferably be a
   *     `SourceBufferError`.
   *
   *   - The operation was aborted (due to an `abort` or `dispose` call).
   *     In which case the value rejected should be a `CancellationError`.
   *
   * @param {BufferSource} data
   * @param {Object} params
   * @returns {Promise.<Array.<Object>>}
   */
  appendBuffer(
    data: BufferSource,
    params: ISourceBufferInterfaceAppendBufferParameters,
  ): Promise<IRange[]>;
  /**
   * Remove media data present between the given start time in seconds and the
   * given end time in seconds.
   *
   * Returns a promise which resolves once the data has been removed with success
   * with the new updated buffered range associated to the underlying
   * `SourceBuffer`.
   * Reject when either:
   *
   *   - The operation fails.
   *     In which case the value rejected should preferably be a
   *     `SourceBufferError`.
   *
   *   - The operation was aborted (due to an `abort` or `dispose` call).
   *     In which case the value rejected should be a `CancellationError`.
   *
   * @param {number} start
   * @param {number} end
   * @returns {Promise.<Array.<Object>>}
   */
  remove(start: number, end: number): Promise<IRange[]>;
  /** Abort all operations pending on the `SourceBuffer`. */
  abort(): void;
  /**
   * Abort all operations pending on the `SourceBuffer` AND free up all
   * resources taken by the `ISourceBufferInterface`.
   *
   * The `ISourceBufferInterface` implementation might not be usable after
   * this call, it should mostly be called for clean-up.
   */
  dispose(): void;
  /**
   * Returns the current range of buffered data, or `undefined` if this is not
   * obtainable synchronously.
   * @returns {Array.<Object> | undefined}
   */
  getBuffered(): IRange[] | undefined;
  /**
   * Only set for `ISourceBufferInterface` objects which cannot rely on
   * MediaSource API directly.
   *
   * This callback allows to communicate to the `ISourceBufferInterface` that
   * an operation it has performed previously has suceeded.
   *
   * @param {string} operationId - Identifier for the operation that
   * succeeded. The same one should have been used when initially running
   * the operation.
   * @param {Array.<Object>} ranges - The new contiguous buffered range
   * linked to the MSE SourceBuffer once the operation succeeded.
   */
  onOperationSuccess?: (operationId: string, ranges: IRange[]) => void;
  /**
   * Only set for `ISourceBufferInterface` objects which cannot rely on
   * MediaSource API directly.
   *
   * This callback allows to communicate to the `ISourceBufferInterface` that
   * an operation it has performed previously has failed.
   *
   * @param {string} operationId - Identifier for the operation that
   * succeeded. The same one should have been used when initially running
   * the operation.
   * @param {Array.<Object>} error - Categorization on the error encountered
   * while doing the operation.
   */
  onOperationFailure?: (
    operationId: string,
    error: ISerializedSourceBufferError | { errorName: "CancellationError" },
  ) => void;
}

/**
 * Object allowing to link a MSE's `MediaSource` instance to an
 * `HTMLMediaElement`.
 */
export type IMediaSourceHandle =
  | {
      type: "handle";
      /**
       * This is a `MediaSourceHandle` which can be sent through a `postMessage` - if
       * cross-thread communication is needed - in which case it should be transfered
       * through that call (see `postMessage` browser API documentation).
       */
      value: MediaProvider;
    }
  | {
      type: "media-source";
      /**
       * This is the `MediaSource` instance itself directly, you may want to create
       * an object URL to it before linking it through an `src` attribute.
       *
       * To create an object URL, you can use browser API such as
       * `URL.createObjectURL`.
       * Do not forget to revoke such URL (e.g. through `URL.revokeObjectURL`) when
       * you're done.
       */
      /* eslint-disable-next-line @typescript-eslint/ban-types */
      value: MediaSource;
    };

/**
 * Interface to the Media Source Extension (or MSE) API, that is supposed to
 * work regardless of if those API are available in the current environment
 * (e.g. we're currently in a WebWorker where the MSE-in-worker feature is
 * not available).
 *
 * The procedure creating a new `IMediaSourceInterface` object should also
 * trigger the creation of a linked `MediaSource` MSE object.
 */
export interface IMediaSourceInterface extends EventEmitter<IMediaSourceInterfaceEvents> {
  /** `id` uniquely identifying this `IMediaSourceInterface`. */
  id: string;
  /**
   * Last known `ReadyState` the underlying MSE `MediaSource` was at.
   *
   * /!\ May be known asynchronously after it is updated. You can rely on events
   * to be notified of its change.
   */
  readyState: ReadyState;
  /**
   * Mean to link the underlying `MediaSource` to an `HTMLMediaElement`.
   *
   * `undefined` if this `IMediaSourceInterface` cannot rely on MSE API
   * directly to create a `MediaSource`, in which case it will have sent
   * message by itself to the main thread for MediaSource creation.
   */
  handle: IMediaSourceHandle | undefined;
  /**
   * List `ISourceBufferInterface` objects linked to this
   * `IMediaSourceInterface`.
   *
   * It can be noted that only one `ISourceBufferInterface` per
   * `SourceBufferType` can be created at most, making that info on
   * `ISourceBufferInterface` useful as a discriminant for that array.
   */
  sourceBuffers: ISourceBufferInterface[];
  /**
   * Add a new `ISourceBufferInterface` (and its corresponding underlying MSE
   * `SourceBuffer` object) linked to the given `SourceBufferType`.
   *
   * This allows to then push media data of the corresponding media type so it
   * can be decoded.
   *
   * Note that only one `ISourceBufferInterface` for a given `SourceBufferType`
   * can be created at most per-`IMediaSourceInterface`.
   */
  addSourceBuffer(sbType: SourceBufferType, codec: string): ISourceBufferInterface;
  /**
   * Update `duration` property (which in reality means more the "maximum
   * reachable position") in seconds linked to the `MediaSource` (which itself
   * is used by the browser to determine the `HTMLMediaElement`'s `duration`
   * property and various linked browser behavior).
   *
   * Note that this operation acts as a long-running background task that
   * ensures the duration is set on the `MediaSource`.
   * If you want to cancel the duration update operation, you should call
   * `interruptDurationSetting`.
   */
  setDuration(newDuration: number, isRealEndKnown: boolean): void;
  /**
   * Interrupt a duration update background task previously started through
   * a `setDuration` call.
   */
  interruptDurationSetting(): void;
  /**
   * Signal to the `IMediaSourceInterface` that all media segments until the
   * end of the current content has been pushed through its
   * `ISourceBufferInterface`, so it can call the `endOfStream` MSE API at
   * the right time, allowing to properly end the content (e.g. this is
   * necessary so the `HTMLMediaElement` can set its `ended` property to
   * `true` when the end is reached).
   *
   * The `endOfStream` operation keeps running until a `stopEndOfStream` is
   * done. If you want to cancel an `endOfStream` operation, for example because
   * new future content is now available, you should call `stopEndOfStream`.
   */
  maintainEndOfStream(): void;
  /**
   * Interrupt an `endOfStream` operation started with `maintainEndOfStream`.
   */
  stopEndOfStream(): void;
  /**
   * Free all resources taken by the `IMediaSourceInterface`, including all its
   * inner `ISourceBufferInterface` objects.
   */
  dispose(): void;
  /**
   * Only set for `IMediaSourceInterface` objects which cannot rely on
   * MediaSource API directly.
   *
   * This callback allows to communicate that the `ReadyState` of the underlying
   * MSE `MediaSource` has changed.
   *
   * @param {string} readyState - The new `MediaSource` readyState.
   */
  onMediaSourceReadyStateChanged?: (readyState: ReadyState) => void;
}

/** Events that should be sent by an `IMediaSourceInterface`. */
export interface IMediaSourceInterfaceEvents {
  /**
   * Indicate that the `IMediaSourceInterface`'s `readyState` property just
   * changed to `"open"`.
   */
  mediaSourceOpen: null;
  /**
   * Indicate that the `IMediaSourceInterface`'s `readyState` property just
   * changed to `"ended"`.
   */
  mediaSourceEnded: null;
  /**
   * Indicate that the `IMediaSourceInterface`'s `readyState` property just
   * changed to `"close"`.
   */
  mediaSourceClose: null;
}

/**
 * Object allowing to probe for codec support, regarless of the environment
 * (e.g. in a WebWorker or in the main thread - which may have different API).
 */
export interface ICodecSupportProber {
  /**
   * Probe for codec support of the given mime-type + codec combination,
   * returning a boolean which is `true` when that combination is supported on
   * the current browser, `false` when it is not or `undefined` if it cannot
   * be known currently.
   *
   * @param {string} mimeType
   * @param {string} codec
   * @returns {boolean|undefined}
   */
  isSupported(mimeType: string, codec: string): boolean | undefined;
  /**
   * Some implementations may rely on a caching mechanism to improve the
   * pertinence / speed of `isSupported`.
   *
   * Calling this method allows to add the entry refered by these arguments to
   * the cache.
   *
   * @param {string} mimeType
   * @param {string} codec
   * @param {boolean} isSupported
   */
  updateCache?: (mimeType: string, codec: string, isSupported: boolean) => void;
}
