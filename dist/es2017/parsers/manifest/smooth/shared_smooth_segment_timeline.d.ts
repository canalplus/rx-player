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
import type { ISegment } from "../../../manifest";
/**
 * Smooth contents provide the index of segments under a "StreamIndex", the
 * smooth equivalent of an AdaptationSet.
 *
 * This means that multiple "QualityLevel" (smooth's Representation) are going
 * to rely on the exact same list of segments. This also means that all
 * mutations on that timeline (whether it is to evict old segments or to add
 * new ones) should presumably happen for all of them at the same time.
 *
 * The `SharedSmoothSegmentTimeline` is an abstraction over that index of
 * segments whose goal is to explicitely provide a data structure that can be
 * shared to every `RepresentationIndex` linked to Representations being part
 * of the same smooth Adaptation, thus allowing to mutualize any side-effect
 * done to it automatically.
 *
 * @class SharedSmoothSegmentTimeline
 */
export default class SharedSmoothSegmentTimeline {
    /**
     * Array describing the list of segments available.
     * Note that this same list might be shared by multiple `RepresentationIndex`
     * (as they link to the same timeline in the Manifest).
     */
    timeline: IIndexSegment[];
    /** Timescale allowing to convert time values in `timeline` into seconds. */
    timescale: number;
    /**
     * Defines the earliest time - expressed in the RxPlayer's
     * monotonically-raising timestamp unit - when the timeline was known to be
     * valid (that is, when all segments declared in it are available).
     *
     * This is either:
     *   - the Manifest downloading time, if known
     *   - else, the time of creation of this SharedSmoothSegmentTimeline, as a
     *     guess
     */
    validityTime: number;
    private _timeShiftBufferDepth;
    private _initialScaledLastPosition;
    constructor(args: ISharedSmoothSegmentTimelineArguments);
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to the timeshift window
     */
    refresh(): void;
    /**
     * Replace this SharedSmoothSegmentTimeline by a newly downloaded one.
     * Check if the old timeline had more information about new segments and re-add
     * them if that's the case.
     * @param {Object} newSmoothTimeline
     */
    replace(newSmoothTimeline: SharedSmoothSegmentTimeline): void;
    /**
     * Update the current SharedSmoothSegmentTimeline with a new, partial, version.
     * This method might be use to only add information about new segments.
     * @param {Object} newSmoothTimeline
     */
    update(newSmoothTimeline: SharedSmoothSegmentTimeline): void;
    /**
     * Add segments to a `SharedSmoothSegmentTimeline` that were predicted to come
     * after `currentSegment`.
     * @param {Array.<Object>} nextSegments - The segment information parsed.
     * @param {Object} segment - Information on the segment which contained that
     * new segment information.
     */
    addPredictedSegments(nextSegments: Array<{
        duration: number;
        time: number;
        timescale: number;
    }>, currentSegment: ISegment): void;
}
export interface ISharedSmoothSegmentTimelineArguments {
    timeline: IIndexSegment[];
    timescale: number;
    timeShiftBufferDepth: number | undefined;
    manifestReceivedTime: number | undefined;
}
/**
 * Object describing information about one segment or several consecutive
 * segments.
 */
export interface IIndexSegment {
    /** Time (timescaled) at which the segment starts. */
    start: number;
    /** Duration (timescaled) of the segment. */
    duration: number;
    /**
     * Amount of consecutive segments with that duration.
     *
     * For example let's consider the following IIndexSegment:
     * ```
     * { start: 10, duration: 2, repeatCount: 2 }
     * ```
     * Here, because `repeatCount` is set to `2`, this object actually defines 3
     * segments:
     *   1. one starting at `10` and ending at `12` (10 + 2)
     *   2. another one starting at `12` (the previous one's end) and ending at
     *      `14` (12 + 2)
     *   3. another one starting at `14` (the previous one's end) and ending at
     *      `16` (14 +2)
     */
    repeatCount: number;
}
