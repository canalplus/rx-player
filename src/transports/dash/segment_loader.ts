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
import { CustomLoaderError } from "../../errors";
import request, {
  fetchIsSupported,
} from "../../utils/request";
import {
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller";
import warnOnce from "../../utils/warn_once";
import {
  ICustomSegmentLoader,
  ILoadedAudioVideoSegmentFormat,
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
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} uri
 * @param {Object} content
 * @param {boolean} lowLatencyMode
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export function regularSegmentLoader(
  url : string,
  content : ISegmentContext,
  lowLatencyMode : boolean,
  callbacks : ISegmentLoaderCallbacks<ILoadedAudioVideoSegmentFormat>,
  cancelSignal : CancellationSignal
) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat> |
            ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat> |
            ISegmentLoaderResultChunkedComplete>
{
  if (content.segment.isInit) {
    return initSegmentLoader(url, content.segment, cancelSignal, callbacks);
  }

  const containerType = inferSegmentContainer(content.adaptation.type,
                                              content.representation);
  if (lowLatencyMode && (containerType === "mp4" || containerType === undefined)) {
    if (fetchIsSupported()) {
      return lowLatencySegmentLoader(url, content, callbacks, cancelSignal);
    } else {
      warnOnce("DASH: Your browser does not have the fetch API. You will have " +
               "a higher chance of rebuffering when playing close to the live edge");
    }
  }

  const { segment } = content;
  return request({ url,
                   responseType: "arraybuffer",
                   headers: segment.range !== undefined ?
                     { Range: byteRange(segment.range) } :
                     undefined,
                   cancelSignal,
                   onProgress: callbacks.onProgress })
    .then((data) => ({ resultType: "segment-loaded",
                       resultData: data }));
}

/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateSegmentLoader(
  { lowLatencyMode,
    segmentLoader: customSegmentLoader,
    checkMediaSegmentIntegrity } : { lowLatencyMode: boolean;
                                     segmentLoader? : ICustomSegmentLoader;
                                     checkMediaSegmentIntegrity? : boolean; }
) : ISegmentLoader<Uint8Array | ArrayBuffer | null> {
  return checkMediaSegmentIntegrity !== true ? segmentLoader :
                                               addSegmentIntegrityChecks(segmentLoader);

  /**
   * @param {Object} content
   * @returns {Observable}
   */
  function segmentLoader(
    url : string | null,
    content : ISegmentContext,
    cancelSignal : CancellationSignal,
    callbacks : ISegmentLoaderCallbacks<Uint8Array | ArrayBuffer | null>
  ) : Promise<ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat> |
              ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat> |
              ISegmentLoaderResultChunkedComplete>
  {
    if (url == null) {
      return PPromise.resolve({ resultType: "segment-created",
                                resultData: null });
    }

    if (lowLatencyMode || customSegmentLoader === undefined) {
      return regularSegmentLoader(url, content, lowLatencyMode, callbacks, cancelSignal);
    }

    const args = { adaptation: content.adaptation,
                   manifest: content.manifest,
                   period: content.period,
                   representation: content.representation,
                   segment: content.segment,
                   transport: "dash",
                   url };

    return new Promise((res, rej) => {
      /** `true` when the custom segmentLoader should not be active anymore. */
      let hasFinished = false;

      /**
       * Callback triggered when the custom segment loader has a response.
       * @param {Object} args
       */
      const resolve = (
        _args : { data : ArrayBuffer|Uint8Array;
                  size? : number;
                  duration? : number; }
      ) => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);
        res({ resultType: "segment-loaded",
              resultData: { responseData: _args.data,
                            size: _args.size,
                            duration: _args.duration } });
      };

      /**
       * Callback triggered when the custom segment loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err : unknown) : void => {
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
                        "Unknown error when fetching a DASH segment through a " +
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
                  totalSize? : number; }
      ) => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        callbacks.onProgress({ duration: _args.duration,
                               size: _args.size,
                               totalSize: _args.totalSize });
      };

      /**
       * Callback triggered when the custom segment loader wants to fallback to
       * the "regular" implementation
       */
      const fallback = () => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);
        regularSegmentLoader(url, content, lowLatencyMode, callbacks, cancelSignal)
          .then(res, rej);
      };

      const customCallbacks = { reject, resolve, progress, fallback };
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
        if (typeof abort === "function") {
          abort();
        }
        rej(err);
      }
    });
  }
}
