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
  IManifestLoader,
  ILoadedManifestFormat,
} from "../../public_types";
import request from "../../utils/request";
import { CancellationSignal } from "../../utils/task_canceller";
import { IManifestLoaderOptions, IRequestedData } from "../types";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader";

/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @param {Object} loaderOptions
 * @param {Object} cancelSignal
 */
function regularManifestLoader(
  url : string | undefined,
  loaderOptions : IManifestLoaderOptions,
  cancelSignal : CancellationSignal
) : Promise< IRequestedData<ILoadedManifestFormat> > {
  if (url === undefined) {
    throw new Error("Cannot perform HTTP(s) request. URL not known");
  }
  return request({ url,
                   responseType: "text",
                   timeout: loaderOptions.timeout,
                   cancelSignal });
}

/**
 * Generate a manifest loader for the application
 * @param {Function} [customManifestLoader]
 * @returns {Function}
 */
export default function generateManifestLoader(
  { customManifestLoader } : { customManifestLoader?: IManifestLoader | undefined }
) : (
    url : string | undefined,
    loaderOptions : IManifestLoaderOptions,
    cancelSignal : CancellationSignal
  ) => Promise<IRequestedData<ILoadedManifestFormat>>
{
  return typeof customManifestLoader !== "function" ?
    regularManifestLoader :
    callCustomManifestLoader(customManifestLoader, regularManifestLoader);
}
