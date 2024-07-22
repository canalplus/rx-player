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
import Manifest from "../../../manifest/classes";
import EventEmitter from "../../../utils/event_emitter";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import noop from "../../../utils/noop";
import TaskCanceller from "../../../utils/task_canceller";
import errorSelector from "../utils/error_selector";
import { scheduleRequestPromise } from "../utils/schedule_request";
/**
 * Class allowing to facilitate the task of loading and parsing a Manifest, as
 * well as automatically refreshing it.
 * @class ManifestFetcher
 */
export default class ManifestFetcher extends EventEmitter {
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
    constructor(urls, pipelines, settings) {
        super();
        this.scheduleManualRefresh = noop;
        this._manifestUrls = urls;
        this._pipelines = pipelines.manifest;
        this._transportName = pipelines.transportName;
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
    dispose() {
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
    start() {
        if (this._isStarted) {
            return;
        }
        this._isStarted = true;
        let manifestProm;
        const initialManifest = this._settings.initialManifest;
        if (initialManifest instanceof Manifest) {
            manifestProm = Promise.resolve({ manifest: initialManifest });
        }
        else if (initialManifest !== undefined) {
            manifestProm = this.parse(initialManifest, { previousManifest: null, unsafeMode: false }, undefined);
        }
        else {
            manifestProm = this._fetchManifest(undefined).then((val) => {
                return val.parse({ previousManifest: null, unsafeMode: false });
            });
        }
        manifestProm
            .then((val) => {
            this.trigger("manifestReady", val.manifest);
            if (!this._canceller.isUsed()) {
                this._recursivelyRefreshManifest(val.manifest, val);
            }
        })
            .catch((err) => this._onFatalError(err));
    }
    /**
     * Update URL of the fetched Manifest.
     * @param {Array.<string> | undefined} urls - New Manifest URLs by order of
     * priority or `undefined` if there's now no URL.
     * @param {boolean} refreshNow - If set to `true`, the next Manifest refresh
     * will be triggered immediately.
     */
    updateContentUrls(urls, refreshNow) {
        var _a;
        this._prioritizedContentUrl = (_a = urls === null || urls === void 0 ? void 0 : urls[0]) !== null && _a !== void 0 ? _a : undefined;
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
    async _fetchManifest(url) {
        var _a;
        const cancelSignal = this._canceller.signal;
        const settings = this._settings;
        const transportName = this._transportName;
        const pipelines = this._pipelines;
        // TODO Better handle multiple Manifest URLs
        const requestUrl = url !== null && url !== void 0 ? url : (_a = this._manifestUrls) === null || _a === void 0 ? void 0 : _a[0];
        const backoffSettings = this._getBackoffSetting((err) => {
            this.trigger("warning", errorSelector(err));
        });
        try {
            const response = await callLoaderWithRetries(requestUrl);
            return {
                parse: (parserOptions) => {
                    return this._parseLoadedManifest(response, parserOptions, requestUrl);
                },
            };
        }
        catch (err) {
            throw errorSelector(err);
        }
        /**
         * Call the loader part of the pipeline, retrying if it fails according
         * to the current settings.
         * Returns the Promise of the last attempt.
         * @param {string | undefined} manifestUrl
         * @returns {Promise}
         */
        function callLoaderWithRetries(manifestUrl) {
            var _a;
            const { loadManifest } = pipelines;
            let requestTimeout = settings.requestTimeout === undefined
                ? config.getCurrent().DEFAULT_REQUEST_TIMEOUT
                : settings.requestTimeout;
            let connectionTimeout = settings.connectionTimeout === undefined
                ? config.getCurrent().DEFAULT_CONNECTION_TIMEOUT
                : settings.connectionTimeout;
            if (requestTimeout < 0) {
                requestTimeout = undefined;
            }
            if (connectionTimeout < 0) {
                connectionTimeout = undefined;
            }
            const requestOptions = {
                timeout: requestTimeout,
                connectionTimeout,
                cmcdPayload: (_a = settings.cmcdDataBuilder) === null || _a === void 0 ? void 0 : _a.getCmcdDataForManifest(transportName),
            };
            const callLoader = () => loadManifest(manifestUrl, requestOptions, cancelSignal);
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
    parse(manifest, parserOptions, originalUrl) {
        return this._parseLoadedManifest({ responseData: manifest, size: undefined, requestDuration: undefined }, parserOptions, originalUrl);
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
    async _parseLoadedManifest(loaded, parserOptions, requestUrl) {
        var _a;
        const parsingTimeStart = getMonotonicTimeStamp();
        const cancelSignal = this._canceller.signal;
        const trigger = this.trigger.bind(this);
        const { sendingTime, receivedTime } = loaded;
        const backoffSettings = this._getBackoffSetting((err) => {
            this.trigger("warning", errorSelector(err));
        });
        const originalUrl = requestUrl !== null && requestUrl !== void 0 ? requestUrl : (_a = this._manifestUrls) === null || _a === void 0 ? void 0 : _a[0];
        const opts = {
            externalClockOffset: parserOptions.externalClockOffset,
            unsafeMode: parserOptions.unsafeMode,
            previousManifest: parserOptions.previousManifest,
            originalUrl,
        };
        try {
            const res = this._pipelines.parseManifest(loaded, opts, onWarnings, cancelSignal, scheduleRequest);
            if (!isPromise(res)) {
                return finish(res.manifest, res.warnings);
            }
            else {
                const { manifest, warnings } = await res;
                return finish(manifest, warnings);
            }
        }
        catch (err) {
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
        async function scheduleRequest(performRequest) {
            try {
                const data = await scheduleRequestPromise(performRequest, backoffSettings, cancelSignal);
                return data;
            }
            catch (err) {
                throw errorSelector(err);
            }
        }
        /**
         * Handle minor errors encountered by a Manifest parser.
         * @param {Array.<Error>} warnings
         */
        function onWarnings(warnings) {
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
        function finish(manifest, warnings) {
            onWarnings(warnings);
            const parsingTime = getMonotonicTimeStamp() - parsingTimeStart;
            log.info(`MF: Manifest parsed in ${parsingTime}ms`);
            return { manifest, sendingTime, receivedTime, parsingTime };
        }
    }
    /**
     * Construct "backoff settings" that can be used with a range of functions
     * allowing to perform multiple request attempts
     * @param {Function} onRetry
     * @returns {Object}
     */
    _getBackoffSetting(onRetry) {
        const { DEFAULT_MAX_MANIFEST_REQUEST_RETRY, INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE, } = config.getCurrent();
        const { lowLatencyMode, maxRetry: ogRegular } = this._settings;
        const baseDelay = lowLatencyMode
            ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY
            : INITIAL_BACKOFF_DELAY_BASE.REGULAR;
        const maxDelay = lowLatencyMode
            ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY
            : MAX_BACKOFF_DELAY_BASE.REGULAR;
        const maxRetry = ogRegular !== null && ogRegular !== void 0 ? ogRegular : DEFAULT_MAX_MANIFEST_REQUEST_RETRY;
        return { onRetry, baseDelay, maxDelay, maxRetry };
    }
    /**
     * Performs Manifest refresh (recursively) when it judges it is time to do so.
     * @param {Object} manifest
     * @param {Object} manifestRequestInfos - Various information linked to the
     * last Manifest loading and parsing operations.
     */
    _recursivelyRefreshManifest(manifest, { sendingTime, parsingTime, updatingTime, }) {
        const { MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE, MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE, } = config.getCurrent();
        /**
         * Total time taken to fully update the last Manifest, in milliseconds.
         * Note: this time also includes possible requests done by the parsers.
         */
        const totalUpdateTime = parsingTime !== undefined ? parsingTime + (updatingTime !== null && updatingTime !== void 0 ? updatingTime : 0) : undefined;
        /**
         * "unsafeMode" is a mode where we unlock advanced Manifest parsing
         * optimizations with the added risk to lose some information.
         * `unsafeModeEnabled` is set to `true` when the `unsafeMode` is enabled.
         *
         * Only perform parsing in `unsafeMode` when the last full parsing took a
         * lot of time and do not go higher than the maximum consecutive time.
         */
        let unsafeModeEnabled = false;
        if (this._consecutiveUnsafeMode > 0) {
            unsafeModeEnabled =
                this._consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE;
        }
        else if (totalUpdateTime !== undefined) {
            unsafeModeEnabled =
                totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE;
        }
        /** Time elapsed since the beginning of the Manifest request, in milliseconds. */
        const timeSinceRequest = sendingTime === undefined ? 0 : getMonotonicTimeStamp() - sendingTime;
        /** Minimum update delay we should not go below, in milliseconds. */
        const minInterval = Math.max(this._settings.minimumManifestUpdateInterval - timeSinceRequest, 0);
        /**
         * Multiple refresh trigger are scheduled here, but only the first one should
         * be effectively considered.
         * `nextRefreshCanceller` will allow to cancel every other when one is triggered.
         */
        const nextRefreshCanceller = new TaskCanceller();
        nextRefreshCanceller.linkToSignal(this._canceller.signal);
        /* Function to manually schedule a Manifest refresh */
        this.scheduleManualRefresh = (settings) => {
            const { enablePartialRefresh, delay, canUseUnsafeMode } = settings;
            const unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
            // The value allows to set a delay relatively to the last Manifest refresh
            // (to avoid asking for it too often).
            const timeSinceLastRefresh = sendingTime === undefined ? 0 : getMonotonicTimeStamp() - sendingTime;
            const _minInterval = Math.max(this._settings.minimumManifestUpdateInterval - timeSinceLastRefresh, 0);
            const timeoutId = setTimeout(() => {
                nextRefreshCanceller.cancel();
                this._triggerNextManifestRefresh(manifest, {
                    enablePartialRefresh,
                    unsafeMode,
                });
            }, Math.max((delay !== null && delay !== void 0 ? delay : 0) - timeSinceLastRefresh, _minInterval));
            nextRefreshCanceller.signal.register(() => {
                clearTimeout(timeoutId);
            });
        };
        /* Handle Manifest expiration. */
        if (manifest.expired !== null) {
            const timeoutId = setTimeout(() => {
                var _a;
                (_a = manifest.expired) === null || _a === void 0 ? void 0 : _a.then(() => {
                    nextRefreshCanceller.cancel();
                    this._triggerNextManifestRefresh(manifest, {
                        enablePartialRefresh: false,
                        unsafeMode: unsafeModeEnabled,
                    });
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
            let actualRefreshInterval;
            if (totalUpdateTime === undefined) {
                actualRefreshInterval = regularRefreshDelay;
            }
            else if (manifest.lifetime < 3 && totalUpdateTime >= 100) {
                // If Manifest update is very frequent and we take time to update it,
                // postpone it.
                actualRefreshInterval = Math.min(Math.max(
                // Take 3 seconds as a default safe value for a base interval.
                3000 - timeSinceRequest, 
                // Add update time to the original interval.
                Math.max(regularRefreshDelay, 0) + totalUpdateTime), 
                // Limit the postponment's higher bound to a very high value relative
                // to `regularRefreshDelay`.
                // This avoid perpetually postponing a Manifest update when
                // performance seems to have been abysmal one time.
                regularRefreshDelay * 6);
                log.info("MUS: Manifest update rythm is too frequent. Postponing next request.", regularRefreshDelay, actualRefreshInterval);
            }
            else if (totalUpdateTime >= (manifest.lifetime * 1000) / 10) {
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
                log.info("MUS: Manifest took too long to parse. Postponing next request", actualRefreshInterval, actualRefreshInterval);
            }
            else {
                actualRefreshInterval = regularRefreshDelay;
            }
            const timeoutId = setTimeout(() => {
                nextRefreshCanceller.cancel();
                this._triggerNextManifestRefresh(manifest, {
                    enablePartialRefresh: false,
                    unsafeMode: unsafeModeEnabled,
                });
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
    _triggerNextManifestRefresh(manifest, { enablePartialRefresh, unsafeMode, }) {
        const manifestUpdateUrl = manifest.updateUrl;
        let fullRefresh;
        let refreshURL;
        if (this._prioritizedContentUrl !== null) {
            fullRefresh = true;
            refreshURL = this._prioritizedContentUrl;
            this._prioritizedContentUrl = null;
        }
        else {
            fullRefresh = !enablePartialRefresh || manifestUpdateUrl === undefined;
            refreshURL = fullRefresh ? manifest.getUrls()[0] : manifestUpdateUrl;
        }
        const externalClockOffset = manifest.clockOffset;
        if (unsafeMode) {
            this._consecutiveUnsafeMode += 1;
            log.info('Init: Refreshing the Manifest in "unsafeMode" for the ' +
                String(this._consecutiveUnsafeMode) +
                " consecutive time.");
        }
        else if (this._consecutiveUnsafeMode > 0) {
            log.info('Init: Not parsing the Manifest in "unsafeMode" anymore after ' +
                String(this._consecutiveUnsafeMode) +
                " consecutive times.");
            this._consecutiveUnsafeMode = 0;
        }
        if (this._isRefreshPending) {
            return;
        }
        this._isRefreshPending = true;
        this._fetchManifest(refreshURL)
            .then((res) => res.parse({
            externalClockOffset,
            previousManifest: manifest,
            unsafeMode,
        }))
            .then((res) => {
            this._isRefreshPending = false;
            const { manifest: newManifest, sendingTime: newSendingTime, parsingTime } = res;
            const updateTimeStart = getMonotonicTimeStamp();
            if (fullRefresh) {
                manifest.replace(newManifest);
            }
            else {
                try {
                    manifest.update(newManifest);
                }
                catch (e) {
                    const message = e instanceof Error ? e.message : "unknown error";
                    log.warn(`MUS: Attempt to update Manifest failed: ${message}`, "Re-downloading the Manifest fully");
                    const { FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY } = config.getCurrent();
                    // The value allows to set a delay relatively to the last Manifest refresh
                    // (to avoid asking for it too often).
                    const timeSinceLastRefresh = newSendingTime === undefined ? 0 : getMonotonicTimeStamp() - newSendingTime;
                    const _minInterval = Math.max(this._settings.minimumManifestUpdateInterval - timeSinceLastRefresh, 0);
                    let unregisterCanceller = noop;
                    const timeoutId = setTimeout(() => {
                        unregisterCanceller();
                        this._triggerNextManifestRefresh(manifest, {
                            enablePartialRefresh: false,
                            unsafeMode: false,
                        });
                    }, Math.max(FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY - timeSinceLastRefresh, _minInterval));
                    unregisterCanceller = this._canceller.signal.register(() => {
                        clearTimeout(timeoutId);
                    });
                    return;
                }
            }
            const updatingTime = getMonotonicTimeStamp() - updateTimeStart;
            this._recursivelyRefreshManifest(manifest, {
                sendingTime: newSendingTime,
                parsingTime,
                updatingTime,
            });
        })
            .catch((err) => {
            this._isRefreshPending = false;
            this._onFatalError(err);
        });
    }
    _onFatalError(err) {
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
function isPromise(val) {
    return val instanceof Promise;
}
