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
import request, {
  fetchIsSupported,
} from "../../utils/request";
import warnOnce from "../../utils/warn_once";
import {
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
} from "../types";
import byteRange from "../utils/byte_range";
import initSegmentLoader from "./init_segment_loader";
import isMP4EmbeddedTextTrack from "./is_mp4_embedded_text_track";
import lowLatencySegmentLoader from "./low_latency_segment_loader";

/**
 * Perform requests for "text" segments
 * @param {boolean} lowLatencyMode
 * @returns {Function}
 */
export default function generateTextTrackLoader(
  lowLatencyMode : boolean
) : (x : ISegmentLoaderArguments) => ISegmentLoaderObservable< ArrayBuffer |
                                                               string |
                                                               null > {
  /**
   * @param {Object} args
   * @returns {Observable}
   */
  return (
    args : ISegmentLoaderArguments
  ) : ISegmentLoaderObservable< ArrayBuffer | string | null > => {
    const { mediaURL,
            range } = args.segment;

    if (mediaURL == null) {
      return observableOf({ type: "data-created",
                            value: { responseData: null } });
    }

    if (args.segment.isInit) {
      return initSegmentLoader(mediaURL, args);
    }

    const isMP4Embedded = isMP4EmbeddedTextTrack(args.representation);
    if (lowLatencyMode && isMP4Embedded) {
      if (fetchIsSupported()) {
        return lowLatencySegmentLoader(mediaURL, args);
      } else {
        warnOnce("DASH: Your browser does not have the fetch API. You will have " +
                 "a higher chance of rebuffering when playing close to the live edge");
      }
    }

    // ArrayBuffer when in mp4 to parse isobmff manually, text otherwise
    const responseType = isMP4Embedded ?  "arraybuffer" :
                                          "text";
    return request<ArrayBuffer|string>({ url: mediaURL,
                                         responseType,
                                         headers: range ? { Range: byteRange(range) } :
                                                          null,
                                         sendProgressEvents: true });
  };
}
