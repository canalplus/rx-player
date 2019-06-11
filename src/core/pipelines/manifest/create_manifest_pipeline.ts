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
  EMPTY,
  Observable,
  Subject,
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
  share,
} from "rxjs/operators";
import {
  ICustomError,
  isKnownError,
  OtherError,
} from "../../../errors";
import Manifest from "../../../manifest";
import { ITransportPipelines } from "../../../transports";
import tryCatch from "../../../utils/rx-try_catch";
import downloadingBackoff from "../utils/backoff";
import errorSelector from "../utils/error_selector";
import getBackoffOptions from "../utils/get_backoff_options";
import createManifestLoader, {
  IManifestPipelineLoaderOptions,
} from "./create_manifest_loader";

export interface IRequestSchedulerOptions { maxRetry : number;
                                            maxRetryOffline : number; }

export interface IFetchManifestOptions {
  url : string; // URL from which the manifest was requested
  hasClockSynchronization: boolean; // if true, the client's clock is
                                    // synchronized with the server's
}

export interface IFetchManifestResult { manifest : Manifest;
                                        sendingTime? : number; }

/**
 * Create function allowing to easily fetch and parse the manifest from its URL.
 *
 * @example
 * ```js
 * const manifestPipeline = createManifestPipeline(transport, options, warning$);
 * manifestPipeline(manifestURL)
 *  .subscribe(manifest => console.log("Manifest:", manifest));
 * ```
 *
 * @param {Object} transport
 * @param {Subject} warning$
 * @param {Array.<Object>|undefined} supplementaryTextTracks
 * @param {Array.<Object>|undefined} supplementaryImageTrack
 * @returns {Function}
 */
export default function createManifestPipeline(
  pipelines : ITransportPipelines,
  pipelineOptions : IManifestPipelineLoaderOptions,
  warning$ : Subject<Error|ICustomError>
) : (args : IFetchManifestOptions) => Observable<IFetchManifestResult> {
  const loader = createManifestLoader(pipelines.manifest, pipelineOptions);
  const { parser } = pipelines.manifest;

  /**
   * Allow the parser to schedule a new request.
   * @param {Object} transportPipeline
   * @param {Object} options
   * @returns {Function}
   */
  function scheduleRequest<T>(request : () => Observable<T>) : Observable<T> {
    const { maxRetry, maxRetryOffline } = pipelineOptions;
    const backoffOptions = getBackoffOptions(maxRetry, maxRetryOffline, warning$);

    return downloadingBackoff(tryCatch(request, undefined), backoffOptions).pipe(
      catchError((error : Error) : Observable<never> => {
        throw errorSelector("PIPELINE_LOAD_ERROR", error, true);
      }));
  }

  /**
   * Fetch and parse the manifest corresponding to the URL given.
   * @param {Object} options
   * @returns {Observable}
   */
  return function fetchManifest(
    { url, hasClockSynchronization } : IFetchManifestOptions
  ) : Observable<IFetchManifestResult> {
    return loader({ url }).pipe(
      mergeMap((evt) => {
        if (evt.type === "error") {
          warning$.next(evt.value);
          return EMPTY;
        }
        const { value } = evt;
        const { sendingTime } = value;
        return parser({ response: value,
                        url,
                        hasClockSynchronization,
                        scheduleRequest }
        ).pipe(
          catchError((error: Error) => {
            const formattedError = isKnownError(error) ?
                                     error :
                                     new OtherError("PIPELINE_PARSING_ERROR",
                                                    error.toString(),
                                                    true);
            throw formattedError;
          }),
          map(({ manifest }) => {
            const warnings = manifest.parsingErrors;
            for (let i = 0; i < warnings.length; i++) {
              warning$.next(warnings[i]); // TODO not through warning$
            }
            return { manifest, sendingTime };
          })
        );
      }),
      share()
    );
  };
}
