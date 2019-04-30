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
  of as observableOf,
} from "rxjs";
import request from "../../utils/request";
import {
  CustomSegmentLoader,
  ILoaderObservable,
  ILoaderObserver,
  ISegmentLoaderArguments,
} from "../types";
import byteRange from "../utils/byte_range";

interface IRegularSegmentLoaderArguments extends ISegmentLoaderArguments {
  url : string;
}

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {Object} opt
 * @returns {Observable}
 */
function regularSegmentLoader(
  { url, segment } : IRegularSegmentLoaderArguments
) : ILoaderObservable<ArrayBuffer> {
  const { range, indexRange } = segment;

  // fire a single time for init and index ranges
  if (range != null && indexRange != null) {
    return request({
      url,
      responseType: "arraybuffer",
      headers: {
        Range: byteRange([
          Math.min(range[0], indexRange[0]),
          Math.max(range[1], indexRange[1]),
        ]),
      },
      sendProgressEvents: true,
    });
  }
  return request({
    url,
    responseType: "arraybuffer",
    headers: range ? { Range: byteRange(range) } : null,
    sendProgressEvents: true,
  });
}

/**
 * Generate a segment loader for the application
 * @param {Function} [customSegmentLoader]
 * @returns {Function}
 */
const segmentPreLoader = (customSegmentLoader? : CustomSegmentLoader) => ({
  adaptation,
  manifest,
  period,
  representation,
  segment,
} : ISegmentLoaderArguments) : ILoaderObservable<Uint8Array|ArrayBuffer|null> => {
  const { mediaURL } = segment;

  if (mediaURL == null) {
    return observableOf({
      type: "data" as "data",
      value: { responseData: null },
    });
  }

  const args = {
    adaptation,
    manifest,
    period,
    representation,
    segment,
    transport: "dash",
    url: mediaURL,
  };

  if (!customSegmentLoader) {
    return regularSegmentLoader(args);
  }

  return new Observable((obs : ILoaderObserver<Uint8Array|ArrayBuffer>) => {
    let hasFinished = false;
    let hasFallbacked = false;

    /**
     * Callback triggered when the custom segment loader has a response.
     * @param {Object} args
     */
    const resolve = (_args : {
      data : ArrayBuffer|Uint8Array;
      size : number;
      duration : number;
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

    /**
     * Callback triggered when the custom segment loader wants to fallback to
     * the "regular" implementation
     */
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
};

export default segmentPreLoader;
