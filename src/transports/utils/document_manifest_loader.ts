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

import request from "../../utils/request";

import {
  CustomManifestLoader,
  IManifestLoaderObservable,
} from "../types";
import callCustomManifestLoader from "./call_custom_manifest_loader";

/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @returns {Observable}
 */
function regularManifestLoader(url? : string) : IManifestLoaderObservable {
  if (url == null) {
    throw new Error("Cannot perform HTTP(s) request. URL not known");
  }
  return request({ url, responseType: "document" });
}

/**
 * Generate a manifest loader for the application
 * @param {Function} [customManifestLoader]
 * @returns {Function}
 */
const manifestPreLoader = (
  options: { customManifestLoader?: CustomManifestLoader }
) => (url? : string) : IManifestLoaderObservable => {
    const { customManifestLoader } = options;
    if (!customManifestLoader) {
      return regularManifestLoader(url);
    }
    return callCustomManifestLoader(customManifestLoader, regularManifestLoader, url);
  };

export default manifestPreLoader;
