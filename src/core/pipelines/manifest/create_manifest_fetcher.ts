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
  tap,
} from "rxjs/operators";
import {
  formatError,
  ICustomError,
} from "../../../errors";
import Manifest from "../../../manifest";
import {
  ILoadedManifest,
  ILoaderDataLoadedValue,
  ITransportPipelines,
} from "../../../transports";
import createRequestScheduler from "../utils/create_request_scheduler";
import createManifestLoader, {
  IPipelineLoaderResponse,
} from "./create_manifest_loader";
import getManifestBackoffOptions from "./get_manifest_backoff_options";

/** What will be sent once parsed. */
export interface IManifestFetcherParsedResult {
  /** The resulting Manifest */
  manifest : Manifest;
  /**
   * The time (`performance.now()`) at which the request was started (at which
   * the JavaScript call was done).
   */
  sendingTime? : number;
  /* The time (`performance.now()`) at which the request was fully received. */
  receivedTime? : number;
  /* The time taken to parse the Manifest through the corresponding parse function. */
  parsingTime : number;
}

/** Response emitted by a Manifest fetcher. */
export interface IManifestFetcherResponse {
  /** Allows to parse a fetched Manifest into a `Manifest` structure. */
  parse(parserOptions : { externalClockOffset? : number }) :
    Observable<IManifestFetcherParsedResult>;
}

/** The Manifest fetcher generated here. */
export interface IManifestFetcher {
  /** Allows to perform the Manifest request. */
  fetch(url? : string) : Observable<IManifestFetcherResponse>;
}

/** Options used by `createManifestFetcher`. */
export interface IManifestFetcherBackoffOptions {
  /**
   * Whether the content is played in a low-latency mode.
   * This has an impact on default backoff delays.
   */
  lowLatencyMode : boolean;
  /** Maximum number of time a request on error will be retried. */
  maxRetryRegular : number | undefined;
  /** Maximum number of time a request be retried when the user is offline. */
  maxRetryOffline : number | undefined;
}

/**
 * Create function allowing to easily fetch and parse a Manifest from its URL.
 * @example
 * ```js
 * const manifestFetcher = createManifestFetcher(pipelines, options, warning$);
 * manifestFetcher.fetch(manifestURL).pipe(
 *   filter((evt) => {
 *     return evt.type === "response"; // Might also receive warning events
 *   }),
 *   mergeMap(evt => manifestFetcher.parse(evt.value))
 * ).subscribe(({ manifest }) => console.log("Manifest:", manifest));
 * ```
 * @param {Object} pipelines
 * @param {Subject} backoffOptions
 * @param {Subject} warning$
 * @returns {Object}
 */
export default function createManifestFetcher(
  pipelines : ITransportPipelines,
  options : IManifestFetcherBackoffOptions,
  warning$ : Subject<ICustomError>
) : IManifestFetcher {
  const backoffOptions = getManifestBackoffOptions(options);
  const loader = createManifestLoader(pipelines.manifest, backoffOptions);
  const { parser } = pipelines.manifest;

  type IRequestSchedulerData = ILoaderDataLoadedValue<string | Document>;
  const scheduleRequest = createRequestScheduler<IRequestSchedulerData>(backoffOptions,
                                                                        warning$);

  return {
    /**
     * Fetch the manifest corresponding to the URL given.
     * @param {string} url - URL of the manifest
     * @returns {Observable}
     */
    fetch(url : string) : Observable<IManifestFetcherResponse> {
      return loader({ url }).pipe(
        tap((arg) => {
          if (arg.type === "warning") {
            warning$.next(arg.value); // TODO not through warning$
          }
        }),
        filter((arg) : arg is IPipelineLoaderResponse<ILoadedManifest> =>
          arg.type === "response"
        ),
        map(
          ({ value } : IPipelineLoaderResponse<ILoadedManifest>
        ) : IManifestFetcherResponse => {
          const { sendingTime, receivedTime } = value;
          const parsingTimeStart = performance.now();
          return {
            parse(
              parserOptions : { externalClockOffset? : number }
            ) : Observable<IManifestFetcherParsedResult> {
              return parser({ response: value,
                              url,
                              externalClockOffset: parserOptions.externalClockOffset,
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
                }));
            },
          };
        }));
    },
  };
}
