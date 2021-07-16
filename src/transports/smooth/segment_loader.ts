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

import { CustomLoaderError } from "../../errors";
import { ISegmentLoader as ICustomSegmentLoader } from "../../public_types";
import assert from "../../utils/assert";
import request from "../../utils/request";
import {
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller";
import {
  ISegmentContext,
  ISegmentLoaderCallbacks,
  ISegmentLoaderOptions,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
} from "../types";
import byteRange from "../utils/byte_range";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import isMP4EmbeddedTrack from "./is_mp4_embedded_track";
import {
  createAudioInitSegment,
  createVideoInitSegment,
} from "./isobmff";

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @param {Object} content
 * @param {Object} loaderOptions
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @param {boolean} checkMediaSegmentIntegrity
 * @returns {Promise}
 */
function regularSegmentLoader(
  url : string,
  content : ISegmentContext,
  callbacks : ISegmentLoaderCallbacks<Uint8Array | ArrayBuffer | null>,
  loaderOptions : ISegmentLoaderOptions,
  cancelSignal : CancellationSignal,
  checkMediaSegmentIntegrity? : boolean | undefined
) : Promise<ISegmentLoaderResultSegmentLoaded<Uint8Array | ArrayBuffer | null>> {
  let headers;
  const range = content.segment.range;
  if (Array.isArray(range)) {
    headers = { Range: byteRange(range) };
  }

  return request({ url,
                   responseType: "arraybuffer",
                   headers,
                   timeout: loaderOptions.timeout,
                   cancelSignal,
                   onProgress: callbacks.onProgress })
    .then((data) => {
      const isMP4 = isMP4EmbeddedTrack(content.representation);
      if (!isMP4 || checkMediaSegmentIntegrity !== true) {
        return { resultType: "segment-loaded" as const,
                 resultData: data };
      }
      const dataU8 = new Uint8Array(data.responseData);
      checkISOBMFFIntegrity(dataU8, content.segment.isInit);
      return { resultType: "segment-loaded" as const,
               resultData: { ...data, responseData: dataU8 } };
    });
}

/**
 * Defines the url for the request, load the right loader (custom/default
 * one).
 */
const generateSegmentLoader = ({
  checkMediaSegmentIntegrity,
  customSegmentLoader,
} : {
  checkMediaSegmentIntegrity? : boolean | undefined;
  customSegmentLoader? : ICustomSegmentLoader | undefined;
}) => (
  url : string | null,
  content : ISegmentContext,
  loaderOptions : ISegmentLoaderOptions,
  cancelSignal : CancellationSignal,
  callbacks : ISegmentLoaderCallbacks<Uint8Array | ArrayBuffer | null>
) : Promise<ISegmentLoaderResultSegmentLoaded<Uint8Array | ArrayBuffer | null> |
            ISegmentLoaderResultSegmentCreated<Uint8Array | ArrayBuffer | null>> => {
  const { segment, manifest, period, adaptation, representation } = content;
  if (segment.isInit) {
    if (segment.privateInfos === undefined ||
        segment.privateInfos.smoothInitSegment === undefined)
    {
      throw new Error("Smooth: Invalid segment format");
    }
    const smoothInitPrivateInfos = segment.privateInfos.smoothInitSegment;
    let responseData : Uint8Array;
    const { codecPrivateData,
            timescale,
            protection = { keyId: undefined,
                           keySystems: undefined } } = smoothInitPrivateInfos;

    if (codecPrivateData === undefined) {
      throw new Error("Smooth: no codec private data.");
    }
    switch (adaptation.type) {
      case "video": {
        const { width = 0, height = 0 } = representation;
        responseData = createVideoInitSegment(timescale,
                                              width,
                                              height,
                                              72, 72, 4, // vRes, hRes, nal
                                              codecPrivateData,
                                              protection.keyId);
        break;
      }
      case "audio": {
        const { channels = 0,
                bitsPerSample = 0,
                packetSize = 0,
                samplingRate = 0 } = smoothInitPrivateInfos;
        responseData = createAudioInitSegment(timescale,
                                              channels,
                                              bitsPerSample,
                                              packetSize,
                                              samplingRate,
                                              codecPrivateData,
                                              protection.keyId);
        break;
      }
      default:
        if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
          assert(false, "responseData should have been set");
        }
        responseData = new Uint8Array(0);
    }

    return Promise.resolve({ resultType: "segment-created" as const,
                             resultData: responseData });
  } else if (url === null) {
    return Promise.resolve({ resultType: "segment-created" as const,
                             resultData: null });
  } else {
    const args = { adaptation,
                   manifest,
                   period,
                   representation,
                   segment,
                   transport: "smooth",
                   timeout: loaderOptions.timeout,
                   url };

    if (typeof customSegmentLoader !== "function") {
      return regularSegmentLoader(url,
                                  content,
                                  callbacks,
                                  loaderOptions,
                                  cancelSignal,
                                  checkMediaSegmentIntegrity);
    }

    return new Promise((res, rej) => {
      /** `true` when the custom segmentLoader should not be active anymore. */
      let hasFinished = false;


      /**
       * Callback triggered when the custom segment loader has a response.
       * @param {Object} args
       */
      const resolve = (_args : {
        data : ArrayBuffer|Uint8Array;
        size? : number | undefined;
        duration? : number | undefined;
      }) => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);

        const isMP4 = isMP4EmbeddedTrack(content.representation);
        if (!isMP4 || checkMediaSegmentIntegrity !== true) {
          res({ resultType: "segment-loaded" as const,
                resultData: { responseData: _args.data,
                              size: _args.size,
                              requestDuration: _args.duration } });
        }

        const dataU8 = _args.data instanceof Uint8Array ? _args.data :
                                                          new Uint8Array(_args.data);
        checkISOBMFFIntegrity(dataU8, content.segment.isInit);
        res({ resultType: "segment-loaded" as const,
              resultData: { responseData: dataU8,
                            size: _args.size,
                            requestDuration: _args.duration } });
      };

      /**
       * Callback triggered when the custom segment loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err : unknown) => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);

        // Format error and send it
        const castedErr = err as (null | undefined | { message? : string;
                                                       canRetry? : boolean;
                                                       isOfflineError? : boolean;
                                                       xhr? : XMLHttpRequest; });
        const message = castedErr?.message ??
                        "Unknown error when fetching a Smooth segment through a " +
                        "custom segmentLoader.";
        const emittedErr = new CustomLoaderError(message,
                                                 castedErr?.canRetry ?? false,
                                                 castedErr?.isOfflineError ?? false,
                                                 castedErr?.xhr);
        rej(emittedErr);
      };

      const progress = (
        _args : { duration : number;
                  size : number;
                  totalSize? : number | undefined; }
      ) => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        callbacks.onProgress({ duration: _args.duration,
                               size: _args.size,
                               totalSize: _args.totalSize });
      };

      const fallback = () => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);
        regularSegmentLoader(url,
                             content,
                             callbacks,
                             loaderOptions,
                             cancelSignal,
                             checkMediaSegmentIntegrity)
          .then(res, rej);
      };

      const customCallbacks = { reject, resolve, fallback, progress };
      const abort = customSegmentLoader(args, customCallbacks);

      cancelSignal.register(abortCustomLoader);

      /**
       * The logic to run when the custom loader is cancelled while pending.
       * @param {Error} err
       */
      function abortCustomLoader(err : CancellationError) {
        if (hasFinished) {
          return;
        }
        hasFinished = true;
        if (!hasFinished && typeof abort === "function") {
          abort();
        }
        rej(err);
      }
    });
  }
};

export default generateSegmentLoader;
