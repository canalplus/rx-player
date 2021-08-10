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

import PPromise from "pinkie";
import request, {
  fetchIsSupported,
} from "../../utils/request";
import { CancellationSignal } from "../../utils/task_canceller";
import warnOnce from "../../utils/warn_once";
import {
  ILoadedTextSegmentFormat,
  ISegmentContext,
  ISegmentLoader,
  ISegmentLoaderCallbacks,
  ISegmentLoaderResultChunkedComplete,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
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
    checkMediaSegmentIntegrity } : { lowLatencyMode: boolean;
                                     checkMediaSegmentIntegrity? : boolean; }
) : ISegmentLoader<Uint8Array | ArrayBuffer | string | null> {
  return checkMediaSegmentIntegrity !== true ? textTrackLoader :
                                               addSegmentIntegrityChecks(textTrackLoader);

  /**
   * @param {string|null} url
   * @param {Object} content
   * @param {Object} cancelSignal
   * @param {Object} callbacks
   * @returns {Promise}
   */
  function textTrackLoader(
    url : string | null,
    context : ISegmentContext,
    cancelSignal : CancellationSignal,
    callbacks : ISegmentLoaderCallbacks<ILoadedTextSegmentFormat>
  ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedTextSegmentFormat> |
              ISegmentLoaderResultSegmentCreated<ILoadedTextSegmentFormat> |
              ISegmentLoaderResultChunkedComplete>
  {
    const { segment } = context;
    const { range } = segment;

    if (url === null) {
      return PPromise.resolve({ resultType: "segment-created",
                                resultData: null });
    }

    if (segment.isInit) {
      return initSegmentLoader(url, segment, cancelSignal, callbacks);
    }

    const containerType = inferSegmentContainer(context.type, context.mimeType);
    const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
    if (lowLatencyMode && seemsToBeMP4) {
      if (fetchIsSupported()) {
        return lowLatencySegmentLoader(url, context, callbacks, cancelSignal);
      } else {
        warnOnce("DASH: Your browser does not have the fetch API. You will have " +
                 "a higher chance of rebuffering when playing close to the live edge");
      }
    }

    if (seemsToBeMP4) {
      return request({ url,
                       responseType: "arraybuffer",
                       headers: Array.isArray(range) ?
                         { Range: byteRange(range) } :
                         null,
                       onProgress: callbacks.onProgress,
                       cancelSignal })
        .then((data) => ({ resultType: "segment-loaded",
                           resultData: data }));
    }

    return request({ url,
                     responseType: "text",
                     headers: Array.isArray(range) ?
                       { Range: byteRange(range) } :
                       null,
                     onProgress: callbacks.onProgress,
                     cancelSignal })
      .then((data) => ({ resultType: "segment-loaded",
                         resultData: data }));

  }
}
