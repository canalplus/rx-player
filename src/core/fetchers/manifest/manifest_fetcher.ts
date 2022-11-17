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
import assert from "../../../utils/assert";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import errorSelector from "../utils/error_selector";
import {
  IBackoffSettings,
  scheduleRequestPromise,
} from "../utils/schedule_request";


/** What will be sent once parsed. */
export interface IManifestFetcherParsedResult {
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

/** Response emitted by a Manifest fetcher. */
export interface IManifestFetcherResponse {
  /** Allows to parse a fetched Manifest into a `Manifest` structure. */
  parse(parserOptions : IManifestFetcherParserOptions) :
    Promise<IManifestFetcherParsedResult>;
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
  /**
   * Timeout after which request are aborted and, depending on other options,
   * retried.
   * To set to `-1` for no timeout.
   * `undefined` will lead to a default, large, timeout being used.
   */
  requestTimeout : number | undefined;
}

/**
 * Class allowing to facilitate the task of loading and parsing a Manifest.
 * @class ManifestFetcher
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
   * @param {string} url
   * @param {Function} onWarning
   * @param {Object} cancelSignal
   * @returns {Promise}
   */
  public async fetch(
    url : string | undefined,
    onWarning : (err : IPlayerError) => void,
    cancelSignal : CancellationSignal
  ) : Promise<IManifestFetcherResponse> {
    const settings = this._settings;
    const pipelines = this._pipelines;
    const requestUrl = url ?? this._manifestUrl;

    const backoffSettings = this._getBackoffSetting((err) => {
      onWarning(errorSelector(err));
    });

    const loadingPromise = pipelines.resolveManifestUrl === undefined ?
      callLoaderWithRetries(requestUrl) :
      callResolverWithRetries(requestUrl).then(callLoaderWithRetries);

    try {
      const response = await loadingPromise;
      return {
        parse: (parserOptions : IManifestFetcherParserOptions) => {
          return this._parseLoadedManifest(response,
                                           parserOptions,
                                           onWarning,
                                           cancelSignal);
        },
      };
    } catch (err) {
      if (err instanceof CancellationSignal) {
        throw err;
      }
      throw errorSelector(err);
    }

    /**
     * Call the resolver part of the pipeline, retrying if it fails according
     * to the current settings.
     * Returns the Promise of the last attempt.
     * /!\ This pipeline should have a `resolveManifestUrl` function defined.
     * @param {string | undefined}  resolverUrl
     * @returns {Promise}
     */
    function callResolverWithRetries(resolverUrl : string | undefined) {
      const { resolveManifestUrl } = pipelines;
      assert(resolveManifestUrl !== undefined);
      const callResolver = () => resolveManifestUrl(resolverUrl, cancelSignal);
      return scheduleRequestPromise(callResolver, backoffSettings, cancelSignal);
    }

    /**
     * Call the loader part of the pipeline, retrying if it fails according
     * to the current settings.
     * Returns the Promise of the last attempt.
     * @param {string | undefined} manifestUrl
     * @returns {Promise}
     */
    function callLoaderWithRetries(manifestUrl : string | undefined) {
      const { loadManifest } = pipelines;
      let requestTimeout : number | undefined =
        isNullOrUndefined(settings.requestTimeout) ?
          config.getCurrent().DEFAULT_REQUEST_TIMEOUT :
          settings.requestTimeout;
      if (requestTimeout < 0) {
        requestTimeout = undefined;
      }
      const callLoader = () => loadManifest(manifestUrl,
                                            { timeout: requestTimeout },
                                            cancelSignal);
      return scheduleRequestPromise(callLoader, backoffSettings, cancelSignal);
    }
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
   * @param {Function} onWarning
   * @param {Object} cancelSignal
   * @returns {Promise}
   */
  public parse(
    manifest : unknown,
    parserOptions : IManifestFetcherParserOptions,
    onWarning : (err : IPlayerError) => void,
    cancelSignal : CancellationSignal
  ) : Promise<IManifestFetcherParsedResult> {
    return this._parseLoadedManifest({ responseData: manifest,
                                       size: undefined,
                                       requestDuration: undefined },
                                     parserOptions,
                                     onWarning,
                                     cancelSignal);

  }

  /**
   * Parse a Manifest.
   *
   * @param {Object} loaded - Information about the loaded Manifest as well as
   * about the corresponding request.
   * @param {Object} parserOptions - Options used when parsing the Manifest.
   * @param {Function} onWarning
   * @param {Object} cancelSignal
   * @returns {Promise}
   */
  private async _parseLoadedManifest(
    loaded : IRequestedData<unknown>,
    parserOptions : IManifestFetcherParserOptions,
    onWarning : (err : IPlayerError) => void,
    cancelSignal : CancellationSignal
  ) : Promise<IManifestFetcherParsedResult> {
    const parsingTimeStart = performance.now();
    const canceller = new TaskCanceller();
    const { sendingTime, receivedTime } = loaded;
    const backoffSettings = this._getBackoffSetting((err) => {
      onWarning(errorSelector(err));
    });

    const opts = { externalClockOffset: parserOptions.externalClockOffset,
                   unsafeMode: parserOptions.unsafeMode,
                   previousManifest: parserOptions.previousManifest,
                   originalUrl: this._manifestUrl };
    try {
      const res = this._pipelines.parseManifest(loaded,
                                                opts,
                                                onWarnings,
                                                cancelSignal,
                                                scheduleRequest);
      if (!isPromise(res)) {
        return finish(res.manifest);
      } else {
        const { manifest } = await res;
        return finish(manifest);
      }
    } catch (err) {
      const formattedError = formatError(err, {
        defaultCode: "PIPELINE_PARSE_ERROR",
        defaultReason: "Unknown error when parsing the Manifest",
      });
      throw formattedError;
    }

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
        const data = await scheduleRequestPromise(performRequest,
                                                  backoffSettings,
                                                  cancelSignal);
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
        const formattedError = formatError(warning, {
          defaultCode: "PIPELINE_PARSE_ERROR",
          defaultReason: "Unknown error when parsing the Manifest",
        });
        onWarning(formattedError);
      }
    }

    /**
     * Emit a formatted "parsed" event through `obs`.
     * To call once the Manifest has been parsed.
     * @param {Object} manifest
     */
    function finish(manifest : Manifest) : IManifestFetcherParsedResult {
      onWarnings(manifest.contentWarnings);
      const parsingTime = performance.now() - parsingTimeStart;
      log.info(`MF: Manifest parsed in ${parsingTime}ms`);

      return { manifest,
               sendingTime,
               receivedTime,
               parsingTime };
    }
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
