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

import log from "../../../../log";
import { getLoggableSegmentId } from "../../../../manifest";
import type {
  IMediaSourceInterface,
  ISourceBufferInterface,
  SourceBufferType,
} from "../../../../mse";
import getMonotonicTimeStamp from "../../../../utils/monotonic_timestamp";
import type { IRange } from "../../../../utils/ranges";
import type {
  ICompleteSegmentInfo,
  IPushChunkInfos,
  IPushedChunkData,
  ISBOperation,
} from "../types";
import { SegmentSink, SegmentSinkOperation } from "../types";

/**
 * Allows to push and remove new segments to a SourceBuffer while keeping an
 * inventory of what has been pushed and what is being pushed.
 *
 * To work correctly, only a single AudioVideoSegmentSink per SourceBuffer
 * should be created.
 *
 * @class AudioVideoSegmentSink
 */
export default class AudioVideoSegmentSink extends SegmentSink {
  /** "Type" of the buffer concerned. */
  public readonly bufferType: "audio" | "video";

  /** SourceBuffer implementation. */
  private readonly _sourceBuffer: ISourceBufferInterface;

  /**
   * Queue of awaited buffer "operations".
   * The first element in this array will be the first performed.
   */
  private _pendingOperations: Array<{
    operation: ISBOperation<unknown>;
    promise: Promise<unknown>;
  }>;

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
   * `AudioVideoSegmentSink` yet.
   */
  private _lastInitSegmentUniqueId: string | null;

  /**
   * Link unique identifiers for initialization segments (as communicated by
   * `declareInitSegment`) to the corresponding initialization data.
   */
  private _initSegmentsMap: Map<string, BufferSource>;

  /**
   * @constructor
   * @param {string} bufferType
   * @param {string} codec
   * @param {Object} mediaSource
   */
  constructor(
    bufferType: SourceBufferType,
    codec: string,
    mediaSource: IMediaSourceInterface,
  ) {
    super();
    log.info("AVSB: calling `mediaSource.addSourceBuffer`", codec);
    const sourceBuffer = mediaSource.addSourceBuffer(bufferType, codec);

    this.bufferType = bufferType;
    this._sourceBuffer = sourceBuffer;
    this._lastInitSegmentUniqueId = null;
    this.codec = codec;
    this._initSegmentsMap = new Map();
    this._pendingOperations = [];
  }

  /** @see SegmentSink */
  public declareInitSegment(uniqueId: string, initSegmentData: unknown): void {
    assertDataIsBufferSource(initSegmentData);
    this._initSegmentsMap.set(uniqueId, initSegmentData);
  }

  /** @see SegmentSink */
  public freeInitSegment(uniqueId: string): void {
    this._initSegmentsMap.delete(uniqueId);
  }

  /**
   * Push a chunk of the media segment given to the attached SourceBuffer.
   *
   * Once all chunks of a single Segment have been given to `pushChunk`, you
   * should call `signalSegmentComplete` to indicate that the whole Segment has
   * been pushed.
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
   * @returns {Promise}
   */
  public async pushChunk(infos: IPushChunkInfos<unknown>): Promise<IRange[] | undefined> {
    assertDataIsBufferSource(infos.data.chunk);
    log.debug(
      "AVSB: receiving order to push data to the SourceBuffer",
      this.bufferType,
      getLoggableSegmentId(infos.inventoryInfos),
    );
    const dataToPush = this._getActualDataToPush(
      infos.data as IPushedChunkData<BufferSource>,
    );

    if (dataToPush.length === 0) {
      // TODO
      // For now the following code rely on the fact that there should be at
      // least one element to push (else, we won't make the round-trip to
      // be able to signal updated ranges).
      //
      // For cases where this isn't the case (e.g. when pushing an
      // initialization segment which was already the last one pushed), we
      // perform a trick by just pushing an empty segment instead.
      // That seems to work on all platforms even if it is a little ugly.
      //
      // To provide a better solution we could either handle initialization
      // segment references on a `SourceBufferInterface` - which has access to
      // the buffered ranges - or just create a new `SourceBufferInterface`
      // method to specifically obtain the current buffered range, which we
      // would call instead here. For now, I'm more of a fan of the former
      // solution.
      dataToPush.push(new Uint8Array());
    }
    const promise = Promise.all(
      dataToPush.map((data) => {
        const { codec, timestampOffset, appendWindow } = infos.data;
        log.debug(
          "AVSB: pushing segment",
          this.bufferType,
          getLoggableSegmentId(infos.inventoryInfos),
        );
        return this._sourceBuffer.appendBuffer(data, {
          codec,
          timestampOffset,
          appendWindow,
        });
      }),
    );
    this._addToOperationQueue(promise, {
      type: SegmentSinkOperation.Push,
      value: infos,
    });
    let res;
    try {
      res = await promise;
    } catch (err) {
      this._segmentInventory.insertChunk(
        infos.inventoryInfos,
        false,
        getMonotonicTimeStamp(),
      );
      throw err;
    }
    if (infos.inventoryInfos !== null) {
      this._segmentInventory.insertChunk(
        infos.inventoryInfos,
        true,
        getMonotonicTimeStamp(),
      );
    }
    const ranges = res[res.length - 1];
    if (ranges !== undefined) {
      this._segmentInventory.synchronizeBuffered(ranges);
    }
    return ranges;
  }

  /** @see SegmentSink */
  public async removeBuffer(start: number, end: number): Promise<IRange[] | undefined> {
    log.debug(
      "AVSB: receiving order to remove data from the SourceBuffer",
      this.bufferType,
      start,
      end,
    );
    const promise = this._sourceBuffer.remove(start, end);
    this._addToOperationQueue(promise, {
      type: SegmentSinkOperation.Remove,
      value: { start, end },
    });
    const ranges = await promise;
    if (ranges !== undefined) {
      this._segmentInventory.synchronizeBuffered(ranges);
    }
    return ranges;
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
   * Returns the list of every operations that the `AudioVideoSegmentSink` is
   * still processing.
   * @returns {Array.<Object>}
   */
  public getPendingOperations(): Array<ISBOperation<unknown>> {
    return this._pendingOperations.map((p) => p.operation);
  }

  /** @see SegmentSink */
  public dispose(): void {
    try {
      log.debug("AVSB: Calling `dispose` on the SourceBufferInterface");
      this._sourceBuffer.dispose();
    } catch (e) {
      log.debug(
        `AVSB: Failed to dispose a ${this.bufferType} SourceBufferInterface:`,
        e instanceof Error ? e : "",
      );
    }
  }

  /**
   * A single `pushChunk` might actually necessitate two `appendBuffer` call
   * if the initialization segment needs to be pushed again.
   *
   * This method perform this check and actually return both the
   * initialization segment then the media segment when the former needs to
   * be pushed again first.
   * @param {Object} data
   * @returns {Object}
   */
  private _getActualDataToPush(data: IPushedChunkData<BufferSource>): BufferSource[] {
    // Push operation with both an init segment and a regular segment might
    // need to be separated into two steps
    const dataToPush = [];

    if (
      data.initSegmentUniqueId !== null &&
      !this._isLastInitSegment(data.initSegmentUniqueId)
    ) {
      // Push initialization segment before the media segment
      let segmentData = this._initSegmentsMap.get(data.initSegmentUniqueId);
      if (segmentData === undefined) {
        throw new Error("Invalid initialization segment uniqueId");
      }
      // Initialization segments have to be cloned for now
      // TODO Initialization segments could be stored on the main thread?
      const dst = new ArrayBuffer(segmentData.byteLength);
      const tmpU8 = new Uint8Array(dst);
      tmpU8.set(
        segmentData instanceof ArrayBuffer
          ? new Uint8Array(segmentData)
          : new Uint8Array(segmentData.buffer),
      );
      segmentData = tmpU8;
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
   * initialization segment pushed to the `AudioVideoSegmentSink`.
   * @param {string} uniqueId
   * @returns {boolean}
   */
  private _isLastInitSegment(uniqueId: string): boolean {
    if (this._lastInitSegmentUniqueId === null) {
      return false;
    }
    return this._lastInitSegmentUniqueId === uniqueId;
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

/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} data
 */
function assertDataIsBufferSource(data: unknown): asserts data is BufferSource {
  if (
    (__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.PRODUCTION as number)
  ) {
    return;
  }
  if (
    typeof data !== "object" ||
    (data !== null &&
      !(data instanceof ArrayBuffer) &&
      !((data as ArrayBufferView).buffer instanceof ArrayBuffer))
  ) {
    throw new Error("Invalid data given to the AudioVideoSegmentSink");
  }
}
