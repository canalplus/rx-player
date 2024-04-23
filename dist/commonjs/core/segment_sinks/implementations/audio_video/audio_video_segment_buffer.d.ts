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
import type { IMediaSourceInterface, SourceBufferType } from "../../../../mse";
import type { IRange } from "../../../../utils/ranges";
import type { ICompleteSegmentInfo, IPushChunkInfos, ISBOperation } from "../types";
import { SegmentSink } from "../types";
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
    readonly bufferType: "audio" | "video";
    /** SourceBuffer implementation. */
    private readonly _sourceBuffer;
    /**
     * Queue of awaited buffer "operations".
     * The first element in this array will be the first performed.
     */
    private _pendingOperations;
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
    private _lastInitSegmentUniqueId;
    /**
     * Link unique identifiers for initialization segments (as communicated by
     * `declareInitSegment`) to the corresponding initialization data.
     */
    private _initSegmentsMap;
    /**
     * @constructor
     * @param {string} bufferType
     * @param {string} codec
     * @param {Object} mediaSource
     */
    constructor(bufferType: SourceBufferType, codec: string, mediaSource: IMediaSourceInterface);
    /** @see SegmentSink */
    declareInitSegment(uniqueId: string, initSegmentData: unknown): void;
    /** @see SegmentSink */
    freeInitSegment(uniqueId: string): void;
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
    pushChunk(infos: IPushChunkInfos<unknown>): Promise<IRange[]>;
    /** @see SegmentSink */
    removeBuffer(start: number, end: number): Promise<IRange[]>;
    /**
     * Indicate that every chunks from a Segment has been given to pushChunk so
     * far.
     * This will update our internal Segment inventory accordingly.
     * The returned Promise will resolve once the whole segment has been pushed
     * and this indication is acknowledged.
     * @param {Object} infos
     * @returns {Promise}
     */
    signalSegmentComplete(infos: ICompleteSegmentInfo): Promise<void>;
    /**
     * Returns the list of every operations that the `AudioVideoSegmentSink` is
     * still processing.
     * @returns {Array.<Object>}
     */
    getPendingOperations(): Array<ISBOperation<unknown>>;
    /** @see SegmentSink */
    dispose(): void;
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
    private _getActualDataToPush;
    /**
     * Return `true` if the given `uniqueId` is the identifier of the last
     * initialization segment pushed to the `AudioVideoSegmentSink`.
     * @param {string} uniqueId
     * @returns {boolean}
     */
    private _isLastInitSegment;
    private _addToOperationQueue;
}
