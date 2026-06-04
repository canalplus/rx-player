import log from "../../../../log";
import type { ITextDisplayer } from "../../../../main_thread/types";
import type {
  ISupportedTextTrackFormat,
  ITextTrackSegmentData,
} from "../../../../transports";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../../../../utils/monotonic_timestamp";
import type { IRange } from "../../../../utils/ranges";
import type { ICompleteSegmentInfo, IPushChunkInfos, ISBOperation } from "../types";
import { SegmentSink, SegmentSinkOperation } from "../types";

/**
 * SegmentSink implementation to add text data, most likely subtitles.
 * @class TextSegmentSink
 */
export default class TextSegmentSink extends SegmentSink {
  readonly bufferType: "text";

  private _sender: ITextDisplayerInterface;

  private _pendingOperations: Array<{
    operation: ISBOperation<unknown>;
    promise: Promise<unknown>;
  }>;

  /**
   * @param {Object} textDisplayerSender
   */
  constructor(textDisplayerSender: ITextDisplayerInterface) {
    log.debug("Stream", "Creating TextSegmentSink");
    super();
    this.bufferType = "text";
    this._sender = textDisplayerSender;
    this._pendingOperations = [];
    this._sender.reset();
  }

  /**
   * @param {string} uniqueId
   */
  public declareInitSegment(uniqueId: string): void {
    log.warn("Stream", "Declaring initialization segment for  Text SegmentSink", {
      uniqueId,
    });
  }

  /**
   * @param {string} uniqueId
   */
  public freeInitSegment(uniqueId: string): void {
    log.warn("Stream", "Freeing initialization segment for  Text SegmentSink", {
      uniqueId,
    });
  }

  /**
   * Push text segment to the TextSegmentSink.
   * @param {Object} infos
   * @returns {Promise}
   */
  public async pushChunk(infos: IPushChunkInfos<unknown>): Promise<IRange[]> {
    const { data } = infos;
    assertChunkIsTextTrackSegmentData(data.chunk);
    // Needed for TypeScript :(
    const promise = this._sender.pushTextData({
      ...data,
      chunk: data.chunk,
    });
    this._addToOperationQueue(promise, {
      type: SegmentSinkOperation.Push,
      value: infos,
    });
    const ranges = await promise;
    if (infos.inventoryInfos !== null) {
      this._segmentInventory.insertChunk(
        infos.inventoryInfos,
        true,
        getMonotonicTimeStamp(),
      );
    }
    this._segmentInventory.synchronizeBuffered(ranges);
    return ranges;
  }

  /**
   * Remove buffered data.
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Promise}
   */
  public async removeBuffer(start: number, end: number): Promise<IRange[]> {
    const promise = this._sender.remove(start, end);
    this._addToOperationQueue(promise, {
      type: SegmentSinkOperation.Remove,
      value: { start, end },
    });
    const ranges = await promise;
    this._segmentInventory.synchronizeBuffered(ranges);
    return ranges;
  }

  /**
   * @param {Object} infos
   * @returns {Promise}
   */
  public async signalSegmentComplete(infos: ICompleteSegmentInfo): Promise<void> {
    if (this._pendingOperations.length > 0) {
      // Only validate after preceding operation
      const { promise } = this._pendingOperations[this._pendingOperations.length - 1];
      this._addToOperationQueue(promise, {
        type: SegmentSinkOperation.SignalSegmentComplete,
        value: infos,
      });
      try {
        await promise;
      } catch (_) {
        // We don't really care of what happens of the preceding operation here
      }
    }
    this._segmentInventory.completeSegment(infos);
  }

  /**
   * @returns {Array.<Object>}
   */
  public getPendingOperations(): Array<ISBOperation<unknown>> {
    return this._pendingOperations.map((p) => p.operation);
  }

  public dispose(reason: string | undefined): void {
    log.debug("Stream", "Disposing TextSegmentSink");
    this._sender.stop(reason);
  }

  private _addToOperationQueue(
    promise: Promise<unknown>,
    operation: ISBOperation<unknown>,
  ): void {
    const queueObject = { operation, promise };
    this._pendingOperations.push(queueObject);
    const endOperation = () => {
      const indexOf = this._pendingOperations.indexOf(queueObject);
      if (indexOf >= 0) {
        this._pendingOperations.splice(indexOf, 1);
      }
    };
    promise.then(endOperation, endOperation); // `finally` not supported everywhere
  }
}

/** Data of chunks that should be pushed to the HTMLTextSegmentSink. */
export interface ITextTracksBufferSegmentData<
  T extends string | Uint8Array<ArrayBuffer> | ArrayBuffer =
    | string
    | Uint8Array<ArrayBuffer>
    | ArrayBuffer,
> {
  /** The text track data, in the format indicated in `type`. */
  data: T;
  /** The format of `data` (examples: "ttml", "srt" or "vtt") */
  type: ISupportedTextTrackFormat;
  /**
   * Language in which the text track is, as a language code.
   * This is mostly needed for "sami" subtitles, to know which cues can / should
   * be parsed.
   */
  language?: string | undefined;
  /**
   * If set, there has been a "timescale" that has been parsed from an
   * initialization segment linked to that text track, which contained a
   * timescale value, potentially allowing to convert time information
   * into seconds.
   *
   * This is needed by very few text track formats.
   */
  initTimescale: number | null;
  /** start time from which the segment apply, in seconds. */
  start?: number | undefined;
  /** end time until which the segment apply, in seconds. */
  end?: number | undefined;
}

/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} chunk
 */
function assertChunkIsTextTrackSegmentData(
  chunk: unknown,
): asserts chunk is ITextTracksBufferSegmentData {
  if (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.PRODUCTION as number)
  ) {
    return;
  }
  if (
    typeof chunk !== "object" ||
    chunk === null ||
    isNullOrUndefined((chunk as ITextTracksBufferSegmentData).data)
  ) {
    throw new Error("Invalid format given to a TextSegmentSink");
  }
  if (!isTextTracksBufferSegmentData(chunk as ITextTracksBufferSegmentData)) {
    throw new Error("Invalid format given to a TextSegmentSink");
  }
  if (
    typeof (chunk as ITextTracksBufferSegmentData<string>).data !== "string" &&
    typeof (chunk as ITextTracksBufferSegmentData<Uint8Array<ArrayBuffer> | ArrayBuffer>)
      .data.byteLength !== "number"
  ) {
    throw new Error("Invalid format given to a TextSegmentSink");
  }
}

/**
 * Get a value in argument that may or may not be
 * `ITextT nor hangracksBufferSegmentData`.
 *
 * Returns `true` if it corresponds to that type definition, `false` otherwise.
 *
 * Basically it's a runtime type check.It was added here as we may be casting as
 * `any` at some point to facilitate implementation.
 * @param {*} chunk
 * @returns {boolean}
 */
function isTextTracksBufferSegmentData(chunk: ITextTracksBufferSegmentData): boolean {
  if (typeof chunk !== "object" || chunk === null) {
    return false;
  }
  if (typeof chunk.type !== "string") {
    return false;
  }
  if (chunk.language !== undefined && typeof chunk.language !== "string") {
    return false;
  }
  if (chunk.initTimescale !== null && typeof chunk.initTimescale !== "number") {
    return false;
  }
  if (chunk.start !== undefined && typeof chunk.start !== "number") {
    return false;
  }
  if (chunk.end !== undefined && typeof chunk.end !== "number") {
    return false;
  }
  return true;
}

/**
 * Abstraction over an `ITextDisplayer`, making parts of its initial API
 * returning a result asynchronously, to allow a common interface for when
 * the `ITextDisplayerInterface` runs in a main thread or in a WebWorker
 * (considering that an `ITextDisplayer` always run in main thread).
 */
export interface ITextDisplayerInterface {
  /**
   * @see ITextDisplayer
   */
  pushTextData(
    ...args: Parameters<ITextDisplayer["pushTextData"]>
  ): Promise<ReturnType<ITextDisplayer["pushTextData"]>>;
  /**
   * @see ITextDisplayer
   */
  remove(
    ...args: Parameters<ITextDisplayer["removeBuffer"]>
  ): Promise<ReturnType<ITextDisplayer["removeBuffer"]>>;
  /**
   * @see ITextDisplayer
   */
  reset(): void;
  /**
   * @see ITextDisplayer
   */
  stop(reason: string | undefined): void;
}

/*
 * The following ugly code is here to provide a compile-time check that an
 * `ITextTracksBufferSegmentData` (type of data pushed to a
 * `TextSegmentSink`) can be derived from a `ITextTrackSegmentData`
 * (text track data parsed from a segment).
 *
 * It doesn't correspond at all to real code that will be called. This is just
 * a hack to tell TypeScript to perform that check.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
  // @ts-expect-error: unused function for type checking
  function _checkType(input: ITextTrackSegmentData): void {
    function checkEqual(_arg: ITextTracksBufferSegmentData): void {
      /* nothing */
    }
    checkEqual(input);
  }
}
