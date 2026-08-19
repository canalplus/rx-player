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

import { CustomLoaderError } from "../../errors/index.ts";
import log from "../../log.ts";
import { extractCompleteChunks } from "../../parsers/containers/isobmff/index.ts";
import type { ICdnMetadata } from "../../parsers/manifest/index.ts";
import type { ISegmentLoader as ICustomSegmentLoader } from "../../public_types.ts";
import { concat } from "../../utils/byte_parsing.ts";
import request, { fetchIsSupported } from "../../utils/request/index.ts";
import type {
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller.ts";
import warnOnce from "../../utils/warn_once.ts";
import type {
  ILoadedAudioVideoSegmentFormat,
  ISegmentContext,
  ISegmentLoader,
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultChunkedComplete,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
} from "../types.ts";
import addQueryString from "../utils/add_query_string.ts";
import byteRange from "../utils/byte_range.ts";
import inferSegmentContainer from "../utils/infer_segment_container.ts";
import mergeRequestHeaders from "../utils/merge_request_headers.ts";
import constructSegmentUrl from "./construct_segment_url.ts";
import initSegmentLoader from "./init_segment_loader.ts";
import { addSegmentIntegrityChecks } from "./integrity_checks.ts";
import loadChunkedSegmentData from "./load_chunked_segment_data.ts";

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} initialUrl
 * @param {Object} context
 * @param {boolean} lowLatencyMode
 * @param {Object} options
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export async function regularSegmentLoader(
  initialUrl: string,
  context: ISegmentContext,
  lowLatencyMode: boolean,
  options: ISegmentLoaderOptions & {
    headers?: Record<string, string> | undefined;
  },
  callbacks: ISegmentLoaderCallbacks<ILoadedAudioVideoSegmentFormat>,
  cancelSignal: CancellationSignal,
): Promise<
  | ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat>
  | ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat>
  | ISegmentLoaderResultChunkedComplete
> {
  if (context.segment.isInit) {
    return initSegmentLoader(
      initialUrl,
      context.segment,
      options,
      cancelSignal,
      callbacks,
    );
  }

  const url =
    options.cmcdPayload?.type === "query"
      ? addQueryString(initialUrl, options.cmcdPayload.value)
      : initialUrl;

  const cmcdHeaders =
    options.cmcdPayload?.type === "headers" ? options.cmcdPayload.value : undefined;

  const { segment } = context;
  let generatedHeaders;
  if (segment.range !== undefined) {
    generatedHeaders = {
      ...cmcdHeaders,
      Range: byteRange(segment.range),
    };
  } else if (cmcdHeaders !== undefined) {
    generatedHeaders = cmcdHeaders;
  }
  const headers = mergeRequestHeaders(generatedHeaders, options.headers);

  const containerType = inferSegmentContainer(context.type, context.mimeType);
  if (lowLatencyMode && (containerType === "mp4" || containerType === undefined)) {
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

  const data = await request({
    url,
    responseType: "arraybuffer",
    headers,
    timeout: options.timeout,
    connectionTimeout: options.connectionTimeout,
    cancelSignal,
    onProgress: callbacks.onProgress,
  });
  return { resultType: "segment-loaded", resultData: data };
}

/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateSegmentLoader({
  lowLatencyMode,
  segmentLoader: customSegmentLoader,
  checkMediaSegmentIntegrity,
}: {
  lowLatencyMode: boolean;
  segmentLoader?: ICustomSegmentLoader | undefined;
  checkMediaSegmentIntegrity?: boolean | undefined;
}): ISegmentLoader<Uint8Array<ArrayBuffer> | ArrayBuffer | null> {
  return checkMediaSegmentIntegrity !== true
    ? segmentLoader
    : addSegmentIntegrityChecks(segmentLoader);

  /**
   * @param {Object|null} wantedCdn
   * @param {Object} context
   * @param {Object} options
   * @param {Object} cancelSignal
   * @param {Object} callbacks
   * @returns {Promise.<Object>}
   */
  function segmentLoader(
    wantedCdn: ICdnMetadata | null,
    context: ISegmentContext,
    options: ISegmentLoaderOptions,
    cancelSignal: CancellationSignal,
    callbacks: ISegmentLoaderCallbacks<Uint8Array<ArrayBuffer> | ArrayBuffer | null>,
  ): Promise<
    | ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat>
    | ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat>
    | ISegmentLoaderResultChunkedComplete
  > {
    const url = constructSegmentUrl(wantedCdn, context.segment);
    if (url === null) {
      return Promise.resolve({
        resultType: "segment-created",
        resultData: null,
      });
    }

    if (customSegmentLoader === undefined) {
      return regularSegmentLoader(
        url,
        context,
        lowLatencyMode,
        options,
        callbacks,
        cancelSignal,
      );
    }
    const customLoader = customSegmentLoader;

    return new Promise((res, rej) => {
      /** `true` when the custom segmentLoader should not be active anymore. */
      let hasFinished = false;
      let hasReceivedData = false;
      let hasEmittedChunk = false;
      let remainingProgressiveData: Uint8Array | null = null;
      const nonProgressiveData: Uint8Array[] = [];
      const containerType = inferSegmentContainer(context.type, context.mimeType);
      const canLoadProgressively =
        !context.segment.isInit &&
        (containerType === "mp4" || containerType === undefined);

      const onData = (newData: ArrayBuffer | Uint8Array): void => {
        if (hasFinished || cancelSignal.isCancelled()) {
          return;
        }
        if (newData.byteLength === 0) {
          return;
        }
        hasReceivedData = true;
        const newDataU8 = new Uint8Array(newData);
        if (!canLoadProgressively) {
          nonProgressiveData.push(newDataU8);
          return;
        }
        const concatenated =
          remainingProgressiveData === null
            ? newDataU8
            : concat(remainingProgressiveData, newDataU8);
        const [completeChunks, remainingData] = extractCompleteChunks(concatenated);
        remainingProgressiveData = remainingData;
        completeChunks?.forEach((completeChunk) => {
          hasEmittedChunk = true;
          callbacks.onNewChunk(completeChunk);
        });
      };

      /**
       * Callback triggered when the custom segment loader has a response.
       * @param {Object} _args
       */
      const resolve = (_args: {
        data: ArrayBuffer | Uint8Array | null;
        size?: number | undefined;
        duration?: number | undefined;
      }) => {
        if (hasFinished || cancelSignal.isCancelled()) {
          return;
        }
        if (!hasReceivedData && _args.data === null) {
          reject(new Error("No data received when resolving the segment request."));
          return;
        }
        const hadReceivedData = hasReceivedData;
        if (hadReceivedData && _args.data !== null) {
          onData(_args.data);
        }
        if (hasFinished || cancelSignal.isCancelled()) {
          return;
        }
        if (hasEmittedChunk) {
          if (remainingProgressiveData !== null && remainingProgressiveData.length > 0) {
            log.warn(
              "dash",
              "Ignoring incomplete data at the end of a custom segment request.",
            );
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          res({
            resultType: "chunk-complete",
            resultData: {
              url,
              size: _args.size,
              requestDuration: _args.duration,
            },
          });
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);
        let data: ArrayBuffer | Uint8Array<ArrayBuffer>;
        let responseData: ArrayBuffer | Uint8Array | null;
        if (!hadReceivedData) {
          responseData = _args.data;
        } else if (nonProgressiveData.length > 0) {
          responseData = concat(...nonProgressiveData);
        } else {
          responseData = remainingProgressiveData;
        }
        if (responseData === null) {
          data = new ArrayBuffer(0);
        } else if (responseData instanceof Uint8Array) {
          if (responseData.buffer instanceof ArrayBuffer) {
            // Typescript is not so smart here for now
            data = responseData as Uint8Array<ArrayBuffer>;
          } else {
            data = responseData.slice();
          }
        } else {
          data = responseData;
        }
        res({
          resultType: "segment-loaded",
          resultData: {
            responseData: data,
            size: _args.size,
            requestDuration: _args.duration,
          },
        });
      };

      /**
       * Callback triggered when the custom segment loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err: unknown): void => {
        if (hasFinished || cancelSignal.isCancelled()) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);

        // Format error and send it
        const castedErr = err as
          | null
          | undefined
          | { message?: string; canRetry?: boolean; xhr?: XMLHttpRequest };
        const message =
          castedErr?.message ??
          "Unknown error when fetching a DASH segment through a " +
            "custom segmentLoader.";
        const emittedErr = new CustomLoaderError(
          message,
          castedErr?.canRetry ?? false,
          castedErr?.xhr,
        );
        rej(emittedErr);
      };

      const progress = (_args: {
        duration: number;
        size: number;
        totalSize?: number | undefined;
      }) => {
        if (hasFinished || cancelSignal.isCancelled()) {
          return;
        }
        callbacks.onProgress({
          duration: _args.duration,
          size: _args.size,
          totalSize: _args.totalSize,
        });
      };

      /**
       * Callback triggered when the custom segment loader wants to fallback to
       * the "regular" implementation
       */
      const fallback = (fallbackOptions?: {
        headers?: Record<string, string> | undefined;
      }) => {
        if (hasFinished || cancelSignal.isCancelled()) {
          return;
        }
        if (hasReceivedData) {
          reject(new Error("Cannot fallback after sending segment data."));
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);
        regularSegmentLoader(
          url,
          context,
          lowLatencyMode,
          { ...options, headers: fallbackOptions?.headers },
          callbacks,
          cancelSignal,
        ).then(res, rej);
      };

      const customCallbacks = {
        reject,
        resolve,
        progress,
        fallback,
        data: (args: { data: ArrayBuffer | Uint8Array }) => onData(args.data),
      };

      let byteRanges: Array<[number, number]> | undefined;
      if (context.segment.range !== undefined) {
        byteRanges = [context.segment.range];
        if (context.segment.indexRange !== undefined) {
          byteRanges.push(context.segment.indexRange);
        }
      }
      const args = {
        isInit: context.segment.isInit,
        timeout: options.timeout,
        byteRanges,
        trackType: context.type,
        url,
        cmcdPayload: options.cmcdPayload,
      };
      const abort = callCustomSegmentLoader();
      if (!hasFinished) {
        cancelSignal.register(abortCustomLoader);
      }

      /**
       * Call the custom segment loader and handle synchronous errors.
       * @returns {Function|undefined}
       */
      function callCustomSegmentLoader(): (() => void) | void {
        try {
          return customLoader(args, customCallbacks);
        } catch (err: unknown) {
          if (!hasFinished) {
            reject(err);
          }
        }
      }

      /**
       * The logic to run when the custom loader is cancelled while pending.
       * @param {Error} err
       */
      function abortCustomLoader(err: CancellationError) {
        if (hasFinished) {
          return;
        }
        hasFinished = true;
        if (typeof abort === "function") {
          abort();
        }
        rej(err);
      }
    });
  }
}
