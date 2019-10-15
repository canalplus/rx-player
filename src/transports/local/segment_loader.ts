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

import { Observable, Observer } from "rxjs";
import {
  ILocalManifestInitSegmentLoader,
  ILocalManifestSegmentLoader,
} from "../../parsers/manifest/local";
import {
  ILoaderRegularDataEvent,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
} from "../types";

/**
 * @param {Function} customSegmentLoader
 * @returns {Observable}
 */
function loadInitSegment(
  customSegmentLoader : ILocalManifestInitSegmentLoader
) : Observable< ILoaderRegularDataEvent<ArrayBuffer | null>> {
  return new Observable((obs : Observer<
    ILoaderRegularDataEvent< ArrayBuffer | null >
  >) => {
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
      obs.next({ type: "data-loaded",
                 value: { responseData: _args.data,
                          size: _args.size,
                          duration: _args.duration } });
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
  segment : { time : number; duration : number; timescale : number },
  customSegmentLoader : ILocalManifestSegmentLoader
) : Observable< ILoaderRegularDataEvent<ArrayBuffer | null>> {
  return new Observable((obs : Observer<
    ILoaderRegularDataEvent< ArrayBuffer | null >
  >) => {
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
      obs.next({ type: "data-loaded",
                 value: { responseData: _args.data,
                          size: _args.size,
                          duration: _args.duration } });
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
) : ISegmentLoaderObservable< ArrayBuffer | null > {
  const privateInfos = segment.privateInfos;
  if (segment.isInit) {
    if (privateInfos === undefined || privateInfos.localManifestInitSegment == null) {
      throw new Error("Segment is not a local Manifest segment");
    }
    return loadInitSegment(privateInfos.localManifestInitSegment.load);
  }
  if (privateInfos === undefined || privateInfos.localManifestSegment == null) {
    throw new Error("Segment is not an local Manifest segment");
  }
  return loadSegment(privateInfos.localManifestSegment.segment,
                     privateInfos.localManifestSegment.load);
}
