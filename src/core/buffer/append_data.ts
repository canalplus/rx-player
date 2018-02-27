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

import { Observable } from "rxjs/Observable";
import { MediaError } from "../../errors";
import { ISegment } from "../../manifest";
import { QueuedSourceBuffer } from "../source_buffers";
import forceGarbageCollection from "./force_garbage_collection";

/**
 * Append buffer to the queuedSourceBuffer.
 * If it leads to a QuotaExceededError, try to run our custom range
 * _garbage collector_.
 * @returns {Observable}
 */
function appendDataToSourceBuffer<T>(
  queuedSourceBuffer : QueuedSourceBuffer<T>,
  initSegmentData : T|null,
  segment : ISegment,
  segmentData : T
) : Observable<void> {

  let append$ : Observable<void>;
  if (segment.isInit) {
    append$ = initSegmentData == null ?
      Observable.of(undefined) :
      queuedSourceBuffer.appendBuffer(initSegmentData, null);
  } else {
    append$ = segmentData == null ?
      Observable.of(undefined) :
      queuedSourceBuffer.appendBuffer(initSegmentData, segmentData);
  }
  return append$;
}

/**
 * Append buffer to the queuedSourceBuffer.
 * If it leads to a QuotaExceededError, try to run our custom range
 * _garbage collector_.
 * @returns {Observable}
 */
export default function appendDataToSourceBufferWithRetries<T>(
  clock$ : Observable<{ currentTime : number }>,
  queuedSourceBuffer : QueuedSourceBuffer<T>,
  initSegmentData : T|null,
  segment : ISegment,
  segmentData : T
) : Observable<void> {
  const append$ = appendDataToSourceBuffer(
    queuedSourceBuffer, initSegmentData, segment, segmentData);

  return append$
    .catch((appendError : Error) : Observable<void> => {
      if (!appendError || appendError.name !== "QuotaExceededError") {
        throw new MediaError("BUFFER_APPEND_ERROR", appendError, true);
      }

      return forceGarbageCollection(clock$, queuedSourceBuffer)
        .mergeMapTo(append$)
        .catch((forcedGCError : Error) : never|Observable<void> => {
          // (weird Typing either due to TypeScript or RxJS bug)
          throw new MediaError("BUFFER_FULL_ERROR", forcedGCError, true);
        });
    });
}
