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

/**
 * This file allows any Stream to push data to a SegmentSink.
 */

import { MediaError, SourceBufferError } from "../../../../errors/index.ts";
import log from "../../../../log.ts";
import { toTaggedTrack } from "../../../../manifest/index.ts";
import type { IReadOnlyMediaElementMonitor } from "../../../../media_element_monitor/index.ts";
import type { IRange } from "../../../../utils/ranges.ts";
import type { IReadOnlySharedReference } from "../../../../utils/reference.ts";
import sleep from "../../../../utils/sleep.ts";
import type { CancellationSignal } from "../../../../utils/task_canceller.ts";
import { CancellationError } from "../../../../utils/task_canceller.ts";
import type {
  IInsertedChunkInfos,
  IPushChunkInfos,
  SegmentSink,
} from "../../../segment_sinks/index.ts";
import type { IRepresentationStreamMediaObservation } from "../types.ts";

/**
 * Append a segment to the given segmentSink.
 * If it leads to an Error due to a full buffer, try to run our custom range
 * _garbage collector_ then retry.
 * @param {Object} mediaElementMonitor
 * @param {Object} segmentSink
 * @param {Object} dataInfos
 * @param {number} bufferGoal
 * @param {Object} cancellationSignal
 * @returns {Promise}
 */
export default async function appendSegmentToBuffer<T>(
  mediaElementMonitor: IReadOnlyMediaElementMonitor<IRepresentationStreamMediaObservation>,
  segmentSink: SegmentSink,
  dataInfos: IPushChunkInfos<T> & { inventoryInfos: IInsertedChunkInfos },
  bufferGoal: IReadOnlySharedReference<number>,
  cancellationSignal: CancellationSignal,
): Promise<IRange[]> {
  try {
    return await segmentSink.pushChunk(dataInfos);
  } catch (appendError: unknown) {
    if (cancellationSignal.isCancelled() && appendError instanceof CancellationError) {
      throw appendError;
    } else if (!(appendError instanceof SourceBufferError) || !appendError.isBufferFull) {
      const reason =
        appendError instanceof Error
          ? appendError.toString()
          : "An unknown error happened when pushing content";
      throw new MediaError("BUFFER_APPEND_ERROR", reason, {
        tracks: [toTaggedTrack(dataInfos.inventoryInfos.adaptation)],
      });
    }
    const { position } = mediaElementMonitor.getReference().getValue();
    const currentPos = position.getWanted();
    try {
      log.warn("Stream", "Running garbage collector");
      const start = Math.max(currentPos - 5, 0);
      const end = currentPos + bufferGoal.getValue() + 12;
      if (start > 0) {
        await segmentSink.removeBuffer(0, start);
      }
      if (end < Number.MAX_VALUE) {
        await segmentSink.removeBuffer(end, Number.MAX_VALUE);
      }
      await sleep(200);
      if (cancellationSignal.cancellationError !== null) {
        throw cancellationSignal.cancellationError;
      }
      return await segmentSink.pushChunk(dataInfos);
    } catch (err2) {
      if (err2 instanceof CancellationError) {
        throw err2;
      }
      const reason =
        err2 instanceof Error ? err2.toString() : "Could not clean the buffer";

      throw new MediaError("BUFFER_FULL_ERROR", reason, {
        tracks: [toTaggedTrack(dataInfos.inventoryInfos.adaptation)],
      });
    }
  }
}
