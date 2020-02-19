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
  throwError
} from "rxjs";
import {
  catchError,
  filter,
  map,
  mergeMap,
  pluck,
} from "rxjs/operators";
import config from "../../../config";
import createManifestLoader, {
  IPipelineLoaderResponse
} from "../../../core/pipelines/manifest/create_manifest_loader";
import backoff, {
  IBackoffResponse
} from "../../../core/pipelines/utils/backoff";
import errorSelector from "../../../core/pipelines/utils/error_selector";
import Manifest from "../../../manifest";
import { ILoadedManifest } from "../../../transports";
import dash from "../../../transports/dash";
import metaplaylist from "../../../transports/metaplaylist";
import smooth from "../../../transports/smooth";
import tryCatch from "../../../utils/rx-try_catch";

const { DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE,
        DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
        INITIAL_BACKOFF_DELAY_BASE,
        MAX_BACKOFF_DELAY_BASE } = config;

const loaderOptions = { maxRetry: DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
                        maxRetryOffline: DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE,
                        baseDelay: INITIAL_BACKOFF_DELAY_BASE.REGULAR,
                        maxDelay: MAX_BACKOFF_DELAY_BASE.REGULAR };

/**
 * Allow the parser to schedule a new request.
 * @param {Object} transportPipeline
 * @param {Object} options
 * @returns {Function}
 */
function scheduleRequest<T>(request : () => Observable<T>) : Observable<T> {
  const backoffOptions = { baseDelay: loaderOptions.baseDelay,
                           maxDelay: loaderOptions.maxDelay,
                           maxRetryRegular: loaderOptions.maxRetry,
                           maxRetryOffline: loaderOptions.maxRetryOffline };
  return backoff(tryCatch(request, undefined), backoffOptions).pipe(
    filter((evt): evt is IBackoffResponse<T> => evt.type !== "retry"),
    pluck("value"),
    catchError((error : unknown) : Observable<never> => {
      throw errorSelector(error);
    }));
}

/**
 * Fetch and parse manifest for a given URL.
 * @param {String} url
 * @param {String} transport
 * @returns {Observable}
 */
function getManifest(url: string,
                     transport: "dash" | "smooth" | "metaplaylist"
): Observable<Manifest> {
  let pipelines;
  switch (transport) {
    case "dash":
      pipelines = dash({ lowLatencyMode: false });
      break;
    case "smooth":
      pipelines = smooth({ lowLatencyMode: false });
      break;
    case "metaplaylist":
      pipelines = metaplaylist({ lowLatencyMode: false });
      break;
    default:
      return throwError(new Error("Metaplaylist Maker: Unknown transport type."));
  }
  const loader = createManifestLoader(pipelines.manifest, loaderOptions);
  const { parser } = pipelines.manifest;
  return loader({ url }).pipe(
    filter((arg) : arg is IPipelineLoaderResponse<ILoadedManifest> =>
      arg.type === "response"
    ),
    mergeMap((evt) => {
      return parser({ response: evt.value,
                      url,
                      scheduleRequest })
        .pipe(
          map(({ manifest }) => {
            return manifest;
          })
        );
    })
  );
}

export default getManifest;
