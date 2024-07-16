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
import type { ISegment } from "../../manifest";
import type { IChunkTimeInfo } from "../types";
/** Information on future segments. */
export interface INextSegmentsInfos {
    /**
     * Difference between the latest and the earliest presentation time
     * available in that segment. The unit is in the corresponding timescale (see
     * `timescale` property).
     */
    duration: number;
    /**
     * Earliest presentation time available in that segment.
     * The unit is in the corresponding timescale (see `timescale` property).
     */
    time: number;
    /**
     * Allow to convert `duration` and `time` into seconds by dividing them to
     * that value.
     * e.g.:
     *   timeInSeconds = time / timescale
     *   durationInSeconds = duration / timescale
     *
     * Expressing those values relative to a "timescale" allows a greater
     * precision for the `time` and `duration` values.
     */
    timescale: number;
}
/**
 * Try to obtain time information from the given data.
 * @param {Uint8Array} data
 * @param {boolean} isChunked
 * @param {Object} segment
 * @param {boolean} isLive
 * @returns {Object}
 */
export default function extractTimingsInfos(data: Uint8Array, isChunked: boolean, initTimescale: number, segment: ISegment, isLive: boolean): {
    /** Possible information on segments after this one. */
    nextSegments: INextSegmentsInfos[];
    /** Time information on this segment */
    chunkInfos: IChunkTimeInfo | null;
    /**
     * Start time of this segment in the same timescale than the
     * initialization segment (so this segment can be patched with this
     * precize information).
     */
    scaledSegmentTime: number | undefined;
};
//# sourceMappingURL=extract_timings_infos.d.ts.map