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
import { resolveURL } from "../../../utils/url";
import mp4Utils from "./mp4.js";
import parsedRequest from "./request.js";
import {
  byteRange,
  buildSegmentURL,
} from "./utils.js";

const {
  createVideoInitSegment,
  createAudioInitSegment,
} = mp4Utils;

function regularSegmentLoader({ url, segment }) {
  let headers;
  const range = segment.range;
  if (range) {
    headers = {
      Range: byteRange(range),
    };
  }

  return parsedRequest({
    url,
    responseType: "arraybuffer",
    headers,
  });
}

/**
 * Defines the url for the request, load the right loader (custom/default
 * one).
 */
const  segmentLoader = (customSegmentLoader) => ({
  segment,
  representation,
  adaptation,
  manifest,
}) => {
  if (segment.isInit) {
    let responseData = {};
    const protection = adaptation._smoothProtection || {};

    switch(adaptation.type) {
    case "video":
      responseData = createVideoInitSegment(
        segment.timescale,
        representation.width,
        representation.height,
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
        representation._bitsPerSample,
        representation._packetSize,
        representation._samplingRate,
        representation._codecPrivateData,
        protection.keyId,     // keyId
        protection.keySystems // pssList
      );
      break;
    }

    return Observable.of({ type: "data", value: { responseData } });
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
    };

    if (!customSegmentLoader) {
      return regularSegmentLoader(args);
    }

    return Observable.create(obs => {
      let hasFinished = false;
      let hasFallbacked = false;

      const resolve = (args = {}) => {
        if (!hasFallbacked) {
          hasFinished = true;
          obs.next({
            type: "response",
            value: {
              responseData: args.data,
              size: args.size || 0,
              duration: args.duration || 0,
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
        segmentLoader(args).subscribe(obs);
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

export default segmentLoader;
