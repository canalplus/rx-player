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
  Subject,
} from "rxjs";
import {
  catchError,
  filter,
  map,
  mergeMap,
  share,
  tap,
} from "rxjs/operators";
import config from "../../../config";
import {
  ICustomError,
  isKnownError,
  NetworkError,
  OtherError,
  RequestError,
} from "../../../errors";
import Manifest from "../../../manifest";
import {
  IManifestLoaderArguments,
  ITransportPipelines,
} from "../../../transports";
import tryCatch from "../../../utils/rx-try_catch";
import downloadingBackoff from "../utils/backoff";
import createLoader, {
  IPipelineLoaderOptions,
  IPipelineLoaderResponse,
} from "../utils/create_loader";

const {
  MAX_BACKOFF_DELAY_BASE,
  INITIAL_BACKOFF_DELAY_BASE,
} = config;

export interface IRequestSchedulerOptions {
  maxRetry : number;
  maxRetryOffline : number;
}

export interface IFetchManifestOptions {
  loadExternalUTCTimings: boolean;
}

type IPipelineManifestOptions =
  IPipelineLoaderOptions<IManifestLoaderArguments, Document|string>;

export interface IFetchManifestResult {
  manifest : Manifest;
  sendingTime? : number;
}

/**
 * Generate a new error from the infos given.
 * @param {string} code
 * @param {Error} error
 * @param {Boolean} fatal - Whether the error is fatal to the content's
 * playback.
 * @returns {Error}
 */
function errorSelector(code : string, error : Error, fatal : boolean) : ICustomError {
  if (!isKnownError(error)) {
    if (error instanceof RequestError) {
      return new NetworkError(code, error, fatal);
    }
    return new OtherError(code, error.toString(), fatal);
  }
  return error;
}

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
  pipelineOptions : IPipelineManifestOptions,
  warning$ : Subject<Error|ICustomError>
) : (url : string, options : IFetchManifestOptions) => Observable<IFetchManifestResult> {
  const loader = createLoader<
    IManifestLoaderArguments, Document|string
  >(pipelines.manifest, pipelineOptions);
  const { parser } = pipelines.manifest;

  /**
   * Allow the parser to schedule a new request.
   * @param {Object} transportPipeline
   * @param {Object} options
   * @returns {Function}
   */
  function scheduleRequest<T>(request : () => Observable<T>) : Observable<T> {
    const { maxRetry, maxRetryOffline } = pipelineOptions;

    const backoffOptions = {
      baseDelay: INITIAL_BACKOFF_DELAY_BASE,
      maxDelay: MAX_BACKOFF_DELAY_BASE,
      maxRetryRegular: maxRetry,
      maxRetryOffline,
      onRetry: (error : Error) => {
        warning$.next(errorSelector("PIPELINE_LOAD_ERROR", error, false));
      },
    };
    return downloadingBackoff(tryCatch(request, undefined), backoffOptions).pipe(
      catchError((error : Error) : Observable<never> => {
        throw errorSelector("PIPELINE_LOAD_ERROR", error, true);
      }));
  }

  /**
   * Fetch and parse the manifest corresponding to the URL given.
   * @param {string} url - URL of the manifest
   * @returns {Observable}
   */
  return function fetchManifest(url : string, options : IFetchManifestOptions) : Observable<IFetchManifestResult> {
    return loader({ url }).pipe(

      tap((arg) => {
        if (arg.type === "error") {
          warning$.next(arg.value);
        }
      }),

      filter((arg) : arg is IPipelineLoaderResponse<Document|string> =>
        arg.type === "response"
      ),

      mergeMap(({ value }) => {
        const { sendingTime } = value;
        const { loadExternalUTCTimings } = options;
        return parser({ response: value, url, scheduleRequest, loadExternalUTCTimings }).pipe(
          catchError((error: Error) => {
            const formattedError = isKnownError(error) ?
              error : new OtherError("PIPELINE_PARSING_ERROR", error.toString(), true);
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
