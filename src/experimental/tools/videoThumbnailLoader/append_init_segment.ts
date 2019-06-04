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
import {
  mapTo,
  mergeMap,
} from "rxjs/operators";
import { QueuedSourceBuffer } from "../../../core/source_buffers";
import request from "../../../utils/request";

/**
 * Load and append data from init segment.
 * @param {string} url
 * @param {string} codec
 * @param {Object} videoSourceBuffer
 * @returns {ArrayBuffer}
 */
export default function appendInitSegment(
  url: string,
  codec: string,
  videoSourceBuffer: QueuedSourceBuffer<ArrayBuffer>
): Observable<ArrayBuffer> {
  return request({ url, sendProgressEvents: false, responseType: "arraybuffer" }).pipe(
    mergeMap((e) => {
      const { value: { responseData }} = e;
      return videoSourceBuffer.appendBuffer({
        initSegment : responseData,
        segment: null,
        codec,
        timestampOffset: 0,
      }).pipe(mapTo(responseData));
    })
  );
}
