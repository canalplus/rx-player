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
import xhr from "../../utils/request";
import {
  CustomSegmentLoader,
  ILoaderRegularDataEvent,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
} from "../types";
import byteRange from "../utils/byte_range";
import initSegmentLoader from "./init_segment_loader";
import isWEBMEmbeddedTrack from "./is_webm_embedded_track";
import lowLatencySegmentLoader from "./low_latency_segment_loader";

type ICustomSegmentLoaderObserver =
  Observer<ILoaderRegularDataEvent<Uint8Array|ArrayBuffer>>;

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {Object} opt
 * @returns {Observable}
 */
function regularSegmentLoader(
  url : string,
  args : ISegmentLoaderArguments,
  lowLatencyMode : boolean
) : ISegmentLoaderObservable<ArrayBuffer> {

  if (args.segment.isInit) {
    return initSegmentLoader(url, args);
  }

  const isWEBM = isWEBMEmbeddedTrack(args.representation);
  if (lowLatencyMode && !isWEBM) {
    return lowLatencySegmentLoader(url, args);
  }

  const { segment } = args;
  return xhr({ url,
               responseType: "arraybuffer",
               sendProgressEvents: true,
               headers: segment.range != null ? { Range: byteRange(segment.range) } :
                                                undefined });
}

/**
 * Generate a segment loader:
 *   - call a custom SegmentLoader if defined
 *   - call the regular loader if not
 * @param {boolean} lowLatencyMode
 * @param {Function} [customSegmentLoader]
 * @returns {Function}
 */
export default function generateSegmentLoader(
  lowLatencyMode: boolean,
  customSegmentLoader? : CustomSegmentLoader
) : (x : ISegmentLoaderArguments) => ISegmentLoaderObservable< Uint8Array |
                                                               ArrayBuffer |
                                                               null > {
  /**
   * @param {Object} content
   * @returns {Observable}
   */
  return function segmentLoader(
    content : ISegmentLoaderArguments
  ) : ISegmentLoaderObservable< Uint8Array | ArrayBuffer | null > {
    const { mediaURL } = content.segment;
    if (mediaURL == null) {
      return observableOf({ type: "data-created" as const,
                            value: { responseData: null } });
    }

    if (lowLatencyMode || customSegmentLoader == null) {
      return regularSegmentLoader(mediaURL, content, lowLatencyMode);
    }

    const args = { adaptation: content.adaptation,
                   manifest: content.manifest,
                   period: content.period,
                   representation: content.representation,
                   segment: content.segment,
                   transport: "dash",
                   url: mediaURL };

    return new Observable((obs : ICustomSegmentLoaderObserver) => {
      let hasFinished = false;
      let hasFallbacked = false;

      /**
       * Callback triggered when the custom segment loader has a response.
       * @param {Object} args
       */
      const resolve = (_args : {
        data : ArrayBuffer|Uint8Array;
        size? : number;
        duration? : number;
      }) => {
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
          obs.error(err);
        }
      };

      /**
       * Callback triggered when the custom segment loader wants to fallback to
       * the "regular" implementation
       */
      const fallback = () => {
        hasFallbacked = true;
        const regular$ = regularSegmentLoader(mediaURL, content, lowLatencyMode);

        // HACK What is TypeScript/RxJS doing here??????
        /* tslint:disable deprecation */
        // @ts-ignore
        regular$.subscribe(obs);
        /* tslint:enable deprecation */
      };

      const callbacks = { reject, resolve, fallback };
      const abort = customSegmentLoader(args, callbacks);

      return () => {
        if (!hasFinished && !hasFallbacked && typeof abort === "function") {
          abort();
        }
      };
    });
  };
}
