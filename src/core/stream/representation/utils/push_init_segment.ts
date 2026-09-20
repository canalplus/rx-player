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
} from "../../../../manifest/index.ts";
import type { IReadOnlyMediaElementMonitor } from "../../../../media_element_monitor/index.ts";
import objectAssign from "../../../../utils/object_assign.ts";
import type { IReadOnlySharedReference } from "../../../../utils/reference.ts";
import type { CancellationSignal } from "../../../../utils/task_canceller.ts";
import type { IPushedChunkData, SegmentSink } from "../../../segment_sinks/index.ts";
import type {
  IRepresentationStreamMediaObservation,
  IStreamEventAddedSegmentPayload,
} from "../types.ts";
import appendSegmentToBuffer from "./append_segment_to_buffer.ts";

/**
 * Push the initialization segment to the SegmentSink.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default async function pushInitSegment<T>(
  {
    mediaElementMonitor,
    content,
    initSegmentUniqueId,
    segment,
    segmentSink,
    bufferGoal,
  }: {
    mediaElementMonitor: IReadOnlyMediaElementMonitor<IRepresentationStreamMediaObservation>;
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
    mediaElementMonitor,
    segmentSink,
    { data, inventoryInfos },
    bufferGoal,
    cancelSignal,
  );
  return { content, segment, buffered };
}
