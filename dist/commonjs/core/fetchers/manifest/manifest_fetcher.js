"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("../../../config");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var classes_1 = require("../../../manifest/classes");
var event_emitter_1 = require("../../../utils/event_emitter");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var noop_1 = require("../../../utils/noop");
var task_canceller_1 = require("../../../utils/task_canceller");
var error_selector_1 = require("../utils/error_selector");
var schedule_request_1 = require("../utils/schedule_request");
/**
 * Class allowing to facilitate the task of loading and parsing a Manifest, as
 * well as automatically refreshing it.
 * @class ManifestFetcher
 */
var ManifestFetcher = /** @class */ (function (_super) {
    __extends(ManifestFetcher, _super);
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
    function ManifestFetcher(urls, pipelines, settings) {
        var _this = _super.call(this) || this;
        _this.scheduleManualRefresh = noop_1.default;
        _this._manifestUrls = urls;
        _this._pipelines = pipelines.manifest;
        _this._transportName = pipelines.transportName;
        _this._settings = settings;
        _this._canceller = new task_canceller_1.default();
        _this._isStarted = false;
        _this._isRefreshPending = false;
        _this._consecutiveUnsafeMode = 0;
        _this._prioritizedContentUrl = null;
        return _this;
    }
    /**
     * Free resources and stop refresh mechanism from happening.
     *
     * Once `dispose` has been called. This `ManifestFetcher` cannot be relied on
     * anymore.
     */
    ManifestFetcher.prototype.dispose = function () {
        this._canceller.cancel();
        this.removeEventListener();
    };
    /**
     * Start requesting the Manifest as well as the Manifest refreshing logic, if
     * needed.
     *
     * Once `start` has been called, this mechanism can only be stopped by calling
     * `dispose`.
     */
    ManifestFetcher.prototype.start = function () {
        var _this = this;
        if (this._isStarted) {
            return;
        }
        this._isStarted = true;
        var manifestProm;
        var initialManifest = this._settings.initialManifest;
        if (initialManifest instanceof classes_1.default) {
            manifestProm = Promise.resolve({ manifest: initialManifest });
        }
        else if (initialManifest !== undefined) {
            manifestProm = this.parse(initialManifest, { previousManifest: null, unsafeMode: false }, undefined);
        }
        else {
            manifestProm = this._fetchManifest(undefined).then(function (val) {
                return val.parse({ previousManifest: null, unsafeMode: false });
            });
        }
        manifestProm
            .then(function (val) {
            _this.trigger("manifestReady", val.manifest);
            if (!_this._canceller.isUsed()) {
                _this._recursivelyRefreshManifest(val.manifest, val);
            }
        })
            .catch(function (err) { return _this._onFatalError(err); });
    };
    /**
     * Update URL of the fetched Manifest.
     * @param {Array.<string> | undefined} urls - New Manifest URLs by order of
     * priority or `undefined` if there's now no URL.
     * @param {boolean} refreshNow - If set to `true`, the next Manifest refresh
     * will be triggered immediately.
     */
    ManifestFetcher.prototype.updateContentUrls = function (urls, refreshNow) {
        var _a;
        this._prioritizedContentUrl = (_a = urls === null || urls === void 0 ? void 0 : urls[0]) !== null && _a !== void 0 ? _a : undefined;
        if (refreshNow) {
            this.scheduleManualRefresh({
                enablePartialRefresh: false,
                delay: 0,
                canUseUnsafeMode: false,
            });
        }
    };
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
    ManifestFetcher.prototype._fetchManifest = function (url) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            /**
             * Call the loader part of the pipeline, retrying if it fails according
             * to the current settings.
             * Returns the Promise of the last attempt.
             * @param {string | undefined} manifestUrl
             * @returns {Promise}
             */
            function callLoaderWithRetries(manifestUrl) {
                var _a;
                var loadManifest = pipelines.loadManifest;
                var requestTimeout = settings.requestTimeout === undefined
                    ? config_1.default.getCurrent().DEFAULT_REQUEST_TIMEOUT
                    : settings.requestTimeout;
                var connectionTimeout = settings.connectionTimeout === undefined
                    ? config_1.default.getCurrent().DEFAULT_CONNECTION_TIMEOUT
                    : settings.connectionTimeout;
                if (requestTimeout < 0) {
                    requestTimeout = undefined;
                }
                if (connectionTimeout < 0) {
                    connectionTimeout = undefined;
                }
                var requestOptions = {
                    timeout: requestTimeout,
                    connectionTimeout: connectionTimeout,
                    cmcdPayload: (_a = settings.cmcdDataBuilder) === null || _a === void 0 ? void 0 : _a.getCmcdDataForManifest(transportName),
                };
                var callLoader = function () { return loadManifest(manifestUrl, requestOptions, cancelSignal); };
                return (0, schedule_request_1.scheduleRequestPromise)(callLoader, backoffSettings, cancelSignal);
            }
            var cancelSignal, settings, transportName, pipelines, requestUrl, backoffSettings, response_1, err_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cancelSignal = this._canceller.signal;
                        settings = this._settings;
                        transportName = this._transportName;
                        pipelines = this._pipelines;
                        requestUrl = url !== null && url !== void 0 ? url : (_a = this._manifestUrls) === null || _a === void 0 ? void 0 : _a[0];
                        backoffSettings = this._getBackoffSetting(function (err) {
                            _this.trigger("warning", (0, error_selector_1.default)(err));
                        });
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, callLoaderWithRetries(requestUrl)];
                    case 2:
                        response_1 = _b.sent();
                        return [2 /*return*/, {
                                parse: function (parserOptions) {
                                    return _this._parseLoadedManifest(response_1, parserOptions, requestUrl);
                                },
                            }];
                    case 3:
                        err_1 = _b.sent();
                        throw (0, error_selector_1.default)(err_1);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
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
    ManifestFetcher.prototype.parse = function (manifest, parserOptions, originalUrl) {
        return this._parseLoadedManifest({ responseData: manifest, size: undefined, requestDuration: undefined }, parserOptions, originalUrl);
    };
    /**
     * Parse a Manifest.
     *
     * @param {Object} loaded - Information about the loaded Manifest as well as
     * about the corresponding request.
     * @param {Object} parserOptions - Options used when parsing the Manifest.
     * @param {string | undefined} requestUrl
     * @returns {Promise}
     */
    ManifestFetcher.prototype._parseLoadedManifest = function (loaded, parserOptions, requestUrl) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            /**
             * Perform a request with the same retry mechanisms and error handling
             * than for a Manifest loader.
             * @param {Function} performRequest
             * @returns {Function}
             */
            function scheduleRequest(performRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var data, err_3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, (0, schedule_request_1.scheduleRequestPromise)(performRequest, backoffSettings, cancelSignal)];
                            case 1:
                                data = _a.sent();
                                return [2 /*return*/, data];
                            case 2:
                                err_3 = _a.sent();
                                throw (0, error_selector_1.default)(err_3);
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            }
            /**
             * Handle minor errors encountered by a Manifest parser.
             * @param {Array.<Error>} warnings
             */
            function onWarnings(warnings) {
                var e_1, _a;
                try {
                    for (var warnings_1 = __values(warnings), warnings_1_1 = warnings_1.next(); !warnings_1_1.done; warnings_1_1 = warnings_1.next()) {
                        var warning = warnings_1_1.value;
                        if (cancelSignal.isCancelled()) {
                            return;
                        }
                        var formattedError = (0, errors_1.formatError)(warning, {
                            defaultCode: "PIPELINE_PARSE_ERROR",
                            defaultReason: "Unknown error when parsing the Manifest",
                        });
                        trigger("warning", formattedError);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (warnings_1_1 && !warnings_1_1.done && (_a = warnings_1.return)) _a.call(warnings_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            /**
             * Emit a formatted "parsed" event through `obs`.
             * To call once the Manifest has been parsed.
             * @param {Object} manifest
             */
            function finish(manifest, warnings) {
                onWarnings(warnings);
                var parsingTime = (0, monotonic_timestamp_1.default)() - parsingTimeStart;
                log_1.default.info("MF: Manifest parsed in ".concat(parsingTime, "ms"));
                return { manifest: manifest, sendingTime: sendingTime, receivedTime: receivedTime, parsingTime: parsingTime };
            }
            var parsingTimeStart, cancelSignal, trigger, sendingTime, receivedTime, backoffSettings, originalUrl, opts, res, _b, manifest, warnings, err_2, formattedError;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        parsingTimeStart = (0, monotonic_timestamp_1.default)();
                        cancelSignal = this._canceller.signal;
                        trigger = this.trigger.bind(this);
                        sendingTime = loaded.sendingTime, receivedTime = loaded.receivedTime;
                        backoffSettings = this._getBackoffSetting(function (err) {
                            _this.trigger("warning", (0, error_selector_1.default)(err));
                        });
                        originalUrl = requestUrl !== null && requestUrl !== void 0 ? requestUrl : (_a = this._manifestUrls) === null || _a === void 0 ? void 0 : _a[0];
                        opts = {
                            externalClockOffset: parserOptions.externalClockOffset,
                            unsafeMode: parserOptions.unsafeMode,
                            previousManifest: parserOptions.previousManifest,
                            originalUrl: originalUrl,
                        };
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        res = this._pipelines.parseManifest(loaded, opts, onWarnings, cancelSignal, scheduleRequest);
                        if (!!isPromise(res)) return [3 /*break*/, 2];
                        return [2 /*return*/, finish(res.manifest, res.warnings)];
                    case 2: return [4 /*yield*/, res];
                    case 3:
                        _b = _c.sent(), manifest = _b.manifest, warnings = _b.warnings;
                        return [2 /*return*/, finish(manifest, warnings)];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err_2 = _c.sent();
                        formattedError = (0, errors_1.formatError)(err_2, {
                            defaultCode: "PIPELINE_PARSE_ERROR",
                            defaultReason: "Unknown error when parsing the Manifest",
                        });
                        throw formattedError;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Construct "backoff settings" that can be used with a range of functions
     * allowing to perform multiple request attempts
     * @param {Function} onRetry
     * @returns {Object}
     */
    ManifestFetcher.prototype._getBackoffSetting = function (onRetry) {
        var _a = config_1.default.getCurrent(), DEFAULT_MAX_MANIFEST_REQUEST_RETRY = _a.DEFAULT_MAX_MANIFEST_REQUEST_RETRY, INITIAL_BACKOFF_DELAY_BASE = _a.INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE = _a.MAX_BACKOFF_DELAY_BASE;
        var _b = this._settings, lowLatencyMode = _b.lowLatencyMode, ogRegular = _b.maxRetry;
        var baseDelay = lowLatencyMode
            ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY
            : INITIAL_BACKOFF_DELAY_BASE.REGULAR;
        var maxDelay = lowLatencyMode
            ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY
            : MAX_BACKOFF_DELAY_BASE.REGULAR;
        var maxRetry = ogRegular !== null && ogRegular !== void 0 ? ogRegular : DEFAULT_MAX_MANIFEST_REQUEST_RETRY;
        return { onRetry: onRetry, baseDelay: baseDelay, maxDelay: maxDelay, maxRetry: maxRetry };
    };
    /**
     * Performs Manifest refresh (recursively) when it judges it is time to do so.
     * @param {Object} manifest
     * @param {Object} manifestRequestInfos - Various information linked to the
     * last Manifest loading and parsing operations.
     */
    ManifestFetcher.prototype._recursivelyRefreshManifest = function (manifest, _a) {
        var _this = this;
        var sendingTime = _a.sendingTime, parsingTime = _a.parsingTime, updatingTime = _a.updatingTime;
        var _b = config_1.default.getCurrent(), MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE = _b.MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE, MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE = _b.MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE;
        /**
         * Total time taken to fully update the last Manifest, in milliseconds.
         * Note: this time also includes possible requests done by the parsers.
         */
        var totalUpdateTime = parsingTime !== undefined ? parsingTime + (updatingTime !== null && updatingTime !== void 0 ? updatingTime : 0) : undefined;
        /**
         * "unsafeMode" is a mode where we unlock advanced Manifest parsing
         * optimizations with the added risk to lose some information.
         * `unsafeModeEnabled` is set to `true` when the `unsafeMode` is enabled.
         *
         * Only perform parsing in `unsafeMode` when the last full parsing took a
         * lot of time and do not go higher than the maximum consecutive time.
         */
        var unsafeModeEnabled = false;
        if (this._consecutiveUnsafeMode > 0) {
            unsafeModeEnabled =
                this._consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE;
        }
        else if (totalUpdateTime !== undefined) {
            unsafeModeEnabled =
                totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE;
        }
        /** Time elapsed since the beginning of the Manifest request, in milliseconds. */
        var timeSinceRequest = sendingTime === undefined ? 0 : (0, monotonic_timestamp_1.default)() - sendingTime;
        /** Minimum update delay we should not go below, in milliseconds. */
        var minInterval = Math.max(this._settings.minimumManifestUpdateInterval - timeSinceRequest, 0);
        /**
         * Multiple refresh trigger are scheduled here, but only the first one should
         * be effectively considered.
         * `nextRefreshCanceller` will allow to cancel every other when one is triggered.
         */
        var nextRefreshCanceller = new task_canceller_1.default();
        nextRefreshCanceller.linkToSignal(this._canceller.signal);
        /* Function to manually schedule a Manifest refresh */
        this.scheduleManualRefresh = function (settings) {
            var enablePartialRefresh = settings.enablePartialRefresh, delay = settings.delay, canUseUnsafeMode = settings.canUseUnsafeMode;
            var unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
            // The value allows to set a delay relatively to the last Manifest refresh
            // (to avoid asking for it too often).
            var timeSinceLastRefresh = sendingTime === undefined ? 0 : (0, monotonic_timestamp_1.default)() - sendingTime;
            var _minInterval = Math.max(_this._settings.minimumManifestUpdateInterval - timeSinceLastRefresh, 0);
            var timeoutId = setTimeout(function () {
                nextRefreshCanceller.cancel();
                _this._triggerNextManifestRefresh(manifest, {
                    enablePartialRefresh: enablePartialRefresh,
                    unsafeMode: unsafeMode,
                });
            }, Math.max((delay !== null && delay !== void 0 ? delay : 0) - timeSinceLastRefresh, _minInterval));
            nextRefreshCanceller.signal.register(function () {
                clearTimeout(timeoutId);
            });
        };
        /* Handle Manifest expiration. */
        if (manifest.expired !== null) {
            var timeoutId_1 = setTimeout(function () {
                var _a;
                (_a = manifest.expired) === null || _a === void 0 ? void 0 : _a.then(function () {
                    nextRefreshCanceller.cancel();
                    _this._triggerNextManifestRefresh(manifest, {
                        enablePartialRefresh: false,
                        unsafeMode: unsafeModeEnabled,
                    });
                }, noop_1.default /* `expired` should not reject */);
            }, minInterval);
            nextRefreshCanceller.signal.register(function () {
                clearTimeout(timeoutId_1);
            });
        }
        /*
         * Trigger Manifest refresh when the Manifest needs to be refreshed
         * according to the Manifest's internal properties (parsing time is also
         * taken into account in this operation to avoid refreshing too often).
         */
        if (manifest.lifetime !== undefined && manifest.lifetime >= 0) {
            /** Regular refresh delay as asked by the Manifest. */
            var regularRefreshDelay = manifest.lifetime * 1000 - timeSinceRequest;
            /** Actually choosen delay to refresh the Manifest. */
            var actualRefreshInterval = void 0;
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
                log_1.default.info("MUS: Manifest update rythm is too frequent. Postponing next request.", regularRefreshDelay, actualRefreshInterval);
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
                log_1.default.info("MUS: Manifest took too long to parse. Postponing next request", actualRefreshInterval, actualRefreshInterval);
            }
            else {
                actualRefreshInterval = regularRefreshDelay;
            }
            var timeoutId_2 = setTimeout(function () {
                nextRefreshCanceller.cancel();
                _this._triggerNextManifestRefresh(manifest, {
                    enablePartialRefresh: false,
                    unsafeMode: unsafeModeEnabled,
                });
            }, Math.max(actualRefreshInterval, minInterval));
            nextRefreshCanceller.signal.register(function () {
                clearTimeout(timeoutId_2);
            });
        }
    };
    /**
     * Refresh the Manifest, performing a full update if a partial update failed.
     * Also re-call `recursivelyRefreshManifest` to schedule the next refresh
     * trigger.
     * @param {Object} manifest
     * @param {Object} refreshInformation
     */
    ManifestFetcher.prototype._triggerNextManifestRefresh = function (manifest, _a) {
        var _this = this;
        var enablePartialRefresh = _a.enablePartialRefresh, unsafeMode = _a.unsafeMode;
        var manifestUpdateUrl = manifest.updateUrl;
        var fullRefresh;
        var refreshURL;
        if (this._prioritizedContentUrl !== null) {
            fullRefresh = true;
            refreshURL = this._prioritizedContentUrl;
            this._prioritizedContentUrl = null;
        }
        else {
            fullRefresh = !enablePartialRefresh || manifestUpdateUrl === undefined;
            refreshURL = fullRefresh ? manifest.getUrls()[0] : manifestUpdateUrl;
        }
        var externalClockOffset = manifest.clockOffset;
        if (unsafeMode) {
            this._consecutiveUnsafeMode += 1;
            log_1.default.info('Init: Refreshing the Manifest in "unsafeMode" for the ' +
                String(this._consecutiveUnsafeMode) +
                " consecutive time.");
        }
        else if (this._consecutiveUnsafeMode > 0) {
            log_1.default.info('Init: Not parsing the Manifest in "unsafeMode" anymore after ' +
                String(this._consecutiveUnsafeMode) +
                " consecutive times.");
            this._consecutiveUnsafeMode = 0;
        }
        if (this._isRefreshPending) {
            return;
        }
        this._isRefreshPending = true;
        this._fetchManifest(refreshURL)
            .then(function (res) {
            return res.parse({
                externalClockOffset: externalClockOffset,
                previousManifest: manifest,
                unsafeMode: unsafeMode,
            });
        })
            .then(function (res) {
            _this._isRefreshPending = false;
            var newManifest = res.manifest, newSendingTime = res.sendingTime, parsingTime = res.parsingTime;
            var updateTimeStart = (0, monotonic_timestamp_1.default)();
            if (fullRefresh) {
                manifest.replace(newManifest);
            }
            else {
                try {
                    manifest.update(newManifest);
                }
                catch (e) {
                    var message = e instanceof Error ? e.message : "unknown error";
                    log_1.default.warn("MUS: Attempt to update Manifest failed: ".concat(message), "Re-downloading the Manifest fully");
                    var FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY = config_1.default.getCurrent().FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY;
                    // The value allows to set a delay relatively to the last Manifest refresh
                    // (to avoid asking for it too often).
                    var timeSinceLastRefresh = newSendingTime === undefined ? 0 : (0, monotonic_timestamp_1.default)() - newSendingTime;
                    var _minInterval = Math.max(_this._settings.minimumManifestUpdateInterval - timeSinceLastRefresh, 0);
                    var unregisterCanceller_1 = noop_1.default;
                    var timeoutId_3 = setTimeout(function () {
                        unregisterCanceller_1();
                        _this._triggerNextManifestRefresh(manifest, {
                            enablePartialRefresh: false,
                            unsafeMode: false,
                        });
                    }, Math.max(FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY - timeSinceLastRefresh, _minInterval));
                    unregisterCanceller_1 = _this._canceller.signal.register(function () {
                        clearTimeout(timeoutId_3);
                    });
                    return;
                }
            }
            var updatingTime = (0, monotonic_timestamp_1.default)() - updateTimeStart;
            _this._recursivelyRefreshManifest(manifest, {
                sendingTime: newSendingTime,
                parsingTime: parsingTime,
                updatingTime: updatingTime,
            });
        })
            .catch(function (err) {
            _this._isRefreshPending = false;
            _this._onFatalError(err);
        });
    };
    ManifestFetcher.prototype._onFatalError = function (err) {
        if (this._canceller.isUsed()) {
            return;
        }
        this.trigger("error", err);
        this.dispose();
    };
    return ManifestFetcher;
}(event_emitter_1.default));
exports.default = ManifestFetcher;
/**
 * Returns `true` when the returned value seems to be a Promise instance, as
 * created by the RxPlayer.
 * @param {*} val
 * @returns {boolean}
 */
function isPromise(val) {
    return val instanceof Promise;
}
