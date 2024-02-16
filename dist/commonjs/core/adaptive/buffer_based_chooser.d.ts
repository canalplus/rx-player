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
import type { IRepresentationMaintainabilityScore } from "./utils/representation_score_calculator";
/**
 * Choose a bitrate based on the currently available buffer.
 *
 * This algorithm is based on a deviation of the BOLA algorithm.
 * It is a hybrid solution that also relies on a given bitrate's
 * "maintainability".
 * Each time a chunk is downloaded, from the ratio between the chunk duration
 * and chunk's request time, we can assume that the representation is
 * "maintanable" or not.
 * If so, we may switch to a better quality, or conversely to a worse quality.
 *
 * It also rely on mechanisms to avoid fluctuating too much between qualities.
 *
 * @class BufferBasedChooser
 */
export default class BufferBasedChooser {
    private _levelsMap;
    private _bitrates;
    /**
     * Current last best Representation's bitrate estimate made by the
     * `BufferBasedChooser` or `undefined` if it has no such guess for now.
     *
     * Might be updated each time `onAddedSegment` is called.
     */
    private _currentEstimate;
    /**
     * Last monotonically-raising timestamp (as defined by the RxPlayer), at which
     * the current quality was seen as too high by this algorithm.
     * Begins at `undefined`.
     */
    private _lastUnsuitableQualityTimestamp;
    /**
     * After lowering in quality, we forbid raising during a set amount of time.
     * This amount is adaptive may continue to raise if it seems that quality
     * is switching too much between low and high qualities.
     *
     * `_blockRaiseDelay` represents this time in milliseconds.
     */
    private _blockRaiseDelay;
    /**
     * @param {Array.<number>} bitrates
     */
    constructor(bitrates: number[]);
    /**
     * @param {Object} playbackObservation
     * @returns {number|undefined}
     */
    onAddedSegment(playbackObservation: IBufferBasedChooserPlaybackObservation): void;
    /**
     * Returns the last best Representation's bitrate estimate made by the
     * `BufferBasedChooser` or `undefined` if it has no such guess for now.
     *
     * Might be updated after `onAddedSegment` is called.
     *
     * @returns {number|undefined}
     */
    getLastEstimate(): number | undefined;
}
/** Playback observation needed by the `BufferBasedChooser`. */
export interface IBufferBasedChooserPlaybackObservation {
    /**
     * Difference in seconds between the current position and the next
     * non-buffered position in the buffer for the currently-considered
     * media type.
     */
    bufferGap: number;
    /** The bitrate of the currently downloaded segments, in bps. */
    currentBitrate?: number | undefined;
    /** The "maintainability score" of the currently downloaded segments. */
    currentScore?: IRepresentationMaintainabilityScore | undefined;
    /** Playback rate wanted (e.g. `1` is regular playback, `2` is double speed etc.). */
    speed: number;
}
