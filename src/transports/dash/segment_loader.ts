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
  Observer,
  of as observableOf,
} from "rxjs";
import { CustomLoaderError } from "../../errors";
import xhr, {
  fetchIsSupported,
} from "../../utils/request";
import warnOnce from "../../utils/warn_once";
import {
  CustomSegmentLoader,
  ILoaderProgressEvent,
  ISegmentLoader,
  ISegmentLoaderArguments,
  ISegmentLoaderDataLoadedEvent,
  ISegmentLoaderEvent,
} from "../types";
import byteRange from "../utils/byte_range";
import inferSegmentContainer from "../utils/infer_segment_container";
import addSegmentIntegrityChecks from "./add_segment_integrity_checks_to_loader";
import initSegmentLoader from "./init_segment_loader";
import lowLatencySegmentLoader from "./low_latency_segment_loader";

type ICustomSegmentLoaderObserver =
  Observer<ILoaderProgressEvent |
           ISegmentLoaderDataLoadedEvent<Uint8Array|ArrayBuffer>>;

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {Object} opt
 * @returns {Observable}
 */
function regularSegmentLoader(
  url : string,
  args : ISegmentLoaderArguments,
  lowLatencyMode : boolean
) : Observable< ISegmentLoaderEvent<ArrayBuffer | Uint8Array>> {

  if (args.segment.isInit) {
    return initSegmentLoader(url, args);
  }

  const containerType = inferSegmentContainer(args.adaptation.type, args.representation);
  if (lowLatencyMode && (containerType === "mp4" || containerType === undefined)) {
    if (fetchIsSupported()) {
      return lowLatencySegmentLoader(url, args);
    } else {
      warnOnce("DASH: Your browser does not have the fetch API. You will have " +
               "a higher chance of rebuffering when playing close to the live edge");
    }
  }

  const { segment } = args;
  return xhr({ url,
               responseType: "arraybuffer",
               sendProgressEvents: true,
               headers: segment.range !== undefined ?
                 { Range: byteRange(segment.range) } :
                 undefined });
}

/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateSegmentLoader(
  { lowLatencyMode,
    segmentLoader: customSegmentLoader,
    checkMediaSegmentIntegrity } : { lowLatencyMode: boolean;
                                     segmentLoader? : CustomSegmentLoader;
                                     checkMediaSegmentIntegrity? : boolean; }
) : ISegmentLoader< Uint8Array | ArrayBuffer | null > {
  return checkMediaSegmentIntegrity !== true ? segmentLoader :
                                               addSegmentIntegrityChecks(segmentLoader);

  /**
   * @param {Object} content
   * @returns {Observable}
   */
  function segmentLoader(
    content : ISegmentLoaderArguments
  ) : Observable< ISegmentLoaderEvent< Uint8Array | ArrayBuffer | null > > {
    const { url } = content;
    if (url == null) {
      return observableOf({ type: "data-created" as const,
                            value: { responseData: null } });
    }

    if (lowLatencyMode || customSegmentLoader === undefined) {
      return regularSegmentLoader(url, content, lowLatencyMode);
    }

    const args = { adaptation: content.adaptation,
                   manifest: content.manifest,
                   period: content.period,
                   representation: content.representation,
                   segment: content.segment,
                   transport: "dash",
                   url };

    return new Observable((obs : ICustomSegmentLoaderObserver) => {
      let hasFinished = false;
      let hasFallbacked = false;

      /**
       * Callback triggered when the custom segment loader has a response.
       * @param {Object} args
       */
      const resolve = (
        _args : { data : ArrayBuffer|Uint8Array;
                  size? : number;
                  duration? : number; }
      ) => {
        if (!hasFallbacked) {
          hasFinished = true;
          obs.next({ type: "data-loaded" as const,
                     value: { responseData: _args.data,
                              size: _args.size,
                              duration: _args.duration } });
          obs.complete();
        }
      };

      /**
       * Callback triggered when the custom segment loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err = {}) : void => {
        if (!hasFallbacked) {
          hasFinished = true;

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
          obs.error(emittedErr);
        }
      };

      const progress = (
        _args : { duration : number;
                  size : number;
                  totalSize? : number; }
      ) => {
        if (!hasFallbacked) {
          obs.next({ type: "progress", value: { duration: _args.duration,
                                                size: _args.size,
                                                totalSize: _args.totalSize } });
        }
      };

      /**
       * Callback triggered when the custom segment loader wants to fallback to
       * the "regular" implementation
       */
      const fallback = () => {
        hasFallbacked = true;
        const regular$ = regularSegmentLoader(url, content, lowLatencyMode);

        // HACK What is TypeScript/RxJS doing here??????
        /* eslint-disable import/no-deprecated */
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        regular$.subscribe(obs);
        /* eslint-enable import/no-deprecated */
        /* eslint-enable @typescript-eslint/ban-ts-comment */
      };

      const callbacks = { reject, resolve, progress, fallback };
      const abort = customSegmentLoader(args, callbacks);

      return () => {
        if (!hasFinished && !hasFallbacked && typeof abort === "function") {
          abort();
        }
      };
    });
  }
}
