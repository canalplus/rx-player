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
  Observable,
  of as observableOf,
} from "rxjs";
import request, {
  fetchIsSupported,
} from "../../utils/request";
import warnOnce from "../../utils/warn_once";
import {
  ISegmentLoaderArguments,
  ISegmentLoaderEvent,
} from "../types";
import byteRange from "../utils/byte_range";
import inferSegmentContainer from "../utils/infer_segment_container";
import addSegmentIntegrityChecks from "./add_segment_integrity_checks_to_loader";
import initSegmentLoader from "./init_segment_loader";
import lowLatencySegmentLoader from "./low_latency_segment_loader";

/**
 * Perform requests for "text" segments
 * @param {boolean} lowLatencyMode
 * @returns {Function}
 */
export default function generateTextTrackLoader(
  { lowLatencyMode,
    checkMediaSegmentIntegrity } : { lowLatencyMode : boolean;
                                     checkMediaSegmentIntegrity? : boolean; }
) : (x : ISegmentLoaderArguments) => Observable< ISegmentLoaderEvent< ArrayBuffer |
                                                                      Uint8Array |
                                                                      string |
                                                                      null > > {
  return checkMediaSegmentIntegrity !== true ? textTrackLoader :
                                               addSegmentIntegrityChecks(textTrackLoader);

  /**
   * @param {Object} args
   * @returns {Observable}
   */
  function textTrackLoader(
    args : ISegmentLoaderArguments
  ) : Observable< ISegmentLoaderEvent< ArrayBuffer | Uint8Array | string | null > > {
    const { range } = args.segment;
    const { url } = args;

    if (url === null) {
      return observableOf({ type: "data-created",
                            value: { responseData: null } });
    }

    if (args.segment.isInit) {
      return initSegmentLoader(url, args);
    }

    const containerType = inferSegmentContainer(args.adaptation.type,
                                                args.representation);
    const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
    if (lowLatencyMode && seemsToBeMP4) {
      if (fetchIsSupported()) {
        return lowLatencySegmentLoader(url, args);
      } else {
        warnOnce("DASH: Your browser does not have the fetch API. You will have " +
                 "a higher chance of rebuffering when playing close to the live edge");
      }
    }

    // ArrayBuffer when in mp4 to parse isobmff manually, text otherwise
    const responseType = seemsToBeMP4 ?  "arraybuffer" :
                                          "text";
    return request<ArrayBuffer|string>({ url,
                                         responseType,
                                         headers: Array.isArray(range) ?
                                           { Range: byteRange(range) } :
                                           null,
                                         sendProgressEvents: true });
  }
}
