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
  of as observableOf,
} from "rxjs";
import {
  catchError,
  mergeMap,
} from "rxjs/operators";
import log from "../../log";
import objectAssign from "../../utils/object_assign";
import {
  ITransportAudioVideoSegmentLoader,
  ITransportImageSegmentLoader,
  ITransportTextSegmentLoader,
} from "../types";
import checkISOBMFFIntegrity, {
  getMissingBytes,
} from "../utils/check_isobmff_integrity";
import isWEBMEmbeddedTrack from "../utils/is_webm_embedded_track";

/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, various strategy will be employed:
 * from throwing an integrity error to re-performing the request with updated
 * context.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
export default function addSegmentIntegrityChecks(
  segmentLoader : ITransportAudioVideoSegmentLoader
) : ITransportAudioVideoSegmentLoader;
export default function addSegmentIntegrityChecks(
  segmentLoader : ITransportTextSegmentLoader
) : ITransportTextSegmentLoader;
export default function addSegmentIntegrityChecks(
  segmentLoader : ITransportImageSegmentLoader
) : ITransportImageSegmentLoader;
export default function addSegmentIntegrityChecks(
  segmentLoader : ITransportAudioVideoSegmentLoader |
                  ITransportTextSegmentLoader |
                  ITransportImageSegmentLoader
) : ITransportAudioVideoSegmentLoader |
    ITransportTextSegmentLoader |
    ITransportImageSegmentLoader
{
  return (content) => segmentLoader(content).pipe(mergeMap((res) => {
    if (res.type !== "data" && res.type !== "data-chunk") {
      return observableOf(res);
    }

    if (res.value.responseData === null ||
        typeof res.value.responseData === "string" ||
        isWEBMEmbeddedTrack(content.representation))
    {
      return observableOf(res);
    }

    let responseDataBytes = new Uint8Array(res.value.responseData);

    // Check if we might have done a byte-range request
    if (res.type === "data" &&
        content.segment.range !== undefined &&
        (content.segment.range[1] - content.segment.range[0] + 1)
          === responseDataBytes.length)
    {
      const numberOfMissingBytes = getMissingBytes(responseDataBytes,
                                                   content.segment.isInit);

      if (numberOfMissingBytes !== undefined && numberOfMissingBytes !== 0) {
        if (numberOfMissingBytes < 0) {
          responseDataBytes = responseDataBytes
            .slice(0, responseDataBytes.length + numberOfMissingBytes);
        }

        // there's a positive amount of bytes missing.
        // Redo the request directly with a corrected `segment` object
        const oldRange = content.segment.range;
        const newRange = [oldRange[0], oldRange[1] + numberOfMissingBytes];
        const newSegment = objectAssign({},
                                        content.segment,
                                        { range: newRange });
        const newContent = objectAssign({},
                                        content,
                                        { segment: newSegment });
        return segmentLoader(newContent).pipe(catchError((err) => {
          log.warn("DASH: retried segment request with another byte range failed",
                   err);
          return observableOf(res); // return orginal response
        }));
      }
    }

    checkISOBMFFIntegrity(responseDataBytes, content.segment.isInit);
    return observableOf(res);
  }));
}
