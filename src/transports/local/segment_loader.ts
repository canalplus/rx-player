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
} from "rxjs";
import {
  ILocalManifestInitSegmentLoader,
  ILocalManifestSegmentLoader,
} from "../../parsers/manifest/local";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import {
  ISegmentLoaderArguments,
  ISegmentLoaderEvent,
} from "../types";

/**
 * @param {Function} customSegmentLoader
 * @returns {Observable}
 */
function loadInitSegment(
  customSegmentLoader : ILocalManifestInitSegmentLoader
) : Observable<ISegmentLoaderEvent<ArrayBuffer | null>> {
  return new Observable((obs : Observer< ISegmentLoaderEvent< ArrayBuffer | null > >) => {
    let hasFinished = false;

    /**
     * Callback triggered when the custom segment loader has a response.
     * @param {Object} args
     */
    const resolve = (_args : {
      data : ArrayBuffer | null;
      size? : number;
      duration? : number;
    }) => {
      hasFinished = true;
      obs.next({ type: "data", value: { responseData: _args.data } });
      obs.next({ type: "request-end",
                 value: { size: _args.size,
                          duration: _args.duration,
                          receivedTime: undefined,
                          sendingTime: undefined } });
      obs.complete();
    };

    /**
     * Callback triggered when the custom segment loader fails
     * @param {*} err - The corresponding error encountered
     */
    const reject = (err? : Error) => {
      hasFinished = true;
      obs.error(err);
    };

    obs.next({ type: "request-begin", value: {} });
    const abort = customSegmentLoader({ resolve, reject });

    return () => {
      if (!hasFinished && typeof abort === "function") {
        abort();
      }
    };
  });
}

/**
 * @param {Object} segment
 * @param {Function} customSegmentLoader
 * @returns {Observable}
 */
function loadSegment(
  segment : { time : number; duration : number; timestampOffset? : number },
  customSegmentLoader : ILocalManifestSegmentLoader
) : Observable< ISegmentLoaderEvent<ArrayBuffer | null>> {
  return new Observable((obs : Observer< ISegmentLoaderEvent< ArrayBuffer | null > >) => {
    let hasFinished = false;

    /**
     * Callback triggered when the custom segment loader has a response.
     * @param {Object} args
     */
    const resolve = (_args : {
      data : ArrayBuffer | null;
      size? : number;
      duration? : number;
    }) => {
      hasFinished = true;
      obs.next({ type: "data", value: { responseData: _args.data } });
      obs.next({ type: "request-end",
                 value: { size: _args.size,
                          duration: _args.duration,
                          receivedTime: undefined,
                          sendingTime: undefined } });
      obs.complete();
    };

    /**
     * Callback triggered when the custom segment loader fails
     * @param {*} err - The corresponding error encountered
     */
    const reject = (err? : Error) => {
      hasFinished = true;
      obs.error(err);
    };

    obs.next({ type: "request-begin", value: { } });
    const abort = customSegmentLoader(segment, { resolve, reject });

    return () => {
      if (!hasFinished && typeof abort === "function") {
        abort();
      }
    };
  });
}

/**
 * Generic segment loader for the local Manifest.
 * @param {Object} arg
 * @returns {Observable}
 */
export default function segmentLoader(
  { segment } : ISegmentLoaderArguments
) : Observable< ISegmentLoaderEvent< ArrayBuffer | null > > {
  const privateInfos = segment.privateInfos;
  if (segment.isInit) {
    if (privateInfos === undefined ||
        isNullOrUndefined(privateInfos.localManifestInitSegment)) {
      throw new Error("Segment is not a local Manifest segment");
    }
    return loadInitSegment(privateInfos.localManifestInitSegment.load);
  }
  if (privateInfos === undefined ||
      isNullOrUndefined(privateInfos.localManifestSegment)) {
    throw new Error("Segment is not an local Manifest segment");
  }
  return loadSegment(privateInfos.localManifestSegment.segment,
                     privateInfos.localManifestSegment.load);
}
