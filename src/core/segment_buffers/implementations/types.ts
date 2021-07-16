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

import { Observable } from "rxjs";
import {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import SegmentInventory, {
  IBufferedChunk,
  IBufferedHistoryEntry,
  IChunkContext,
  IInsertedChunkInfos,
} from "../inventory";

/**
 * Class allowing to push segments and remove data to a buffer to be able
 * to decode them in the future as well as retrieving information about which
 * segments have already been pushed.
 *
 * A `SegmentBuffer` can rely on a browser's SourceBuffer as well as being
 * entirely defined in the code.
 *
 * A SegmentBuffer is associated to a given "bufferType" (e.g. "audio",
 * "video", "text") and allows to push segments as well as removing part of
 * already-pushed segments for that type.
 *
 * Because a segment can be divided into multiple chunks, one should call the
 * `endOfSegment` method once all chunks of a given segment have been pushed
 * (through the `pushChunk` method) to validate that a segment has been
 * completely pushed.
 * It is expected to push chunks from only one segment at a time before calling
 * the `endOfSegment` function for that segment. Pushing chunks from multiple
 * segments in parallel could have unexpected result depending on the underlying
 * implementation.
 * TODO reflect that in the API?
 *
 * A SegmentBuffer also maintains an "inventory", which is the current
 * list of segments contained in the underlying buffer.
 * This inventory has to be manually "synchronized" (through the
 * `synchronizeInventory` method) before being retrieved (through the
 * `getInventory` method).
 *
 * Also depending on the underlying implementation, the various operations
 * performed on a `SegmentBuffer` (push/remove/endOfSegment) can happen
 * synchronously or asynchronously.
 * In the latter case, such operations are put in a FIFO Queue.
 * You can retrieve the current queue of operations by calling the
 * `getPendingOperations` method.
 * If operations happens synchronously, this method will just return an empty
 * array.
 */
export abstract class SegmentBuffer {
  /** "Type" of the buffer (e.g. "audio", "video", "text"). */
  public readonly abstract bufferType : IBufferType;

  /** Default implementation of an inventory of segment metadata. */
  protected _segmentInventory : SegmentInventory;

  /**
   * Mimetype+codec combination the SegmentBuffer is currently working with.
   * Depending on the implementation, segments with a different codecs could be
   * incompatible.
   *
   * `undefined` if unknown and if this property does not matter for this
   * SegmentBuffer implementation.
   */
  public codec : string | undefined;

  constructor() {
    // Use SegmentInventory by default for inventory purposes
    this._segmentInventory = new SegmentInventory();
  }

  /**
   * Push a chunk of the media segment given to the attached buffer, in a
   * FIFO queue.
   *
   * Once all chunks of a single Segment have been given to `pushChunk`, you
   * should call `endOfSegment` to indicate that the whole Segment has been
   * pushed.
   *
   * Depending on the type of data appended, the pushed chunk might rely on an
   * initialization segment, given through the `data.initSegment` property.
   *
   * Such initialization segment will be first pushed to the buffer if the
   * last pushed segment was associated to another initialization segment.
   * This detection might rely on the initialization segment's reference so you
   * might want to avoid mutating in-place a initialization segment given to
   * that function (to avoid having two different values which have the same
   * reference).
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
  public abstract pushChunk(infos : IPushChunkInfos<unknown>) : Observable<void>;

  /**
   * Remove buffered data (added to the same FIFO queue than `pushChunk`).
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public abstract removeBuffer(start : number, end : number) : Observable<void>;

  /**
   * Indicate that every chunks from a Segment has been given to pushChunk so
   * far.
   * This will update our internal Segment inventory accordingly.
   * The returned Observable will emit and complete successively once the whole
   * segment has been pushed and this indication is acknowledged.
   * @param {Object} infos
   * @returns {Observable}
   */
  public abstract endOfSegment(infos : IEndOfSegmentInfos) : Observable<void>;

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public abstract getBufferedRanges() : TimeRanges;

  /**
   * The maintained inventory can fall out of sync from garbage collection or
   * other events.
   *
   * This methods allow to manually trigger a synchronization. It should be
   * called before retrieving Segment information from it (e.g. with
   * `getInventory`).
   */
  public synchronizeInventory() : void {
    // The default implementation just use the SegmentInventory
    this._segmentInventory.synchronizeBuffered(this.getBufferedRanges());
  }

  /**
   * Returns the currently buffered data for which the content is known with
   * the corresponding content information.
   * /!\ This data can fall out of sync with the real buffered ranges. Please
   * call `synchronizeInventory` before to make sure it is correctly
   * synchronized.
   * @returns {Array.<Object>}
   */
  public getInventory() : IBufferedChunk[] {
    // The default implementation just use the SegmentInventory
    return this._segmentInventory.getInventory();
  }

  /**
   * Returns the list of every operations that the `SegmentBuffer` is still
   * processing. From the one with the highest priority (like the one being
   * processed)
   * @returns {Array.<Object>}
   */
  public getPendingOperations() : Array<ISBOperation<unknown>> {
    // Return no pending operation by default (for synchronous SegmentBuffers)
    return [];
  }

  /**
   * Returns a recent history of registered operations performed and event
   * received linked to the segment given in argument.
   *
   * Not all operations and events are registered in the returned history.
   * Please check the return type for more information on what is available.
   *
   * Note that history is short-lived for memory usage and performance reasons.
   * You may not receive any information on operations that happened too long
   * ago.
   * @param {Object} context
   * @returns {Array.<Object>}
   */
  public getSegmentHistory(context : IChunkContext) : IBufferedHistoryEntry[] {
    return this._segmentInventory.getHistoryFor(context);
  }

  /**
   * Dispose of the resources used by this AudioVideoSegmentBuffer.
   * /!\ You won't be able to use the SegmentBuffer after calling this
   * function.
   */
  public abstract dispose() : void;
}

/** Every SegmentBuffer types. */
export type IBufferType = "audio" |
                          "video" |
                          "text";

/**
 * Content of the `data` property when pushing a new chunk.
 *
 * This will contain all necessary information to decode the media data.
 * Type parameter `T` is the format of the chunk's data.
 */
export interface IPushedChunkData<T> {
  /**
   * The whole initialization segment's data related to the chunk you want to
   * push.
   * `null` if none.
   */
  initSegment: T | null;
  /**
   * Chunk you want to push.
   * This can be the whole decodable segment's data or just a decodable sub-part
   * of it.
   * `null` if you just want to push the initialization segment.
   */
  chunk : T | null;
  /**
   * String corresponding to the mime-type + codec of the last segment pushed.
   * This might then be used by a SourceBuffer to infer the right codec to use.
   */
  codec : string;
  /**
   * Time offset in seconds to apply to this segment.
   * A `timestampOffset` set to `5` will mean that the segment will be decoded
   * 5 seconds after its decode time which was found from the segment data
   * itself.
   */
  timestampOffset : number;
  /**
   * Append windows for the segment. This is a tuple of two elements.
   *
   * The first indicates the "start append window". The media data of that
   * segment that should have been decoded BEFORE that time (after taking the
   * `timestampOffset` property in consideration) will be ignored.
   * This can be set to `0` or `undefined` to not apply any start append window
   * to that chunk.
   *
   * The second indicates the "end append window". The media data of that
   * segment that should have been decoded AFTER that time (after taking the
   * `timestampOffset` property in consideration) will be ignored.
   * This can be set to `0` or `undefined` to not apply any end append window
   * to that chunk.
   */
  appendWindow: [ number | undefined,
                  number | undefined ];
}

/**
 * Information to give when indicating a whole segment has been pushed via the
 * `endOfSegment` method.
 */
export interface IEndOfSegmentInfos {
  /** Adaptation object linked to the chunk. */
  adaptation : Adaptation;
  /** Period object linked to the chunk. */
  period : Period;
  /** Representation object linked to the chunk. */
  representation : Representation;
  /** The segment object linked to the pushed chunk. */
  segment : ISegment;
}

/**
 * Information to give when pushing a new chunk via the `pushChunk` method.
 * Type parameter `T` is the format of the chunk's data.
 */
export interface IPushChunkInfos<T> {
  /** Chunk that should be pushed with the associated metadata */
  data : IPushedChunkData<T>;
  /**
   * Context about the chunk that will be added to the inventory once it is
   * pushed.
   *
   * Can be set to `null` if you don't want to add an entry to the inventory
   * after that segment is pushed (e.g. can be useful for initialization
   * segments, as they take no place in a buffer).
   * Please note that an inventory might become completely un-synchronized
   * with the real media buffer if some buffered segments are not added to
   * the inventory afterwise.
   */
   inventoryInfos : IInsertedChunkInfos |
                    null;
}

/** "Operations" scheduled by a SegmentBuffer. */
export type ISBOperation<T> = IPushOperation<T> |
                              IRemoveOperation |
                              IEndOfSegmentOperation;

/**
 * Enum used by a SegmentBuffer as a discriminant in its queue of
 * "operations".
 */
export enum SegmentBufferOperation { Push,
                                     Remove,
                                     EndOfSegment }

/**
 * "Operation" created by a `SegmentBuffer` when asked to push a chunk.
 *
 * It represents a queued "Push" operation (created due to a `pushChunk` method
 * call) that is not yet fully processed by a `SegmentBuffer`.
 */
export interface IPushOperation<T> {
  /** Discriminant (allows to tell its a "Push operation"). */
  type : SegmentBufferOperation.Push;
  /** Arguments for that push. */
  value : IPushChunkInfos<T>;
}

/**
 * "Operation" created by a SegmentBuffer when asked to remove buffer.
 *
 * It represents a queued "Remove" operation (created due to a `removeBuffer`
 * method call) that is not yet fully processed by a SegmentBuffer.
 */
export interface IRemoveOperation {
  /** Discriminant (allows to tell its a "Remove operation"). */
  type : SegmentBufferOperation.Remove;
  /** Arguments for that remove (absolute start and end time, in seconds). */
  value : { start : number;
            end : number; }; }

/**
 * "Operation" created by a `SegmentBuffer` when asked to validate that a full
 * segment has been pushed through earlier `Push` operations.
 *
 * It represents a queued "EndOfSegment" operation (created due to a
 * `endOfSegment` method call) that is not yet fully processed by a
 * `SegmentBuffer.`
 */
export interface IEndOfSegmentOperation {
  /** Discriminant (allows to tell its an "EndOfSegment operation"). */
  type : SegmentBufferOperation.EndOfSegment;
  /** Arguments for that operation. */
  value : IEndOfSegmentInfos;
}
