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
import request from "../../utils/request";
import type { CancellationSignal } from "../../utils/task_canceller";
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
import constructSegmentUrl from "./construct_segment_url";
import initSegmentLoader from "./init_segment_loader";
import { addSegmentIntegrityChecks } from "./integrity_checks";

/**
 * Perform requests for "text" segments
 * @returns {Function}
 */
export default function generateTextTrackLoader({
  checkMediaSegmentIntegrity,
}: {
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
      options.cmcdPayload?.type === "query"
        ? addQueryString(initialUrl, options.cmcdPayload.value)
        : initialUrl;

    const cmcdHeaders =
      options.cmcdPayload?.type === "headers" ? options.cmcdPayload.value : undefined;

    let headers;
    if (segment.range !== undefined) {
      headers = {
        ...cmcdHeaders,
        Range: byteRange(segment.range),
      };
    } else if (cmcdHeaders !== undefined) {
      headers = cmcdHeaders;
    }

    const containerType = inferSegmentContainer(context.type, context.mimeType);
    const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;

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
