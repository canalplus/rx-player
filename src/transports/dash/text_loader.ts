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

import type { ICdnMetadata } from "../../parsers/manifest";
import request, { fetchIsSupported } from "../../utils/request";
import type { CancellationSignal } from "../../utils/task_canceller";
import warnOnce from "../../utils/warn_once";
import type {
  ILoadedTextSegmentFormat,
  ISegmentContext,
  ISegmentLoader,
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultChunkedComplete,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
} from "../types";
import addQueryString from "../utils/add_query_string";
import byteRange from "../utils/byte_range";
import inferSegmentContainer from "../utils/infer_segment_container";
import addSegmentIntegrityChecks from "./add_segment_integrity_checks_to_loader";
import constructSegmentUrl from "./construct_segment_url";
import initSegmentLoader from "./init_segment_loader";
import loadChunkedSegmentData from "./load_chunked_segment_data";

/**
 * Perform requests for "text" segments
 * @param {boolean} lowLatencyMode
 * @returns {Function}
 */
export default function generateTextTrackLoader({
  lowLatencyMode,
  checkMediaSegmentIntegrity,
}: {
  lowLatencyMode: boolean;
  checkMediaSegmentIntegrity?: boolean | undefined;
}): ISegmentLoader<Uint8Array | ArrayBuffer | string | null> {
  return checkMediaSegmentIntegrity !== true
    ? textTrackLoader
    : addSegmentIntegrityChecks(textTrackLoader);

  /**
   * @param {Object|null} wantedCdn
   * @param {Object} context
   * @param {Object} options
   * @param {Object} cancelSignal
   * @param {Object} callbacks
   * @returns {Promise}
   */
  async function textTrackLoader(
    wantedCdn: ICdnMetadata | null,
    context: ISegmentContext,
    options: ISegmentLoaderOptions,
    cancelSignal: CancellationSignal,
    callbacks: ISegmentLoaderCallbacks<ILoadedTextSegmentFormat>,
  ): Promise<
    | ISegmentLoaderResultSegmentLoaded<ILoadedTextSegmentFormat>
    | ISegmentLoaderResultSegmentCreated<ILoadedTextSegmentFormat>
    | ISegmentLoaderResultChunkedComplete
  > {
    const { segment } = context;

    const initialUrl = constructSegmentUrl(wantedCdn, segment);
    if (initialUrl === null) {
      return Promise.resolve({
        resultType: "segment-created",
        resultData: null,
      });
    }

    if (segment.isInit) {
      return initSegmentLoader(initialUrl, segment, options, cancelSignal, callbacks);
    }

    const url =
      options.queryString === undefined
        ? initialUrl
        : addQueryString(initialUrl, options.queryString);

    let headers;
    if (segment.range !== undefined) {
      headers = {
        ...options.headers,
        Range: byteRange(segment.range),
      };
    } else if (options.headers !== undefined) {
      headers = options.headers;
    }

    const containerType = inferSegmentContainer(context.type, context.mimeType);
    const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
    if (lowLatencyMode && seemsToBeMP4) {
      if (fetchIsSupported()) {
        return loadChunkedSegmentData(
          url,
          {
            headers,
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
          },
          callbacks,
          cancelSignal,
        );
      } else {
        warnOnce(
          "DASH: Your browser does not have the fetch API. You will have " +
            "a higher chance of rebuffering when playing close to the live edge",
        );
      }
    }

    let data;
    if (seemsToBeMP4) {
      data = await request({
        url,
        responseType: "arraybuffer",
        headers,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        onProgress: callbacks.onProgress,
        cancelSignal,
      });
    } else {
      data = await request({
        url,
        responseType: "text",
        headers,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        onProgress: callbacks.onProgress,
        cancelSignal,
      });
    }
    return { resultType: "segment-loaded", resultData: data };
  }
}
