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
import request from "../../utils/request";

import {
  CustomManifestLoader,
  ILoaderObservable,
  ILoaderObserver,
} from "../types";

/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 */
function regularManifestLoader(
  url: string,
  ignoreProgressEvents?: true,
  responseType?: string
) {
  return request({
    url,
    responseType: (responseType as any) || "document",
    ignoreProgressEvents,
  });
}

/**
 * Generate a manifest loader for the application
 * @param {Function} [customManifestLoader]
 * @returns {Function}
 */
const manifestPreLoader = (
  options: {
    customManifestLoader?: CustomManifestLoader;
    ignoreProgressEvents?: true;
  }) => (url: string, responseType?: string) : ILoaderObservable<Document|string> => {
    const { customManifestLoader, ignoreProgressEvents } = options;
    if (!customManifestLoader) {
      return regularManifestLoader(url, ignoreProgressEvents, responseType);
    }

    return Observable.create((obs: ILoaderObserver<Document|string>) => {
      let hasFinished = false;
      let hasFallbacked = false;

      /**
       * Callback triggered when the custom manifest loader has a response.
       * @param {Object} args - Which contains:
       *   - data {*} - The manifest data
       *   - size {Number} - The manifest size
       *   - duration {Number} - The duration of the request, in ms
       */
      const resolve = (_args : {
        data : Document|string;
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
       * Callback triggered when the custom manifest loader fails
       * @param {*} err - The corresponding error encountered
       */
      const reject = (err = {}) => {
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
        regularManifestLoader(url).subscribe(obs);
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

export default manifestPreLoader;
