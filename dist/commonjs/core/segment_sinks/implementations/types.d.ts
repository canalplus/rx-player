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
import type { IAdaptation, ISegment, IPeriod, IRepresentation } from "../../../manifest";
import type { IRange } from "../../../utils/ranges";
import type { IBufferedChunk, IBufferedHistoryEntry, IChunkContext, IInsertedChunkInfos } from "../inventory";
import SegmentInventory from "../inventory";
/**
 * Class allowing to push segments and remove data to a buffer to be able
 * to decode them in the future as well as retrieving information about which
 * segments have already been pushed.
 *
 * A `SegmentSink` can rely on a browser's SourceBuffer as well as being
 * entirely defined in the code.
 *
 * A SegmentSink is associated to a given "bufferType" (e.g. "audio",
 * "video", "text") and allows to push segments as well as removing part of
 * already-pushed segments for that type.
 *
 * Because a segment can be divided into multiple chunks, one should call the
 * `signalSegmentComplete` method once all chunks of a given segment have been
 * pushed (through the `pushChunk` method) to validate that a segment has been
 * completely pushed.
 * It is expected to push chunks from only one segment at a time before calling
 * the `signalSegmentComplete` function for that segment. Pushing chunks from
 * multiple segments in parallel could have unexpected result depending on the
 * underlying implementation.
 * TODO reflect that in the API?
 *
 * A SegmentSink also maintains an "inventory", which is the current
 * list of segments contained in the underlying buffer.
 * This inventory has to be manually "synchronized" (through the
 * `synchronizeInventory` method) before being retrieved (through the
 * `getInventory` method).
 *
 * Also depending on the underlying implementation, the various operations
 * performed on a `SegmentSink` (push/remove/segmentComplete) can happen
 * synchronously or asynchronously.
 *
 * You can retrieve the current queue of operations by calling the
 * `getPendingOperations` method.
 * If operations happens synchronously, this method will just return an empty
 * array.
 */
export declare abstract class SegmentSink {
    /** "Type" of the buffer (e.g. "audio", "video", "text"). */
    abstract readonly bufferType: IBufferType;
    /** Default implementation of an inventory of segment metadata. */
    protected _segmentInventory: SegmentInventory;
    /**
     * Mimetype+codec combination the SegmentSink is currently working with.
     * Depending on the implementation, segments with a different codecs could be
     * incompatible.
     *
     * `undefined` if unknown and if this property does not matter for this
     * SegmentSink implementation.
     */
    codec: string | undefined;
    constructor();
    abstract declareInitSegment(uniqueId: string, initSegmentData: unknown): void;
    abstract freeInitSegment(uniqueId: string): void;
    /**
     * Push a chunk of the media segment given to the attached buffer.
     *
     * Once all chunks of a single Segment have been given to `pushChunk`, you
     * should call `signalSegmentComplete` to indicate that the whole Segment has
     * been pushed.
     *
     * Depending on the type of data appended, the pushed chunk might rely on an
     * initialization segment, which had to be previously declared through the
     * `declareInitSegment` method.
     *
     * Such initialization segment will be first pushed to the buffer if the
     * last pushed segment was associated to another initialization segment.
     * This detection might rely on the initialization segment's reference so you
     * might want to avoid mutating in-place a initialization segment given to
     * that function (to avoid having two different values which have the same
     * reference).
     *
     * If you don't need any initialization segment to push the wanted chunk, you
     * can just set the corresponding property to `null`.
     *
     * You can also only push an initialization segment by setting the
     * `data.chunk` argument to null.
     *
     * @param {Object} infos
     * @returns {Promise}
     */
    abstract pushChunk(infos: IPushChunkInfos<unknown>): Promise<IRange[]>;
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Promise}
     */
    abstract removeBuffer(start: number, end: number): Promise<IRange[] | undefined>;
    /**
     * Indicate that every chunks from a segment has been given to pushChunk so
     * far.
     * This will update our internal Segment inventory accordingly.
     * The returned Promise will resolve once the whole segment has been pushed
     * and this indication is acknowledged.
     * @param {Object} infos
     * @returns {Promise}
     *
     * TODO since switching to worker, this abstraction doesn't really work.
     * Find better.
     */
    abstract signalSegmentComplete(infos: ICompleteSegmentInfo): Promise<void>;
    /**
     * The maintained inventory can fall out of sync from garbage collection or
     * other events.
     *
     * This methods allow to manually trigger a synchronization by providing the
     * buffered time ranges of the real SourceBuffer implementation.
     */
    synchronizeInventory(ranges: IRange[]): void;
    /**
     * Returns an inventory of the last known segments to be currently contained in
     * the SegmentSink.
     *
     * /!\ Note that this data may not be up-to-date with the real current content
     * of the SegmentSink.
     * Generally speaking, pushed segments are added right away to it but segments
     * may have been since removed, which might not be known right away.
     * Please consider this when using this method, by considering that it does
     * not reflect the full reality of the underlying buffer.
     * @returns {Array.<Object>}
     */
    getLastKnownInventory(): IBufferedChunk[];
    /**
     * Returns the list of every operations that the `SegmentSink` is still
     * processing. From the one with the highest priority to the lowest priority.
     * @returns {Array.<Object>}
     */
    abstract getPendingOperations(): Array<ISBOperation<unknown>>;
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
    getSegmentHistory(context: IChunkContext): IBufferedHistoryEntry[];
    /**
     * Dispose of the resources used by this SegmentSink.
     * /!\ You won't be able to use the SegmentSink after calling this
     * function.
     */
    abstract dispose(): void;
}
/** Every SegmentSink types. */
export type IBufferType = "audio" | "video" | "text";
/**
 * Content of the `data` property when pushing a new chunk.
 *
 * This will contain all necessary information to decode the media data.
 * Type parameter `T` is the format of the chunk's data.
 */
export interface IPushedChunkData<T> {
    /**
     * The `uniqueId` of the initialization segment linked to the data you want to
     * push.
     *
     * That identifier should previously have been declared through the
     * `declareInitSegment` method and not freed.
     *
     * To set to `null` either if no initialization data is needed, or if you are
     * confident that the last pushed one is compatible.
     */
    initSegmentUniqueId: string | null;
    /**
     * Chunk you want to push.
     * This can be the whole decodable segment's data or just a decodable sub-part
     * of it.
     * `null` if you just want to push the initialization segment.
     */
    chunk: T | null;
    /**
     * String corresponding to the mime-type + codec of the last segment pushed.
     * This might then be used by a SourceBuffer to infer the right codec to use.
     *
     * If set to `undefined`, the SegmentSink implementation will just rely on
     * a default codec it is linked to, if one.
     */
    codec: string | undefined;
    /**
     * Time offset in seconds to apply to this segment.
     * A `timestampOffset` set to `5` will mean that the segment will be decoded
     * 5 seconds after its decode time which was found from the segment data
     * itself.
     */
    timestampOffset: number;
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
    appendWindow: [number | undefined, number | undefined];
}
/**
 * Information to give when indicating a whole segment has been pushed via the
 * `signalSegmentComplete` method.
 */
export interface ICompleteSegmentInfo {
    /** Adaptation object linked to the chunk. */
    adaptation: IAdaptation;
    /** Period object linked to the chunk. */
    period: IPeriod;
    /** Representation object linked to the chunk. */
    representation: IRepresentation;
    /** The segment object linked to the pushed chunk. */
    segment: ISegment;
}
/**
 * Information to give when pushing a new chunk via the `pushChunk` method.
 * Type parameter `T` is the format of the chunk's data.
 */
export interface IPushChunkInfos<T> {
    /** Chunk that should be pushed with the associated metadata */
    data: IPushedChunkData<T>;
    /**
     * Context about the chunk that will be added to the inventory once it is
     * pushed.
     */
    inventoryInfos: IInsertedChunkInfos;
}
/** "Operations" scheduled by a SegmentSink. */
export type ISBOperation<T> = IPushOperation<T> | IRemoveOperation | ISignalCompleteSegmentOperation;
/**
 * Enum used by a SegmentSink as a discriminant in its queue of
 * "operations".
 */
export declare enum SegmentSinkOperation {
    Push = 0,
    Remove = 1,
    SignalSegmentComplete = 2
}
/**
 * "Operation" created by a `SegmentSink` when asked to push a chunk.
 *
 * It represents a queued "Push" operation (created due to a `pushChunk` method
 * call) that is not yet fully processed by a `SegmentSink`.
 */
export interface IPushOperation<T> {
    /** Discriminant (allows to tell its a "Push operation"). */
    type: SegmentSinkOperation.Push;
    /** Arguments for that push. */
    value: IPushChunkInfos<T>;
}
/**
 * "Operation" created by a SegmentSink when asked to remove buffer.
 *
 * It represents a queued "Remove" operation (created due to a `removeBuffer`
 * method call) that is not yet fully processed by a SegmentSink.
 */
export interface IRemoveOperation {
    /** Discriminant (allows to tell its a "Remove operation"). */
    type: SegmentSinkOperation.Remove;
    /** Arguments for that remove (absolute start and end time, in seconds). */
    value: {
        start: number;
        end: number;
    };
}
/**
 * "Operation" created by a `SegmentSink` when asked to validate that a full
 * segment has been pushed through earlier `Push` operations.
 *
 * It represents a queued "SignalSegmentComplete" operation (created due to a
 * `signalSegmentComplete` method call) that is not yet fully processed by a
 * `SegmentSink.`
 */
export interface ISignalCompleteSegmentOperation {
    /** Discriminant (allows to tell its an "SignalSegmentComplete operation"). */
    type: SegmentSinkOperation.SignalSegmentComplete;
    /** Arguments for that operation. */
    value: ICompleteSegmentInfo;
}
//# sourceMappingURL=types.d.ts.map