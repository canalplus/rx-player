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

import { of as observableOf } from "rxjs";
import {
  mergeMap,
  scan,
} from "rxjs/operators";
import log from "../../log";
import { concat } from "../../utils/byte_parsing";
import fetchRequest, {
  IDataChunk,
  IDataComplete,
} from "../../utils/request/fetch";
import {
  ILoaderChunkedDataEvent,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
} from "../types";
import byteRange from "../utils/byte_range";
import extractCompleteChunks from "./extract_complete_chunks";

export default function lowLatencySegmentLoader(
  url : string,
  args : ISegmentLoaderArguments
) : ISegmentLoaderObservable<ArrayBuffer> {
  // Items emitted after processing fetch events
  interface IScannedChunk {
    event: IDataChunk | IDataComplete | null; // Event received from fetch
    completeChunks: Uint8Array[]; // Complete chunks received on the event
    partialChunk: Uint8Array | null; // Remaining incomplete chunk received on the event
  }

  const { segment } = args;
  const headers = segment.range != null ? { Range: byteRange(segment.range) } :
                                          undefined;

  return fetchRequest({ url, headers })
    .pipe(
      scan<IDataChunk | IDataComplete, IScannedChunk>((acc, evt) => {
        if (evt.type === "data-complete") {
          if (acc.partialChunk != null) {
            log.warn("DASH Pipelines: remaining chunk does not belong to any segment");
          }
          return { event: evt, completeChunks: [], partialChunk: null };
        }

        const data = new Uint8Array(evt.value.chunk);
        const concatenated = acc.partialChunk != null ? concat(acc.partialChunk,
                                                               data) :
                                                        data;
        const [ completeChunks,
                partialChunk ] = extractCompleteChunks(concatenated);
        return { event: evt, completeChunks, partialChunk };
      }, { event: null, completeChunks: [], partialChunk: null }),

      mergeMap((evt : IScannedChunk) => {
        const emitted : ILoaderChunkedDataEvent[] = [];
        for (let i = 0; i < evt.completeChunks.length; i++) {
          emitted.push({ type: "data-chunk",
                         value: { responseData: evt.completeChunks[i] } });
        }
        const { event } = evt;
        if (event != null && event.type === "data-chunk") {
          const { value } = event;
          emitted.push({ type: "progress",
                         value: { duration: value.duration,
                                  size: value.size,
                                  totalSize: value.totalSize } });
        } else if (event != null && event.type === "data-complete") {
          const { value } = event;
          emitted.push({ type: "data-chunk-complete",
                         value: { duration: value.duration,
                                  receivedTime: value.receivedTime,
                                  sendingTime: value.sendingTime,
                                  size: value.size,
                                  status: value.status,
                                  url: value.url } });
        }
        return observableOf(...emitted);
      }));
}
