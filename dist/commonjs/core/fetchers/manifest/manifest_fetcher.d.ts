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
import Manifest from "../../../manifest/classes";
import type { IInitialManifest, IPlayerError } from "../../../public_types";
import type { ITransportPipelines } from "../../../transports";
import EventEmitter from "../../../utils/event_emitter";
import type CmcdDataBuilder from "../../cmcd";
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
    scheduleManualRefresh: (settings: IManifestRefreshSettings) => void;
    /** `ManifestFetcher` configuration. */
    private _settings;
    /** URLs through which the Manifest may be reached, by order of priority. */
    private _manifestUrls;
    /** Name of the current transport pipeline used. */
    private _transportName;
    /**
     * Manifest loading and parsing pipelines linked to the current transport
     * protocol used.
     */
    private _pipelines;
    /**
     * `TaskCanceller` called when this `ManifestFetcher` is disposed, to clean
     * resources.
     */
    private _canceller;
    /**
     * Set to `true` once the Manifest has been fetched at least once through this
     * `ManifestFetcher`.
     */
    private _isStarted;
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
    private _prioritizedContentUrl;
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
    constructor(urls: string[] | undefined, pipelines: ITransportPipelines, settings: IManifestFetcherSettings);
    /**
     * Free resources and stop refresh mechanism from happening.
     *
     * Once `dispose` has been called. This `ManifestFetcher` cannot be relied on
     * anymore.
     */
    dispose(): void;
    /**
     * Start requesting the Manifest as well as the Manifest refreshing logic, if
     * needed.
     *
     * Once `start` has been called, this mechanism can only be stopped by calling
     * `dispose`.
     */
    start(): void;
    /**
     * Update URL of the fetched Manifest.
     * @param {Array.<string> | undefined} urls - New Manifest URLs by order of
     * priority or `undefined` if there's now no URL.
     * @param {boolean} refreshNow - If set to `true`, the next Manifest refresh
     * will be triggered immediately.
     */
    updateContentUrls(urls: string[] | undefined, refreshNow: boolean): void;
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
    private _fetchManifest;
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
    private parse;
    /**
     * Parse a Manifest.
     *
     * @param {Object} loaded - Information about the loaded Manifest as well as
     * about the corresponding request.
     * @param {Object} parserOptions - Options used when parsing the Manifest.
     * @param {string | undefined} requestUrl
     * @returns {Promise}
     */
    private _parseLoadedManifest;
    /**
     * Construct "backoff settings" that can be used with a range of functions
     * allowing to perform multiple request attempts
     * @param {Function} onRetry
     * @returns {Object}
     */
    private _getBackoffSetting;
    /**
     * Performs Manifest refresh (recursively) when it judges it is time to do so.
     * @param {Object} manifest
     * @param {Object} manifestRequestInfos - Various information linked to the
     * last Manifest loading and parsing operations.
     */
    private _recursivelyRefreshManifest;
    /**
     * Refresh the Manifest, performing a full update if a partial update failed.
     * Also re-call `recursivelyRefreshManifest` to schedule the next refresh
     * trigger.
     * @param {Object} manifest
     * @param {Object} refreshInformation
     */
    private _triggerNextManifestRefresh;
    private _onFatalError;
}
/** Options used by `createManifestFetcher`. */
export interface IManifestFetcherSettings {
    /**
     * Whether the content is played in a low-latency mode.
     * This has an impact on default backoff delays.
     */
    lowLatencyMode: boolean;
    /** Maximum number of time a request on error will be retried. */
    maxRetry: number | undefined;
    /**
     * Timeout after which request are aborted and, depending on other options,
     * retried.
     * To set to `-1` for no timeout.
     * `undefined` will lead to a default, large, timeout being used.
     */
    requestTimeout: number | undefined;
    /**
     * Connection timeout, in milliseconds, after which the request is canceled
     * if the responses headers has not being received.
     * Do not set or set to "undefined" to disable it.
     */
    connectionTimeout: number | undefined;
    /** Limit the frequency of Manifest updates. */
    minimumManifestUpdateInterval: number;
    /**
     * Potential first Manifest to rely on, allowing to skip the initial Manifest
     * request.
     */
    initialManifest: IInitialManifest | undefined;
    /**
     * Optional module allowing to collect "Common Media Client Data" (a.k.a. CMCD)
     * for the CDN.
     */
    cmcdDataBuilder: CmcdDataBuilder | null;
}
/** Event sent by the `ManifestFetcher`. */
export interface IManifestFetcherEvent {
    /** Event sent by the `ManifestFetcher` when a minor error has been encountered. */
    warning: IPlayerError;
    /**
     * Event sent by the `ManifestFetcher` when a major error has been encountered,
     * leading to the `ManifestFetcher` being disposed.
     */
    error: unknown;
    /** Event sent after the Manifest has first been fetched. */
    manifestReady: Manifest;
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
    enablePartialRefresh: boolean;
    /**
     * Optional wanted refresh delay, which is the minimum time you want to wait
     * before updating the Manifest
     */
    delay?: number | undefined;
    /**
     * Whether the parsing can be done in the more efficient "unsafeMode".
     * This mode is extremely fast but can lead to de-synchronisation with the
     * server.
     */
    canUseUnsafeMode: boolean;
}
//# sourceMappingURL=manifest_fetcher.d.ts.map