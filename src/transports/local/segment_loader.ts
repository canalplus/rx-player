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
import {
  ILocalManifestInitSegmentLoader,
  ILocalManifestSegmentLoader,
} from "../../parsers/manifest/local";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { CancellationError, CancellationSignal } from "../../utils/task_canceller";
import {
  ISegmentContext,
  ISegmentLoaderCallbacks,
  ISegmentLoaderResultSegmentLoaded,
} from "../types";

/**
 * @param {Function} customSegmentLoader
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function loadInitSegment(
  customSegmentLoader : ILocalManifestInitSegmentLoader,
  cancelSignal : CancellationSignal
) : PPromise<ISegmentLoaderResultSegmentLoaded<ArrayBuffer | null>> {
  return new PPromise((res, rej) => {
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
      if (!cancelSignal.isCancelled) {
        cancelSignal.deregister(abortLoader);
        res({ resultType: "segment-loaded",
              resultData: { responseData: _args.data,
                            size: _args.size,
                            duration: _args.duration } });
      }
    };

    /**
     * Callback triggered when the custom segment loader fails
     * @param {*} err - The corresponding error encountered
     */
    const reject = (err? : Error) => {
      hasFinished = true;
      if (!cancelSignal.isCancelled) {
        cancelSignal.deregister(abortLoader);
        rej(err);
      }
    };

    const abort = customSegmentLoader({ resolve, reject });

    cancelSignal.register(abortLoader);
    /**
     * The logic to run when this loader is cancelled while pending.
     * @param {Error} err
     */
    function abortLoader(err : CancellationError) {
      if (!hasFinished && typeof abort === "function") {
        abort();
      }
      rej(err);
    }
  });
}

/**
 * @param {Object} segment
 * @param {Function} customSegmentLoader
 * @param {Object} cancelSignal
 * @returns {Observable}
 */
function loadSegment(
  segment : { time : number; duration : number; timestampOffset? : number },
  customSegmentLoader : ILocalManifestSegmentLoader,
  cancelSignal : CancellationSignal
) : PPromise< ISegmentLoaderResultSegmentLoaded<ArrayBuffer | null>> {
  return new PPromise((res, rej) => {
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
      cancelSignal.deregister(abortLoader);
      hasFinished = true;
      if (!cancelSignal.isCancelled) {
        res({ resultType: "segment-loaded",
              resultData: { responseData: _args.data,
                            size: _args.size,
                            duration: _args.duration } });
      }
    };

    /**
     * Callback triggered when the custom segment loader fails
     * @param {*} err - The corresponding error encountered
     */
    const reject = (err? : Error) => {
      cancelSignal.deregister(abortLoader);
      hasFinished = true;
      if (!cancelSignal.isCancelled) {
        rej(err);
      }
    };

    const abort = customSegmentLoader(segment, { resolve, reject });

    cancelSignal.register(abortLoader);
    /**
     * The logic to run when this loader is cancelled while pending.
     * @param {Error} err
     */
    function abortLoader(err : CancellationError) {
      if (!hasFinished && typeof abort === "function") {
        abort();
      }
      rej(err);
    }
  });
}

/**
 * Generic segment loader for the local Manifest.
 * @param {string | null} _url
 * @param {Object} content
 * @param {Object} cancelSignal
 * @param {Object} _callbacks
 * @returns {Promise}
 */
export default function segmentLoader(
  _url : string | null,
  content : ISegmentContext,
  cancelSignal : CancellationSignal,
  _callbacks : ISegmentLoaderCallbacks<ArrayBuffer | null>
) : PPromise<ISegmentLoaderResultSegmentLoaded<ArrayBuffer | null>> {
  const { segment } = content;
  const privateInfos = segment.privateInfos;
  if (segment.isInit) {
    if (privateInfos === undefined ||
        isNullOrUndefined(privateInfos.localManifestInitSegment)) {
      throw new Error("Segment is not a local Manifest segment");
    }
    return loadInitSegment(privateInfos.localManifestInitSegment.load,
                           cancelSignal);
  }
  if (privateInfos === undefined ||
      isNullOrUndefined(privateInfos.localManifestSegment)) {
    throw new Error("Segment is not an local Manifest segment");
  }
  return loadSegment(privateInfos.localManifestSegment.segment,
                     privateInfos.localManifestSegment.load,
                     cancelSignal);
}
