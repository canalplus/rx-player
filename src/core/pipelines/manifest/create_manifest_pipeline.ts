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
  of as observableOf,
  Subject,
} from "rxjs";
import {
  catchError,
  filter,
  map,
  mergeMap,
  tap,
} from "rxjs/operators";
import {
  formatError,
  ICustomError,
} from "../../../errors";
import Manifest from "../../../manifest";
import {
  ILoadedManifest,
  ITransportPipelines,
} from "../../../transports";
import tryCatch from "../../../utils/rx-try_catch";
import errorSelector from "../utils/error_selector";
import { tryRequestObservableWithBackoff } from "../utils/try_urls_with_backoff";
import createManifestLoader, {
  IPipelineLoaderResponse,
  IPipelineLoaderResponseValue,
} from "./create_manifest_loader";
import parseManifestPipelineOptions from "./parse_manifest_pipeline_options";

// What will be sent once parsed
export interface IFetchManifestResult { manifest : Manifest;
                                        sendingTime? : number;
                                        receivedTime? : number;
                                        parsingTime : number; }

// The Manifest Pipeline generated here
export interface ICoreManifestPipeline {
  fetch(url? : string) : Observable<IPipelineLoaderResponse<ILoadedManifest>>;
  parse(response : IPipelineLoaderResponseValue<ILoadedManifest>,
        url? : string,
        externalClockOffset? : number) : Observable<IFetchManifestResult>;
}

export interface IManifestPipelineOptions {
  lowLatencyMode : boolean; // Whether the content is a low-latency content
                            // This has an impact on default backoff delays
  manifestRetry? : number; // Maximum number of time a request on error will be retried
  offlineRetry? : number; // Maximum number of time a request be retried when
                          // the user is offline
}

/**
 * Create function allowing to easily fetch and parse the manifest from its URL.
 *
 * @example
 * ```js
 * const manifestPipeline = createManifestPipeline(pipelines, options, warning$);
 * manifestPipeline.fetch(manifestURL)
 *  .mergeMap((evt) => {
 *    if (evt.type !== "response") { // Might also receive warning events
 *      return EMPTY;
 *    }
 *    return manifestPipeline.parse(evt.value);
 *  }).subscribe(({ manifest }) => console.log("Manifest:", manifest));
 * ```
 *
 * @param {Object} pipelines
 * @param {Subject} pipelineOptions
 * @param {Subject} warning$
 * @returns {Function}
 */
export default function createManifestPipeline(
  pipelines : ITransportPipelines,
  pipelineOptions : IManifestPipelineOptions,
  warning$ : Subject<ICustomError>
) : ICoreManifestPipeline {
  const parsedOptions = parseManifestPipelineOptions(pipelineOptions);
  const loader = createManifestLoader(pipelines.manifest, parsedOptions);
  const { parser } = pipelines.manifest;

  /**
   * Allow the parser to schedule a new request.
   * @param {Object} transportPipeline
   * @param {Object} options
   * @returns {Function}
   */
  function scheduleRequest<T>(request : () => Observable<T>) : Observable<T> {
    const backoffOptions = { baseDelay: parsedOptions.baseDelay,
                             maxDelay: parsedOptions.maxDelay,
                             maxRetryRegular: parsedOptions.maxRetry,
                             maxRetryOffline: parsedOptions.maxRetryOffline };
    return tryRequestObservableWithBackoff(tryCatch(request, undefined),
                                           backoffOptions).pipe(
      mergeMap(evt => {
        if (evt.type === "retry") {
          warning$.next(errorSelector(evt.value));
          return EMPTY;
        }
        return observableOf(evt.value);
      }),
      catchError((error : unknown) : Observable<never> => {
        throw errorSelector(error);
      }));
  }

  return {
    /**
     * Fetch the manifest corresponding to the URL given.
     * @param {string} url - URL of the manifest
     * @returns {Observable}
     */
    fetch(url : string) : Observable<IPipelineLoaderResponse<ILoadedManifest>> {
      return loader({ url }).pipe(
        tap((arg) => {
          if (arg.type === "warning") {
            warning$.next(arg.value); // TODO not through warning$
          }
        }),
        filter((arg) : arg is IPipelineLoaderResponse<ILoadedManifest> =>
          arg.type === "response"
        )
      );
    },

    /**
     * Fetch the manifest corresponding to the URL given.
     * @param {Object} value - The Manifest document to parse.
     * @param {string} [url] - URL of the manifest
     * @param {number} [externalClockOffset]
     * @returns {Observable}
     */
    parse(
      value : IPipelineLoaderResponseValue<ILoadedManifest>,
      fetchedURL? : string,
      externalClockOffset? : number
    ) : Observable<IFetchManifestResult> {
      const { sendingTime, receivedTime } = value;
      const parsingTimeStart = performance.now();
      return parser({ response: value,
                      url: fetchedURL,
                      externalClockOffset,
                      scheduleRequest,
      }).pipe(
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
          const parsingTime = performance.now() - parsingTimeStart;
          return { manifest, sendingTime, receivedTime, parsingTime };
        })
      );
    },
  };
}
