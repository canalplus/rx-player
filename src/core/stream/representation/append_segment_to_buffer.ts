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

import PPromise from "pinkie";
import { MediaError } from "../../../errors";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import {
  IPushChunkInfos,
  SegmentBuffer,
} from "../../segment_buffers";
import forceGarbageCollection from "./force_garbage_collection";

/**
 * Append a segment to the given segmentBuffer.
 * If it leads to a QuotaExceededError, try to run our custom range
 * _garbage collector_ then retry.
 *
 * @param {Observable} clock$
 * @param {Object} segmentBuffer
 * @param {Object} dataInfos
 * @returns {Observable}
 */
export default async function appendSegmentToBuffer<T>(
  getCurrentTime : () => number,
  segmentBuffer : SegmentBuffer<T>,
  dataInfos : IPushChunkInfos<T>,
  cancellationSignal : CancellationSignal
) : Promise<void> {
  try {
    await segmentBuffer.pushChunk(dataInfos, cancellationSignal);
  } catch (appendError) {
    if (TaskCanceller.isCancellationError(appendError)) {
      return PPromise.reject(appendError);
    } else if (!(appendError instanceof Error) ||
               appendError.name !== "QuotaExceededError")
    {
      const reason = appendError instanceof Error ?
        appendError.toString() :
        "An unknown error happened when pushing content";
      return PPromise.reject(new MediaError("BUFFER_APPEND_ERROR", reason));
    }

    try {
      await forceGarbageCollection(getCurrentTime, segmentBuffer, cancellationSignal);
      await segmentBuffer.pushChunk(dataInfos, cancellationSignal);
    } catch (forcedGCError) {
      if (TaskCanceller.isCancellationError(forcedGCError)) {
        return PPromise.reject(forcedGCError);
      }
      const reason = forcedGCError instanceof Error ? forcedGCError.toString() :
                                                      "Could not clean the buffer";
      throw new MediaError("BUFFER_FULL_ERROR", reason);
    }
  }
}
