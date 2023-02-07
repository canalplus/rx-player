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
import {
  IInitialManifest,
  ILoadedManifestFormat,
  IPlayerError,
} from "../../../public_types";
import {
  IRequestedData,
  ITransportManifestPipeline,
  ITransportPipelines,
} from "../../../transports";
import assert from "../../../utils/assert";
import EventEmitter from "../../../utils/event_emitter";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import noop from "../../../utils/noop";
import TaskCanceller from "../../../utils/task_canceller";
import errorSelector from "../utils/error_selector";
import {
  IBackoffSettings,
  scheduleRequestPromise,
} from "../utils/schedule_request";

/**
 * Class allowing to facilitate the task of loading and parsing a Manifest, as
 * well as automatically refreshing it.
 * @class ManifestFetcher
 */
export default class ManifestFetcher extends EventEmitter<IManifestFetcherEvent> {
  /**
   * Allows to manually trigger a Manifest refresh.
   * Will only have an effect if the Manifest has been fetched at least once.
   * @param {Object} settings - refresh configuration.
   */
  public scheduleManualRefresh : (settings : IManifestRefreshSettings) => void;

  /** `ManifestFetcher` configuration. */
  private _settings : IManifestFetcherSettings;
  /** URLs through which the Manifest may be reached, by order of priority. */
  private _manifestUrls : string[] | undefined;
  /**
   * Manifest loading and parsing pipelines linked to the current transport
   * protocol used.
   */
  private _pipelines : ITransportManifestPipeline;
  /**
   * `TaskCanceller` called when this `ManifestFetcher` is disposed, to clean
   * resources.
   */
  private _canceller : TaskCanceller;
  /**
   * Set to `true` once the Manifest has been fetched at least once through this
   * `ManifestFetcher`.
   */
  private _isStarted : boolean;
  /**
   * Set to `true` when a Manifest refresh is currently pending.
   * Allows to avoid doing multiple concurrent Manifest refresh, as this is
   * most of the time unnecessary.
   */
  private _isRefreshPending;
  /** Number of consecutive times the Manifest parsing has been done in `unsafeMode`. */
  private _consecutiveUnsafeMode;
  /**
   * If set to a string or `undefined`, the given URL should be prioritized on
   * the next Manifest fetching operation, it can then be reset to `null`.
   */
  private _prioritizedContentUrl : string | undefined | null;

  /**
   * Construct a new ManifestFetcher.
   * @param {Array.<string> | undefined} urls - Manifest URLs, will be used when
   * no URL is provided to the `fetch` function.
   * `undefined` if unknown or if a Manifest should be retrieved through other
   * means than an HTTP request.
   * @param {Object} pipelines - Transport pipelines used to perform the
   * Manifest loading and parsing operations.
   * @param {Object} settings - Configure the `ManifestFetcher`.
   */
  constructor(
    urls : string[] | undefined,
    pipelines : ITransportPipelines,
    settings : IManifestFetcherSettings
  ) {
    super();
    this.scheduleManualRefresh = noop;
    this._manifestUrls = urls;
    this._pipelines = pipelines.manifest;
    this._settings = settings;
    this._canceller = new TaskCanceller();
    this._isStarted = false;
    this._isRefreshPending = false;
    this._consecutiveUnsafeMode = 0;
    this._prioritizedContentUrl = null;
  }

  /**
   * Free resources and stop refresh mechanism from happening.
   *
   * Once `dispose` has been called. This `ManifestFetcher` cannot be relied on
   * anymore.
   */
  public dispose() {
    this._canceller.cancel();
    this.removeEventListener();
  }

  /**
   * Start requesting the Manifest as well as the Manifest refreshing logic, if
   * needed.
   *
   * Once `start` has been called, this mechanism can only be stopped by calling
   * `dispose`.
   */
  public start() : void {
    if (this._isStarted) {
      return;
    }
    this._isStarted = true;

    let manifestProm : Promise<IManifestFetcherParsedResult>;

    const initialManifest = this._settings.initialManifest;
    if (initialManifest instanceof Manifest) {
      manifestProm = Promise.resolve({ manifest: initialManifest });
    } else if (initialManifest !== undefined) {
      manifestProm = this.parse(initialManifest,
                                { previousManifest: null, unsafeMode: false },
                                undefined);
    } else {
      manifestProm = this._fetchManifest(undefined)
        .then((val) => {
          return val.parse({ previousManifest: null, unsafeMode: false });
        });
    }

    manifestProm
      .then((val : IManifestFetcherParsedResult) => {
        this.trigger("manifestReady", val.manifest);
        if (!this._canceller.isUsed()) {
          this._recursivelyRefreshManifest(val.manifest, val);
        }
      })
      .catch((err : unknown) => this._onFatalError(err));
  }

  /**
   * Update URL of the fetched Manifest.
   * @param {Array.<string> | undefined} urls - New Manifest URLs by order of
   * priority or `undefined` if there's now no URL.
   * @param {boolean} refreshNow - If set to `true`, the next Manifest refresh
   * will be triggered immediately.
   */
  public updateContentUrls(urls : string[] | undefined, refreshNow : boolean) : void {
    this._prioritizedContentUrl = urls?.[0] ?? undefined;
    if (refreshNow) {
      this.scheduleManualRefresh({
        enablePartialRefresh: false,
        delay: 0,
        canUseUnsafeMode: false,
      });
    }
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
   * @param {string | undefined} url
   * @returns {Promise}
   */
  private async _fetchManifest(
    url : string | undefined
  ) : Promise<IManifestFetcherResponse> {
    const cancelSignal = this._canceller.signal;
    const settings = this._settings;
    const pipelines = this._pipelines;

    // TODO Better handle multiple Manifest URLs
    const requestUrl = url ?? this._manifestUrls?.[0];

    const backoffSettings = this._getBackoffSetting((err) => {
      this.trigger("warning", errorSelector(err));
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
                                           requestUrl);
        },
      };
    } catch (err) {
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
    function callResolverWithRetries(
      resolverUrl : string | undefined
    ) : Promise<string | undefined> {
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
    function callLoaderWithRetries(
      manifestUrl : string | undefined
    ) : Promise<IRequestedData<ILoadedManifestFormat>> {
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
   * @param {string | undefined} originalUrl
   * @returns {Promise}
   */
  private parse(
    manifest : unknown,
    parserOptions : IManifestFetcherParserOptions,
    originalUrl : string | undefined
  ) : Promise<IManifestFetcherParsedResult> {
    return this._parseLoadedManifest({ responseData: manifest,
                                       size: undefined,
                                       requestDuration: undefined },
                                     parserOptions,
                                     originalUrl);

  }

  /**
   * Parse a Manifest.
   *
   * @param {Object} loaded - Information about the loaded Manifest as well as
   * about the corresponding request.
   * @param {Object} parserOptions - Options used when parsing the Manifest.
   * @param {string | undefined} requestUrl
   * @returns {Promise}
   */
  private async _parseLoadedManifest(
    loaded : IRequestedData<unknown>,
    parserOptions : IManifestFetcherParserOptions,
    requestUrl : string | undefined
  ) : Promise<IManifestFetcherParsedResult> {
    const parsingTimeStart = performance.now();
    const cancelSignal = this._canceller.signal;
    const trigger = this.trigger.bind(this);
    const { sendingTime, receivedTime } = loaded;
    const backoffSettings = this._getBackoffSetting((err) => {
      this.trigger("warning", errorSelector(err));
    });

    const originalUrl = requestUrl ?? this._manifestUrls?.[0];
    const opts = { externalClockOffset: parserOptions.externalClockOffset,
                   unsafeMode: parserOptions.unsafeMode,
                   previousManifest: parserOptions.previousManifest,
                   originalUrl };
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
        if (cancelSignal.isCancelled()) {
          return;
        }
        const formattedError = formatError(warning, {
          defaultCode: "PIPELINE_PARSE_ERROR",
          defaultReason: "Unknown error when parsing the Manifest",
        });
        trigger("warning", formattedError);
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

  /**
   * Performs Manifest refresh (recursively) when it judges it is time to do so.
   * @param {Object} manifest
   * @param {Object} manifestRequestInfos - Various information linked to the
   * last Manifest loading and parsing operations.
   */
  private _recursivelyRefreshManifest (
    manifest : Manifest,
    { sendingTime, parsingTime, updatingTime } : { sendingTime?: number | undefined;
                                                   parsingTime? : number | undefined;
                                                   updatingTime? : number | undefined; }
  ) : void {
    const { MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE,
            MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE } = config.getCurrent();

    /**
     * Total time taken to fully update the last Manifest, in milliseconds.
     * Note: this time also includes possible requests done by the parsers.
     */
    const totalUpdateTime = parsingTime !== undefined ?
      parsingTime + (updatingTime ?? 0) :
      undefined;

    /**
     * "unsafeMode" is a mode where we unlock advanced Manifest parsing
     * optimizations with the added risk to lose some information.
     * `unsafeModeEnabled` is set to `true` when the `unsafeMode` is enabled.
     *
     * Only perform parsing in `unsafeMode` when the last full parsing took a
     * lot of time and do not go higher than the maximum consecutive time.
     */

    const unsafeModeEnabled = this._consecutiveUnsafeMode > 0 ?
      this._consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE :
      totalUpdateTime !== undefined ?
        (totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE) :
        false;

    /** Time elapsed since the beginning of the Manifest request, in milliseconds. */
    const timeSinceRequest = sendingTime === undefined ?
      0 :
      performance.now() - sendingTime;

    /** Minimum update delay we should not go below, in milliseconds. */
    const minInterval = Math.max(this._settings.minimumManifestUpdateInterval -
                                   timeSinceRequest,
                                 0);

    /**
     * Multiple refresh trigger are scheduled here, but only the first one should
     * be effectively considered.
     * `nextRefreshCanceller` will allow to cancel every other when one is triggered.
     */
    const nextRefreshCanceller = new TaskCanceller();
    nextRefreshCanceller.linkToSignal(this._canceller.signal);

    /* Function to manually schedule a Manifest refresh */
    this.scheduleManualRefresh = (settings : IManifestRefreshSettings) => {
      const { enablePartialRefresh, delay, canUseUnsafeMode } = settings;
      const unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
      // The value allows to set a delay relatively to the last Manifest refresh
      // (to avoid asking for it too often).
      const timeSinceLastRefresh = sendingTime === undefined ?
                                     0 :
                                     performance.now() - sendingTime;
      const _minInterval = Math.max(this._settings.minimumManifestUpdateInterval -
                                      timeSinceLastRefresh,
                                    0);
      const timeoutId = setTimeout(() => {
        nextRefreshCanceller.cancel();
        this._triggerNextManifestRefresh(manifest, { enablePartialRefresh, unsafeMode });
      }, Math.max((delay ?? 0) - timeSinceLastRefresh, _minInterval));
      nextRefreshCanceller.signal.register(() => {
        clearTimeout(timeoutId);
      });
    };

    /* Handle Manifest expiration. */
    if (manifest.expired !== null) {
      const timeoutId = setTimeout(() => {
        manifest.expired?.then(() => {
          nextRefreshCanceller.cancel();
          this._triggerNextManifestRefresh(manifest, { enablePartialRefresh: false,
                                                       unsafeMode: unsafeModeEnabled });
        }, noop /* `expired` should not reject */);
      }, minInterval);
      nextRefreshCanceller.signal.register(() => {
        clearTimeout(timeoutId);
      });
    }

    /*
     * Trigger Manifest refresh when the Manifest needs to be refreshed
     * according to the Manifest's internal properties (parsing time is also
     * taken into account in this operation to avoid refreshing too often).
     */
    if (manifest.lifetime !== undefined && manifest.lifetime >= 0) {
      /** Regular refresh delay as asked by the Manifest. */
      const regularRefreshDelay = manifest.lifetime * 1000 - timeSinceRequest;

      /** Actually choosen delay to refresh the Manifest. */
      let actualRefreshInterval : number;

      if (totalUpdateTime === undefined) {
        actualRefreshInterval = regularRefreshDelay;
      } else if (manifest.lifetime < 3 && totalUpdateTime >= 100) {
        // If Manifest update is very frequent and we take time to update it,
        // postpone it.
        actualRefreshInterval = Math.min(
          Math.max(
            // Take 3 seconds as a default safe value for a base interval.
            3000 - timeSinceRequest,
            // Add update time to the original interval.
            Math.max(regularRefreshDelay, 0) + totalUpdateTime
          ),

          // Limit the postponment's higher bound to a very high value relative
          // to `regularRefreshDelay`.
          // This avoid perpetually postponing a Manifest update when
          // performance seems to have been abysmal one time.
          regularRefreshDelay * 6
        );
        log.info("MUS: Manifest update rythm is too frequent. Postponing next request.",
                 regularRefreshDelay,
                 actualRefreshInterval);
      } else if (totalUpdateTime >= (manifest.lifetime * 1000) / 10) {
        // If Manifest updating time is very long relative to its lifetime,
        // postpone it:
        actualRefreshInterval = Math.min(
          // Just add the update time to the original waiting time
          Math.max(regularRefreshDelay, 0) + totalUpdateTime,

          // Limit the postponment's higher bound to a very high value relative
          // to `regularRefreshDelay`.
          // This avoid perpetually postponing a Manifest update when
          // performance seems to have been abysmal one time.
          regularRefreshDelay * 6);
        log.info("MUS: Manifest took too long to parse. Postponing next request",
                 actualRefreshInterval,
                 actualRefreshInterval);
      } else {
        actualRefreshInterval = regularRefreshDelay;
      }
      const timeoutId = setTimeout(() => {
        nextRefreshCanceller.cancel();
        this._triggerNextManifestRefresh(manifest, { enablePartialRefresh: false,
                                                     unsafeMode: unsafeModeEnabled });
      }, Math.max(actualRefreshInterval, minInterval));
      nextRefreshCanceller.signal.register(() => {
        clearTimeout(timeoutId);
      });
    }
  }

  /**
   * Refresh the Manifest, performing a full update if a partial update failed.
   * Also re-call `recursivelyRefreshManifest` to schedule the next refresh
   * trigger.
   * @param {Object} manifest
   * @param {Object} refreshInformation
   */
  private _triggerNextManifestRefresh(
    manifest : Manifest,
    { enablePartialRefresh,
      unsafeMode } : { enablePartialRefresh : boolean;
                       unsafeMode : boolean; }
  ) {
    const manifestUpdateUrl = manifest.updateUrl;
    let fullRefresh : boolean;
    let refreshURL : string | undefined;
    if (this._prioritizedContentUrl !== null) {
      fullRefresh = true;
      refreshURL = this._prioritizedContentUrl;
      this._prioritizedContentUrl = null;
    } else {
      fullRefresh = !enablePartialRefresh || manifestUpdateUrl === undefined;
      refreshURL = fullRefresh ? manifest.getUrl() :
                                 manifestUpdateUrl;
    }
    const externalClockOffset = manifest.clockOffset;

    if (unsafeMode) {
      this._consecutiveUnsafeMode += 1;
      log.info("Init: Refreshing the Manifest in \"unsafeMode\" for the " +
               String(this._consecutiveUnsafeMode) + " consecutive time.");
    } else if (this._consecutiveUnsafeMode > 0) {
      log.info("Init: Not parsing the Manifest in \"unsafeMode\" anymore after " +
               String(this._consecutiveUnsafeMode) + " consecutive times.");
      this._consecutiveUnsafeMode = 0;
    }

    if (this._isRefreshPending) {
      return;
    }
    this._isRefreshPending = true;
    this._fetchManifest(refreshURL)
      .then(res => res.parse({ externalClockOffset,
                               previousManifest: manifest,
                               unsafeMode }))
      .then(res => {
        this._isRefreshPending = false;
        const { manifest: newManifest,
                sendingTime: newSendingTime,
                parsingTime } = res;
        const updateTimeStart = performance.now();

        if (fullRefresh) {
          manifest.replace(newManifest);
        } else {
          try {
            manifest.update(newManifest);
          } catch (e) {
            const message = e instanceof Error ? e.message :
                                                 "unknown error";
            log.warn(`MUS: Attempt to update Manifest failed: ${message}`,
                     "Re-downloading the Manifest fully");
            const { FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY } = config.getCurrent();

            // The value allows to set a delay relatively to the last Manifest refresh
            // (to avoid asking for it too often).
            const timeSinceLastRefresh = newSendingTime === undefined ?
                                           0 :
                                           performance.now() - newSendingTime;
            const _minInterval = Math.max(this._settings.minimumManifestUpdateInterval -
                                            timeSinceLastRefresh,
                                          0);
            let unregisterCanceller = noop;
            const timeoutId = setTimeout(() => {
              unregisterCanceller();
              this._triggerNextManifestRefresh(manifest,
                                               { enablePartialRefresh: false,
                                                 unsafeMode: false });
            }, Math.max(FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY -
                          timeSinceLastRefresh,
                        _minInterval));
            unregisterCanceller = this._canceller.signal.register(() => {
              clearTimeout(timeoutId);
            });
            return;
          }
        }
        const updatingTime = performance.now() - updateTimeStart;
        this._recursivelyRefreshManifest(manifest, { sendingTime: newSendingTime,
                                                     parsingTime,
                                                     updatingTime });
      })
      .catch((err) => {
        this._isRefreshPending = false;
        this._onFatalError(err);
      });
  }

  private _onFatalError(err : unknown) : void {
    if (this._canceller.isUsed()) {
      return;
    }
    this.trigger("error", err);
    this.dispose();
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

/** What will be sent once parsed. */
interface IManifestFetcherParsedResult {
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
interface IManifestFetcherResponse {
  /** Allows to parse a fetched Manifest into a `Manifest` structure. */
  parse(parserOptions : IManifestFetcherParserOptions) :
    Promise<IManifestFetcherParsedResult>;
}

interface IManifestFetcherParserOptions {
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
  /** Limit the frequency of Manifest updates. */
  minimumManifestUpdateInterval : number;
  /**
   * Potential first Manifest to rely on, allowing to skip the initial Manifest
   * request.
   */
  initialManifest : IInitialManifest | undefined;
}

/** Event sent by the `ManifestFetcher`. */
export interface IManifestFetcherEvent {
  /** Event sent by the `ManifestFetcher` when a minor error has been encountered. */
  warning : IPlayerError;
  /**
   * Event sent by the `ManifestFetcher` when a major error has been encountered,
   * leading to the `ManifestFetcher` being disposed.
   */
  error : unknown;
  /** Event sent after the Manifest has first been fetched. */
  manifestReady : Manifest;
}

/** Argument defined when forcing a Manifest refresh. */
export interface IManifestRefreshSettings {
  /**
   * if `false`, the Manifest should be fully updated.
   * if `true`, a shorter version with just the added information can be loaded
   * instead.
   *
   * Basically can be set to `true` in most updates to improve performances, but
   * should be set to `false` if you suspect some iregularities in the Manifest,
   * so a complete and thorough refresh is performed.
   *
   * Note that this optimization is only possible when a shorter version of the
   * Manifest is available.
   * In other cases, setting this value to `true` won't have any effect.
   */
  enablePartialRefresh : boolean;
  /**
   * Optional wanted refresh delay, which is the minimum time you want to wait
   * before updating the Manifest
   */
  delay? : number | undefined;
  /**
   * Whether the parsing can be done in the more efficient "unsafeMode".
   * This mode is extremely fast but can lead to de-synchronisation with the
   * server.
   */
  canUseUnsafeMode : boolean;
}
