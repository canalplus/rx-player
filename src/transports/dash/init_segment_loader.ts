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

import { ISegment } from "../../manifest";
import { concat } from "../../utils/byte_parsing";
import request from "../../utils/request";
import { CancellationSignal } from "../../utils/task_canceller";
import {
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultChunkedComplete,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
} from "../types";
import byteRange from "../utils/byte_range";

/**
 * Perform a request for an initialization segment, agnostic to the container.
 * @param {string} url
 * @param {Object} segment
 * @param {Object} options
 * @param {CancellationSignal} cancelSignal
 * @param {Object} callbacks
 * @returns {Promise}
 */
export default function initSegmentLoader(
  url : string,
  segment : ISegment,
  options : ISegmentLoaderOptions,
  cancelSignal : CancellationSignal,
  callbacks : ISegmentLoaderCallbacks<ArrayBuffer | Uint8Array>
) : Promise<ISegmentLoaderResultSegmentLoaded<ArrayBuffer | Uint8Array> |
            ISegmentLoaderResultSegmentCreated<ArrayBuffer | Uint8Array> |
            ISegmentLoaderResultChunkedComplete>
{
  if (segment.range === undefined) {
    return request({ url,
                     responseType: "arraybuffer",
                     timeout: options.timeout,
                     cancelSignal,
                     onProgress: callbacks.onProgress })
      .then(data => ({ resultType: "segment-loaded",
                       resultData: data }));
  }

  if (segment.indexRange === undefined) {
    return request({ url,
                     headers: { Range: byteRange(segment.range) },
                     responseType: "arraybuffer",
                     timeout: options.timeout,
                     cancelSignal,
                     onProgress: callbacks.onProgress })
      .then(data => ({ resultType: "segment-loaded",
                       resultData: data }));
  }

  // range and indexRange are contiguous (99% of the cases)
  if (segment.range[1] + 1 === segment.indexRange[0]) {
    return request({ url,
                     headers: { Range: byteRange([segment.range[0],
                                                  segment.indexRange[1] ]) },
                     responseType: "arraybuffer",
                     timeout: options.timeout,
                     cancelSignal,
                     onProgress: callbacks.onProgress })
      .then(data => ({ resultType: "segment-loaded",
                       resultData: data }));
  }

  const rangeRequest$ = request({ url,
                                  headers: { Range: byteRange(segment.range) },
                                  responseType: "arraybuffer",
                                  timeout: options.timeout,
                                  cancelSignal,
                                  onProgress: callbacks.onProgress });
  const indexRequest$ = request({ url,
                                  headers: { Range: byteRange(segment.indexRange) },
                                  responseType: "arraybuffer",
                                  timeout: options.timeout,
                                  cancelSignal,
                                  onProgress: callbacks.onProgress });

  return Promise.all([rangeRequest$, indexRequest$])
    .then(([ initData, indexData ]) => {
      const data = concat(new Uint8Array(initData.responseData),
                          new Uint8Array(indexData.responseData));

      const sendingTime = Math.min(initData.sendingTime,
                                   indexData.sendingTime);
      const receivedTime = Math.max(initData.receivedTime,
                                    indexData.receivedTime);
      return { resultType: "segment-loaded" as const,
               resultData: { url,
                             responseData: data,
                             size: initData.size + indexData.size,
                             requestDuration: receivedTime - sendingTime,
                             sendingTime,
                             receivedTime } };

    });
}
