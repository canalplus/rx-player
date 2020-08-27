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

import {
  concat as observableConcat,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  tap,
} from "rxjs/operators";
import { concat } from "../../utils/byte_parsing";
import xhr from "../../utils/request";
import {
  ISegmentLoaderArguments,
  ISegmentLoaderEvent,
} from "../types";
import byteRange from "../utils/byte_range";
import performSegmentRequest from "../utils/segment_request";

/**
 * Perform a request for an initialization segment, agnostic to the container.
 * @param {string} url
 * @param {Object} content
 */
export default function initSegmentLoader(
  url : string,
  { segment } : ISegmentLoaderArguments
) : Observable< ISegmentLoaderEvent< ArrayBuffer >> {
  if (segment.range === undefined) {
    return performSegmentRequest(xhr({ url,
                                       responseType: "arraybuffer",
                                       sendProgressEvents: true }));
  }

  if (segment.indexRange === undefined) {
    return performSegmentRequest(xhr({ url,
                                       headers: { Range: byteRange(segment.range) },
                                       responseType: "arraybuffer",
                                       sendProgressEvents: true }));
  }

  // range and indexRange are contiguous (99% of the cases)
  if (segment.range[1] + 1 === segment.indexRange[0]) {
    return performSegmentRequest(xhr({ url,
                                       headers: {
                                         Range: byteRange([segment.range[0],
                                                           segment.indexRange[1] ]),
                                       },
                                       responseType: "arraybuffer",
                                       sendProgressEvents: true }));
  }

  let initSegment : ArrayBuffer | null = null;
  const rangeRequest$ = performSegmentRequest(
    xhr({ url,
          headers: { Range: byteRange(segment.range) },
          responseType: "arraybuffer" })
      .pipe(filter(evt => {
        if (evt.type !== "data-loaded") {
          return true;
        }
        initSegment = evt.value.responseData;
        return false;
      }))
  );

  let indexSegment : ArrayBuffer | null = null;
  const indexRequest$ = performSegmentRequest(
    xhr({ url,
          headers: { Range: byteRange(segment.indexRange) },
          responseType: "arraybuffer" })
      .pipe(tap(evt => {
        if (evt.type !== "data-loaded") {
          return true;
        }
        indexSegment = evt.value.responseData;
        return false;
      }))
  );

  return observableConcat(
    observableMerge(rangeRequest$, indexRequest$),
    observableDefer(() => {
      if (initSegment === null || indexSegment === null) {
        throw new Error("Should have loaded both the init and index segment");
      }
      const data = concat(new Uint8Array(initSegment),
                          new Uint8Array(indexSegment));
      return observableOf({ type: "data" as const,
                            value: { responseData: data } });
    }));
}
