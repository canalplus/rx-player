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
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller";
import {
  CustomManifestLoader,
  ILoadedManifestFormat,
  IRequestedData,
} from "../types";

export default function callCustomManifestLoader(
  customManifestLoader : CustomManifestLoader,
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
    return new PPromise((res, rej) => {
      const timeAPIsDelta = Date.now() - performance.now();
      let hasFinished = false;
      let hasFallbacked = false;

      /**
       * Callback triggered when the custom manifest loader has a response.
       * @param {Object} args
       */
      const resolve = (_args : { data : ILoadedManifestFormat;
                                 size? : number;
                                 duration? : number;
                                 url? : string;
                                 receivingTime? : number;
                                 sendingTime? : number; }) =>
      {
        hasFinished = true;
        if (hasFallbacked || cancelSignal.isCancelled) {
          return;
        }
        cancelSignal.deregister(abortCustomLoader);
        const receivedTime =
          _args.receivingTime !== undefined ? _args.receivingTime - timeAPIsDelta :
                                              undefined;
        const sendingTime =
          _args.sendingTime !== undefined ? _args.sendingTime - timeAPIsDelta :
                                            undefined;

        res({ responseData: _args.data,
              size: _args.size,
              duration: _args.duration,
              url: _args.url,
              receivedTime, sendingTime });
      };

      /**
       * Callback triggered when the custom manifest loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err : unknown) : void => {
        hasFinished = true;
        if (!hasFallbacked && !cancelSignal.isCancelled) {
          cancelSignal.deregister(abortCustomLoader);
          rej(err);
        }
      };

      /**
       * Callback triggered when the custom manifest loader wants to fallback to
       * the "regular" implementation
       */
      const fallback = () => {
        hasFallbacked = true;
        if (!cancelSignal.isCancelled) {
          cancelSignal.deregister(abortCustomLoader);
          fallbackManifestLoader(url, cancelSignal).then(res, rej);
        }
      };

      const callbacks = { reject, resolve, fallback };
      const abort = customManifestLoader(url, callbacks);

      cancelSignal.register(abortCustomLoader);

      /**
       * The logic to run when the custom loader is cancelled while pending.
       * @param {Error} err
       */
      function abortCustomLoader(err : CancellationError) {
        if (hasFallbacked || hasFinished) {
          return;
        }
        if (typeof abort === "function") {
          abort();
        }
        rej(err);
      }
    });
  };
}
