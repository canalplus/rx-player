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

import { resolveURL } from "../../utils/url";

import request from "../../utils/request";
import {
  byteRange,
  replaceTokens,
} from "./utils";

import {
  CustomSegmentLoader,
  ISegmentLoaderArguments,
  ILoaderObservable,
  ILoaderObserver,
} from "../types";

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
  const { range, indexRange } = segment;

  // fire a single time contiguous init and index ranges.
  if (
    range && indexRange &&
    range[1] === indexRange[0] - 1
  ) {
    return request({
      url,
      responseType: "arraybuffer",
      headers: {
        Range: byteRange([range[0], indexRange[1]]),
      },
    });
  }

  const mediaHeaders = range ?
    { Range: byteRange(range) } : null;

  const mediaOrInitRequest = request({
    url,
    responseType: "arraybuffer",
    headers: mediaHeaders,
  });

  // If init segment has indexRange metadata, we need to fetch
  // both the initialization data and the index metadata. We do
  // this in parallel and send the both blobs into the pipeline.
  if (indexRange) {
    const indexRequest = request({
      url,
      responseType: "arraybuffer",
      headers: { Range: byteRange(indexRange) },
    });
    return Observable.merge(mediaOrInitRequest, indexRequest);
  }
  else {
    return mediaOrInitRequest;
  }
}

/**
 * Generate a segment loader for the application
 * @param {Function} [customSegmentLoader]
 * @returns {Function}
 */
const segmentPreLoader = (customSegmentLoader? : CustomSegmentLoader) => ({
  segment,
  adaptation,
  representation,
  manifest,
} : ISegmentLoaderArguments) : ILoaderObservable<Uint8Array|ArrayBuffer> => {
  const {
    media,
    range,
    indexRange,
    isInit,
  } = segment;

  // init segment without initialization media/range/indexRange:
  // we do nothing on the network
  if (isInit && !(media || range || indexRange)) {
    return Observable.empty();
  }

  // construct url for the segment
  const path = media ? replaceTokens(media, segment, representation) : "";
  const url = resolveURL(representation.baseURL, path);

  const args = {
    adaptation,
    representation,
    manifest,
    segment,
    transport: "dash",
    url,
  };

  if (!customSegmentLoader) {
    return regularSegmentLoader(args);
  }

  return Observable.create((obs : ILoaderObserver<Uint8Array|ArrayBuffer>) => {
    let hasFinished = false;
    let hasFallbacked = false;

    /**
     * Callback triggered when the custom segment loader has a response.
     * @param {Object} args
     * @param {*} args.data - The segment data
     * @param {Number} args.size - The segment size
     * @param {Number} args.duration - The duration of the request, in ms
     */
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

    /**
     * Callback triggered when the custom segment loader fails
     * @param {*} [err={}] - The corresponding error encountered
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
