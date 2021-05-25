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

import { tap } from "rxjs/operators";
import {
  ISegmentLoader,
} from "../types";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import inferSegmentContainer from "../utils/infer_segment_container";

/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, this Observable will throw an error
 * with an `INTEGRITY_ERROR` code.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
export default function addSegmentIntegrityChecks(
  segmentLoader : ISegmentLoader<ArrayBuffer | Uint8Array | null>
) : ISegmentLoader<ArrayBuffer | Uint8Array | null>;
export default function addSegmentIntegrityChecks(
  segmentLoader : ISegmentLoader<ArrayBuffer | Uint8Array | string | null>
) : ISegmentLoader< ArrayBuffer | Uint8Array | string | null>;
export default function addSegmentIntegrityChecks(
  segmentLoader : ISegmentLoader< ArrayBuffer | Uint8Array | string | null >
) : ISegmentLoader< ArrayBuffer | Uint8Array | string | null >
{
  return (content) => segmentLoader(content).pipe(tap((res) => {
    if ((res.type === "data-loaded" || res.type === "data-chunk") &&
        res.value.responseData !== null &&
        typeof res.value.responseData !== "string" &&
        inferSegmentContainer(content.adaptation.type,
                              content.representation) === "mp4")
    {
      checkISOBMFFIntegrity(new Uint8Array(res.value.responseData),
                            content.segment.isInit);
    }
  }));
}
