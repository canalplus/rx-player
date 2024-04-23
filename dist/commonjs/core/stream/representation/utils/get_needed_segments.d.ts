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
import type { IManifest, IAdaptation, ISegment, IPeriod, IRepresentation } from "../../../../manifest";
import type { IBufferedChunk, ICompleteSegmentInfo, IBufferedHistoryEntry, IChunkContext } from "../../../segment_sinks";
interface IContentContext {
    adaptation: IAdaptation;
    manifest: IManifest;
    period: IPeriod;
    representation: IRepresentation;
}
/** Arguments for `getNeededSegments`. */
export interface IGetNeededSegmentsArguments {
    /** The content we want to load segments for */
    content: IContentContext;
    /**
     * The current playing position.
     * Important to avoid asking for segments on the same exact position, which
     * can be problematic in some browsers.
     */
    currentPlaybackTime: number;
    /**
     * This threshold defines a bitrate from which "fast-switching" is disabled.
     * For example with a fastSwitchThreshold set to `100`, segments with a
     * bitrate of `90` can be replaced. But segments with a bitrate of `100`
     * onward won't be replaced by higher quality segments.
     * Set to `undefined` to indicate that there's no threshold (anything can be
     * replaced by higher-quality segments).
     */
    fastSwitchThreshold: number | undefined;
    /** The range we want to fill with segments. */
    neededRange: {
        start: number;
        end: number;
    };
    /** The list of segments that are already in the process of being pushed. */
    segmentsBeingPushed: ICompleteSegmentInfo[];
    /**
     * Information on the segments already in the buffer, in chronological order.
     *
     * The data for the whole buffer is not necessary, as only data around the
     * current range will be looked at.
     * It is important to include segments close to - though not in - that range
     * (let's say around 5 seconds) however to avoid some segments being
     * re-requested.
     */
    bufferedSegments: IBufferedChunk[];
    /**
     * maxBufferSize is the maximum memory in kilobytes that the buffer should take
     */
    maxBufferSize: number;
    getBufferedHistory: (context: IChunkContext) => IBufferedHistoryEntry[];
}
interface INeededSegments {
    /** Segments that should be loaded right now, by chronological order. */
    segmentsToLoad: ISegment[];
    /**
     * Segments that should be loaded, but not right now, due to some other
     * constraints, such as memory limitations.
     */
    segmentsOnHold: ISegment[];
    /**
     * If `true` the buffer is currently full according to the given limits.
     * Memory should be freed if possible, for example by cleaning the buffers.
     */
    isBufferFull: boolean;
}
/**
 * Return the list of segments that can currently be downloaded to fill holes
 * in the buffer in the given range, including already-pushed segments currently
 * incomplete in the buffer.
 * This list might also include already-loaded segments in a higher bitrate,
 * according to the given configuration.
 * Excludes segment that are already being pushed.
 * @param {Object} args
 * @returns {Array.<Object>}
 */
export default function getNeededSegments({ bufferedSegments, content, currentPlaybackTime, fastSwitchThreshold, getBufferedHistory, neededRange, segmentsBeingPushed, maxBufferSize, }: IGetNeededSegmentsArguments): INeededSegments;
export {};
