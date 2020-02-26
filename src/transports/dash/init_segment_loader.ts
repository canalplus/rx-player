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

import { combineLatest as observableCombineLatest } from "rxjs";
import { map } from "rxjs/operators";
import { concat } from "../../utils/byte_parsing";
import xhr from "../../utils/request";
import {
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
} from "../types";
import byteRange from "../utils/byte_range";

/**
 * Perform a request for an initialization segment, agnostic to the container.
 * @param {string} url
 * @param {Object} content
 */
export default function initSegmentLoader(
  url : string,
  { segment } : ISegmentLoaderArguments
) : ISegmentLoaderObservable<ArrayBuffer> {
  if (segment.range === undefined) {
    return xhr({ url, responseType: "arraybuffer", sendProgressEvents: true });
  }

  if (segment.indexRange === undefined) {
    return xhr({ url,
                 headers: { Range: byteRange(segment.range) },
                 responseType: "arraybuffer",
                 sendProgressEvents: true });
  }

  // range and indexRange are contiguous (99% of the cases)
  if (segment.range[1] + 1 === segment.indexRange[0]) {
    return xhr({ url,
                 headers: { Range: byteRange([segment.range[0],
                                              segment.indexRange[1] ]) },
                 responseType: "arraybuffer",
                 sendProgressEvents: true });
  }

  const rangeRequest$ = xhr({ url,
                              headers: { Range: byteRange(segment.range) },
                              responseType: "arraybuffer",
                              sendProgressEvents: false });
  const indexRequest$ = xhr({ url,
                              headers: { Range: byteRange(segment.indexRange) },
                              responseType: "arraybuffer",
                              sendProgressEvents: false });
  return observableCombineLatest([rangeRequest$, indexRequest$])
    .pipe(map(([initData, indexData]) => {
      const data = concat(new Uint8Array(initData.value.responseData),
                          new Uint8Array(indexData.value.responseData));

      const sendingTime = Math.min(initData.value.sendingTime,
                                   indexData.value.sendingTime);
      const receivedTime = Math.max(initData.value.receivedTime,
                                    indexData.value.receivedTime);
      return { type: "data-loaded",
               value: { url,
                        responseData: data,
                        size: initData.value.size + indexData.value.size,
                        duration: receivedTime - sendingTime,
                        sendingTime,
                        receivedTime } };
    }));
}
