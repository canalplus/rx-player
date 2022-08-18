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
  catchError,
  concat as observableConcat,
  mergeMap,
  ignoreElements,
  Observable,
  take,
} from "rxjs";
import { MediaError } from "../../../../common/errors";
import { IReadOnlyPlaybackObserver } from "../../api";
import {
  IPushChunkInfos,
  SegmentBuffer,
} from "../../segment_buffers";
import forceGarbageCollection from "./force_garbage_collection";
import { IRepresentationStreamPlaybackObservation } from "./representation_stream";

/**
 * Append a segment to the given segmentBuffer.
 * If it leads to a QuotaExceededError, try to run our custom range
 * _garbage collector_ then retry.
 *
 * @param {Observable} playbackObserver
 * @param {Object} segmentBuffer
 * @param {Object} dataInfos
 * @returns {Observable}
 */
export default function appendSegmentToBuffer<T>(
  playbackObserver : IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>,
  segmentBuffer : SegmentBuffer,
  dataInfos : IPushChunkInfos<T>
) : Observable<unknown> {
  const append$ = segmentBuffer.pushChunk(dataInfos);

  return append$.pipe(
    catchError((appendError : unknown) => {
      if (!(appendError instanceof Error) || appendError.name !== "QuotaExceededError") {
        const reason = appendError instanceof Error ?
          appendError.toString() :
          "An unknown error happened when pushing content";
        throw new MediaError("BUFFER_APPEND_ERROR", reason);
      }

      return playbackObserver.getReference().asObservable().pipe(
        take(1),
        mergeMap((observation) => {
          const currentPos = observation.position.pending ??
                             observation.position.last;
          return observableConcat(
            forceGarbageCollection(currentPos, segmentBuffer).pipe(ignoreElements()),
            append$
          ).pipe(
            catchError((forcedGCError : unknown) => {
              const reason = forcedGCError instanceof Error ?
                forcedGCError.toString() :
                "Could not clean the buffer";

              throw new MediaError("BUFFER_FULL_ERROR", reason);
            })
          );
        }));
    }));
}
