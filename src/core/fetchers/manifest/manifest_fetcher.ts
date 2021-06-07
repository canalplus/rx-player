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
  of as observableOf,
  Subject,
} from "rxjs";
import {
  catchError,
  finalize,
  map,
  mergeMap,
} from "rxjs/operators";
import {
  formatError,
  ICustomError,
} from "../../../errors";
import log from "../../../log";
import Manifest from "../../../manifest";
import {
  ILoaderDataLoadedValue,
  IManifestLoaderArguments,
  IManifestLoaderFunction,
  IManifestResolverFunction,
  ITransportManifestPipeline,
  ITransportPipelines,
} from "../../../transports";
import tryCatch$ from "../../../utils/rx-try_catch";
import createRequestScheduler from "../utils/create_request_scheduler";
import errorSelector from "../utils/error_selector";
import {
  IBackoffOptions,
  tryRequestObservableWithBackoff,
} from "../utils/try_urls_with_backoff";
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
  parsingTime? : number;
}

/** Emitted when a fetching or parsing minor error happened. */
export interface IManifestFetcherWarningEvent {
  /** To differentiate it from other events. */
  type : "warning";

  /** The error in question. */
  value : ICustomError;
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
 * Class allowing to facilitate the task of loading and parsing a Manifest.
 * @class ManifestFetcher
 * @example
 * ```js
 * const manifestFetcher = new ManifestFetcher(manifestUrl, pipelines, options);
 * manifestFetcher.fetch().pipe(
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
 */
export default class ManifestFetcher {
  private _backoffOptions : IBackoffOptions;
  private _manifestUrl : string | undefined;
  private _pipelines : ITransportManifestPipeline;

  /**
   * @param {string | undefined} url
   * @param {Object} pipelines
   * @param {Object} backoffOptions
   */
  constructor(
    url : string | undefined,
    pipelines : ITransportPipelines,
    backoffOptions : IManifestFetcherBackoffOptions
  ) {
    this._manifestUrl = url;
    this._pipelines = pipelines.manifest;
    this._backoffOptions = getManifestBackoffOptions(backoffOptions);
  }

  /**
   * (re-)Load the Manifest without yet parsing it.
   *
   * You can set an `url` on which that Manifest will be requested.
   * If not set, the regular Manifest url - defined on the
   * `ManifestFetcher` instanciation - will be used instead.
   * @param {string} [url]
   * @returns {Observable}
   */
  public fetch(url? : string) : Observable<IManifestFetcherResponse |
                                   IManifestFetcherWarningEvent> {
    const requestUrl = url ?? this._manifestUrl;

    // TODO Remove the resolver completely in the next major version
    const resolver : IManifestResolverFunction =
      this._pipelines.resolver ??
      observableOf;

    const loader : IManifestLoaderFunction = this._pipelines.loader;

    return tryCatch$(resolver, { url: requestUrl }).pipe(
      catchError((error : Error) : Observable<never> => {
        throw errorSelector(error);
      }),
      mergeMap((loaderArgument : IManifestLoaderArguments) => {
        const loader$ = tryCatch$(loader, loaderArgument);
        return tryRequestObservableWithBackoff(loader$, this._backoffOptions).pipe(
          catchError((error : unknown) : Observable<never> => {
            throw errorSelector(error);
          }),
          map((evt) => {
            return evt.type === "retry" ?
              ({ type: "warning" as const, value: errorSelector(evt.value) }) :
              ({
                type: "response" as const,
                parse: (parserOptions : IManifestFetcherParserOptions) => {
                  return this._parseLoadedManifest(evt.value.value, parserOptions);
                },
              });
          }));
      }));
  }

  /**
   * Parse an already loaded Manifest.
   *
   * This method should be reserved for Manifests for which no request has been
   * done.
   * In other cases, it's preferable to go through the `fetch` method, so
   * information on the request can be used by the parsing process.
   * @param {*} manifest
   * @param {Object} parserOptions
   * @returns {Observable}
   */
  public parse(
    manifest : unknown,
    parserOptions : IManifestFetcherParserOptions
  ) : Observable<IManifestFetcherWarningEvent |
                 IManifestFetcherParsedResult> {
    return this._parseLoadedManifest({ responseData: manifest,
                                       size: undefined,
                                       duration: undefined },
                                     parserOptions);

  }

  /**
   * Parse a Manifest.
   *
   * @param {Object} loaded - Information about the loaded Manifest as well as
   * about the corresponding request.
   * @param {Object} parserOptions - Options used when parsing the Manifest.
   * @returns {Observable}
   */
  private _parseLoadedManifest(
    loaded : ILoaderDataLoadedValue<unknown>,
    parserOptions : IManifestFetcherParserOptions
  ) : Observable<IManifestFetcherWarningEvent |
                 IManifestFetcherParsedResult> {
    const { sendingTime, receivedTime } = loaded;
    const parsingTimeStart = performance.now();

    // Prepare RequestScheduler
    // TODO Remove the need of a subject
    type IRequestSchedulerData = ILoaderDataLoadedValue<string | ArrayBuffer | Document>;
    const schedulerWarnings$ = new Subject<ICustomError>();
    const scheduleRequest =
      createRequestScheduler<IRequestSchedulerData>(this._backoffOptions,
                                                    schedulerWarnings$);

    return observableMerge(
      schedulerWarnings$
        .pipe(map(err => ({ type: "warning" as const, value: err }))),
      this._pipelines.parser({ response: loaded,
                               url: this._manifestUrl,
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
          log.info(`MF: Manifest parsed in ${parsingTime}ms`);

          return { type: "parsed" as const,
                   manifest: parsingEvt.value.manifest,
                   sendingTime,
                   receivedTime,
                   parsingTime };

        }),
        finalize(() => { schedulerWarnings$.complete(); })
      ));
  }
}
