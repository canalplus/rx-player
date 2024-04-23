"use strict";
/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");publicapi
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This file defines the public API for the RxPlayer.
 * It also starts the different sub-parts of the player on various API calls.
 */
var can_rely_on_video_visibility_and_size_1 = require("../../compat/can_rely_on_video_visibility_and_size");
var event_listeners_1 = require("../../compat/event_listeners");
var get_start_date_1 = require("../../compat/get_start_date");
var has_mse_in_worker_1 = require("../../compat/has_mse_in_worker");
var has_worker_api_1 = require("../../compat/has_worker_api");
var is_debug_mode_enabled_1 = require("../../compat/is_debug_mode_enabled");
var errors_1 = require("../../errors");
var worker_initialization_error_1 = require("../../errors/worker_initialization_error");
var features_1 = require("../../features");
var log_1 = require("../../log");
var manifest_1 = require("../../manifest");
var media_element_playback_observer_1 = require("../../playback_observer/media_element_playback_observer");
var array_find_1 = require("../../utils/array_find");
var array_includes_1 = require("../../utils/array_includes");
var assert_1 = require("../../utils/assert");
var event_emitter_1 = require("../../utils/event_emitter");
var id_generator_1 = require("../../utils/id_generator");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../utils/monotonic_timestamp");
var object_assign_1 = require("../../utils/object_assign");
var ranges_1 = require("../../utils/ranges");
var reference_1 = require("../../utils/reference");
var task_canceller_1 = require("../../utils/task_canceller");
var decrypt_1 = require("../decrypt");
var tracks_store_1 = require("../tracks_store");
var option_utils_1 = require("./option_utils");
var utils_1 = require("./utils");
/* eslint-disable @typescript-eslint/naming-convention */
var generateContentId = (0, id_generator_1.default)();
/**
 * Options of a `loadVideo` call which are for now not supported when running
 * in a "multithread" mode.
 *
 * TODO support those?
 */
var MULTI_THREAD_UNSUPPORTED_LOAD_VIDEO_OPTIONS = [
    "manifestLoader",
    "segmentLoader",
];
/**
 * @class Player
 * @extends EventEmitter
 */
var Player = /** @class */ (function (_super) {
    __extends(Player, _super);
    /**
     * @constructor
     * @param {Object} options
     */
    function Player(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        var _a = (0, option_utils_1.parseConstructorOptions)(options), baseBandwidth = _a.baseBandwidth, videoResolutionLimit = _a.videoResolutionLimit, maxBufferAhead = _a.maxBufferAhead, maxBufferBehind = _a.maxBufferBehind, throttleVideoBitrateWhenHidden = _a.throttleVideoBitrateWhenHidden, videoElement = _a.videoElement, wantedBufferAhead = _a.wantedBufferAhead, maxVideoBufferSize = _a.maxVideoBufferSize;
        // Workaround to support Firefox autoplay on FF 42.
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
        videoElement.preload = "auto";
        _this.version = /* PLAYER_VERSION */ "4.0.0-rc.2";
        _this.log = log_1.default;
        _this.state = "STOPPED";
        _this.videoElement = videoElement;
        Player._priv_registerVideoElement(_this.videoElement);
        var destroyCanceller = new task_canceller_1.default();
        _this._destroyCanceller = destroyCanceller;
        _this._priv_pictureInPictureRef = (0, event_listeners_1.getPictureOnPictureStateRef)(videoElement, destroyCanceller.signal);
        _this._priv_speed = new reference_1.default(videoElement.playbackRate, _this._destroyCanceller.signal);
        _this._priv_preferTrickModeTracks = false;
        _this._priv_contentLock = new reference_1.default(false, _this._destroyCanceller.signal);
        _this._priv_bufferOptions = {
            wantedBufferAhead: new reference_1.default(wantedBufferAhead, _this._destroyCanceller.signal),
            maxBufferAhead: new reference_1.default(maxBufferAhead, _this._destroyCanceller.signal),
            maxBufferBehind: new reference_1.default(maxBufferBehind, _this._destroyCanceller.signal),
            maxVideoBufferSize: new reference_1.default(maxVideoBufferSize, _this._destroyCanceller.signal),
        };
        _this._priv_bitrateInfos = {
            lastBitrates: { audio: baseBandwidth, video: baseBandwidth },
        };
        _this._priv_throttleVideoBitrateWhenHidden = throttleVideoBitrateWhenHidden;
        _this._priv_videoResolutionLimit = videoResolutionLimit;
        _this._priv_currentError = null;
        _this._priv_contentInfos = null;
        _this._priv_contentEventsMemory = {};
        _this._priv_reloadingMetadata = {};
        _this._priv_lastAutoPlay = false;
        _this._priv_worker = null;
        var onVolumeChange = function () {
            _this.trigger("volumeChange", {
                volume: videoElement.volume,
                muted: videoElement.muted,
            });
        };
        videoElement.addEventListener("volumechange", onVolumeChange);
        destroyCanceller.signal.register(function () {
            videoElement.removeEventListener("volumechange", onVolumeChange);
        });
        return _this;
    }
    Object.defineProperty(Player, "ErrorTypes", {
        /** All possible Error types emitted by the RxPlayer. */
        get: function () {
            return errors_1.ErrorTypes;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Player, "ErrorCodes", {
        /** All possible Error codes emitted by the RxPlayer. */
        get: function () {
            return errors_1.ErrorCodes;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Player, "LogLevel", {
        /**
         * Current log level.
         * Update current log level.
         * Should be either (by verbosity ascending):
         *   - "NONE"
         *   - "ERROR"
         *   - "WARNING"
         *   - "INFO"
         *   - "DEBUG"
         * Any other value will be translated to "NONE".
         */
        get: function () {
            return log_1.default.getLevel();
        },
        set: function (logLevel) {
            log_1.default.setLevel(logLevel);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Add feature(s) to the RxPlayer.
     * @param {Array.<Object>} featureList - Features wanted.
     */
    Player.addFeatures = function (featureList) {
        (0, features_1.addFeatures)(featureList);
    };
    /**
     * Register the video element to the set of elements currently in use.
     * @param videoElement the video element to register.
     * @throws Error - Throws if the element is already used by another player instance.
     */
    Player._priv_registerVideoElement = function (videoElement) {
        if (Player._priv_currentlyUsedVideoElements.has(videoElement)) {
            var errorMessage = "The video element is already attached to another RxPlayer instance." +
                "\nMake sure to dispose the previous instance with player.dispose() before creating" +
                " a new player instance attaching that video element.";
            // eslint-disable-next-line no-console
            console.warn(errorMessage);
            /*
             * TODO: for next major version 5.0: this need to throw an error instead of just logging
             * this was not done for minor version as it could be considerated a breaking change.
             *
             * throw new Error(errorMessage);
             */
        }
        Player._priv_currentlyUsedVideoElements.add(videoElement);
    };
    /**
     * Deregister the video element of the set of elements currently in use.
     * @param videoElement the video element to deregister.
     */
    Player._priv_deregisterVideoElement = function (videoElement) {
        if (Player._priv_currentlyUsedVideoElements.has(videoElement)) {
            Player._priv_currentlyUsedVideoElements.delete(videoElement);
        }
    };
    /**
     * TODO returns promise?
     * @param {Object} workerSettings
     */
    Player.prototype.attachWorker = function (workerSettings) {
        var _this = this;
        return new Promise(function (res, rej) {
            var _a;
            if (!(0, has_worker_api_1.default)()) {
                log_1.default.warn("API: Cannot rely on a WebWorker: Worker API unavailable");
                return rej(new worker_initialization_error_1.default("INCOMPATIBLE_ERROR", "Worker unavailable"));
            }
            if (typeof workerSettings.workerUrl === "string") {
                _this._priv_worker = new Worker(workerSettings.workerUrl);
            }
            else {
                var blobUrl = URL.createObjectURL(workerSettings.workerUrl);
                _this._priv_worker = new Worker(blobUrl);
                URL.revokeObjectURL(blobUrl);
            }
            _this._priv_worker.onerror = function (evt) {
                if (_this._priv_worker !== null) {
                    _this._priv_worker.terminate();
                    _this._priv_worker = null;
                }
                log_1.default.error("API: Unexpected worker error", evt.error instanceof Error ? evt.error : undefined);
                rej(new worker_initialization_error_1.default("UNKNOWN_ERROR", 'Unexpected Worker "error" event'));
            };
            var handleInitMessages = function (msg) {
                var msgData = msg.data;
                if (msgData.type === "init-error" /* WorkerMessageType.InitError */) {
                    log_1.default.warn("API: Processing InitError worker message: detaching worker");
                    if (_this._priv_worker !== null) {
                        _this._priv_worker.removeEventListener("message", handleInitMessages);
                        _this._priv_worker.terminate();
                        _this._priv_worker = null;
                    }
                    rej(new worker_initialization_error_1.default("SETUP_ERROR", "Worker parser initialization failed: " + msgData.value.errorMessage));
                }
                else if (msgData.type === "init-success" /* WorkerMessageType.InitSuccess */) {
                    log_1.default.info("API: InitSuccess received from worker.");
                    if (_this._priv_worker !== null) {
                        _this._priv_worker.removeEventListener("message", handleInitMessages);
                    }
                    res();
                }
            };
            _this._priv_worker.addEventListener("message", handleInitMessages);
            log_1.default.debug("---> Sending To Worker:", "init" /* MainThreadMessageType.Init */);
            _this._priv_worker.postMessage({
                type: "init" /* MainThreadMessageType.Init */,
                value: {
                    dashWasmUrl: workerSettings.dashWasmUrl,
                    logLevel: log_1.default.getLevel(),
                    sendBackLogs: (0, is_debug_mode_enabled_1.default)(),
                    date: Date.now(),
                    timestamp: (0, monotonic_timestamp_1.default)(),
                    hasVideo: ((_a = _this.videoElement) === null || _a === void 0 ? void 0 : _a.nodeName.toLowerCase()) === "video",
                    hasMseInWorker: has_mse_in_worker_1.default,
                },
            });
            log_1.default.addEventListener("onLogLevelChange", function (logLevel) {
                if (_this._priv_worker === null) {
                    return;
                }
                log_1.default.debug("---> Sending To Worker:", "log-level-update" /* MainThreadMessageType.LogLevelUpdate */);
                _this._priv_worker.postMessage({
                    type: "log-level-update" /* MainThreadMessageType.LogLevelUpdate */,
                    value: {
                        logLevel: logLevel,
                        sendBackLogs: (0, is_debug_mode_enabled_1.default)(),
                    },
                });
            }, _this._destroyCanceller.signal);
        });
    };
    /**
     * Returns information on which "mode" the RxPlayer is running for the current
     * content (e.g. main logic running in a WebWorker or not, are we in
     * directfile mode...).
     *
     * Returns `null` if no content is loaded.
     * @returns {Object|null}
     */
    Player.prototype.getCurrentModeInformation = function () {
        if (this._priv_contentInfos === null) {
            return null;
        }
        return {
            isDirectFile: this._priv_contentInfos.isDirectFile,
            useWorker: this._priv_contentInfos.useWorker,
        };
    };
    /**
     * Register a new callback for a player event event.
     *
     * @param {string} evt - The event to register a callback to
     * @param {Function} fn - The callback to call as that event is triggered.
     * The callback will take as argument the eventual payload of the event
     * (single argument).
     */
    Player.prototype.addEventListener = function (evt, fn) {
        // The EventEmitter's `addEventListener` method takes an optional third
        // argument that we do not want to expose in the public API.
        // We thus overwrite that function to remove any possible usage of that
        // third argument.
        return _super.prototype.addEventListener.call(this, evt, fn);
    };
    /**
     * Stop the playback for the current content.
     */
    Player.prototype.stop = function () {
        if (this._priv_contentInfos !== null) {
            this._priv_contentInfos.currentContentCanceller.cancel();
        }
        this._priv_cleanUpCurrentContentState();
        if (this.state !== "STOPPED" /* PLAYER_STATES.STOPPED */) {
            this._priv_setPlayerState("STOPPED" /* PLAYER_STATES.STOPPED */);
        }
    };
    /**
     * Free the resources used by the player.
     * /!\ The player cannot be "used" anymore after this method has been called.
     */
    Player.prototype.dispose = function () {
        // free resources linked to the loaded content
        this.stop();
        if (this.videoElement !== null) {
            Player._priv_deregisterVideoElement(this.videoElement);
            // free resources used for decryption management
            (0, decrypt_1.disposeDecryptionResources)(this.videoElement).catch(function (err) {
                var message = err instanceof Error ? err.message : "Unknown error";
                log_1.default.error("API: Could not dispose decryption resources: " + message);
            });
        }
        // free resources linked to the Player instance
        this._destroyCanceller.cancel();
        this._priv_reloadingMetadata = {};
        // un-attach video element
        this.videoElement = null;
        if (this._priv_worker !== null) {
            this._priv_worker.terminate();
            this._priv_worker = null;
        }
    };
    /**
     * Load a new video.
     * @param {Object} opts
     */
    Player.prototype.loadVideo = function (opts) {
        var options = (0, option_utils_1.parseLoadVideoOptions)(opts);
        log_1.default.info("API: Calling loadvideo", options.url, options.transport);
        this._priv_reloadingMetadata = { options: options };
        this._priv_initializeContentPlayback(options);
        this._priv_lastAutoPlay = options.autoPlay;
    };
    /**
     * Reload the last loaded content.
     * @param {Object} reloadOpts
     */
    Player.prototype.reload = function (reloadOpts) {
        var _a, _b, _c;
        var _d = this._priv_reloadingMetadata, options = _d.options, manifest = _d.manifest, reloadPosition = _d.reloadPosition, reloadInPause = _d.reloadInPause;
        if (options === undefined) {
            throw new Error("API: Can't reload without having previously loaded a content.");
        }
        (0, option_utils_1.checkReloadOptions)(reloadOpts);
        var startAt;
        if (((_a = reloadOpts === null || reloadOpts === void 0 ? void 0 : reloadOpts.reloadAt) === null || _a === void 0 ? void 0 : _a.position) !== undefined) {
            startAt = { position: reloadOpts.reloadAt.position };
        }
        else if (((_b = reloadOpts === null || reloadOpts === void 0 ? void 0 : reloadOpts.reloadAt) === null || _b === void 0 ? void 0 : _b.relative) !== undefined) {
            if (reloadPosition === undefined) {
                throw new Error("Can't reload to a relative position when previous content was not loaded.");
            }
            else {
                startAt = { position: reloadOpts.reloadAt.relative + reloadPosition };
            }
        }
        else if (reloadPosition !== undefined) {
            startAt = { position: reloadPosition };
        }
        var autoPlay;
        if ((reloadOpts === null || reloadOpts === void 0 ? void 0 : reloadOpts.autoPlay) !== undefined) {
            autoPlay = reloadOpts.autoPlay;
        }
        else if (reloadInPause !== undefined) {
            autoPlay = !reloadInPause;
        }
        var keySystems;
        if ((reloadOpts === null || reloadOpts === void 0 ? void 0 : reloadOpts.keySystems) !== undefined) {
            keySystems = reloadOpts.keySystems;
        }
        else if (((_c = this._priv_reloadingMetadata.options) === null || _c === void 0 ? void 0 : _c.keySystems) !== undefined) {
            keySystems = this._priv_reloadingMetadata.options.keySystems;
        }
        var newOptions = __assign(__assign({}, options), { initialManifest: manifest });
        if (startAt !== undefined) {
            newOptions.startAt = startAt;
        }
        if (autoPlay !== undefined) {
            newOptions.autoPlay = autoPlay;
        }
        if (keySystems !== undefined) {
            newOptions.keySystems = keySystems;
        }
        this._priv_initializeContentPlayback(newOptions);
    };
    Player.prototype.createDebugElement = function (element) {
        if (features_1.default.createDebugElement === null) {
            throw new Error("Feature `DEBUG_ELEMENT` not added to the RxPlayer");
        }
        var canceller = new task_canceller_1.default();
        features_1.default.createDebugElement(element, this, canceller.signal);
        return {
            dispose: function () {
                canceller.cancel();
            },
        };
    };
    /**
     * From given options, initialize content playback.
     * @param {Object} options
     */
    Player.prototype._priv_initializeContentPlayback = function (options) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        var autoPlay = options.autoPlay, defaultAudioTrackSwitchingMode = options.defaultAudioTrackSwitchingMode, enableFastSwitching = options.enableFastSwitching, initialManifest = options.initialManifest, keySystems = options.keySystems, lowLatencyMode = options.lowLatencyMode, minimumManifestUpdateInterval = options.minimumManifestUpdateInterval, requestConfig = options.requestConfig, onCodecSwitch = options.onCodecSwitch, startAt = options.startAt, transport = options.transport, checkMediaSegmentIntegrity = options.checkMediaSegmentIntegrity, manifestLoader = options.manifestLoader, referenceDateTime = options.referenceDateTime, segmentLoader = options.segmentLoader, serverSyncInfos = options.serverSyncInfos, mode = options.mode, __priv_manifestUpdateUrl = options.__priv_manifestUpdateUrl, __priv_patchLastSegmentInSidx = options.__priv_patchLastSegmentInSidx, url = options.url;
        // Perform multiple checks on the given options
        if (this.videoElement === null) {
            throw new Error("the attached video element is disposed");
        }
        var isDirectFile = transport === "directfile";
        /** Emit to stop the current content. */
        var currentContentCanceller = new task_canceller_1.default();
        var videoElement = this.videoElement;
        var initializer;
        var useWorker = false;
        var mediaElementTracksStore = null;
        if (!isDirectFile) {
            /** Interface used to load and refresh the Manifest. */
            var manifestRequestSettings = {
                lowLatencyMode: lowLatencyMode,
                maxRetry: (_a = requestConfig.manifest) === null || _a === void 0 ? void 0 : _a.maxRetry,
                requestTimeout: (_b = requestConfig.manifest) === null || _b === void 0 ? void 0 : _b.timeout,
                connectionTimeout: (_c = requestConfig.manifest) === null || _c === void 0 ? void 0 : _c.connectionTimeout,
                minimumManifestUpdateInterval: minimumManifestUpdateInterval,
                initialManifest: initialManifest,
            };
            var relyOnVideoVisibilityAndSize = (0, can_rely_on_video_visibility_and_size_1.default)();
            var throttlers = {
                throttleBitrate: {},
                limitResolution: {},
            };
            if (this._priv_throttleVideoBitrateWhenHidden) {
                if (!relyOnVideoVisibilityAndSize) {
                    log_1.default.warn("API: Can't apply throttleVideoBitrateWhenHidden because " +
                        "browser can't be trusted for visibility.");
                }
                else {
                    throttlers.throttleBitrate = {
                        video: (0, reference_1.createMappedReference)((0, event_listeners_1.getVideoVisibilityRef)(this._priv_pictureInPictureRef, currentContentCanceller.signal), function (isActive) { return (isActive ? Infinity : 0); }, currentContentCanceller.signal),
                    };
                }
            }
            if (this._priv_videoResolutionLimit === "videoElement") {
                if (!relyOnVideoVisibilityAndSize) {
                    log_1.default.warn("API: Can't apply videoResolutionLimit because browser can't be " +
                        "trusted for video size.");
                }
                else {
                    throttlers.limitResolution = {
                        video: (0, event_listeners_1.getElementResolutionRef)(videoElement, this._priv_pictureInPictureRef, currentContentCanceller.signal),
                    };
                }
            }
            else if (this._priv_videoResolutionLimit === "screen") {
                throttlers.limitResolution = {
                    video: (0, event_listeners_1.getScreenResolutionRef)(currentContentCanceller.signal),
                };
            }
            /** Options used by the adaptive logic. */
            var adaptiveOptions = {
                initialBitrates: this._priv_bitrateInfos.lastBitrates,
                lowLatencyMode: lowLatencyMode,
                throttlers: throttlers,
            };
            /** Options used by the TextTrack SegmentSink. */
            var textTrackOptions = options.textTrackMode === "native"
                ? { textTrackMode: "native" }
                : {
                    textTrackMode: "html",
                    textTrackElement: options.textTrackElement,
                };
            var bufferOptions = (0, object_assign_1.default)({ enableFastSwitching: enableFastSwitching, onCodecSwitch: onCodecSwitch }, this._priv_bufferOptions);
            var segmentRequestOptions = {
                lowLatencyMode: lowLatencyMode,
                maxRetry: (_d = requestConfig.segment) === null || _d === void 0 ? void 0 : _d.maxRetry,
                requestTimeout: (_e = requestConfig.segment) === null || _e === void 0 ? void 0 : _e.timeout,
                connectionTimeout: (_f = requestConfig.segment) === null || _f === void 0 ? void 0 : _f.connectionTimeout,
            };
            var canRunInMultiThread = features_1.default.multithread !== null &&
                this._priv_worker !== null &&
                transport === "dash" &&
                MULTI_THREAD_UNSUPPORTED_LOAD_VIDEO_OPTIONS.every(function (option) {
                    return (0, is_null_or_undefined_1.default)(options[option]);
                }) &&
                typeof options.representationFilter !== "function";
            if (mode === "main" || (mode === "auto" && !canRunInMultiThread)) {
                if (features_1.default.mainThreadMediaSourceInit === null) {
                    throw new Error("Cannot load video, neither in a WebWorker nor with the " +
                        "`MEDIA_SOURCE_MAIN` feature");
                }
                var transportFn = features_1.default.transports[transport];
                if (typeof transportFn !== "function") {
                    // Stop previous content and reset its state
                    this.stop();
                    this._priv_currentError = null;
                    throw new Error("transport \"".concat(transport, "\" not supported"));
                }
                var representationFilter = typeof options.representationFilter === "string"
                    ? (0, manifest_1.createRepresentationFilterFromFnString)(options.representationFilter)
                    : options.representationFilter;
                log_1.default.info("API: Initializing MediaSource mode in the main thread");
                var transportPipelines = transportFn({
                    lowLatencyMode: lowLatencyMode,
                    checkMediaSegmentIntegrity: checkMediaSegmentIntegrity,
                    manifestLoader: manifestLoader,
                    referenceDateTime: referenceDateTime,
                    representationFilter: representationFilter,
                    segmentLoader: segmentLoader,
                    serverSyncInfos: serverSyncInfos,
                    __priv_manifestUpdateUrl: __priv_manifestUpdateUrl,
                    __priv_patchLastSegmentInSidx: __priv_patchLastSegmentInSidx,
                });
                initializer = new features_1.default.mainThreadMediaSourceInit({
                    adaptiveOptions: adaptiveOptions,
                    autoPlay: autoPlay,
                    bufferOptions: bufferOptions,
                    keySystems: keySystems,
                    lowLatencyMode: lowLatencyMode,
                    transport: transportPipelines,
                    manifestRequestSettings: manifestRequestSettings,
                    segmentRequestOptions: segmentRequestOptions,
                    speed: this._priv_speed,
                    startAt: startAt,
                    textTrackOptions: textTrackOptions,
                    url: url,
                });
            }
            else {
                if (features_1.default.multithread === null) {
                    throw new Error("Cannot load video in multithread mode: `MULTI_THREAD` " +
                        "feature not imported.");
                }
                else if (this._priv_worker === null) {
                    throw new Error("Cannot load video in multithread mode: `attachWorker` " +
                        "method not called.");
                }
                (0, assert_1.default)(typeof options.representationFilter !== "function");
                useWorker = true;
                log_1.default.info("API: Initializing MediaSource mode in a WebWorker");
                var transportOptions = {
                    lowLatencyMode: lowLatencyMode,
                    checkMediaSegmentIntegrity: checkMediaSegmentIntegrity,
                    referenceDateTime: referenceDateTime,
                    serverSyncInfos: serverSyncInfos,
                    manifestLoader: undefined,
                    segmentLoader: undefined,
                    representationFilter: options.representationFilter,
                    __priv_manifestUpdateUrl: __priv_manifestUpdateUrl,
                    __priv_patchLastSegmentInSidx: __priv_patchLastSegmentInSidx,
                };
                initializer = new features_1.default.multithread.init({
                    adaptiveOptions: adaptiveOptions,
                    autoPlay: autoPlay,
                    bufferOptions: bufferOptions,
                    keySystems: keySystems,
                    lowLatencyMode: lowLatencyMode,
                    transportOptions: transportOptions,
                    manifestRequestSettings: manifestRequestSettings,
                    segmentRequestOptions: segmentRequestOptions,
                    speed: this._priv_speed,
                    startAt: startAt,
                    textTrackOptions: textTrackOptions,
                    worker: this._priv_worker,
                    url: url,
                });
            }
        }
        else {
            if (features_1.default.directfile === null) {
                this.stop();
                this._priv_currentError = null;
                throw new Error("DirectFile feature not activated in your build.");
            }
            else if ((0, is_null_or_undefined_1.default)(url)) {
                throw new Error("No URL for a DirectFile content");
            }
            log_1.default.info("API: Initializing DirectFile mode in the main thread");
            mediaElementTracksStore = this._priv_initializeMediaElementTracksStore(currentContentCanceller.signal);
            if (currentContentCanceller.isUsed()) {
                return;
            }
            initializer = new features_1.default.directfile.initDirectFile({
                autoPlay: autoPlay,
                keySystems: keySystems,
                speed: this._priv_speed,
                startAt: startAt,
                url: url,
            });
        }
        /** Future `this._priv_contentInfos` related to this content. */
        var contentInfos = {
            contentId: generateContentId(),
            originalUrl: url,
            currentContentCanceller: currentContentCanceller,
            defaultAudioTrackSwitchingMode: defaultAudioTrackSwitchingMode,
            initializer: initializer,
            isDirectFile: isDirectFile,
            segmentSinksStore: null,
            manifest: null,
            currentPeriod: null,
            activeAdaptations: null,
            activeRepresentations: null,
            tracksStore: null,
            mediaElementTracksStore: mediaElementTracksStore,
            useWorker: useWorker,
        };
        // Bind events
        initializer.addEventListener("error", function (error) {
            _this._priv_onFatalError(error, contentInfos);
        });
        initializer.addEventListener("warning", function (error) {
            var formattedError = (0, errors_1.formatError)(error, {
                defaultCode: "NONE",
                defaultReason: "An unknown error happened.",
            });
            log_1.default.warn("API: Sending warning:", formattedError);
            _this.trigger("warning", formattedError);
        });
        initializer.addEventListener("reloadingMediaSource", function (payload) {
            contentInfos.segmentSinksStore = null;
            if (contentInfos.tracksStore !== null) {
                contentInfos.tracksStore.resetPeriodObjects();
            }
            _this._priv_lastAutoPlay = payload.autoPlay;
        });
        initializer.addEventListener("inbandEvents", function (inbandEvents) {
            return _this.trigger("inbandEvents", inbandEvents);
        });
        initializer.addEventListener("streamEvent", function (streamEvent) {
            return _this.trigger("streamEvent", streamEvent);
        });
        initializer.addEventListener("streamEventSkip", function (streamEventSkip) {
            return _this.trigger("streamEventSkip", streamEventSkip);
        });
        initializer.addEventListener("activePeriodChanged", function (periodInfo) {
            return _this._priv_onActivePeriodChanged(contentInfos, periodInfo);
        });
        initializer.addEventListener("periodStreamReady", function (periodReadyInfo) {
            return _this._priv_onPeriodStreamReady(contentInfos, periodReadyInfo);
        });
        initializer.addEventListener("periodStreamCleared", function (periodClearedInfo) {
            return _this._priv_onPeriodStreamCleared(contentInfos, periodClearedInfo);
        });
        initializer.addEventListener("representationChange", function (representationInfo) {
            return _this._priv_onRepresentationChange(contentInfos, representationInfo);
        });
        initializer.addEventListener("adaptationChange", function (adaptationInfo) {
            return _this._priv_onAdaptationChange(contentInfos, adaptationInfo);
        });
        initializer.addEventListener("bitrateEstimateChange", function (bitrateEstimateInfo) {
            return _this._priv_onBitrateEstimateChange(bitrateEstimateInfo);
        });
        initializer.addEventListener("manifestReady", function (manifest) {
            return _this._priv_onManifestReady(contentInfos, manifest);
        });
        initializer.addEventListener("manifestUpdate", function (updates) {
            return _this._priv_onManifestUpdate(contentInfos, updates);
        });
        initializer.addEventListener("decipherabilityUpdate", function (updates) {
            return _this._priv_onDecipherabilityUpdate(contentInfos, updates);
        });
        initializer.addEventListener("loaded", function (evt) {
            contentInfos.segmentSinksStore = evt.segmentSinksStore;
        });
        // Now, that most events are linked, prepare the next content.
        initializer.prepare();
        // Now that the content is prepared, stop previous content and reset state
        // This is done after content preparation as `stop` could technically have
        // a long and synchronous blocking time.
        // Note that this call is done **synchronously** after all events linking.
        // This is **VERY** important so:
        //   - the `STOPPED` state is switched to synchronously after loading a new
        //     content.
        //   - we can avoid involontarily catching events linked to the previous
        //     content.
        this.stop();
        /** Global "playback observer" which will emit playback conditions */
        var playbackObserver = new media_element_playback_observer_1.default(videoElement, {
            withMediaSource: !isDirectFile,
            lowLatencyMode: lowLatencyMode,
        });
        currentContentCanceller.signal.register(function () {
            playbackObserver.stop();
        });
        // Update the RxPlayer's state at the right events
        var playerStateRef = (0, utils_1.constructPlayerStateReference)(initializer, videoElement, playbackObserver, currentContentCanceller.signal);
        currentContentCanceller.signal.register(function () {
            initializer.dispose();
        });
        /**
         * Function updating `this._priv_reloadingMetadata` in function of the
         * current state and playback conditions.
         * To call when either might change.
         * @param {string} state - The player state we're about to switch to.
         */
        var updateReloadingMetadata = function (state) {
            switch (state) {
                case "STOPPED":
                case "RELOADING":
                case "LOADING":
                    break; // keep previous metadata
                case "ENDED":
                    _this._priv_reloadingMetadata.reloadInPause = true;
                    _this._priv_reloadingMetadata.reloadPosition = playbackObserver
                        .getReference()
                        .getValue()
                        .position.getPolled();
                    break;
                default:
                    var o = playbackObserver.getReference().getValue();
                    _this._priv_reloadingMetadata.reloadInPause = o.paused;
                    _this._priv_reloadingMetadata.reloadPosition = o.position.getWanted();
                    break;
            }
        };
        /**
         * `TaskCanceller` allowing to stop emitting `"play"` and `"pause"`
         * events.
         * `null` when such events are not emitted currently.
         */
        var playPauseEventsCanceller = null;
        /**
         * Callback emitting `"play"` and `"pause`" events once the content is
         * loaded, starting from the state indicated in argument.
         * @param {boolean} willAutoPlay - If `false`, we're currently paused.
         */
        var triggerPlayPauseEventsWhenReady = function (willAutoPlay) {
            if (playPauseEventsCanceller !== null) {
                playPauseEventsCanceller.cancel(); // cancel previous logic
                playPauseEventsCanceller = null;
            }
            playerStateRef.onUpdate(function (val, stopListeningToStateUpdates) {
                if (!(0, utils_1.isLoadedState)(val)) {
                    return; // content not loaded yet: no event
                }
                stopListeningToStateUpdates();
                if (playPauseEventsCanceller !== null) {
                    playPauseEventsCanceller.cancel();
                }
                playPauseEventsCanceller = new task_canceller_1.default();
                playPauseEventsCanceller.linkToSignal(currentContentCanceller.signal);
                if (willAutoPlay !== !videoElement.paused) {
                    // paused status is not at the expected value on load: emit event
                    if (videoElement.paused) {
                        _this.trigger("pause", null);
                    }
                    else {
                        _this.trigger("play", null);
                    }
                }
                (0, utils_1.emitPlayPauseEvents)(videoElement, function () { return _this.trigger("play", null); }, function () { return _this.trigger("pause", null); }, currentContentCanceller.signal);
            }, {
                emitCurrentValue: false,
                clearSignal: currentContentCanceller.signal,
            });
        };
        triggerPlayPauseEventsWhenReady(autoPlay);
        initializer.addEventListener("reloadingMediaSource", function (payload) {
            triggerPlayPauseEventsWhenReady(payload.autoPlay);
        });
        this._priv_currentError = null;
        this._priv_contentInfos = contentInfos;
        /**
         * `TaskCanceller` allowing to stop emitting `"seeking"` and `"seeked"`
         * events.
         * `null` when such events are not emitted currently.
         */
        var seekEventsCanceller = null;
        // React to player state change
        playerStateRef.onUpdate(function (newState) {
            updateReloadingMetadata(newState);
            _this._priv_setPlayerState(newState);
            if (currentContentCanceller.isUsed()) {
                return;
            }
            if (seekEventsCanceller !== null) {
                if (!(0, utils_1.isLoadedState)(_this.state)) {
                    seekEventsCanceller.cancel();
                    seekEventsCanceller = null;
                }
            }
            else if ((0, utils_1.isLoadedState)(_this.state)) {
                seekEventsCanceller = new task_canceller_1.default();
                seekEventsCanceller.linkToSignal(currentContentCanceller.signal);
                (0, utils_1.emitSeekEvents)(videoElement, playbackObserver, function () { return _this.trigger("seeking", null); }, function () { return _this.trigger("seeked", null); }, seekEventsCanceller.signal);
            }
        }, { emitCurrentValue: true, clearSignal: currentContentCanceller.signal });
        // React to playback conditions change
        playbackObserver.listen(function (observation) {
            updateReloadingMetadata(_this.state);
            _this._priv_triggerPositionUpdate(contentInfos, observation);
        }, { clearSignal: currentContentCanceller.signal });
        currentContentCanceller.signal.register(function () {
            initializer.removeEventListener();
        });
        // initialize the content only when the lock is inactive
        this._priv_contentLock.onUpdate(function (isLocked, stopListeningToLock) {
            if (!isLocked) {
                stopListeningToLock();
                // start playback!
                initializer.start(videoElement, playbackObserver);
            }
        }, { emitCurrentValue: true, clearSignal: currentContentCanceller.signal });
    };
    /**
     * Returns fatal error if one for the current content.
     * null otherwise.
     * @returns {Object|null} - The current Error (`null` when no error).
     */
    Player.prototype.getError = function () {
        return this._priv_currentError;
    };
    /**
     * Returns the media DOM element used by the player.
     * You should not its HTML5 API directly and use the player's method instead,
     * to ensure a well-behaved player.
     * @returns {HTMLMediaElement|null} - The HTMLMediaElement used (`null` when
     * disposed)
     */
    Player.prototype.getVideoElement = function () {
        return this.videoElement;
    };
    /**
     * Returns the player's current state.
     * @returns {string} - The current Player's state
     */
    Player.prototype.getPlayerState = function () {
        return this.state;
    };
    /**
     * Returns true if a content is loaded.
     * @returns {Boolean} - `true` if a content is loaded, `false` otherwise.
     */
    Player.prototype.isContentLoaded = function () {
        return !(0, array_includes_1.default)(["LOADING", "RELOADING", "STOPPED"], this.state);
    };
    /**
     * Returns true if the player is buffering.
     * @returns {Boolean} - `true` if the player is buffering, `false` otherwise.
     */
    Player.prototype.isBuffering = function () {
        return (0, array_includes_1.default)(["BUFFERING", "SEEKING", "LOADING", "RELOADING"], this.state);
    };
    /**
     * Returns the play/pause status of the player :
     *   - when `LOADING` or `RELOADING`, returns the scheduled play/pause condition
     *     for when loading is over,
     *   - in other states, returns the `<video>` element .paused value,
     *   - if the player is disposed, returns `true`.
     * @returns {Boolean} - `true` if the player is paused or will be after loading,
     * `false` otherwise.
     */
    Player.prototype.isPaused = function () {
        if (this.videoElement) {
            if ((0, array_includes_1.default)(["LOADING", "RELOADING"], this.state)) {
                return !this._priv_lastAutoPlay;
            }
            else {
                return this.videoElement.paused;
            }
        }
        return true;
    };
    /**
     * Returns true if both:
     *   - a content is loaded
     *   - the content loaded is a live content
     * @returns {Boolean} - `true` if we're playing a live content, `false` otherwise.
     */
    Player.prototype.isLive = function () {
        if (this._priv_contentInfos === null) {
            return false;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, manifest = _a.manifest;
        if (isDirectFile || manifest === null) {
            return false;
        }
        return manifest.isLive;
    };
    /**
     * Returns `true` if trickmode playback is active (usually through the usage
     * of the `setPlaybackRate` method), which means that the RxPlayer selects
     * "trickmode" video tracks in priority.
     * @returns {Boolean}
     */
    Player.prototype.areTrickModeTracksEnabled = function () {
        return this._priv_preferTrickModeTracks;
    };
    /**
     * Returns the URL(s) of the currently considered Manifest, or of the content for
     * directfile content.
     * @returns {Array.<string>|undefined} - Current URL. `undefined` if not known
     * or no URL yet.
     */
    Player.prototype.getContentUrls = function () {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, manifest = _a.manifest, originalUrl = _a.originalUrl;
        if (isDirectFile) {
            return originalUrl === undefined ? undefined : [originalUrl];
        }
        if (manifest !== null) {
            return manifest.uris;
        }
        return undefined;
    };
    /**
     * Update URL of the content currently being played (e.g. DASH's MPD).
     * @param {Array.<string>|undefined} urls - URLs to reach that content /
     * Manifest from the most prioritized URL to the least prioritized URL.
     * @param {Object|undefined} [params]
     * @param {boolean} params.refresh - If `true` the resource in question
     * (e.g. DASH's MPD) will be refreshed immediately.
     */
    Player.prototype.updateContentUrls = function (urls, params) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        var refreshNow = (params === null || params === void 0 ? void 0 : params.refresh) === true;
        this._priv_contentInfos.initializer.updateContentUrls(urls, refreshNow);
    };
    /**
     * Returns the video duration, in seconds.
     * NaN if no video is playing.
     * @returns {Number}
     */
    Player.prototype.getMediaDuration = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        return this.videoElement.duration;
    };
    /**
     * Returns in seconds the difference between:
     *   - the end of the current contiguous loaded range.
     *   - the current time
     * @returns {Number}
     */
    Player.prototype.getCurrentBufferGap = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        var videoElement = this.videoElement;
        var bufferGap = (0, ranges_1.getLeftSizeOfBufferedTimeRange)(videoElement.buffered, videoElement.currentTime);
        if (bufferGap === Infinity) {
            return 0;
        }
        return bufferGap;
    };
    /**
     * Get the current position, in s, in wall-clock time.
     * That is:
     *   - for live content, get a timestamp, in s, of the current played content.
     *   - for static content, returns the position from beginning in s.
     *
     * If you do not know if you want to use this method or getPosition:
     *   - If what you want is to display the current time to the user, use this
     *     one.
     *   - If what you want is to interact with the player's API or perform other
     *     actions (like statistics) with the real player data, use getPosition.
     *
     * @returns {Number}
     */
    Player.prototype.getWallClockTime = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (this._priv_contentInfos === null) {
            return this.videoElement.currentTime;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, manifest = _a.manifest;
        if (isDirectFile) {
            var startDate = (0, get_start_date_1.default)(this.videoElement);
            return (startDate !== null && startDate !== void 0 ? startDate : 0) + this.videoElement.currentTime;
        }
        if (manifest !== null) {
            var currentTime = this.videoElement.currentTime;
            var ast = manifest.availabilityStartTime !== undefined ? manifest.availabilityStartTime : 0;
            return currentTime + ast;
        }
        return 0;
    };
    /**
     * Get the current position, in seconds, of the video element.
     *
     * If you do not know if you want to use this method or getWallClockTime:
     *   - If what you want is to display the current time to the user, use
     *     getWallClockTime.
     *   - If what you want is to interact with the player's API or perform other
     *     actions (like statistics) with the real player data, use this one.
     *
     * @returns {Number}
     */
    Player.prototype.getPosition = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        return this.videoElement.currentTime;
    };
    /**
     * Returns the last stored content position, in seconds.
     *
     * @returns {number|undefined}
     */
    Player.prototype.getLastStoredContentPosition = function () {
        return this._priv_reloadingMetadata.reloadPosition;
    };
    /**
     * Returns the current playback rate at which the video plays.
     * @returns {Number}
     */
    Player.prototype.getPlaybackRate = function () {
        return this._priv_speed.getValue();
    };
    /**
     * Update the playback rate of the video.
     *
     * This method's effect is persisted from content to content, and can be
     * called even when no content is playing (it will still have an effect for
     * the next contents).
     *
     * If you want to reverse effects provoked by `setPlaybackRate` before playing
     * another content, you will have to call `setPlaybackRate` first with the
     * default settings you want to set.
     *
     * As an example, to reset the speed to "normal" (x1) speed and to disable
     * trickMode video tracks (which may have been enabled by a previous
     * `setPlaybackRate` call), you can call:
     * ```js
     * player.setPlaybackRate(1, { preferTrickModeTracks: false });
     * ```
     *
     * --
     *
     * This method can be used to switch to or exit from "trickMode" video tracks,
     * which are tracks specifically defined to mimic the visual aspect of a VCR's
     * fast forward/rewind feature, by only displaying a few video frames during
     * playback.
     *
     * This behavior is configurable through the second argument, by adding a
     * property named `preferTrickModeTracks` to that object.
     *
     * You can set that value to `true` to switch to trickMode video tracks when
     * available, and set it to `false` when you want to disable that logic.
     * Note that like any configuration given to `setPlaybackRate`, this setting
     * is persisted through all future contents played by the player.
     *
     * If you want to stop enabling trickMode tracks, you will have to call
     * `setPlaybackRate` again with `preferTrickModeTracks` set to `false`.
     *
     * You can know at any moment whether this behavior is enabled by calling
     * the `areTrickModeTracksEnabled` method. This will only means that the
     * RxPlayer will select in priority trickmode video tracks, not that the
     * currently chosen video tracks is a trickmode track (for example, some
     * contents may have no trickmode tracks available).
     *
     * If you want to know about the latter instead, you can call `getVideoTrack`
     * and/or listen to `videoTrackChange` events. The track returned may have an
     * `isTrickModeTrack` property set to `true`, indicating that it is a
     * trickmode track.
     *
     * Note that switching to or getting out of a trickmode video track may
     * lead to the player being a brief instant in a `"RELOADING"` state (notified
     * through `playerStateChange` events and the `getLoadedContentState` method).
     * When in that state, a black screen may be displayed and multiple RxPlayer
     * APIs will not be usable.
     *
     * @param {Number} rate
     * @param {Object} opts
     */
    Player.prototype.setPlaybackRate = function (rate, opts) {
        var _a;
        if (rate !== this._priv_speed.getValue()) {
            this._priv_speed.setValue(rate);
        }
        var preferTrickModeTracks = opts === null || opts === void 0 ? void 0 : opts.preferTrickModeTracks;
        if (typeof preferTrickModeTracks !== "boolean") {
            return;
        }
        this._priv_preferTrickModeTracks = preferTrickModeTracks;
        var tracksStore = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.tracksStore;
        if (!(0, is_null_or_undefined_1.default)(tracksStore)) {
            if (preferTrickModeTracks && !tracksStore.isTrickModeEnabled()) {
                tracksStore.enableVideoTrickModeTracks();
            }
            else if (!preferTrickModeTracks && tracksStore.isTrickModeEnabled()) {
                tracksStore.disableVideoTrickModeTracks();
            }
        }
    };
    /**
     * Returns video Representation currently considered for the current Period.
     *
     * Returns `null` if no video track is playing for the current Period.
     *
     * Returns `undefined` either when are not currently playing any Period or
     * when we don't know which Representation is playing.
     * @returns {Object|null|undefined}
     */
    Player.prototype.getVideoRepresentation = function () {
        var representations = this.__priv_getCurrentRepresentations();
        if (representations === null) {
            return undefined;
        }
        return representations.video;
    };
    /**
     * Returns audio Representation currently considered for the current Period.
     *
     * Returns `null` if no audio track is playing for the current Period.
     *
     * Returns `undefined` either when are not currently playing any Period or
     * when we don't know which Representation is playing.
     * @returns {Object|null|undefined}
     */
    Player.prototype.getAudioRepresentation = function () {
        var representations = this.__priv_getCurrentRepresentations();
        if (representations === null) {
            return undefined;
        }
        return representations.audio;
    };
    /**
     * Play/Resume the current video.
     * @returns {Promise}
     */
    Player.prototype.play = function () {
        var _this = this;
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        var playPromise = this.videoElement.play();
        /* eslint-disable @typescript-eslint/unbound-method */
        if ((0, is_null_or_undefined_1.default)(playPromise) || typeof playPromise.catch !== "function") {
            /* eslint-enable @typescript-eslint/unbound-method */
            return Promise.resolve();
        }
        return playPromise.catch(function (error) {
            if (error.name === "NotAllowedError") {
                var warning = new errors_1.MediaError("MEDIA_ERR_PLAY_NOT_ALLOWED", error.toString());
                _this.trigger("warning", warning);
            }
            throw error;
        });
    };
    /**
     * Pause the current video.
     */
    Player.prototype.pause = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        this.videoElement.pause();
    };
    /**
     * Seek to a given absolute position.
     * @param {Number|Object} time
     * @returns {Number} - The time the player has seek to
     */
    Player.prototype.seekTo = function (time) {
        var _a;
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (this._priv_contentInfos === null) {
            throw new Error("player: no content loaded");
        }
        var _b = this._priv_contentInfos, isDirectFile = _b.isDirectFile, manifest = _b.manifest;
        if (!isDirectFile && manifest === null) {
            throw new Error("player: the content did not load yet");
        }
        var positionWanted;
        if (typeof time === "number") {
            positionWanted = time;
        }
        else if (typeof time === "object") {
            var timeObj = time;
            var currentTs = this.videoElement.currentTime;
            if (!(0, is_null_or_undefined_1.default)(timeObj.relative)) {
                positionWanted = currentTs + timeObj.relative;
            }
            else if (!(0, is_null_or_undefined_1.default)(timeObj.position)) {
                positionWanted = timeObj.position;
            }
            else if (!(0, is_null_or_undefined_1.default)(timeObj.wallClockTime)) {
                if (manifest !== null) {
                    positionWanted = timeObj.wallClockTime - ((_a = manifest.availabilityStartTime) !== null && _a !== void 0 ? _a : 0);
                }
                else if (isDirectFile && this.videoElement !== null) {
                    var startDate = (0, get_start_date_1.default)(this.videoElement);
                    if (startDate !== undefined) {
                        positionWanted = timeObj.wallClockTime - startDate;
                    }
                }
                if (positionWanted === undefined) {
                    positionWanted = timeObj.wallClockTime;
                }
            }
            else {
                throw new Error("invalid time object. You must set one of the " +
                    'following properties: "relative", "position" or ' +
                    '"wallClockTime"');
            }
        }
        if (positionWanted === undefined) {
            throw new Error("invalid time given");
        }
        log_1.default.info("API: API Seek to", positionWanted);
        this.videoElement.currentTime = positionWanted;
        return positionWanted;
    };
    /**
     * Returns the current player's audio volume on the media element.
     * From 0 (no audio) to 1 (maximum volume).
     * @returns {Number}
     */
    Player.prototype.getVolume = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        return this.videoElement.volume;
    };
    /**
     * Set the player's audio volume. From 0 (no volume) to 1 (maximum volume).
     * @param {Number} volume
     */
    Player.prototype.setVolume = function (volume) {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        var videoElement = this.videoElement;
        if (volume !== videoElement.volume) {
            videoElement.volume = volume;
        }
    };
    /**
     * Returns `true` if audio is currently muted.
     * @returns {Boolean}
     */
    Player.prototype.isMute = function () {
        var _a;
        return ((_a = this.videoElement) === null || _a === void 0 ? void 0 : _a.muted) === true;
    };
    /**
     * Mute audio.
     */
    Player.prototype.mute = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (!this.videoElement.muted) {
            this.videoElement.muted = true;
        }
    };
    /**
     * Unmute audio.
     */
    Player.prototype.unMute = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (this.videoElement.muted) {
            this.videoElement.muted = false;
        }
    };
    /**
     * Set the max buffer size for the buffer behind the current position.
     * Every buffer data before will be removed.
     * @param {Number} depthInSeconds
     */
    Player.prototype.setMaxBufferBehind = function (depthInSeconds) {
        this._priv_bufferOptions.maxBufferBehind.setValue(depthInSeconds);
    };
    /**
     * Set the max buffer size for the buffer behind the current position.
     * Every buffer data before will be removed.
     * @param {Number} depthInSeconds
     */
    Player.prototype.setMaxBufferAhead = function (depthInSeconds) {
        this._priv_bufferOptions.maxBufferAhead.setValue(depthInSeconds);
    };
    /**
     * Set the max buffer size for the buffer ahead of the current position.
     * The player will stop downloading chunks when this size is reached.
     * @param {Number} sizeInSeconds
     */
    Player.prototype.setWantedBufferAhead = function (sizeInSeconds) {
        this._priv_bufferOptions.wantedBufferAhead.setValue(sizeInSeconds);
    };
    /**
     * Set the max buffer size the buffer should take in memory
     * The player . will stop downloading chunks when this size is reached.
     * @param {Number} sizeInKBytes
     */
    Player.prototype.setMaxVideoBufferSize = function (sizeInKBytes) {
        this._priv_bufferOptions.maxVideoBufferSize.setValue(sizeInKBytes);
    };
    /**
     * Returns the max buffer size for the buffer behind the current position.
     * @returns {Number}
     */
    Player.prototype.getMaxBufferBehind = function () {
        return this._priv_bufferOptions.maxBufferBehind.getValue();
    };
    /**
     * Returns the max buffer size for the buffer behind the current position.
     * @returns {Number}
     */
    Player.prototype.getMaxBufferAhead = function () {
        return this._priv_bufferOptions.maxBufferAhead.getValue();
    };
    /**
     * Returns the max buffer size for the buffer ahead of the current position.
     * @returns {Number}
     */
    Player.prototype.getWantedBufferAhead = function () {
        return this._priv_bufferOptions.wantedBufferAhead.getValue();
    };
    /**
     * Returns the max buffer memory size for the buffer in kilobytes
     * @returns {Number}
     */
    Player.prototype.getMaxVideoBufferSize = function () {
        return this._priv_bufferOptions.maxVideoBufferSize.getValue();
    };
    Player.prototype.getCurrentPeriod = function () {
        var _a;
        var currentPeriod = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.currentPeriod;
        if ((0, is_null_or_undefined_1.default)(currentPeriod)) {
            return null;
        }
        return {
            id: currentPeriod.id,
            start: currentPeriod.start,
            end: currentPeriod.end,
        };
    };
    /**
     * Returns both the name of the key system (e.g. `"com.widevine.alpha"`) and
     * the `MediaKeySystemConfiguration` currently associated to the
     * HTMLMediaElement linked to the RxPlayer.
     *
     * Returns `null` if no such capabilities is associated or if unknown.
     * @returns {Object|null}
     */
    Player.prototype.getKeySystemConfiguration = function () {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        var values = (0, decrypt_1.getKeySystemConfiguration)(this.videoElement);
        if (values === null) {
            return null;
        }
        return { keySystem: values[0], configuration: values[1] };
    };
    /**
     * Returns the list of available Periods for which the current audio, video or
     * text track can now be changed.
     * @returns {Array.<Object>}
     */
    Player.prototype.getAvailablePeriods = function () {
        if (this._priv_contentInfos === null) {
            return [];
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, tracksStore = _a.tracksStore;
        if (isDirectFile) {
            return [];
        }
        if (tracksStore === null) {
            return [];
        }
        return tracksStore.getAvailablePeriods().slice();
    };
    /**
     * Returns every available audio tracks for a given Period - or the current
     * one if no `periodId` is given.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    Player.prototype.getAvailableAudioTracks = function (periodId) {
        var _a;
        if (this._priv_contentInfos === null) {
            return [];
        }
        var _b = this._priv_contentInfos, isDirectFile = _b.isDirectFile, mediaElementTracksStore = _b.mediaElementTracksStore;
        if (isDirectFile) {
            return (_a = mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.getAvailableAudioTracks()) !== null && _a !== void 0 ? _a : [];
        }
        return this._priv_callTracksStoreGetterSetter(periodId, [], function (tcm, periodRef) { var _a; return (_a = tcm.getAvailableAudioTracks(periodRef)) !== null && _a !== void 0 ? _a : []; });
    };
    /**
     * Returns every available text tracks for a given Period - or the current
     * one if no `periodId` is given.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    Player.prototype.getAvailableTextTracks = function (periodId) {
        var _a;
        if (this._priv_contentInfos === null) {
            return [];
        }
        var _b = this._priv_contentInfos, isDirectFile = _b.isDirectFile, mediaElementTracksStore = _b.mediaElementTracksStore;
        if (isDirectFile) {
            return (_a = mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.getAvailableTextTracks()) !== null && _a !== void 0 ? _a : [];
        }
        return this._priv_callTracksStoreGetterSetter(periodId, [], function (tcm, periodRef) { var _a; return (_a = tcm.getAvailableTextTracks(periodRef)) !== null && _a !== void 0 ? _a : []; });
    };
    /**
     * Returns every available video tracks for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    Player.prototype.getAvailableVideoTracks = function (periodId) {
        var _a;
        if (this._priv_contentInfos === null) {
            return [];
        }
        var _b = this._priv_contentInfos, isDirectFile = _b.isDirectFile, mediaElementTracksStore = _b.mediaElementTracksStore;
        if (isDirectFile) {
            return (_a = mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.getAvailableVideoTracks()) !== null && _a !== void 0 ? _a : [];
        }
        return this._priv_callTracksStoreGetterSetter(periodId, [], function (tcm, periodRef) { var _a; return (_a = tcm.getAvailableVideoTracks(periodRef)) !== null && _a !== void 0 ? _a : []; });
    };
    /**
     * Returns currently chosen audio language for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    Player.prototype.getAudioTrack = function (periodId) {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, mediaElementTracksStore = _a.mediaElementTracksStore;
        if (isDirectFile) {
            if (mediaElementTracksStore === null) {
                return undefined;
            }
            return mediaElementTracksStore.getChosenAudioTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.getChosenAudioTrack(periodRef);
        });
    };
    /**
     * Returns currently chosen subtitle for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    Player.prototype.getTextTrack = function (periodId) {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, mediaElementTracksStore = _a.mediaElementTracksStore;
        if (isDirectFile) {
            if (mediaElementTracksStore === null) {
                return undefined;
            }
            return mediaElementTracksStore.getChosenTextTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.getChosenTextTrack(periodRef);
        });
    };
    /**
     * Returns currently chosen video track for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    Player.prototype.getVideoTrack = function (periodId) {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, mediaElementTracksStore = _a.mediaElementTracksStore;
        if (isDirectFile) {
            if (mediaElementTracksStore === null) {
                return undefined;
            }
            return mediaElementTracksStore.getChosenVideoTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.getChosenVideoTrack(periodRef);
        });
    };
    /**
     * Update the audio language for the current Period.
     * @param {string | object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no audio track.
     */
    Player.prototype.setAudioTrack = function (arg) {
        var _a;
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        var _b = this._priv_contentInfos, isDirectFile = _b.isDirectFile, mediaElementTracksStore = _b.mediaElementTracksStore;
        if (isDirectFile) {
            try {
                var audioId = typeof arg === "string" ? arg : arg.trackId;
                mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.setAudioTrackById(audioId);
                return;
            }
            catch (e) {
                throw new Error("player: unknown audio track");
            }
        }
        var periodId;
        var trackId;
        var switchingMode;
        var lockedRepresentations = null;
        var relativeResumingPosition;
        if (typeof arg === "string") {
            trackId = arg;
        }
        else {
            trackId = arg.trackId;
            periodId = arg.periodId;
            switchingMode = arg.switchingMode;
            lockedRepresentations = (_a = arg.lockedRepresentations) !== null && _a !== void 0 ? _a : null;
            relativeResumingPosition = arg.relativeResumingPosition;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.setAudioTrack({
                periodRef: periodRef,
                trackId: trackId,
                switchingMode: switchingMode,
                lockedRepresentations: lockedRepresentations,
                relativeResumingPosition: relativeResumingPosition,
            });
        });
    };
    /**
     * Update the text language for the current Period.
     * @param {string | Object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no text track.
     */
    Player.prototype.setTextTrack = function (arg) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, mediaElementTracksStore = _a.mediaElementTracksStore;
        if (isDirectFile) {
            try {
                var textId = typeof arg === "string" ? arg : arg.trackId;
                mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.setTextTrackById(textId);
                return;
            }
            catch (e) {
                throw new Error("player: unknown text track");
            }
        }
        var periodId;
        var trackId;
        if (typeof arg === "string") {
            trackId = arg;
        }
        else {
            trackId = arg.trackId;
            periodId = arg.periodId;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.setTextTrack(periodRef, trackId);
        });
    };
    /**
     * Disable subtitles for the current content.
     * @param {string|undefined} [periodId]
     */
    Player.prototype.disableTextTrack = function (periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, mediaElementTracksStore = _a.mediaElementTracksStore;
        if (isDirectFile) {
            mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.disableTextTrack();
            return;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.disableTrack(periodRef, "text");
        });
    };
    /**
     * Update the video track for the current Period.
     * @param {string | Object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no video track.
     */
    Player.prototype.setVideoTrack = function (arg) {
        var _a;
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        var _b = this._priv_contentInfos, isDirectFile = _b.isDirectFile, mediaElementTracksStore = _b.mediaElementTracksStore;
        if (isDirectFile) {
            try {
                var videoId = typeof arg === "string" ? arg : arg.trackId;
                mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.setVideoTrackById(videoId);
                return;
            }
            catch (e) {
                throw new Error("player: unknown video track");
            }
        }
        var periodId;
        var trackId;
        var switchingMode;
        var lockedRepresentations = null;
        var relativeResumingPosition;
        if (typeof arg === "string") {
            trackId = arg;
        }
        else {
            trackId = arg.trackId;
            periodId = arg.periodId;
            switchingMode = arg.switchingMode;
            lockedRepresentations = (_a = arg.lockedRepresentations) !== null && _a !== void 0 ? _a : null;
            relativeResumingPosition = arg.relativeResumingPosition;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.setVideoTrack({
                periodRef: periodRef,
                trackId: trackId,
                switchingMode: switchingMode,
                lockedRepresentations: lockedRepresentations,
                relativeResumingPosition: relativeResumingPosition,
            });
        });
    };
    /**
     * Disable video track for the current content.
     * @param {string|undefined} [periodId]
     */
    Player.prototype.disableVideoTrack = function (periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, mediaElementTracksStore = _a.mediaElementTracksStore;
        if (isDirectFile && mediaElementTracksStore !== null) {
            return mediaElementTracksStore.disableVideoTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.disableTrack(periodRef, "video");
        });
    };
    Player.prototype.lockVideoRepresentations = function (arg) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        var isDirectFile = this._priv_contentInfos.isDirectFile;
        if (isDirectFile) {
            throw new Error("Cannot lock video Representations in directfile mode.");
        }
        var repsId;
        var periodId;
        var switchingMode;
        if (Array.isArray(arg)) {
            repsId = arg;
            periodId = undefined;
        }
        else {
            repsId = arg.representations;
            periodId = arg.periodId;
            switchingMode = arg.switchingMode;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.lockVideoRepresentations(periodRef, {
                representations: repsId,
                switchingMode: switchingMode,
            });
        });
    };
    Player.prototype.lockAudioRepresentations = function (arg) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        var isDirectFile = this._priv_contentInfos.isDirectFile;
        if (isDirectFile) {
            throw new Error("Cannot lock audio Representations in directfile mode.");
        }
        var repsId;
        var periodId;
        var switchingMode;
        if (Array.isArray(arg)) {
            repsId = arg;
            periodId = undefined;
        }
        else {
            repsId = arg.representations;
            periodId = arg.periodId;
            switchingMode = arg.switchingMode;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.lockAudioRepresentations(periodRef, {
                representations: repsId,
                switchingMode: switchingMode,
            });
        });
    };
    Player.prototype.getLockedVideoRepresentations = function (periodId) {
        if (this._priv_contentInfos === null) {
            return null;
        }
        var isDirectFile = this._priv_contentInfos.isDirectFile;
        if (isDirectFile) {
            return null;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, null, function (tcm, periodRef) {
            return tcm.getLockedVideoRepresentations(periodRef);
        });
    };
    Player.prototype.getLockedAudioRepresentations = function (periodId) {
        if (this._priv_contentInfos === null) {
            return null;
        }
        var isDirectFile = this._priv_contentInfos.isDirectFile;
        if (isDirectFile) {
            return null;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, null, function (tcm, periodRef) {
            return tcm.getLockedAudioRepresentations(periodRef);
        });
    };
    Player.prototype.unlockVideoRepresentations = function (periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        var isDirectFile = this._priv_contentInfos.isDirectFile;
        if (isDirectFile) {
            return;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.unlockVideoRepresentations(periodRef);
        });
    };
    Player.prototype.unlockAudioRepresentations = function (periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        var isDirectFile = this._priv_contentInfos.isDirectFile;
        if (isDirectFile) {
            return;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, function (tcm, periodRef) {
            return tcm.unlockAudioRepresentations(periodRef);
        });
    };
    /**
     * Get minimum seek-able position.
     * @returns {number}
     */
    Player.prototype.getMinimumPosition = function () {
        if (this._priv_contentInfos === null) {
            return null;
        }
        if (this._priv_contentInfos.isDirectFile) {
            return 0;
        }
        var manifest = this._priv_contentInfos.manifest;
        if (manifest !== null) {
            return (0, manifest_1.getMinimumSafePosition)(manifest);
        }
        return null;
    };
    /**
     * Returns the current position for live contents.
     *
     * Returns `null` if no content is loaded or if the current loaded content is
     * not considered as a live content.
     * Returns `undefined` if that live position is currently unknown.
     * @returns {number}
     */
    Player.prototype.getLivePosition = function () {
        if (this._priv_contentInfos === null) {
            return null;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, manifest = _a.manifest;
        if (isDirectFile) {
            return undefined;
        }
        if ((manifest === null || manifest === void 0 ? void 0 : manifest.isLive) !== true) {
            return null;
        }
        return (0, manifest_1.getLivePosition)(manifest);
    };
    /**
     * Get maximum seek-able position.
     * @returns {number}
     */
    Player.prototype.getMaximumPosition = function () {
        if (this._priv_contentInfos === null) {
            return null;
        }
        var _a = this._priv_contentInfos, isDirectFile = _a.isDirectFile, manifest = _a.manifest;
        if (isDirectFile) {
            if (this.videoElement === null) {
                throw new Error("Disposed player");
            }
            return this.videoElement.duration;
        }
        if (manifest !== null) {
            if (!manifest.isDynamic && this.videoElement !== null) {
                return this.videoElement.duration;
            }
            return (0, manifest_1.getMaximumSafePosition)(manifest);
        }
        return null;
    };
    // ---- Undocumented Private methods. ----
    //
    // Those methods are just here either to allow some tools relying on the
    // RxPlayer instance to work or to improve the RxPlayer's demo.
    //
    // They should not be used by any external code.
    /**
     * /!\ For demo use only! Do not touch!
     *
     * Returns every chunk buffered for a given buffer type.
     * Returns `null` if no SegmentSink was created for this type of buffer.
     * @param {string} bufferType
     * @returns {Array.<Object>|null}
     */
    Player.prototype.__priv_getSegmentSinkContent = function (bufferType) {
        if (this._priv_contentInfos === null ||
            this._priv_contentInfos.segmentSinksStore === null) {
            return null;
        }
        var segmentSinkStatus = this._priv_contentInfos.segmentSinksStore.getStatus(bufferType);
        if (segmentSinkStatus.type === "initialized") {
            return segmentSinkStatus.value.getLastKnownInventory();
        }
        return null;
    };
    /**
     * /!\ For tools use only! Do not touch!
     *
     * Returns manifest/playlist object.
     * null if the player is STOPPED.
     * @returns {Manifest|null} - The current Manifest (`null` when not known).
     */
    // TODO remove the need for that public method
    Player.prototype.__priv_getManifest = function () {
        if (this._priv_contentInfos === null) {
            return null;
        }
        return this._priv_contentInfos.manifest;
    };
    // TODO remove the need for that public method
    Player.prototype.__priv_getCurrentAdaptation = function () {
        if (this._priv_contentInfos === null) {
            return null;
        }
        var _a = this._priv_contentInfos, currentPeriod = _a.currentPeriod, activeAdaptations = _a.activeAdaptations;
        if (currentPeriod === null ||
            activeAdaptations === null ||
            (0, is_null_or_undefined_1.default)(activeAdaptations[currentPeriod.id])) {
            return null;
        }
        return activeAdaptations[currentPeriod.id];
    };
    // TODO remove the need for that public method
    Player.prototype.__priv_getCurrentRepresentations = function () {
        if (this._priv_contentInfos === null) {
            return null;
        }
        var _a = this._priv_contentInfos, currentPeriod = _a.currentPeriod, activeRepresentations = _a.activeRepresentations;
        if (currentPeriod === null ||
            activeRepresentations === null ||
            (0, is_null_or_undefined_1.default)(activeRepresentations[currentPeriod.id])) {
            return null;
        }
        return activeRepresentations[currentPeriod.id];
    };
    // ---- Private methods ----
    /**
     * Reset all state properties relative to a playing content.
     */
    Player.prototype._priv_cleanUpCurrentContentState = function () {
        var _this = this;
        var _a, _b, _c, _d;
        log_1.default.debug("Locking `contentLock` to clean-up the current content.");
        // lock playback of new contents while cleaning up is pending
        this._priv_contentLock.setValue(true);
        (_b = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.tracksStore) === null || _b === void 0 ? void 0 : _b.dispose();
        (_d = (_c = this._priv_contentInfos) === null || _c === void 0 ? void 0 : _c.mediaElementTracksStore) === null || _d === void 0 ? void 0 : _d.dispose();
        this._priv_contentInfos = null;
        this._priv_contentEventsMemory = {};
        // DRM-related clean-up
        var freeUpContentLock = function () {
            if (_this.videoElement !== null) {
                // If not disposed
                log_1.default.debug("Unlocking `contentLock`. Next content can begin.");
                _this._priv_contentLock.setValue(false);
            }
        };
        if (!(0, is_null_or_undefined_1.default)(this.videoElement)) {
            (0, decrypt_1.clearOnStop)(this.videoElement).then(function () {
                log_1.default.debug("API: DRM session cleaned-up with success!");
                freeUpContentLock();
            }, function (err) {
                log_1.default.error("API: An error arised when trying to clean-up the DRM session:" +
                    (err instanceof Error ? err.toString() : "Unknown Error"));
                freeUpContentLock();
            });
        }
        else {
            freeUpContentLock();
        }
    };
    /**
     * Triggered when the Manifest has been loaded for the current content.
     * Initialize various private properties and emit initial event.
     * @param {Object} contentInfos
     * @param {Object} manifest
     */
    Player.prototype._priv_onManifestReady = function (contentInfos, manifest) {
        var _this = this;
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        contentInfos.manifest = manifest;
        if (manifest.manifestFormat === 0 /* ManifestMetadataFormat.Class */) {
            this._priv_reloadingMetadata.manifest = manifest;
        }
        var tracksStore = new tracks_store_1.default({
            preferTrickModeTracks: this._priv_preferTrickModeTracks,
            defaultAudioTrackSwitchingMode: contentInfos.defaultAudioTrackSwitchingMode,
        });
        contentInfos.tracksStore = tracksStore;
        tracksStore.addEventListener("newAvailablePeriods", function (p) {
            _this.trigger("newAvailablePeriods", p);
        });
        tracksStore.addEventListener("brokenRepresentationsLock", function (e) {
            _this.trigger("brokenRepresentationsLock", e);
        });
        tracksStore.addEventListener("trackUpdate", function (e) {
            var _a, _b;
            _this.trigger("trackUpdate", e);
            var currentPeriod = (_b = (_a = _this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.currentPeriod) !== null && _b !== void 0 ? _b : undefined;
            if (e.reason === "no-playable-representation" &&
                e.period.id === (currentPeriod === null || currentPeriod === void 0 ? void 0 : currentPeriod.id)) {
                _this._priv_onAvailableTracksMayHaveChanged(e.trackType);
            }
        });
        contentInfos.tracksStore.addEventListener("warning", function (err) {
            _this.trigger("warning", err);
        });
        contentInfos.tracksStore.addEventListener("error", function (err) {
            _this._priv_onFatalError(err, contentInfos);
        });
        contentInfos.tracksStore.onManifestUpdate(manifest);
    };
    /**
     * Triggered when the Manifest has been updated for the current content.
     * Initialize various private properties and emit initial event.
     * @param {Object} contentInfos
     * @param {Object} updates
     */
    Player.prototype._priv_onManifestUpdate = function (contentInfos, updates) {
        var e_1, _a;
        var _b, _c, _d;
        if (this._priv_contentInfos === null || this._priv_contentInfos.manifest === null) {
            return;
        }
        // Update the tracks chosen if it changed
        if (!(0, is_null_or_undefined_1.default)(contentInfos === null || contentInfos === void 0 ? void 0 : contentInfos.tracksStore)) {
            contentInfos.tracksStore.onManifestUpdate(this._priv_contentInfos.manifest);
        }
        var currentPeriod = (_c = (_b = this._priv_contentInfos) === null || _b === void 0 ? void 0 : _b.currentPeriod) !== null && _c !== void 0 ? _c : undefined;
        var currTracksStore = (_d = this._priv_contentInfos) === null || _d === void 0 ? void 0 : _d.tracksStore;
        if (currentPeriod === undefined || (0, is_null_or_undefined_1.default)(currTracksStore)) {
            return;
        }
        try {
            for (var _e = __values(updates.updatedPeriods), _f = _e.next(); !_f.done; _f = _e.next()) {
                var update = _f.value;
                if (update.period.id === currentPeriod.id) {
                    if (update.result.addedAdaptations.length > 0 ||
                        update.result.removedAdaptations.length > 0) {
                        // We might have new (or less) tracks, send events just to be sure
                        var periodRef = currTracksStore.getPeriodObjectFromPeriod(currentPeriod);
                        if (periodRef === undefined) {
                            return;
                        }
                        this._priv_onAvailableTracksMayHaveChanged("audio");
                        this._priv_onAvailableTracksMayHaveChanged("text");
                        this._priv_onAvailableTracksMayHaveChanged("video");
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    Player.prototype._priv_onDecipherabilityUpdate = function (contentInfos, elts) {
        var e_2, _a;
        if (contentInfos === null || contentInfos.manifest === null) {
            return;
        }
        if (!(0, is_null_or_undefined_1.default)(contentInfos === null || contentInfos === void 0 ? void 0 : contentInfos.tracksStore)) {
            contentInfos.tracksStore.onDecipherabilityUpdates();
        }
        /**
         * Array of tuples only including once the Period/Track combination, and
         * only when it concerns the currently-selected track.
         */
        var periodsAndTrackTypes = elts.reduce(function (acc, elt) {
            var _a, _b, _c;
            var isFound = (0, array_find_1.default)(acc, function (x) { return x[0].id === elt.period.id && x[1] === elt.adaptation.type; }) !== undefined;
            if (!isFound) {
                // Only consider the currently-selected tracks.
                // NOTE: Maybe there's room for optimizations? Unclear.
                var tStore = contentInfos.tracksStore;
                if (tStore === null) {
                    return acc;
                }
                var isCurrent = false;
                var periodRef = tStore.getPeriodObjectFromPeriod(elt.period);
                if (periodRef === undefined) {
                    return acc;
                }
                switch (elt.adaptation.type) {
                    case "audio":
                        isCurrent = ((_a = tStore.getChosenAudioTrack(periodRef)) === null || _a === void 0 ? void 0 : _a.id) === elt.adaptation.id;
                        break;
                    case "video":
                        isCurrent = ((_b = tStore.getChosenVideoTrack(periodRef)) === null || _b === void 0 ? void 0 : _b.id) === elt.adaptation.id;
                        break;
                    case "text":
                        isCurrent = ((_c = tStore.getChosenTextTrack(periodRef)) === null || _c === void 0 ? void 0 : _c.id) === elt.adaptation.id;
                        break;
                }
                if (isCurrent) {
                    acc.push([elt.period, elt.adaptation.type]);
                }
            }
            return acc;
        }, []);
        try {
            for (var periodsAndTrackTypes_1 = __values(periodsAndTrackTypes), periodsAndTrackTypes_1_1 = periodsAndTrackTypes_1.next(); !periodsAndTrackTypes_1_1.done; periodsAndTrackTypes_1_1 = periodsAndTrackTypes_1.next()) {
                var _b = __read(periodsAndTrackTypes_1_1.value, 2), period = _b[0], trackType = _b[1];
                this._priv_triggerEventIfNotStopped("representationListUpdate", {
                    period: { start: period.start, end: period.end, id: period.id },
                    trackType: trackType,
                    reason: "decipherability-update",
                }, contentInfos.currentContentCanceller.signal);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (periodsAndTrackTypes_1_1 && !periodsAndTrackTypes_1_1.done && (_a = periodsAndTrackTypes_1.return)) _a.call(periodsAndTrackTypes_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    /**
     * Triggered each times the current Period Changed.
     * Store and emit initial state for the Period.
     *
     * @param {Object} contentInfos
     * @param {Object} periodInfo
     */
    Player.prototype._priv_onActivePeriodChanged = function (contentInfos, _a) {
        var _b, _c, _d, _e, _f, _g;
        var period = _a.period;
        if (contentInfos.contentId !== ((_b = this._priv_contentInfos) === null || _b === void 0 ? void 0 : _b.contentId)) {
            return; // Event for another content
        }
        contentInfos.currentPeriod = period;
        var cancelSignal = contentInfos.currentContentCanceller.signal;
        if (this._priv_contentEventsMemory.periodChange !== period) {
            this._priv_contentEventsMemory.periodChange = period;
            this._priv_triggerEventIfNotStopped("periodChange", { start: period.start, end: period.end, id: period.id }, cancelSignal);
        }
        this._priv_triggerEventIfNotStopped("availableAudioTracksChange", this.getAvailableAudioTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableTextTracksChange", this.getAvailableTextTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableVideoTracksChange", this.getAvailableVideoTracks(), cancelSignal);
        var tracksStore = (_c = this._priv_contentInfos) === null || _c === void 0 ? void 0 : _c.tracksStore;
        // Emit initial events for the Period
        if (!(0, is_null_or_undefined_1.default)(tracksStore)) {
            var periodRef = tracksStore.getPeriodObjectFromPeriod(period);
            if (periodRef) {
                var audioTrack = tracksStore.getChosenAudioTrack(periodRef);
                this._priv_triggerEventIfNotStopped("audioTrackChange", audioTrack, cancelSignal);
                var textTrack = tracksStore.getChosenTextTrack(periodRef);
                this._priv_triggerEventIfNotStopped("textTrackChange", textTrack, cancelSignal);
                var videoTrack = tracksStore.getChosenVideoTrack(periodRef);
                this._priv_triggerEventIfNotStopped("videoTrackChange", videoTrack, cancelSignal);
            }
        }
        else {
            this._priv_triggerEventIfNotStopped("audioTrackChange", null, cancelSignal);
            this._priv_triggerEventIfNotStopped("textTrackChange", null, cancelSignal);
            this._priv_triggerEventIfNotStopped("videoTrackChange", null, cancelSignal);
        }
        var audioRepresentation = (_e = (_d = this.__priv_getCurrentRepresentations()) === null || _d === void 0 ? void 0 : _d.audio) !== null && _e !== void 0 ? _e : null;
        this._priv_triggerEventIfNotStopped("audioRepresentationChange", audioRepresentation, cancelSignal);
        var videoRepresentation = (_g = (_f = this.__priv_getCurrentRepresentations()) === null || _f === void 0 ? void 0 : _f.video) !== null && _g !== void 0 ? _g : null;
        this._priv_triggerEventIfNotStopped("videoRepresentationChange", videoRepresentation, cancelSignal);
    };
    /**
     * Triggered each times a new "PeriodStream" is ready.
     * Choose the right Adaptation for the Period and emit it.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    Player.prototype._priv_onPeriodStreamReady = function (contentInfos, value) {
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        var type = value.type, period = value.period, adaptationRef = value.adaptationRef;
        var tracksStore = contentInfos.tracksStore;
        switch (type) {
            case "video":
            case "audio":
            case "text":
                if ((0, is_null_or_undefined_1.default)(tracksStore)) {
                    log_1.default.error("API: TracksStore not instanciated for a new ".concat(type, " period"));
                    adaptationRef.setValue(null);
                }
                else {
                    tracksStore.addTrackReference(type, period, adaptationRef);
                }
                break;
            default:
                (0, assert_1.assertUnreachable)(type);
        }
    };
    /**
     * Triggered each times we "remove" a PeriodStream.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    Player.prototype._priv_onPeriodStreamCleared = function (contentInfos, value) {
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        var type = value.type, period = value.period;
        var tracksStore = contentInfos.tracksStore;
        // Clean-up track choices from TracksStore
        switch (type) {
            case "audio":
            case "text":
            case "video":
                if (!(0, is_null_or_undefined_1.default)(tracksStore)) {
                    tracksStore.removeTrackReference(type, period);
                }
                break;
        }
        // Clean-up stored Representation and Adaptation information
        var activeAdaptations = contentInfos.activeAdaptations, activeRepresentations = contentInfos.activeRepresentations;
        if (!(0, is_null_or_undefined_1.default)(activeAdaptations) &&
            !(0, is_null_or_undefined_1.default)(activeAdaptations[period.id])) {
            var activePeriodAdaptations = activeAdaptations[period.id];
            delete activePeriodAdaptations[type];
            if (Object.keys(activePeriodAdaptations).length === 0) {
                delete activeAdaptations[period.id];
            }
        }
        if (!(0, is_null_or_undefined_1.default)(activeRepresentations) &&
            !(0, is_null_or_undefined_1.default)(activeRepresentations[period.id])) {
            var activePeriodRepresentations = activeRepresentations[period.id];
            delete activePeriodRepresentations[type];
            if (Object.keys(activePeriodRepresentations).length === 0) {
                delete activeRepresentations[period.id];
            }
        }
    };
    /**
     * Triggered each times a new Adaptation is considered for the current
     * content.
     * Store given Adaptation and emit it if from the current Period.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    Player.prototype._priv_onAdaptationChange = function (contentInfos, _a) {
        var _b;
        var _c;
        var type = _a.type, adaptation = _a.adaptation, period = _a.period;
        if (contentInfos.contentId !== ((_c = this._priv_contentInfos) === null || _c === void 0 ? void 0 : _c.contentId)) {
            return; // Event for another content
        }
        // lazily create contentInfos.activeAdaptations
        if (contentInfos.activeAdaptations === null) {
            contentInfos.activeAdaptations = {};
        }
        var activeAdaptations = contentInfos.activeAdaptations, currentPeriod = contentInfos.currentPeriod;
        var activePeriodAdaptations = activeAdaptations[period.id];
        if ((0, is_null_or_undefined_1.default)(activePeriodAdaptations)) {
            activeAdaptations[period.id] = (_b = {}, _b[type] = adaptation, _b);
        }
        else {
            activePeriodAdaptations[type] = adaptation;
        }
        var tracksStore = contentInfos.tracksStore;
        var cancelSignal = contentInfos.currentContentCanceller.signal;
        if (tracksStore !== null &&
            currentPeriod !== null &&
            !(0, is_null_or_undefined_1.default)(period) &&
            period.id === currentPeriod.id) {
            var periodRef = tracksStore.getPeriodObjectFromPeriod(period);
            if (periodRef === undefined) {
                return;
            }
            switch (type) {
                case "audio":
                    var audioTrack = tracksStore.getChosenAudioTrack(periodRef);
                    this._priv_triggerEventIfNotStopped("audioTrackChange", audioTrack, cancelSignal);
                    break;
                case "text":
                    var textTrack = tracksStore.getChosenTextTrack(periodRef);
                    this._priv_triggerEventIfNotStopped("textTrackChange", textTrack, cancelSignal);
                    break;
                case "video":
                    var videoTrack = tracksStore.getChosenVideoTrack(periodRef);
                    this._priv_triggerEventIfNotStopped("videoTrackChange", videoTrack, cancelSignal);
                    break;
            }
        }
    };
    /**
     * Triggered each times a new Representation is considered during playback.
     *
     * Store given Representation and emit it if from the current Period.
     *
     * @param {Object} contentInfos
     * @param {Object} obj
     */
    Player.prototype._priv_onRepresentationChange = function (contentInfos, _a) {
        var _b;
        var _c;
        var type = _a.type, period = _a.period, representation = _a.representation;
        if (contentInfos.contentId !== ((_c = this._priv_contentInfos) === null || _c === void 0 ? void 0 : _c.contentId)) {
            return; // Event for another content
        }
        // lazily create contentInfos.activeRepresentations
        if (contentInfos.activeRepresentations === null) {
            contentInfos.activeRepresentations = {};
        }
        var activeRepresentations = contentInfos.activeRepresentations, currentPeriod = contentInfos.currentPeriod;
        var activePeriodRepresentations = activeRepresentations[period.id];
        if ((0, is_null_or_undefined_1.default)(activePeriodRepresentations)) {
            activeRepresentations[period.id] = (_b = {}, _b[type] = representation, _b);
        }
        else {
            activePeriodRepresentations[type] = representation;
        }
        if (!(0, is_null_or_undefined_1.default)(period) &&
            currentPeriod !== null &&
            currentPeriod.id === period.id) {
            var cancelSignal = this._priv_contentInfos.currentContentCanceller.signal;
            if (type === "video") {
                this._priv_triggerEventIfNotStopped("videoRepresentationChange", representation, cancelSignal);
            }
            else if (type === "audio") {
                this._priv_triggerEventIfNotStopped("audioRepresentationChange", representation, cancelSignal);
            }
        }
    };
    /**
     * Triggered each time a bitrate estimate is calculated.
     *
     * Emit it.
     *
     * @param {Object} value
     */
    Player.prototype._priv_onBitrateEstimateChange = function (_a) {
        var type = _a.type, bitrate = _a.bitrate;
        if (bitrate !== undefined) {
            this._priv_bitrateInfos.lastBitrates[type] = bitrate;
        }
        this.trigger(
        // !!! undocumented API :O !!!
        /* eslint-disable-next-line */
        "__priv_bitrateEstimateChange", 
        /* eslint-disable-next-line */
        { type: type, bitrate: bitrate });
    };
    /**
     * Triggered each time the player state updates.
     *
     * Trigger the right Player Event.
     *
     * @param {string} newState
     */
    Player.prototype._priv_setPlayerState = function (newState) {
        if (this.state !== newState) {
            this.state = newState;
            log_1.default.info("API: playerStateChange event", newState);
            this.trigger("playerStateChange", newState);
        }
    };
    /**
     * Triggered each time a playback observation.
     *
     * Trigger the right Player Event
     *
     * @param {Object} contentInfos
     * @param {Object} observation
     */
    Player.prototype._priv_triggerPositionUpdate = function (contentInfos, observation) {
        var _a, _b;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        var isDirectFile = contentInfos.isDirectFile, manifest = contentInfos.manifest;
        if ((!isDirectFile && manifest === null) || (0, is_null_or_undefined_1.default)(observation)) {
            return;
        }
        var maximumPosition = manifest !== null ? (0, manifest_1.getMaximumSafePosition)(manifest) : undefined;
        var positionData = {
            position: observation.position.getPolled(),
            duration: observation.duration,
            playbackRate: observation.playbackRate,
            maximumPosition: maximumPosition,
            // TODO bufferGap may be undefined
            bufferGap: observation.bufferGap === undefined || !isFinite(observation.bufferGap)
                ? 0
                : observation.bufferGap,
        };
        if (manifest !== null && manifest.isLive && observation.position.getPolled() > 0) {
            var ast = (_b = manifest.availabilityStartTime) !== null && _b !== void 0 ? _b : 0;
            positionData.wallClockTime = observation.position.getPolled() + ast;
            var livePosition = (0, manifest_1.getLivePosition)(manifest);
            if (livePosition !== undefined) {
                positionData.liveGap = livePosition - observation.position.getPolled();
            }
        }
        else if (isDirectFile && this.videoElement !== null) {
            var startDate = (0, get_start_date_1.default)(this.videoElement);
            if (startDate !== undefined) {
                positionData.wallClockTime = startDate + observation.position.getPolled();
            }
        }
        this.trigger("positionUpdate", positionData);
    };
    /**
     * @param {string} evt
     * @param {*} arg
     * @param {Object} currentContentCancelSignal
     */
    Player.prototype._priv_triggerEventIfNotStopped = function (evt, arg, currentContentCancelSignal) {
        if (!currentContentCancelSignal.isCancelled()) {
            this.trigger(evt, arg);
        }
    };
    /**
     * @param {Object} cancelSignal
     * @returns {Object}
     */
    Player.prototype._priv_initializeMediaElementTracksStore = function (cancelSignal) {
        var _this = this;
        var _a, _b, _c;
        (0, assert_1.default)(features_1.default.directfile !== null, "Initializing `MediaElementTracksStore` without Directfile feature");
        (0, assert_1.default)(this.videoElement !== null, "Initializing `MediaElementTracksStore` on a disposed RxPlayer");
        var mediaElementTracksStore = new features_1.default.directfile.mediaElementTracksStore(this.videoElement);
        this._priv_triggerEventIfNotStopped("availableAudioTracksChange", mediaElementTracksStore.getAvailableAudioTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableVideoTracksChange", mediaElementTracksStore.getAvailableVideoTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableTextTracksChange", mediaElementTracksStore.getAvailableTextTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("audioTrackChange", (_a = mediaElementTracksStore.getChosenAudioTrack()) !== null && _a !== void 0 ? _a : null, cancelSignal);
        this._priv_triggerEventIfNotStopped("textTrackChange", (_b = mediaElementTracksStore.getChosenTextTrack()) !== null && _b !== void 0 ? _b : null, cancelSignal);
        this._priv_triggerEventIfNotStopped("videoTrackChange", (_c = mediaElementTracksStore.getChosenVideoTrack()) !== null && _c !== void 0 ? _c : null, cancelSignal);
        mediaElementTracksStore.addEventListener("availableVideoTracksChange", function (val) {
            return _this.trigger("availableVideoTracksChange", val);
        });
        mediaElementTracksStore.addEventListener("availableAudioTracksChange", function (val) {
            return _this.trigger("availableAudioTracksChange", val);
        });
        mediaElementTracksStore.addEventListener("availableTextTracksChange", function (val) {
            return _this.trigger("availableTextTracksChange", val);
        });
        mediaElementTracksStore.addEventListener("audioTrackChange", function (val) {
            return _this.trigger("audioTrackChange", val);
        });
        mediaElementTracksStore.addEventListener("videoTrackChange", function (val) {
            return _this.trigger("videoTrackChange", val);
        });
        mediaElementTracksStore.addEventListener("textTrackChange", function (val) {
            return _this.trigger("textTrackChange", val);
        });
        return mediaElementTracksStore;
    };
    Player.prototype._priv_callTracksStoreGetterSetter = function (periodId, defaultValue, cb) {
        var _a, _b;
        if (this._priv_contentInfos === null ||
            this._priv_contentInfos.tracksStore === null) {
            log_1.default.warn("API: Trying to call track API too soon");
            return defaultValue;
        }
        var tracksStore = this._priv_contentInfos.tracksStore;
        var currentPeriod = (_b = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.currentPeriod) !== null && _b !== void 0 ? _b : undefined;
        var wantedPeriodId = periodId !== null && periodId !== void 0 ? periodId : currentPeriod === null || currentPeriod === void 0 ? void 0 : currentPeriod.id;
        if (wantedPeriodId === undefined) {
            return defaultValue;
        }
        var periodRef = wantedPeriodId === (currentPeriod === null || currentPeriod === void 0 ? void 0 : currentPeriod.id)
            ? tracksStore.getPeriodObjectFromPeriod(currentPeriod)
            : tracksStore.getPeriodObjectFromId(wantedPeriodId);
        if (periodRef === undefined) {
            return defaultValue;
        }
        return cb(tracksStore, periodRef);
    };
    /**
     * Method to call when some event lead to a high for possibility that the
     * available tracks for the given type have changed.
     * Send the corresponding `available*Tracks` change event with the last
     * available tracks.
     *
     * @param {string} trackType
     * @param {Object|undefined} [oPeriodRef] - optional period object used by the
     * `tracksStore` API, allows to optimize the method by bypassing this step.
     */
    Player.prototype._priv_onAvailableTracksMayHaveChanged = function (trackType, oPeriodRef) {
        var contentInfos = this._priv_contentInfos;
        if (contentInfos === null) {
            return;
        }
        var currentPeriod = contentInfos.currentPeriod, tracksStore = contentInfos.tracksStore, currentContentCanceller = contentInfos.currentContentCanceller;
        var cancelSignal = currentContentCanceller.signal;
        if ((0, is_null_or_undefined_1.default)(currentPeriod) || tracksStore === null) {
            return;
        }
        var periodRef = oPeriodRef !== null && oPeriodRef !== void 0 ? oPeriodRef : tracksStore.getPeriodObjectFromPeriod(currentPeriod);
        if (periodRef === undefined) {
            return;
        }
        switch (trackType) {
            case "video":
                var videoTracks = tracksStore.getAvailableVideoTracks(periodRef);
                this._priv_triggerEventIfNotStopped("availableVideoTracksChange", videoTracks !== null && videoTracks !== void 0 ? videoTracks : [], cancelSignal);
                break;
            case "audio":
                var audioTracks = tracksStore.getAvailableAudioTracks(periodRef);
                this._priv_triggerEventIfNotStopped("availableAudioTracksChange", audioTracks !== null && audioTracks !== void 0 ? audioTracks : [], cancelSignal);
                break;
            case "text":
                var textTracks = tracksStore.getAvailableTextTracks(periodRef);
                this._priv_triggerEventIfNotStopped("availableTextTracksChange", textTracks !== null && textTracks !== void 0 ? textTracks : [], cancelSignal);
                break;
            default:
                (0, assert_1.assertUnreachable)(trackType);
        }
    };
    /**
     * Method to call when a fatal error lead to the stopping of the current
     * content.
     *
     * @param {*} err - The error encountered.
     * @param {Object} contentInfos - The `IPublicApiContentInfos` object linked
     * to the content for which the error was received.
     */
    Player.prototype._priv_onFatalError = function (err, contentInfos) {
        var formattedError = (0, errors_1.formatError)(err, {
            defaultCode: "NONE",
            defaultReason: "An unknown error stopped content playback.",
        });
        formattedError.fatal = true;
        contentInfos.currentContentCanceller.cancel();
        this._priv_cleanUpCurrentContentState();
        this._priv_currentError = formattedError;
        log_1.default.error("API: The player stopped because of an error", formattedError);
        this._priv_setPlayerState("STOPPED" /* PLAYER_STATES.STOPPED */);
        // TODO This condition is here because the eventual callback called when the
        // player state is updated can launch a new content, thus the error will not
        // be here anymore, in which case triggering the "error" event is unwanted.
        // This is very ugly though, and we should probable have a better solution
        if (this._priv_currentError === formattedError) {
            this.trigger("error", formattedError);
        }
    };
    /**
     * Store all video elements currently in use by an RxPlayer instance.
     * This is used to check that a video element is not shared between multiple instances.
     * Use of a WeakSet ensure the object is garbage collected if it's not used anymore.
     */
    Player._priv_currentlyUsedVideoElements = new WeakSet();
    return Player;
}(event_emitter_1.default));
Player.version = /* PLAYER_VERSION */ "4.0.0-rc.2";
exports.default = Player;
