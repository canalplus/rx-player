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
import type { IRepresentationIndex, ISegment } from "../../../manifest";
import type { IPlayerError } from "../../../public_types";
import type SharedSmoothSegmentTimeline from "./shared_smooth_segment_timeline";
/**
 * Supplementary options taken by a SmoothRepresentationIndex bringing the
 * context the segments are in.
 */
export interface ISmoothRepresentationIndexContextInformation {
    /**
     * If `true` the corresponding Smooth Manifest was announced as a live
     * content.
     * `false` otherwise.
     */
    isLive: boolean;
    /**
     * Generic tokenized (e.g. with placeholders for time information) URL for
     * every segments anounced here.
     */
    media: string;
    /**
     * Contains information allowing to generate the corresponding initialization
     * segment.
     */
    segmentPrivateInfos: ISmoothInitSegmentPrivateInfos;
    sharedSmoothTimeline: SharedSmoothSegmentTimeline;
}
/** Information allowing to generate a Smooth initialization segment. */
interface ISmoothInitSegmentPrivateInfos {
    bitsPerSample?: number | undefined;
    channels?: number | undefined;
    codecPrivateData?: string | undefined;
    packetSize?: number | undefined;
    samplingRate?: number | undefined;
    protection?: {
        keyId: Uint8Array;
    } | undefined;
    height?: number | undefined;
    width?: number | undefined;
}
/**
 * RepresentationIndex implementation for Smooth Manifests.
 *
 * Allows to interact with the index to create new Segments.
 *
 * @class SmoothRepresentationIndex
 */
export default class SmoothRepresentationIndex implements IRepresentationIndex {
    /**
     * Information needed to generate an initialization segment.
     * Taken from the Manifest.
     */
    private _initSegmentInfos;
    /**
     * Value only calculated for live contents.
     *
     * Calculates the difference, in timescale, between the monotonically-raising
     * timestamp used by the RxPlayer and the time of the last segment known to
     * have been generated on the server-side.
     * Useful to know if a segment present in the timeline has actually been
     * generated on the server-side
     */
    private _scaledLiveGap;
    /**
     * Defines the end of the latest available segment when this index was known to
     * be valid, in the index's timescale.
     */
    private _initialScaledLastPosition;
    /**
     * If `true` the corresponding Smooth Manifest was announced as a live
     * content.
     * `false` otherwise.
     */
    private _isLive;
    /**
     * Contains information on the list of segments available in this
     * SmoothRepresentationIndex.
     */
    private _sharedSmoothTimeline;
    /**
     * Generic tokenized (e.g. with placeholders for time information) URL for
     * every segments anounced here.
     */
    private _media;
    /**
     * Creates a new `SmoothRepresentationIndex`.
     * @param {Object} index
     * @param {Object} options
     */
    constructor(options: ISmoothRepresentationIndexContextInformation);
    /**
     * Construct init Segment compatible with a Smooth Manifest.
     * @returns {Object}
     */
    getInitSegment(): ISegment;
    /**
     * Generate a list of Segments for a particular period of time.
     *
     * @param {Number} from
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(from: number, dur: number): ISegment[];
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * (If we should re-fetch the manifest)
     * @param {Number} up
     * @param {Number} to
     * @returns {Boolean}
     */
    shouldRefresh(up: number, to: number): boolean;
    /**
     * Returns first position available in the index.
     * @returns {Number|null}
     */
    getFirstAvailablePosition(): number | null;
    /**
     * Returns last position available in the index.
     * @returns {Number}
     */
    getLastAvailablePosition(): number | undefined;
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd(): number | null | undefined;
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     * @param {number} start
     * @param {number} end
     * @returns {boolean|undefined}
     */
    awaitSegmentBetween(start: number, end: number): boolean | undefined;
    /**
     * Checks if `timeSec` is in a discontinuity.
     * That is, if there's no segment available for the `timeSec` position.
     * @param {number} timeSec - The time to check if it's in a discontinuity, in
     * seconds.
     * @returns {number | null} - If `null`, no discontinuity is encountered at
     * `time`. If this is a number instead, there is one and that number is the
     * position for which a segment is available in seconds.
     */
    checkDiscontinuity(timeSec: number): number | null;
    /**
     * Returns `true` if a Segment returned by this index is still considered
     * available.
     * Returns `false` if it is not available anymore.
     * Returns `undefined` if we cannot know whether it is still available or not.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    isSegmentStillAvailable(segment: ISegment): boolean | undefined;
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    canBeOutOfSyncError(error: IPlayerError): boolean;
    /**
     * Replace this RepresentationIndex by a newly downloaded one.
     * Check if the old index had more information about new segments and re-add
     * them if that's the case.
     * @param {Object} newIndex
     */
    _replace(newIndex: SmoothRepresentationIndex): void;
    /**
     * Update the current index with a new, partial, version.
     * This method might be use to only add information about new segments.
     * @param {Object} newIndex
     */
    _update(newIndex: SmoothRepresentationIndex): void;
    /**
     * Returns `false` if the last segments in this index have already been
     * generated.
     * Returns `true` if the index is still waiting on future segments to be
     * generated.
     *
     * For Smooth, it should only depend on whether the content is a live content
     * or not.
     * TODO What about Smooth live content that finishes at some point?
     * @returns {boolean}
     */
    isStillAwaitingFutureSegments(): boolean;
    /**
     * @returns {Boolean}
     */
    isInitialized(): true;
    initialize(): void;
    /**
     * Add segments to a `SharedSmoothSegmentTimeline` that were predicted to come
     * after `currentSegment`.
     * @param {Array.<Object>} nextSegments - The segment information parsed.
     * @param {Object} currentSegment - Information on the segment which contained
     * that new segment information.
     */
    addPredictedSegments(nextSegments: Array<{
        duration: number;
        time: number;
        timescale: number;
    }>, currentSegment: ISegment): void;
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to the timeshift window
     */
    private _refreshTimeline;
}
export {};
//# sourceMappingURL=representation_index.d.ts.map