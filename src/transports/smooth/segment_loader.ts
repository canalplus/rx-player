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
import assert from "../../utils/assert";
import request from "../../utils/request";
import {
  CustomSegmentLoader,
  ILoaderRegularDataEvent,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
} from "../types";
import byteRange from "../utils/byte_range";
import {
  createAudioInitSegment,
  createVideoInitSegment,
} from "./isobmff";

interface IRegularSegmentLoaderArguments extends ISegmentLoaderArguments {
  url : string;
}

type ICustomSegmentLoaderObserver =
  Observer< ILoaderRegularDataEvent< Uint8Array | ArrayBuffer > >;

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {Object} opt
 * @returns {Observable}
 */
function regularSegmentLoader(
  { url, segment } : IRegularSegmentLoaderArguments
) : ISegmentLoaderObservable<ArrayBuffer> {
  let headers;
  const range = segment.range;
  if (range) {
    headers = { Range: byteRange(range) };
  }

  return request({ url,
                   responseType: "arraybuffer",
                   headers,
                   sendProgressEvents: true });
}

/**
 * Defines the url for the request, load the right loader (custom/default
 * one).
 */
const generateSegmentLoader = (
  customSegmentLoader? : CustomSegmentLoader
) => ({
  segment,
  representation,
  adaptation,
  period,
  manifest,
} : ISegmentLoaderArguments) : ISegmentLoaderObservable<Uint8Array|ArrayBuffer|null> => {
  if (segment.isInit) {
    if (!segment.privateInfos || segment.privateInfos.smoothInit == null) {
      throw new Error("Smooth: Invalid segment format");
    }
    const smoothInitPrivateInfos = segment.privateInfos.smoothInit;
    let responseData : Uint8Array;
    const protection = smoothInitPrivateInfos.protection;

    const codecPrivateData = smoothInitPrivateInfos.codecPrivateData || "";
    switch (adaptation.type) {
    case "video":
      responseData = createVideoInitSegment(segment.timescale,
                                            representation.width || 0,
                                            representation.height || 0,
                                            72, 72, 4, // vRes, hRes, nal
                                            codecPrivateData,
                                            protection && protection.keyId,
                                            protection && protection.keySystems);
      break;
    case "audio":
      responseData = createAudioInitSegment(segment.timescale,
                                            smoothInitPrivateInfos.channels || 0,
                                            smoothInitPrivateInfos.bitsPerSample || 0,
                                            smoothInitPrivateInfos.packetSize || 0,
                                            smoothInitPrivateInfos.samplingRate || 0,
                                            codecPrivateData,
                                            protection && protection.keyId,
                                            protection && protection.keySystems);
      break;
    default:
      if (__DEV__) {
        assert(false, "responseData should have been set");
      }
      responseData = new Uint8Array(0);
    }

    return observableOf({ type: "data-created" as const,
                          value: { responseData } });
  }
  else if (segment.mediaURL == null) {
    return observableOf({ type: "data-created" as const,
                          value: { responseData: null } });
  }
  else {
    const url = segment.mediaURL;
    const args = { adaptation,
                   manifest,
                   period,
                   representation,
                   segment,
                   transport: "smooth",
                   url };

    if (!customSegmentLoader) {
      return regularSegmentLoader(args);
    }

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
          obs.next({ type: "data-loaded",
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
      const reject = (err = {}) => {
        if (!hasFallbacked) {
          hasFinished = true;
          obs.error(err);
        }
      };

      const fallback = () => {
        hasFallbacked = true;

        // HACK What is TypeScript/RxJS doing here??????
        /* tslint:disable deprecation */
        // @ts-ignore
        regularSegmentLoader(args).subscribe(obs);
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
  }
};

export default generateSegmentLoader;
