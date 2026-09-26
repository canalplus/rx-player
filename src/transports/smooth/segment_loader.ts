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
import type { ISegmentLoader as ICustomSegmentLoader } from "../../public_types.ts";
import assert from "../../utils/assert.ts";
import { concat } from "../../utils/byte_parsing.ts";
import request from "../../utils/request/index.ts";
import type {
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller.ts";
import type {
  ISegmentContext,
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
} from "../types.ts";
import addQueryString from "../utils/add_query_string.ts";
import byteRange from "../utils/byte_range.ts";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity.ts";
import mergeRequestHeaders from "../utils/merge_request_headers.ts";
import isMP4EmbeddedTrack from "./is_mp4_embedded_track.ts";
import { createAudioInitSegment, createVideoInitSegment } from "./isobmff/index.ts";

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} initialUrl
 * @param {Object} context
 * @param {Object} loaderOptions
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @param {boolean} checkMediaSegmentIntegrity
 * @returns {Promise}
 */
async function regularSegmentLoader(
  initialUrl: string,
  context: ISegmentContext,
  callbacks: ISegmentLoaderCallbacks<Uint8Array<ArrayBuffer> | ArrayBuffer | null>,
  loaderOptions: ISegmentLoaderOptions & {
    headers?: Record<string, string> | undefined;
  },
  cancelSignal: CancellationSignal,
  checkMediaSegmentIntegrity?: boolean | undefined,
): Promise<
  ISegmentLoaderResultSegmentLoaded<Uint8Array<ArrayBuffer> | ArrayBuffer | null>
> {
  const cmcdHeaders =
    loaderOptions.cmcdPayload?.type === "headers"
      ? loaderOptions.cmcdPayload.value
      : undefined;
  const range = context.segment.range;

  let generatedHeaders;
  if (Array.isArray(range)) {
    generatedHeaders = {
      ...cmcdHeaders,
      Range: byteRange(range),
    };
  } else if (cmcdHeaders !== undefined) {
    generatedHeaders = cmcdHeaders;
  }
  const headers = mergeRequestHeaders(generatedHeaders, loaderOptions.headers);

  const url =
    loaderOptions.cmcdPayload?.type === "query"
      ? addQueryString(initialUrl, loaderOptions.cmcdPayload.value)
      : initialUrl;

  const data = await request({
    url,
    responseType: "arraybuffer",
    headers,
    timeout: loaderOptions.timeout,
    connectionTimeout: loaderOptions.connectionTimeout,
    cancelSignal,
    onProgress: callbacks.onProgress,
  });
  const isMP4 = isMP4EmbeddedTrack(context.mimeType);
  if (!isMP4 || checkMediaSegmentIntegrity !== true) {
    return { resultType: "segment-loaded" as const, resultData: data };
  }
  const dataU8 = new Uint8Array(data.responseData);
  checkISOBMFFIntegrity(dataU8, context.segment.isInit);
  return {
    resultType: "segment-loaded" as const,
    resultData: { ...data, responseData: dataU8 },
  };
}

/**
 * Defines the url for the request, load the right loader (custom/default
 * one).
 */
const generateSegmentLoader =
  ({
    checkMediaSegmentIntegrity,
    segmentLoader,
  }: {
    checkMediaSegmentIntegrity?: boolean | undefined;
    segmentLoader?: ICustomSegmentLoader | undefined;
  }) =>
  (
    url: string | null,
    context: ISegmentContext,
    loaderOptions: ISegmentLoaderOptions,
    cancelSignal: CancellationSignal,
    callbacks: ISegmentLoaderCallbacks<Uint8Array<ArrayBuffer> | ArrayBuffer | null>,
  ): Promise<
    | ISegmentLoaderResultSegmentLoaded<Uint8Array<ArrayBuffer> | ArrayBuffer | null>
    | ISegmentLoaderResultSegmentCreated<Uint8Array<ArrayBuffer> | ArrayBuffer | null>
  > => {
    const { segment } = context;
    if (segment.isInit) {
      if (
        segment.privateInfos === undefined ||
        segment.privateInfos.smoothInitSegment === undefined
      ) {
        throw new Error("Smooth: Invalid segment format");
      }
      const smoothInitPrivateInfos = segment.privateInfos.smoothInitSegment;
      let responseData: Uint8Array<ArrayBuffer>;
      const {
        codecPrivateData,
        timescale,
        height,
        width,
        protection = { keyId: undefined, keySystems: undefined },
      } = smoothInitPrivateInfos;

      if (codecPrivateData === undefined) {
        throw new Error("Smooth: no codec private data.");
      }
      switch (context.type) {
        case "video": {
          responseData = createVideoInitSegment(
            timescale,
            width ?? 0,
            height ?? 0,
            72,
            72,
            4, // vRes, hRes, nal
            codecPrivateData,
            protection.keyId,
          );
          break;
        }
        case "audio": {
          const {
            channels = 0,
            bitsPerSample = 0,
            packetSize = 0,
            samplingRate = 0,
          } = smoothInitPrivateInfos;
          responseData = createAudioInitSegment(
            timescale,
            channels,
            bitsPerSample,
            packetSize,
            samplingRate,
            codecPrivateData,
            protection.keyId,
          );
          break;
        }
        default:
          if (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            (__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)
          ) {
            assert(false, "responseData should have been set");
          }
          responseData = new Uint8Array(0);
      }

      return Promise.resolve({
        resultType: "segment-created" as const,
        resultData: responseData,
      });
    } else if (url === null) {
      return Promise.resolve({
        resultType: "segment-created" as const,
        resultData: null,
      });
    } else {
      if (typeof segmentLoader !== "function") {
        return regularSegmentLoader(
          url,
          context,
          callbacks,
          loaderOptions,
          cancelSignal,
          checkMediaSegmentIntegrity,
        );
      }
      const customLoader = segmentLoader;

      return new Promise((res, rej) => {
        /** `true` when the custom segmentLoader should not be active anymore. */
        let hasFinished = false;
        const receivedDataChunks: Uint8Array[] = [];

        const onData = (newData: ArrayBuffer | Uint8Array): void => {
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          if (newData.byteLength === 0) {
            return;
          }
          const newDataU8 = new Uint8Array(newData);
          receivedDataChunks.push(newDataU8);
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
          if (receivedDataChunks.length === 0 && _args.data === null) {
            reject(new Error("No data received when resolving the segment request."));
            return;
          }
          const hadReceivedData = receivedDataChunks.length > 0;
          if (hadReceivedData && _args.data !== null) {
            onData(_args.data);
          }
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          let responseData: ArrayBuffer | Uint8Array;
          if (hadReceivedData) {
            responseData = concat(...receivedDataChunks);
          } else {
            responseData = _args.data ?? new ArrayBuffer(0);
          }
          let data: ArrayBuffer | Uint8Array<ArrayBuffer>;
          if (responseData instanceof Uint8Array) {
            if (responseData.buffer instanceof ArrayBuffer) {
              data = responseData as Uint8Array<ArrayBuffer>;
            } else {
              data = responseData.slice();
            }
          } else {
            data = responseData;
          }

          const isMP4 = isMP4EmbeddedTrack(context.mimeType);
          if (!isMP4 || checkMediaSegmentIntegrity !== true) {
            res({
              resultType: "segment-loaded" as const,
              resultData: {
                responseData: data,
                size: _args.size,
                requestDuration: _args.duration,
              },
            });
          }

          const dataU8 = data instanceof Uint8Array ? data : new Uint8Array(data);
          checkISOBMFFIntegrity(dataU8, context.segment.isInit);
          res({
            resultType: "segment-loaded" as const,
            resultData: {
              responseData: dataU8,
              size: _args.size,
              requestDuration: _args.duration,
            },
          });
        };

        /**
         * Callback triggered when the custom segment loader fails
         * @param {*} err - The corresponding error encountered
         */
        const reject = (err: unknown) => {
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
            "Unknown error when fetching a Smooth segment through a " +
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

        const fallback = (fallbackOptions?: {
          headers?: Record<string, string> | undefined;
        }) => {
          if (hasFinished || cancelSignal.isCancelled()) {
            return;
          }
          if (receivedDataChunks.length > 0) {
            reject(new Error("Cannot fallback after sending segment data."));
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          regularSegmentLoader(
            url,
            context,
            callbacks,
            { ...loaderOptions, headers: fallbackOptions?.headers },
            cancelSignal,
            checkMediaSegmentIntegrity,
          ).then(res, rej);
        };

        const customCallbacks = {
          reject,
          resolve,
          fallback,
          progress,
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
          timeout: loaderOptions.timeout,
          byteRanges,
          trackType: context.type,
          url,
          cmcdPayload: loaderOptions.cmcdPayload,
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
  };

export default generateSegmentLoader;
