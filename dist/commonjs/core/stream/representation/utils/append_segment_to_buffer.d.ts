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
import type { IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import type { IRange } from "../../../../utils/ranges";
import type { IReadOnlySharedReference } from "../../../../utils/reference";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type { IInsertedChunkInfos, IPushChunkInfos, SegmentSink } from "../../../segment_sinks";
import type { IRepresentationStreamPlaybackObservation } from "../types";
/**
 * Append a segment to the given segmentSink.
 * If it leads to an Error due to a full buffer, try to run our custom range
 * _garbage collector_ then retry.
 * @param {Object} playbackObserver
 * @param {Object} segmentSink
 * @param {Object} dataInfos
 * @param {number} bufferGoal
 * @param {Object} cancellationSignal
 * @returns {Promise}
 */
export default function appendSegmentToBuffer<T>(playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>, segmentSink: SegmentSink, dataInfos: IPushChunkInfos<T> & {
    inventoryInfos: IInsertedChunkInfos;
}, bufferGoal: IReadOnlySharedReference<number>, cancellationSignal: CancellationSignal): Promise<IRange[]>;
