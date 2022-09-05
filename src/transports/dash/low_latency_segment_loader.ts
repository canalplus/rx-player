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

import { concat } from "../../utils/byte_parsing";
import fetchRequest, {
  IFetchedDataObject,
} from "../../utils/request/fetch";
import { CancellationSignal } from "../../utils/task_canceller";
import {
  ISegmentContext,
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultChunkedComplete,
} from "../types";
import byteRange from "../utils/byte_range";
import extractCompleteChunks from "./extract_complete_chunks";

/**
 * Load segments through a "chunk" mode (decodable chunk by decodable chunk).
 *
 * This method is particularly adapted to low-latency streams.
 *
 * @param {string} url - URL of the segment to download.
 * @param {Object} content - Context of the segment needed.
 * @param {Object} options
 * @param {Object} callbacks
 * @param {CancellationSignal} cancelSignal
 * @returns {Promise}
 */
export default function lowLatencySegmentLoader(
  url : string,
  content : ISegmentContext,
  options : ISegmentLoaderOptions,
  callbacks : ISegmentLoaderCallbacks<Uint8Array>,
  cancelSignal : CancellationSignal
) : Promise<ISegmentLoaderResultChunkedComplete> {
  const { segment } = content;
  const headers = segment.range !== undefined ? { Range: byteRange(segment.range) } :
                                                undefined;
  let partialChunk : Uint8Array | null = null;

  /**
   * Called each time `fetch` has new data available.
   * @param {Object} info
   */
  function onData(info : IFetchedDataObject) : void {
    const chunk = new Uint8Array(info.chunk);
    const concatenated = partialChunk !== null ? concat(partialChunk, chunk) :
                                                 chunk;
    const res = extractCompleteChunks(concatenated);
    const completeChunks = res[0];
    partialChunk = res[1];
    for (let i = 0; i < completeChunks.length; i++) {
      callbacks.onNewChunk(completeChunks[i]);
      if (cancelSignal.isCancelled) {
        return;
      }
    }
    callbacks.onProgress({ duration: info.duration,
                           size: info.size,
                           totalSize: info.totalSize });
    if (cancelSignal.isCancelled) {
      return;
    }
  }

  return fetchRequest({ url,
                        headers,
                        onData,
                        timeout: options.timeout,
                        cancelSignal })
    .then((res) => ({ resultType: "chunk-complete" as const,
                      resultData: res }));
}
