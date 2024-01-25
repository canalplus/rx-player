import log from "../../../../log";
import type { ITextDisplayer } from "../../../../main_thread/types";
import type { ITextTrackSegmentData } from "../../../../transports";
import getMonotonicTimeStamp from "../../../../utils/monotonic_timestamp";
import type { IRange } from "../../../../utils/ranges";
import type {
  ICompleteSegmentInfo,
  IPushChunkInfos,
  ISBOperation } from "../types";
import {
  SegmentBuffer,
  SegmentBufferOperation,
} from "../types";

/**
 * SegmentBuffer implementation to add text data, most likely subtitles.
 * @class TextSegmentBuffer
 */
export default class TextSegmentBuffer extends SegmentBuffer {
  readonly bufferType : "text";

  private _sender : ITextDisplayerInterface;

  private _pendingOperations : Array<{
    operation: ISBOperation<unknown>;
    promise: Promise<unknown>;
  }>;

  /**
   * @param {Object} textDisplayerSender
   */
  constructor(textDisplayerSender : ITextDisplayerInterface) {
    log.debug("HTSB: Creating TextSegmentBuffer");
    super();
    this.bufferType = "text";
    this._sender = textDisplayerSender;
    this._pendingOperations = [];
    this._sender.reset();
  }

  /**
   * @param {string} uniqueId
   */
  public declareInitSegment(uniqueId : string): void {
    log.warn("HTSB: Declaring initialization segment for  Text SegmentBuffer",
             uniqueId);
  }

  /**
   * @param {string} uniqueId
   */
  public freeInitSegment(uniqueId : string): void {
    log.warn("HTSB: Freeing initialization segment for  Text SegmentBuffer",
             uniqueId);
  }

  /**
   * Push text segment to the TextSegmentBuffer.
   * @param {Object} infos
   * @returns {Promise}
   */
  public async pushChunk(infos : IPushChunkInfos<unknown>) : Promise<IRange[]> {
    const { data } = infos;
    assertChunkIsTextTrackSegmentData(data.chunk);
    // Needed for TypeScript :(
    const promise = this._sender.pushTextData({
      ...data,
      chunk: data.chunk,
    });
    this._addToOperationQueue(promise, { type: SegmentBufferOperation.Push,
                                         value: infos });
    const ranges = await promise;
    if (infos.inventoryInfos !== null) {
      this._segmentInventory.insertChunk(infos.inventoryInfos,
                                         true,
                                         getMonotonicTimeStamp());
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
  public async removeBuffer(start : number, end : number) : Promise<IRange[]> {
    const promise = this._sender.remove(start, end);
    this._addToOperationQueue(promise, { type: SegmentBufferOperation.Remove,
                                         value: { start, end } });
    const ranges = await promise;
    this._segmentInventory.synchronizeBuffered(ranges);
    return ranges;
  }

  /**
   * @param {Object} infos
   * @returns {Promise}
   */
  public async signalSegmentComplete(infos : ICompleteSegmentInfo) : Promise<void> {
    if (this._pendingOperations.length > 0) {
      // Only validate after preceding operation
      const { promise } = this._pendingOperations[this._pendingOperations.length - 1];
      this._addToOperationQueue(promise, {
        type: SegmentBufferOperation.SignalSegmentComplete,
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
  public getPendingOperations() : Array<ISBOperation<unknown>> {
    return this._pendingOperations.map(p => p.operation);
  }

  public dispose() : void {
    log.debug("HTSB: Disposing TextSegmentBuffer");
    this._sender.reset();
  }

  private _addToOperationQueue(
    promise: Promise<unknown>,
    operation: ISBOperation<unknown>
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

/** Data of chunks that should be pushed to the HTMLTextSegmentBuffer. */
export interface ITextTracksBufferSegmentData {
  /** The text track data, in the format indicated in `type`. */
  data : string;
  /** The format of `data` (examples: "ttml", "srt" or "vtt") */
  type : string;
  /**
   * Language in which the text track is, as a language code.
   * This is mostly needed for "sami" subtitles, to know which cues can / should
   * be parsed.
   */
  language? : string | undefined;
  /** start time from which the segment apply, in seconds. */
  start? : number | undefined;
  /** end time until which the segment apply, in seconds. */
  end? : number | undefined;
}

/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} chunk
 */
function assertChunkIsTextTrackSegmentData(
  chunk : unknown
) : asserts chunk is ITextTracksBufferSegmentData {
  if (__ENVIRONMENT__.CURRENT_ENV as number === __ENVIRONMENT__.PRODUCTION as number) {
    return;
  }
  if (
    typeof chunk !== "object" ||
    chunk === null ||
    typeof (chunk as ITextTracksBufferSegmentData).data !== "string" ||
    typeof (chunk as ITextTracksBufferSegmentData).type !== "string" ||
    (
      (chunk as ITextTracksBufferSegmentData).language !== undefined &&
      typeof (chunk as ITextTracksBufferSegmentData).language !== "string"
    ) ||
    (
      (chunk as ITextTracksBufferSegmentData).start !== undefined &&
      typeof (chunk as ITextTracksBufferSegmentData).start !== "number"
    ) ||
    (
      (chunk as ITextTracksBufferSegmentData).end !== undefined &&
      typeof (chunk as ITextTracksBufferSegmentData).end !== "number"
    )
  ) {
    throw new Error("Invalid format given to a TextSegmentBuffer");
  }
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
    ...args : Parameters<ITextDisplayer["pushTextData"]>
  ): Promise<ReturnType<ITextDisplayer["pushTextData"]>>;
  /**
   * @see ITextDisplayer
   */
  remove(
    ...args : Parameters<ITextDisplayer["removeBuffer"]>
  ): Promise<ReturnType<ITextDisplayer["removeBuffer"]>>;
  /**
   * @see ITextDisplayer
   */
  reset(): void;
  /**
   * @see ITextDisplayer
   */
  stop(): void;
}

/*
 * The following ugly code is here to provide a compile-time check that an
 * `ITextTracksBufferSegmentData` (type of data pushed to a
 * `TextSegmentBuffer`) can be derived from a `ITextTrackSegmentData`
 * (text track data parsed from a segment).
 *
 * It doesn't correspond at all to real code that will be called. This is just
 * a hack to tell TypeScript to perform that check.
 */
if (__ENVIRONMENT__.CURRENT_ENV as number === __ENVIRONMENT__.DEV as number) {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  function _checkType(
    input : ITextTrackSegmentData
  ) : void {
    function checkEqual(_arg : ITextTracksBufferSegmentData) : void {
      /* nothing */
    }
    checkEqual(input);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
  /* eslint-enable @typescript-eslint/ban-ts-comment */
}
