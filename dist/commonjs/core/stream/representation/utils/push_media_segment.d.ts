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
import type { IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import type { ISegmentParserParsedMediaChunk } from "../../../../transports";
import type { IReadOnlySharedReference } from "../../../../utils/reference";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type { SegmentSink } from "../../../segment_sinks";
import type { IRepresentationStreamPlaybackObservation, IStreamEventAddedSegmentPayload } from "../types";
/**
 * Push a given media segment (non-init segment) to a SegmentSink.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default function pushMediaSegment<T>({ playbackObserver, bufferGoal, content, initSegmentUniqueId, parsedSegment, segment, segmentSink, }: {
    playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>;
    content: {
        adaptation: IAdaptation;
        manifest: IManifest;
        period: IPeriod;
        representation: IRepresentation;
    };
    bufferGoal: IReadOnlySharedReference<number>;
    initSegmentUniqueId: string | null;
    parsedSegment: ISegmentParserParsedMediaChunk<T>;
    segment: ISegment;
    segmentSink: SegmentSink;
}, cancelSignal: CancellationSignal): Promise<IStreamEventAddedSegmentPayload | null>;
