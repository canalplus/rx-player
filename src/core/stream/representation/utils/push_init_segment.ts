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

import type {
  IManifest,
  IAdaptation,
  ISegment,
  IPeriod,
  IRepresentation,
} from "../../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import objectAssign from "../../../../utils/object_assign";
import type { IReadOnlySharedReference } from "../../../../utils/reference";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type { IPushedChunkData, SegmentSink } from "../../../segment_sinks";
import type {
  IRepresentationStreamPlaybackObservation,
  IStreamEventAddedSegmentPayload,
} from "../types";
import appendSegmentToBuffer from "./append_segment_to_buffer";

/**
 * Push the initialization segment to the SegmentSink.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default async function pushInitSegment<T>(
  {
    playbackObserver,
    content,
    initSegmentUniqueId,
    segment,
    segmentSink,
    bufferGoal,
  }: {
    playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>;
    content: {
      adaptation: IAdaptation;
      manifest: IManifest;
      period: IPeriod;
      representation: IRepresentation;
    };
    initSegmentUniqueId: string;
    segmentData: T;
    segment: ISegment;
    segmentSink: SegmentSink;
    bufferGoal: IReadOnlySharedReference<number>;
  },
  cancelSignal: CancellationSignal,
): Promise<IStreamEventAddedSegmentPayload | null> {
  if (cancelSignal.cancellationError !== null) {
    throw cancelSignal.cancellationError;
  }
  const codec = content.representation.getMimeTypeString();
  const data: IPushedChunkData<T> = {
    initSegmentUniqueId,
    chunk: null,
    timestampOffset: 0,
    appendWindow: [undefined, undefined],
    codec,
  };
  const inventoryInfos = objectAssign(
    { segment, chunkSize: undefined, start: 0, end: 0 },
    content,
  );
  const buffered = await appendSegmentToBuffer(
    playbackObserver,
    segmentSink,
    { data, inventoryInfos },
    bufferGoal,
    cancelSignal,
  );
  return { content, segment, buffered };
}
