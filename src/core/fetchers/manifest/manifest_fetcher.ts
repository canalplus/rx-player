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
} from "rxjs";
import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import Manifest from "../../../manifest";
import { IPlayerError } from "../../../public_types";
import {
  IRequestedData,
  ITransportManifestPipeline,
  ITransportPipelines,
} from "../../../transports";
import TaskCanceller from "../../../utils/task_canceller";
import errorSelector from "../utils/error_selector";
import {
  IBackoffSettings,
  tryRequestPromiseWithBackoff,
} from "../utils/try_urls_with_backoff";


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
  sendingTime? : number | undefined;
  /** The time (`performance.now()`) at which the request was fully received. */
  receivedTime? : number | undefined;
  /* The time taken to parse the Manifest through the corresponding parse function. */
  parsingTime? : number | undefined;
}

/** Emitted when a fetching or parsing minor error happened. */
export interface IManifestFetcherWarningEvent {
  /** To differentiate it from other events. */
  type : "warning";

  /** The error in question. */
  value : IPlayerError;
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
  externalClockOffset? : number | undefined;
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
export interface IManifestFetcherSettings {
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
  private _settings : IManifestFetcherSettings;
  private _manifestUrl : string | undefined;
  private _pipelines : ITransportManifestPipeline;

  /**
   * Construct a new ManifestFetcher.
   * @param {string | undefined} url - Default Manifest url, will be used when
   * no URL is provided to the `fetch` function.
   * `undefined` if unknown or if a Manifest should be retrieved through other
   * means than an HTTP request.
   * @param {Object} pipelines - Transport pipelines used to perform the
   * Manifest loading and parsing operations.
   * @param {Object} settings - Configure the `ManifestFetcher`.
   */
  constructor(
    url : string | undefined,
    pipelines : ITransportPipelines,
    settings : IManifestFetcherSettings
  ) {
    this._manifestUrl = url;
    this._pipelines = pipelines.manifest;
    this._settings = settings;
  }

  /**
   * (re-)Load the Manifest.
   * This method does not yet parse it, parsing will then be available through
   * a callback available on the response.
   *
   * You can set an `url` on which that Manifest will be requested.
   * If not set, the regular Manifest url - defined on the `ManifestFetcher`
   * instanciation - will be used instead.
   *
   * @param {string} [url]
   * @returns {Observable}
   */
  public fetch(url? : string) : Observable<IManifestFetcherResponse |
                                           IManifestFetcherWarningEvent>
  {
    return new Observable((obs) => {
      const pipelines = this._pipelines;
      const requestUrl = url ?? this._manifestUrl;

      /** `true` if the loading pipeline is already completely executed. */
      let hasFinishedLoading = false;

      /** Allows to cancel the loading operation. */
      const canceller = new TaskCanceller();

      const backoffSettings = this._getBackoffSetting((err) => {
        obs.next({ type: "warning", value: errorSelector(err) });
      });

      callLoaderWithRetries(requestUrl)
        .then(response => {
          hasFinishedLoading = true;
          obs.next({
            type: "response",
            parse: (parserOptions : IManifestFetcherParserOptions) => {
              return this._parseLoadedManifest(response, parserOptions);
            },
          });
          obs.complete();
        })
        .catch((err : unknown) => {
          if (canceller.isUsed) {
            // Cancellation has already been handled by RxJS
            return;
          }
          hasFinishedLoading = true;
          obs.error(errorSelector(err));
        });

      return () => {
        if (!hasFinishedLoading) {
          canceller.cancel();
        }
      };

      /**
       * Call the loader part of the pipeline, retrying if it fails according
       * to the current settings.
       * Returns the Promise of the last attempt.
       * @param {string | undefined}  resolverUrl
       * @returns {Promise}
       */
      function callLoaderWithRetries(manifestUrl : string | undefined) {
        const { loadManifest } = pipelines;
        const callLoader = () => loadManifest(manifestUrl, canceller.signal);
        return tryRequestPromiseWithBackoff(callLoader,
                                            backoffSettings,
                                            canceller.signal);
      }
    });
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
                                       requestDuration: undefined },
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
    loaded : IRequestedData<unknown>,
    parserOptions : IManifestFetcherParserOptions
  ) : Observable<IManifestFetcherWarningEvent |
                 IManifestFetcherParsedResult>
  {
    return new Observable(obs => {
      const parsingTimeStart = performance.now();
      const canceller = new TaskCanceller();
      const { sendingTime, receivedTime } = loaded;
      const backoffSettings = this._getBackoffSetting((err) => {
        obs.next({ type: "warning", value: errorSelector(err) });
      });

      const opts = { externalClockOffset: parserOptions.externalClockOffset,
                     unsafeMode: parserOptions.unsafeMode,
                     previousManifest: parserOptions.previousManifest,
                     originalUrl: this._manifestUrl };
      try {
        const res = this._pipelines.parseManifest(loaded,
                                                  opts,
                                                  onWarnings,
                                                  canceller.signal,
                                                  scheduleRequest);
        if (!isPromise(res)) {
          emitManifestAndComplete(res.manifest);
        } else {
          res
            .then(({ manifest }) => emitManifestAndComplete(manifest))
            .catch((err) => {
              if (canceller.isUsed) {
                // Cancellation is already handled by RxJS
                return;
              }
              emitError(err, true);
            });
        }
      } catch (err) {
        if (canceller.isUsed) {
          // Cancellation is already handled by RxJS
          return undefined;
        }
        emitError(err, true);
      }

      return () => {
        canceller.cancel();
      };

      /**
       * Perform a request with the same retry mechanisms and error handling
       * than for a Manifest loader.
       * @param {Function} performRequest
       * @returns {Function}
       */
      async function scheduleRequest<T>(
        performRequest : () => Promise<T>
      ) : Promise<T> {
        try {
          const data = await tryRequestPromiseWithBackoff(performRequest,
                                                          backoffSettings,
                                                          canceller.signal);
          return data;
        } catch (err) {
          throw errorSelector(err);
        }
      }

      /**
       * Handle minor errors encountered by a Manifest parser.
       * @param {Array.<Error>} warnings
       */
      function onWarnings(warnings : Error[]) : void {
        for (const warning of warnings) {
          if (canceller.isUsed) {
            return;
          }
          emitError(warning, false);
        }
      }

      /**
       * Emit a formatted "parsed" event through `obs`.
       * To call once the Manifest has been parsed.
       * @param {Object} manifest
       */
      function emitManifestAndComplete(manifest : Manifest) : void {
        onWarnings(manifest.contentWarnings);
        const parsingTime = performance.now() - parsingTimeStart;
        log.info(`MF: Manifest parsed in ${parsingTime}ms`);

        obs.next({ type: "parsed" as const,
                   manifest,
                   sendingTime,
                   receivedTime,
                   parsingTime });
        obs.complete();
      }

      /**
       * Format the given Error and emit it through `obs`.
       * Either through a `"warning"` event, if `isFatal` is `false`, or through
       * a fatal Observable error, if `isFatal` is set to `true`.
       * @param {*} err
       * @param {boolean} isFatal
       */
      function emitError(err : unknown, isFatal : boolean) : void {
        const formattedError = formatError(err, {
          defaultCode: "PIPELINE_PARSE_ERROR",
          defaultReason: "Unknown error when parsing the Manifest",
        });
        if (isFatal) {
          obs.error(formattedError);
        } else {
          obs.next({ type: "warning" as const,
                     value: formattedError });
        }
      }
    });
  }

  /**
   * Construct "backoff settings" that can be used with a range of functions
   * allowing to perform multiple request attempts
   * @param {Function} onRetry
   * @returns {Object}
   */
  private _getBackoffSetting(onRetry : (err : unknown) => void) : IBackoffSettings {
    const { DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
            DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
            INITIAL_BACKOFF_DELAY_BASE,
            MAX_BACKOFF_DELAY_BASE } = config.getCurrent();
    const { lowLatencyMode,
            maxRetryRegular : ogRegular,
            maxRetryOffline : ogOffline } = this._settings;
    const baseDelay = lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY :
                                       INITIAL_BACKOFF_DELAY_BASE.REGULAR;
    const maxDelay = lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY :
                                      MAX_BACKOFF_DELAY_BASE.REGULAR;
    const maxRetryRegular = ogRegular ?? DEFAULT_MAX_MANIFEST_REQUEST_RETRY;
    const maxRetryOffline = ogOffline ?? DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE;
    return { onRetry,
             baseDelay,
             maxDelay,
             maxRetryRegular,
             maxRetryOffline };
  }
}

/**
 * Returns `true` when the returned value seems to be a Promise instance, as
 * created by the RxPlayer.
 * @param {*} val
 * @returns {boolean}
 */
function isPromise<T>(val : T | Promise<T>) : val is Promise<T> {
  return val instanceof Promise;
}
