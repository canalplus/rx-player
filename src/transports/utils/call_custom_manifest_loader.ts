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

import { CustomLoaderError } from "../../errors";
import {
  IManifestLoader,
  ILoadedManifestFormat,
} from "../../public_types";
import {
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller";
import {
  IRequestedData,
} from "../types";

export default function callCustomManifestLoader(
  customManifestLoader : IManifestLoader,
  fallbackManifestLoader : (
    url : string | undefined,
    cancelSignal : CancellationSignal
  ) => Promise< IRequestedData<ILoadedManifestFormat> >
) : (
    url : string | undefined,
    cancelSignal : CancellationSignal
  ) => Promise< IRequestedData<ILoadedManifestFormat> >
{
  return (
    url : string | undefined,
    cancelSignal : CancellationSignal
  ) : Promise< IRequestedData<ILoadedManifestFormat> > => {
    return new Promise((res, rej) => {
      const timeAPIsDelta = Date.now() - performance.now();
      /** `true` when the custom segmentLoader should not be active anymore. */
      let hasFinished = false;

      /**
       * Callback triggered when the custom manifest loader has a response.
       * @param {Object} args
       */
      const resolve = (_args : { data : ILoadedManifestFormat;
                                 size? : number | undefined;
                                 duration? : number | undefined;
                                 url? : string | undefined;
                                 receivingTime? : number | undefined;
                                 sendingTime? : number | undefined; }) =>
      {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);

        const receivedTime =
          _args.receivingTime !== undefined ? _args.receivingTime - timeAPIsDelta :
                                              undefined;
        const sendingTime =
          _args.sendingTime !== undefined ? _args.sendingTime - timeAPIsDelta :
                                            undefined;

        res({ responseData: _args.data,
              size: _args.size,
              requestDuration: _args.duration,
              url: _args.url,
              receivedTime, sendingTime });
      };

      /**
       * Callback triggered when the custom manifest loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err : unknown) : void => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);

        // Format error and send it
        const castedErr = err as (null | undefined | { message? : string;
                                                       canRetry? : boolean;
                                                       isOfflineError? : boolean;
                                                       xhr? : XMLHttpRequest; });
        const message = castedErr?.message ??
                        "Unknown error when fetching the Manifest through a " +
                        "custom manifestLoader.";
        const emittedErr = new CustomLoaderError(message,
                                                 castedErr?.canRetry ?? false,
                                                 castedErr?.isOfflineError ?? false,
                                                 castedErr?.xhr);
        rej(emittedErr);
      };

      /**
       * Callback triggered when the custom manifest loader wants to fallback to
       * the "regular" implementation
       */
      const fallback = () => {
        if (hasFinished || cancelSignal.isCancelled) {
          return;
        }
        hasFinished = true;
        cancelSignal.deregister(abortCustomLoader);
        fallbackManifestLoader(url, cancelSignal).then(res, rej);
      };

      const callbacks = { reject, resolve, fallback };
      const abort = customManifestLoader({ url }, callbacks);

      cancelSignal.register(abortCustomLoader);

      /**
       * The logic to run when the custom loader is cancelled while pending.
       * @param {Error} err
       */
      function abortCustomLoader(err : CancellationError) {
        if (hasFinished) {
          return;
        }
        hasFinished = true;
        if (typeof abort === "function") {
          abort();
        }
        rej(err);
      }
    });
  };
}
