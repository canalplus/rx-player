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
import type { IManifest, IAdaptation, IPeriod, IRepresentation } from "../../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import type { SegmentSink } from "../../../segment_sinks";
import type { IBufferDiscontinuity, IRepresentationStreamPlaybackObservation, IQueuedSegment } from "../types";
/** Analysis of the current buffer's status. */
export interface IBufferStatus {
    /**
     * Future discontinuity found in the SegmentSink's buffer: hole that won't
     * be filled by a segment.
     * `null` if no such discontinuity is found in the near future.
     */
    imminentDiscontinuity: IBufferDiscontinuity | null;
    /**
     * If `true`, no segment need to be loaded to be able to play until the end of
     * the Period.
     * Some segments might still be in the process of being pushed.
     */
    hasFinishedLoading: boolean;
    /**
     * Segments that have to be scheduled for download to fill the buffer at least
     * until the given buffer goal.
     * The first element of that list might already be currently downloading.
     */
    neededSegments: IQueuedSegment[];
    /**
     * If `true`, the Manifest has to be reloaded to obtain more information
     * on which segments should be loaded.
     */
    shouldRefreshManifest: boolean;
    /**
     * If 'true', the buffer memory is saturated, thus we may have issues loading
     * new segments.
     */
    isBufferFull: boolean;
}
/**
 * Checks on the current buffered data for the given type and Period
 * and returns what should be done to fill the buffer according to the buffer
 * goal, the Representation chosen, etc.
 * Also emits discontinuities if found, which are parts of the buffer that won't
 * be filled by any segment, even in the future.
 *
 * @param {Object} content
 * @param {number} initialWantedTime
 * @param {Object} playbackObserver
 * @param {number|undefined} fastSwitchThreshold
 * @param {number} bufferGoal
 * @param {number} maxBufferSize
 * @param {Object} segmentSink
 * @returns {Object}
 */
export default function getBufferStatus(content: {
    adaptation: IAdaptation;
    manifest: IManifest;
    period: IPeriod;
    representation: IRepresentation;
}, initialWantedTime: number, playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>, fastSwitchThreshold: number | undefined, bufferGoal: number, maxBufferSize: number, segmentSink: SegmentSink): IBufferStatus;
//# sourceMappingURL=get_buffer_status.d.ts.map