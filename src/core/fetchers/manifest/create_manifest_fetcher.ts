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
  merge as observableMerge,
  Observable,
  Subject,
} from "rxjs";
import {
  catchError,
  finalize,
  map,
} from "rxjs/operators";
import {
  formatError,
  ICustomError,
} from "../../../errors";
import Manifest from "../../../manifest";
import {
  ILoaderDataLoadedValue,
  ITransportPipelines,
} from "../../../transports";
import createRequestScheduler from "../utils/create_request_scheduler";
import createManifestLoader from "./create_manifest_loader";
import getManifestBackoffOptions from "./get_manifest_backoff_options";

/** What will be sent once parsed. */
export interface IManifestFetcherParsedResult {
  /** To differentiate it from a "warning" event. */
  type : "parsed";

  /** The resulting Manifest */
  manifest : Manifest;
  /**
   * The time (`performance.now()`) at which the request was started (at which
   * the JavaScript call was done).
   */
  sendingTime? : number;
  /** The time (`performance.now()`) at which the request was fully received. */
  receivedTime? : number;
  /* The time taken to parse the Manifest through the corresponding parse function. */
  parsingTime : number;
}

/** Emitted when a fetching or parsing minor error happened. */
export interface IManifestFetcherWarningEvent {
  /** To differentiate it from other events. */
  type : "warning";

  /** The error in question. */
  value : ICustomError;
}

export interface IManifestFetcherParserOptions {
  /**
   * If set, offset to add to `performance.now()` to obtain the current
   * server's time.
   */
  externalClockOffset? : number;
  /** The previous value of the Manifest (when updating). */
  previousManifest : Manifest | null;
  /**
   * If set to `true`, the Manifest parser can perform advanced optimizations
   * to speed-up the parsing process. Those optimizations might lead to a
   * de-synchronization with what is actually on the server, hence the "unsafe"
   * part.
   * To use with moderation and only when needed.
   */
  unsafeMode : boolean;
}

/** Response emitted by a Manifest fetcher. */
export interface IManifestFetcherResponse {
  /** To differentiate it from a "warning" event. */
  type : "response";

  /** Allows to parse a fetched Manifest into a `Manifest` structure. */
  parse(parserOptions : IManifestFetcherParserOptions) :
    Observable<IManifestFetcherWarningEvent |
               IManifestFetcherParsedResult>;
}

/** The Manifest fetcher generated here. */
export interface IManifestFetcher {
  /** Allows to perform the Manifest request. */
  fetch(url? : string) : Observable<IManifestFetcherWarningEvent |
                                    IManifestFetcherResponse>;
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
 * const manifestFetcher = createManifestFetcher(pipelines, options);
 * manifestFetcher.fetch(manifestURL).pipe(
 *   // Filter only responses (might also receive warning events)
 *   filter((evt) => evt.type === "response");
 *   // Parse the Manifest
 *   mergeMap(res => res.parse({ externalClockOffset }))
 *   // (again)
 *   filter((evt) => evt.type === "parsed");
 * ).subscribe(({ value }) => {
 *   console.log("Manifest:", value.manifest);
 * });
 * ```
 * @param {Object} pipelines
 * @param {Subject} backoffOptions
 * @returns {Object}
 */
export default function createManifestFetcher(
  pipelines : ITransportPipelines,
  options : IManifestFetcherBackoffOptions
) : IManifestFetcher {
  const backoffOptions = getManifestBackoffOptions(options);
  const loader = createManifestLoader(pipelines.manifest, backoffOptions);
  const { parser } = pipelines.manifest;

  return {
    /**
     * Fetch the manifest corresponding to the URL given.
     * @param {string} url - URL of the manifest
     * @returns {Observable}
     */
    fetch(url : string) : Observable<IManifestFetcherWarningEvent |
                                     IManifestFetcherResponse> {
      return loader({ url }).pipe(
        map((evt) : IManifestFetcherWarningEvent | IManifestFetcherResponse => {
          if (evt.type === "warning") {
            return evt;
          }
          const { sendingTime, receivedTime } = evt.value;
          const parsingTimeStart = performance.now();

          // Prepare RequestScheduler
          // TODO Remove the need of a subject
          type IRequestSchedulerData = ILoaderDataLoadedValue<string | Document>;
          const schedulerWarnings$ = new Subject<ICustomError>();
          const scheduleRequest =
            createRequestScheduler<IRequestSchedulerData>(backoffOptions,
                                                          schedulerWarnings$);

          return {
            type: "response",
            parse(parserOptions : IManifestFetcherParserOptions) {
              return observableMerge(
                schedulerWarnings$
                  .pipe(map(err => ({ type: "warning" as const, value: err }))),
                parser({ response: evt.value,
                         url,
                         externalClockOffset: parserOptions.externalClockOffset,
                         previousManifest: parserOptions.previousManifest,
                         scheduleRequest,
                         unsafeMode: parserOptions.unsafeMode,
                }).pipe(
                  catchError((error: unknown) => {
                    throw formatError(error, {
                      defaultCode: "PIPELINE_PARSE_ERROR",
                      defaultReason: "Unknown error when parsing the Manifest",
                    });
                  }),
                  map((parsingEvt) => {
                    if (parsingEvt.type === "warning") {
                      const formatted = formatError(parsingEvt.value, {
                        defaultCode: "PIPELINE_PARSE_ERROR",
                        defaultReason: "Unknown error when parsing the Manifest",
                      });
                      return { type: "warning" as const,
                               value: formatted };
                    }

                    // 2 - send response
                    const parsingTime = performance.now() - parsingTimeStart;
                    return { type: "parsed" as const,
                             manifest: parsingEvt.value.manifest,
                             sendingTime,
                             receivedTime,
                             parsingTime };

                  }),
                  finalize(() => { schedulerWarnings$.complete(); })
                ));
              },
            };
          }));
    },
  };
}
