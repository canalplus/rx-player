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
  formatError,
  ICustomError,
  NetworkError,
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

const { MAX_BACKOFF_DELAY_BASE,
        INITIAL_BACKOFF_DELAY_BASE } = config;

export interface IRequestSchedulerOptions { maxRetry : number;
                                            maxRetryOffline : number; }

export interface IFetchManifestOptions {
  url : string; // URL from which the manifest was requested
  externalClockOffset? : number; // If set, offset to add to `performance.now()`
                                 // to obtain the current server's time
}

type IPipelineManifestOptions =
  IPipelineLoaderOptions<IManifestLoaderArguments, Document|string>;

export interface IFetchManifestResult { manifest : Manifest;
                                        sendingTime? : number; }

/**
 * Generate a new error from the infos given.
 * @param {string} code
 * @param {Error} error
 * @returns {Error}
 */
function errorSelector(
  error : unknown
) : ICustomError {
  if (error instanceof RequestError) {
    return new NetworkError("PIPELINE_LOAD_ERROR", error);
  }
  return formatError(error, {
    defaultCode: "PIPELINE_LOAD_ERROR",
    defaultReason: "Unknown error when fetching the Manifest",
  });
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
  warning$ : Subject<ICustomError>
) : (args : IFetchManifestOptions) => Observable<IFetchManifestResult> {
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

    const backoffOptions = { baseDelay: INITIAL_BACKOFF_DELAY_BASE,
                             maxDelay: MAX_BACKOFF_DELAY_BASE,
                             maxRetryRegular: maxRetry,
                             maxRetryOffline,
                             onRetry: (error : unknown) => {
                               warning$.next(errorSelector(error)); } };

    return downloadingBackoff(tryCatch(request, undefined), backoffOptions).pipe(
      catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }));
  }

  /**
   * Fetch and parse the manifest corresponding to the URL given.
   * @param {Object} options
   * @returns {Observable}
   */
  return function fetchManifest(
    { url, externalClockOffset } : IFetchManifestOptions
  ) : Observable<IFetchManifestResult> {
    return loader({ url }).pipe(

      tap((arg) => {
        if (arg.type === "warning") {
          warning$.next(arg.value);
        }
      }),

      filter((arg) : arg is IPipelineLoaderResponse<Document|string> =>
        arg.type === "response"
      ),

      mergeMap(({ value }) => {
        const { sendingTime } = value;
        return parser({ response: value,
                        url,
                        externalClockOffset,
                        scheduleRequest }
        ).pipe(
          catchError((error: unknown) => {
            throw formatError(error, {
              defaultCode: "PIPELINE_PARSE_ERROR",
              defaultReason: "Unknown error when parsing the Manifest",
            });
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
