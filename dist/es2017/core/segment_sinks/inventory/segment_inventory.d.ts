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
import type { IBufferedHistoryEntry } from "./buffered_history";
import type { IChunkContext } from "./types";
/** Categorization of a given chunk in the `SegmentInventory`. */
export declare const enum ChunkStatus {
    /**
     * This chunk is only a part of a partially-pushed segment for now, meaning
     * that it is only a sub-part of a requested segment that was not yet
     * fully-loaded and pushed.
     *
     * Once and if the corresponding segment is fully-pushed, its `ChunkStatus`
     * switches to `FullyLoaded`.
     */
    PartiallyPushed = 0,
    /** This chunk corresponds to a fully-loaded segment. */
    FullyLoaded = 1,
    /**
     * This chunk's push operation failed, in this scenario there is no certitude
     * about the presence of that chunk in the buffer: it may not be present,
     * partially-present, or fully-present depending on why that push operation
     * failed, which is generally only known by the lower-level code.
     */
    Failed = 2
}
/** Information stored on a single chunk by the SegmentInventory. */
export interface IBufferedChunk {
    /**
     * Value of the monotonically-increasing timestamp used by the RxPlayer at
     * the time the segment was succesfully pushed to the buffer.
     *
     * We add this value here as we may want to wait for some time before
     * synchronizing the buffer to ensure the browser has properly considered the
     * full segment in its `buffered` value.
     */
    insertionTs: number;
    /**
     * Complete size of the pushed chunk, in bytes.
     * Note that this does not always reflect the memory imprint of the segment in
     * memory:
     *
     *   1. It's the size of the original container file. A browser receiving that
     *      segment might then transform it under another form that may be more or
     *      less voluminous.
     *
     *   2. It's the size of the full chunk. In some scenarios only a sub-part of
     *      that chunk is actually considered (examples: when using append
     *      windows, when another chunk overlap that one etc.).
     */
    chunkSize: number | undefined;
    /**
     * Last inferred end in the media buffer this chunk ends at, in seconds.
     *
     * Depending on if contiguous chunks were around it during the first
     * synchronization for that chunk this value could be more or less precize.
     */
    bufferedEnd: number | undefined;
    /**
     * Last inferred start in the media buffer this chunk starts at, in seconds.
     *
     * Depending on if contiguous chunks were around it during the first
     * synchronization for that chunk this value could be more or less precize.
     */
    bufferedStart: number | undefined;
    /** Supposed end, in seconds, the chunk is expected to end at. */
    end: number;
    /**
     * If `true` the `end` property is an estimate the `SegmentInventory` has
     * a high confidence in.
     * In that situation, `bufferedEnd` can easily be compared to it to check if
     * that segment has been partially, or fully, garbage collected.
     *
     * If `false`, it is just a guess based on segment information.
     */
    precizeEnd: boolean;
    /**
     * If `true` the `start` property is an estimate the `SegmentInventory` has
     * a high confidence in.
     * In that situation, `bufferedStart` can easily be compared to it to check if
     * that segment has been partially, or fully, garbage collected.
     *
     * If `false`, it is just a guess based on segment information.
     */
    precizeStart: boolean;
    /** Information on what that chunk actually contains. */
    infos: IChunkContext;
    /**
     * Status of this chunk.
     * @see ChunkStatus
     */
    status: ChunkStatus;
    /**
     * If `true`, the segment as a whole is divided into multiple parts in the
     * buffer, with other segment(s) between them.
     * If `false`, it is contiguous.
     *
     * Splitted segments are a rare occurence that is more complicated to handle
     * than contiguous ones.
     */
    splitted: boolean;
    /**
     * Supposed start, in seconds, the chunk is expected to start at.
     *
     * If the current `chunk` is part of a "partially pushed" segment (see
     * `partiallyPushed`), the definition of this property is flexible in the way
     * that it can correspond either to the start of the chunk or to the start of
     * the whole segment the chunk is linked to.
     * As such, this property should not be relied on until the segment has been
     * fully-pushed.
     */
    start: number;
}
/** information to provide when "inserting" a new chunk into the SegmentInventory. */
export interface IInsertedChunkInfos {
    /** The Adaptation that chunk is linked to */
    adaptation: IAdaptation;
    /** The Period that chunk is linked to */
    period: IPeriod;
    /** The Representation that chunk is linked to. */
    representation: IRepresentation;
    /** The Segment that chunk is linked to. */
    segment: ISegment;
    /** Estimated size of the full pushed chunk, in bytes. */
    chunkSize: number | undefined;
    /**
     * Start time, in seconds, this chunk most probably begins from after being
     * pushed.
     * In doubt, you can set it at the start of the whole segment (after
     * considering the possible offsets and append windows).
     */
    start: number;
    /**
     * End time, in seconds, this chunk most probably ends at after being
     * pushed.
     *
     * In doubt, you can set it at the end of the whole segment (after
     * considering the possible offsets and append windows).
     */
    end: number;
}
/**
 * Keep track of every chunk downloaded and currently in the linked media
 * buffer.
 *
 * The main point of this class is to know which chunks are already pushed to
 * the corresponding media buffer, at which bitrate, and which have been garbage-collected
 * since by the browser (and thus may need to be re-loaded).
 * @class SegmentInventory
 */
export default class SegmentInventory {
    /**
     * Keeps track of all the segments which should be currently in the browser's
     * memory.
     * This array contains objects, each being related to a single downloaded
     * chunk or segment which is at least partially added in the media buffer.
     */
    private _inventory;
    private _bufferedHistory;
    constructor();
    /**
     * Reset the whole inventory.
     */
    reset(): void;
    /**
     * Infer each segment's `bufferedStart` and `bufferedEnd` properties from the
     * ranges given.
     *
     * The ranges object given should come from the media buffer linked to that
     * SegmentInventory.
     *
     * /!\ A SegmentInventory should not be associated to multiple media buffers
     * at a time, so each `synchronizeBuffered` call should be given ranges coming
     * from the same buffer.
     * @param {Array.<Object>} ranges
     */
    synchronizeBuffered(ranges: IRange[]): void;
    /**
     * Add a new chunk in the inventory.
     *
     * Chunks are decodable sub-parts of a whole segment. Once all chunks in a
     * segment have been inserted, you should call the `completeSegment` method.
     * @param {Object} chunkInformation
     * @param {boolean} succeed - If `true` the insertion operation finished with
     * success, if `false` an error arised while doing it.
     * @param {number} insertionTs - The monotonically-increasing timestamp at the
     * time the segment has been confirmed to be inserted by the buffer.
     */
    insertChunk({ period, adaptation, representation, segment, chunkSize, start, end, }: IInsertedChunkInfos, succeed: boolean, insertionTs: number): void;
    /**
     * Indicate that inserted chunks can now be considered as a fully-loaded
     * segment.
     * Take in argument the same content than what was given to `insertChunk` for
     * the corresponding chunks.
     * @param {Object} content
     */
    completeSegment(content: {
        period: IPeriod;
        adaptation: IAdaptation;
        representation: IRepresentation;
        segment: ISegment;
    }): void;
    /**
     * Returns the whole inventory.
     *
     * To get a list synchronized with what a media buffer actually has buffered
     * you might want to call `synchronizeBuffered` before calling this method.
     * @returns {Array.<Object>}
     */
    getInventory(): IBufferedChunk[];
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
    getHistoryFor(context: IChunkContext): IBufferedHistoryEntry[];
}
//# sourceMappingURL=segment_inventory.d.ts.map