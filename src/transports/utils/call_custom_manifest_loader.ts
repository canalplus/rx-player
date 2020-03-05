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

import { Observable } from "rxjs";

import {
  CustomManifestLoader,
  ILoadedManifest,
  IManifestLoaderArguments,
  IManifestLoaderObservable,
  IManifestLoaderObserver,
} from "../types";

export default function callCustomManifestLoader(
  customManifestLoader : CustomManifestLoader,
  fallbackManifestLoader : (x : IManifestLoaderArguments) =>
                             IManifestLoaderObservable
) : (x : IManifestLoaderArguments) => IManifestLoaderObservable {

  return (args : IManifestLoaderArguments) : IManifestLoaderObservable => {
    return new Observable((obs: IManifestLoaderObserver) => {
      const { url } = args;
      const timeAPIsDelta = Date.now() - performance.now();
      let hasFinished = false;
      let hasFallbacked = false;

      /**
       * Callback triggered when the custom manifest loader has a response.
       * @param {Object} args
       */
      const resolve = (_args : { data : ILoadedManifest;
                                 size? : number;
                                 duration? : number;
                                 url? : string;
                                 receivingTime? : number;
                                 sendingTime? : number; }) =>
      {
        if (!hasFallbacked) {
          hasFinished = true;
          const receivedTime =
            _args.receivingTime !== undefined ? _args.receivingTime - timeAPIsDelta :
                                                undefined;
          const sendingTime =
            _args.sendingTime !== undefined ? _args.sendingTime - timeAPIsDelta :
                                              undefined;

          obs.next({ type: "data-loaded",
                     value: { responseData: _args.data,
                              size: _args.size,
                              duration: _args.duration,
                              url: _args.url,
                              receivedTime, sendingTime } });
          obs.complete();
        }
      };

      /**
       * Callback triggered when the custom manifest loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err : unknown) : void => {
        if (!hasFallbacked) {
          hasFinished = true;
          obs.error(err);
        }
      };

      /**
       * Callback triggered when the custom manifest loader wants to fallback to
       * the "regular" implementation
       */
      const fallback = () => {
        hasFallbacked = true;
        fallbackManifestLoader(args).subscribe(obs);
      };

      const callbacks = { reject, resolve, fallback };
      const abort = customManifestLoader(url, callbacks);

      return () => {
        if (!hasFinished && !hasFallbacked && typeof abort === "function") {
          abort();
        }
      };
    });
  };
}
