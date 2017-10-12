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

import { Observable } from "rxjs/Observable";

import request from "../../utils/request";
import assert from "../../utils/assert";
import { resolveURL } from "../../utils/url";
import mp4Utils from "./mp4";
import {
  byteRange,
  buildSegmentURL,
} from "./utils";

import {
  CustomSegmentLoader,
  ISegmentLoaderArguments,
  ILoaderObservable,
  ILoaderObserver,
} from "../types";

const {
  createVideoInitSegment,
  createAudioInitSegment,
} = mp4Utils;

interface IRegularSegmentLoaderArguments extends ISegmentLoaderArguments {
  url : string;
}

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {Object} opt
 * @param {string} opt.url
 * @param {Segment} opt.segment
 * @returns {Observable}
 */
function regularSegmentLoader(
  { url, segment } : IRegularSegmentLoaderArguments
) : ILoaderObservable<ArrayBuffer> {
  let headers;
  const range = segment.range;
  if (range) {
    headers = {
      Range: byteRange(range),
    };
  }

  return request({
    url,
    responseType: "arraybuffer",
    headers,
  });
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
  manifest,
  init,
} : ISegmentLoaderArguments) : ILoaderObservable<Uint8Array|ArrayBuffer> => {
  if (segment.isInit) {
    let responseData : Uint8Array;
    const protection = adaptation._smoothProtection || {};

    switch (adaptation.type) {
    case "video":
      responseData = createVideoInitSegment(
        segment.timescale,
        representation.width || 0,
        representation.height || 0,
        72, 72, 4, // vRes, hRes, nal
        representation._codecPrivateData,
        protection.keyId,     // keyId
        protection.keySystems // pssList
      );
      break;
    case "audio":
      responseData = createAudioInitSegment(
        segment.timescale,
        representation._channels,
        representation._bitsPerSample || 0,
        representation._packetSize || 0,
        representation._samplingRate || 0,
        representation._codecPrivateData,
        protection.keyId,     // keyId
        protection.keySystems // pssList
      );
      break;
    default:
      if (__DEV__) {
        assert(false, "responseData should have been set");
      }
      responseData = new Uint8Array(0);
    }

    return Observable.of({
      type: "data" as "data", // :/ TS Bug or I'm going insane?
      value: { responseData },
    });
  }
  else {
    const url = buildSegmentURL(
      resolveURL(representation.baseURL),
      representation,
      segment
    );

    const args = {
      adaptation,
      representation,
      segment,
      transport: "smooth",
      url,
      manifest,
      init,
    };

    if (!customSegmentLoader) {
      return regularSegmentLoader(args);
    }

    return Observable.create((obs : ILoaderObserver<ArrayBuffer|Uint8Array>) => {
      let hasFinished = false;
      let hasFallbacked = false;

      const resolve = (_args : {
        data : ArrayBuffer|Uint8Array,
        size : number,
        duration : number,
      }) => {
        if (!hasFallbacked) {
          hasFinished = true;
          obs.next({
            type: "response",
            value: {
              responseData: _args.data,
              size: _args.size,
              duration: _args.duration,
            },
          });
          obs.complete();
        }
      };

      const reject = (err = {}) => {
        if (!hasFallbacked) {
          hasFinished = true;
          obs.error(err);
        }
      };

      const fallback = () => {
        hasFallbacked = true;
        regularSegmentLoader(args).subscribe(obs);
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
