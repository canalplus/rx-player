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

import config from "../../../../config";
import type {
  IManifest,
  ISegment,
  IPeriod,
  IRepresentation,
  ITrackMetadata,
} from "../../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import type { ISegmentParserParsedMediaChunk } from "../../../../transports";
import objectAssign from "../../../../utils/object_assign";
import type { IReadOnlySharedReference } from "../../../../utils/reference";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type { SegmentSink } from "../../../segment_sinks";
import type {
  IRepresentationStreamPlaybackObservation,
  IStreamEventAddedSegmentPayload,
} from "../types";
import appendSegmentToBuffer from "./append_segment_to_buffer";

/**
 * Push a given media segment (non-init segment) to a SegmentSink.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default async function pushMediaSegment<T>(
  {
    playbackObserver,
    bufferGoal,
    content,
    initSegmentUniqueId,
    parsedSegment,
    segment,
    segmentSink,
  }: {
    playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>;
    content: {
      track: ITrackMetadata;
      manifest: IManifest;
      period: IPeriod;
      representation: IRepresentation;
    };
    bufferGoal: IReadOnlySharedReference<number>;
    initSegmentUniqueId: string | null;
    parsedSegment: ISegmentParserParsedMediaChunk<T>;
    segment: ISegment;
    segmentSink: SegmentSink;
  },
  cancelSignal: CancellationSignal,
): Promise<IStreamEventAddedSegmentPayload | null> {
  if (parsedSegment.chunkData === null) {
    return null;
  }
  if (cancelSignal.cancellationError !== null) {
    throw cancelSignal.cancellationError;
  }
  const { chunkData, chunkInfos, chunkOffset, chunkSize, appendWindow } = parsedSegment;
  const codec = content.representation.getMimeTypeString();
  const { APPEND_WINDOW_SECURITIES } = config.getCurrent();
  // Cutting exactly at the start or end of the appendWindow can lead to
  // cases of infinite rebuffering due to how browser handle such windows.
  // To work-around that, we add a small offset before and after those.
  const safeAppendWindow: [number | undefined, number | undefined] = [
    appendWindow[0] !== undefined
      ? Math.max(0, appendWindow[0] - APPEND_WINDOW_SECURITIES.START)
      : undefined,
    appendWindow[1] !== undefined
      ? appendWindow[1] + APPEND_WINDOW_SECURITIES.END
      : undefined,
  ];

  const data = {
    initSegmentUniqueId,
    chunk: chunkData,
    timestampOffset: chunkOffset,
    appendWindow: safeAppendWindow,
    codec,
  };

  let estimatedStart = chunkInfos?.time ?? segment.time;
  const estimatedDuration = chunkInfos?.duration ?? segment.duration;
  let estimatedEnd = estimatedStart + estimatedDuration;
  if (safeAppendWindow[0] !== undefined) {
    estimatedStart = Math.max(estimatedStart, safeAppendWindow[0]);
  }
  if (safeAppendWindow[1] !== undefined) {
    estimatedEnd = Math.min(estimatedEnd, safeAppendWindow[1]);
  }

  const inventoryInfos = objectAssign(
    { segment, chunkSize, start: estimatedStart, end: estimatedEnd },
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
