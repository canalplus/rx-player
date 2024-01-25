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
 * This file allows any Stream to push data to a SegmentBuffer.
 */

import {
  MediaError,
  SourceBufferError,
} from "../../../../errors";
import log from "../../../../log";
import type { IReadOnlyPlaybackObserver } from "../../../../main_thread/types";
import { toTaggedTrack } from "../../../../manifest";
import type { IRange } from "../../../../utils/ranges";
import type { IReadOnlySharedReference } from "../../../../utils/reference";
import sleep from "../../../../utils/sleep";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import { CancellationError } from "../../../../utils/task_canceller";
import type {
  IInsertedChunkInfos,
  IPushChunkInfos,
  SegmentBuffer,
} from "../../../segment_sinks";
import type { IRepresentationStreamPlaybackObservation } from "../types";

/**
 * Append a segment to the given segmentBuffer.
 * If it leads to an Error due to a full buffer, try to run our custom range
 * _garbage collector_ then retry.
 * @param {Object} playbackObserver
 * @param {Object} segmentBuffer
 * @param {Object} dataInfos
 * @param {number} bufferGoal
 * @param {Object} cancellationSignal
 * @returns {Promise}
 */
export default async function appendSegmentToBuffer<T>(
  playbackObserver : IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>,
  segmentBuffer : SegmentBuffer,
  dataInfos : IPushChunkInfos<T> & { inventoryInfos: IInsertedChunkInfos },
  bufferGoal : IReadOnlySharedReference<number>,
  cancellationSignal : CancellationSignal
) : Promise<IRange[]> {
  try {
    return await segmentBuffer.pushChunk(dataInfos);
  } catch (appendError : unknown) {
    if (cancellationSignal.isCancelled() && appendError instanceof CancellationError) {
      throw appendError;
    } else if (!(appendError instanceof SourceBufferError) || !appendError.isBufferFull) {
      const reason = appendError instanceof Error ?
        appendError.toString() :
        "An unknown error happened when pushing content";
      throw new MediaError("BUFFER_APPEND_ERROR", reason, {
        tracks: [toTaggedTrack(dataInfos.inventoryInfos.adaptation)],
      });
    }
    const { position } = playbackObserver.getReference().getValue();
    const currentPos = position.getWanted();
    try {
      log.warn("Stream: Running garbage collector");
      const start = Math.max(currentPos - 5, 0);
      const end = currentPos + bufferGoal.getValue() + 12;
      await segmentBuffer.removeBuffer(0, start);
      await segmentBuffer.removeBuffer(end, Number.MAX_VALUE);
      await sleep(200);
      if (cancellationSignal.cancellationError !== null) {
        throw cancellationSignal.cancellationError;
      }
      return await segmentBuffer.pushChunk(dataInfos);
    } catch (err2) {
      if (err2 instanceof CancellationError) {
        throw err2;
      }
      const reason = err2 instanceof Error ? err2.toString() :
                                             "Could not clean the buffer";

      throw new MediaError("BUFFER_FULL_ERROR", reason, {
        tracks: [toTaggedTrack(dataInfos.inventoryInfos.adaptation)],
      });
    }
  }
}
