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

import { Observable } from "rxjs";
import { take } from "rxjs/operators";
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
  clock$ : Observable<{ getCurrentTime : () => number }>,
  segmentBuffer : SegmentBuffer<T>,
  dataInfos : IPushChunkInfos<T>,
  cancellationSignal : CancellationSignal
) : Promise<void> {
  try {
    await segmentBuffer.pushChunk(dataInfos);
  } catch (appendError) {
    if (!(appendError instanceof Error) ||
        appendError.name !== "QuotaExceededError")
    {
      const reason = appendError instanceof Error ?
        appendError.toString() :
        "An unknown error happened when pushing content";
      throw new MediaError("BUFFER_APPEND_ERROR", reason);
    }

    try {
      // TODO Refacto the clock so that ugly hack is not needed anymore
      const { getCurrentTime } = await clock$.pipe(take(1)).toPromise();
      await forceGarbageCollection(getCurrentTime, segmentBuffer, cancellationSignal);
      await segmentBuffer.pushChunk(dataInfos);
    } catch (forcedGCError) {
      if (TaskCanceller.isCancellationError(forcedGCError)) {
        throw forcedGCError;
      }
      const reason = forcedGCError instanceof Error ? forcedGCError.toString() :
                                                      "Could not clean the buffer";
      throw new MediaError("BUFFER_FULL_ERROR", reason);
    }
  }
}
