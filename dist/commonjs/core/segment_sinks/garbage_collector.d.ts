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
import type { IReadOnlyPlaybackObserver } from "../../playback_observer";
import type { IReadOnlySharedReference } from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IStreamOrchestratorPlaybackObservation } from "../stream";
import type { SegmentSink } from "./implementations";
export interface IGarbageCollectorArgument {
    /** SegmentSink implementation */
    segmentSink: SegmentSink;
    /** Emit current position in seconds regularly */
    playbackObserver: IReadOnlyPlaybackObserver<Pick<IStreamOrchestratorPlaybackObservation, "position" | "buffered">>;
    /** Maximum time to keep behind current time position, in seconds */
    maxBufferBehind: IReadOnlySharedReference<number>;
    /** Minimum time to keep behind current time position, in seconds */
    maxBufferAhead: IReadOnlySharedReference<number>;
}
/**
 * Perform cleaning of the buffer according to the values set by the user
 * each time `playbackObserver` emits and each times the
 * maxBufferBehind/maxBufferAhead values change.
 *
 * Abort this operation when the `cancellationSignal` emits.
 *
 * @param {Object} opt
 * @param {Object} cancellationSignal
 *
 * TODO Move to main thread?
 */
export default function BufferGarbageCollector({ segmentSink, playbackObserver, maxBufferBehind, maxBufferAhead, }: IGarbageCollectorArgument, cancellationSignal: CancellationSignal): void;
