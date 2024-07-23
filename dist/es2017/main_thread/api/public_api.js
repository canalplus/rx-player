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
/**
 * This file defines the public API for the RxPlayer.
 * It also starts the different sub-parts of the player on various API calls.
 */
import canRelyOnVideoVisibilityAndSize from "../../compat/can_rely_on_video_visibility_and_size";
import { getPictureOnPictureStateRef, getVideoVisibilityRef, getElementResolutionRef, getScreenResolutionRef, } from "../../compat/event_listeners";
import getStartDate from "../../compat/get_start_date";
import hasMseInWorker from "../../compat/has_mse_in_worker";
import hasWorkerApi from "../../compat/has_worker_api";
import isDebugModeEnabled from "../../compat/is_debug_mode_enabled";
import { ErrorCodes, ErrorTypes, formatError, MediaError } from "../../errors";
import WorkerInitializationError from "../../errors/worker_initialization_error";
import features, { addFeatures } from "../../features";
import log from "../../log";
import { getLivePosition, getMaximumSafePosition, getMinimumSafePosition, createRepresentationFilterFromFnString, } from "../../manifest";
import MediaElementPlaybackObserver from "../../playback_observer/media_element_playback_observer";
import arrayFind from "../../utils/array_find";
import arrayIncludes from "../../utils/array_includes";
import assert, { assertUnreachable } from "../../utils/assert";
import EventEmitter from "../../utils/event_emitter";
import idGenerator from "../../utils/id_generator";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../../utils/monotonic_timestamp";
import objectAssign from "../../utils/object_assign";
import { getLeftSizeOfBufferedTimeRange } from "../../utils/ranges";
import SharedReference, { createMappedReference } from "../../utils/reference";
import TaskCanceller from "../../utils/task_canceller";
import { clearOnStop, disposeDecryptionResources, getKeySystemConfiguration, } from "../decrypt";
import TracksStore from "../tracks_store";
import { checkReloadOptions, parseConstructorOptions, parseLoadVideoOptions, } from "./option_utils";
import { constructPlayerStateReference, emitPlayPauseEvents, emitSeekEvents, isLoadedState, } from "./utils";
/* eslint-disable @typescript-eslint/naming-convention */
const generateContentId = idGenerator();
/**
 * Options of a `loadVideo` call which are for now not supported when running
 * in a "multithread" mode.
 *
 * TODO support those?
 */
const MULTI_THREAD_UNSUPPORTED_LOAD_VIDEO_OPTIONS = [
    "manifestLoader",
    "segmentLoader",
];
/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter {
    /** All possible Error types emitted by the RxPlayer. */
    static get ErrorTypes() {
        return ErrorTypes;
    }
    /** All possible Error codes emitted by the RxPlayer. */
    static get ErrorCodes() {
        return ErrorCodes;
    }
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
    static get LogLevel() {
        return log.getLevel();
    }
    static set LogLevel(logLevel) {
        log.setLevel(logLevel);
    }
    /**
     * Add feature(s) to the RxPlayer.
     * @param {Array.<Object>} featureList - Features wanted.
     */
    static addFeatures(featureList) {
        addFeatures(featureList);
    }
    /**
     * Register the video element to the set of elements currently in use.
     * @param videoElement the video element to register.
     * @throws Error - Throws if the element is already used by another player instance.
     */
    static _priv_registerVideoElement(videoElement) {
        if (Player._priv_currentlyUsedVideoElements.has(videoElement)) {
            const errorMessage = "The video element is already attached to another RxPlayer instance." +
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
    }
    /**
     * Deregister the video element of the set of elements currently in use.
     * @param videoElement the video element to deregister.
     */
    static _priv_deregisterVideoElement(videoElement) {
        if (Player._priv_currentlyUsedVideoElements.has(videoElement)) {
            Player._priv_currentlyUsedVideoElements.delete(videoElement);
        }
    }
    /**
     * @constructor
     * @param {Object} options
     */
    constructor(options = {}) {
        super();
        const { baseBandwidth, videoResolutionLimit, maxBufferAhead, maxBufferBehind, throttleVideoBitrateWhenHidden, videoElement, wantedBufferAhead, maxVideoBufferSize, } = parseConstructorOptions(options);
        // Workaround to support Firefox autoplay on FF 42.
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
        videoElement.preload = "auto";
        this.version = /* PLAYER_VERSION */ "4.1.0";
        this.log = log;
        this.state = "STOPPED";
        this.videoElement = videoElement;
        Player._priv_registerVideoElement(this.videoElement);
        const destroyCanceller = new TaskCanceller();
        this._destroyCanceller = destroyCanceller;
        this._priv_pictureInPictureRef = getPictureOnPictureStateRef(videoElement, destroyCanceller.signal);
        this._priv_speed = new SharedReference(videoElement.playbackRate, this._destroyCanceller.signal);
        this._priv_preferTrickModeTracks = false;
        this._priv_contentLock = new SharedReference(false, this._destroyCanceller.signal);
        this._priv_bufferOptions = {
            wantedBufferAhead: new SharedReference(wantedBufferAhead, this._destroyCanceller.signal),
            maxBufferAhead: new SharedReference(maxBufferAhead, this._destroyCanceller.signal),
            maxBufferBehind: new SharedReference(maxBufferBehind, this._destroyCanceller.signal),
            maxVideoBufferSize: new SharedReference(maxVideoBufferSize, this._destroyCanceller.signal),
        };
        this._priv_bitrateInfos = {
            lastBitrates: { audio: baseBandwidth, video: baseBandwidth },
        };
        this._priv_throttleVideoBitrateWhenHidden = throttleVideoBitrateWhenHidden;
        this._priv_videoResolutionLimit = videoResolutionLimit;
        this._priv_currentError = null;
        this._priv_contentInfos = null;
        this._priv_contentEventsMemory = {};
        this._priv_reloadingMetadata = {};
        this._priv_lastAutoPlay = false;
        this._priv_worker = null;
        this._priv_segmentSinkMetricsCallback = null;
        const onVolumeChange = () => {
            this.trigger("volumeChange", {
                volume: videoElement.volume,
                muted: videoElement.muted,
            });
        };
        videoElement.addEventListener("volumechange", onVolumeChange);
        destroyCanceller.signal.register(() => {
            videoElement.removeEventListener("volumechange", onVolumeChange);
        });
    }
    /**
     * TODO returns promise?
     * @param {Object} workerSettings
     */
    attachWorker(workerSettings) {
        return new Promise((res, rej) => {
            var _a;
            if (!hasWorkerApi()) {
                log.warn("API: Cannot rely on a WebWorker: Worker API unavailable");
                return rej(new WorkerInitializationError("INCOMPATIBLE_ERROR", "Worker unavailable"));
            }
            if (typeof workerSettings.workerUrl === "string") {
                this._priv_worker = new Worker(workerSettings.workerUrl);
            }
            else {
                const blobUrl = URL.createObjectURL(workerSettings.workerUrl);
                this._priv_worker = new Worker(blobUrl);
                URL.revokeObjectURL(blobUrl);
            }
            this._priv_worker.onerror = (evt) => {
                if (this._priv_worker !== null) {
                    this._priv_worker.terminate();
                    this._priv_worker = null;
                }
                log.error("API: Unexpected worker error", evt.error instanceof Error ? evt.error : undefined);
                rej(new WorkerInitializationError("UNKNOWN_ERROR", 'Unexpected Worker "error" event'));
            };
            const handleInitMessages = (msg) => {
                const msgData = msg.data;
                if (msgData.type === "init-error" /* WorkerMessageType.InitError */) {
                    log.warn("API: Processing InitError worker message: detaching worker");
                    if (this._priv_worker !== null) {
                        this._priv_worker.removeEventListener("message", handleInitMessages);
                        this._priv_worker.terminate();
                        this._priv_worker = null;
                    }
                    rej(new WorkerInitializationError("SETUP_ERROR", "Worker parser initialization failed: " + msgData.value.errorMessage));
                }
                else if (msgData.type === "init-success" /* WorkerMessageType.InitSuccess */) {
                    log.info("API: InitSuccess received from worker.");
                    if (this._priv_worker !== null) {
                        this._priv_worker.removeEventListener("message", handleInitMessages);
                    }
                    res();
                }
            };
            this._priv_worker.addEventListener("message", handleInitMessages);
            log.debug("---> Sending To Worker:", "init" /* MainThreadMessageType.Init */);
            this._priv_worker.postMessage({
                type: "init" /* MainThreadMessageType.Init */,
                value: {
                    dashWasmUrl: workerSettings.dashWasmUrl,
                    logLevel: log.getLevel(),
                    sendBackLogs: isDebugModeEnabled(),
                    date: Date.now(),
                    timestamp: getMonotonicTimeStamp(),
                    hasVideo: ((_a = this.videoElement) === null || _a === void 0 ? void 0 : _a.nodeName.toLowerCase()) === "video",
                    hasMseInWorker,
                },
            });
            log.addEventListener("onLogLevelChange", (logLevel) => {
                if (this._priv_worker === null) {
                    return;
                }
                log.debug("---> Sending To Worker:", "log-level-update" /* MainThreadMessageType.LogLevelUpdate */);
                this._priv_worker.postMessage({
                    type: "log-level-update" /* MainThreadMessageType.LogLevelUpdate */,
                    value: {
                        logLevel,
                        sendBackLogs: isDebugModeEnabled(),
                    },
                });
            }, this._destroyCanceller.signal);
        });
    }
    /**
     * Returns information on which "mode" the RxPlayer is running for the current
     * content (e.g. main logic running in a WebWorker or not, are we in
     * directfile mode...).
     *
     * Returns `null` if no content is loaded.
     * @returns {Object|null}
     */
    getCurrentModeInformation() {
        if (this._priv_contentInfos === null) {
            return null;
        }
        return {
            isDirectFile: this._priv_contentInfos.isDirectFile,
            useWorker: this._priv_contentInfos.useWorker,
        };
    }
    /**
     * Register a new callback for a player event event.
     *
     * @param {string} evt - The event to register a callback to
     * @param {Function} fn - The callback to call as that event is triggered.
     * The callback will take as argument the eventual payload of the event
     * (single argument).
     */
    addEventListener(evt, fn) {
        // The EventEmitter's `addEventListener` method takes an optional third
        // argument that we do not want to expose in the public API.
        // We thus overwrite that function to remove any possible usage of that
        // third argument.
        return super.addEventListener(evt, fn);
    }
    /**
     * Stop the playback for the current content.
     */
    stop() {
        if (this._priv_contentInfos !== null) {
            this._priv_contentInfos.currentContentCanceller.cancel();
        }
        this._priv_cleanUpCurrentContentState();
        if (this.state !== "STOPPED" /* PLAYER_STATES.STOPPED */) {
            this._priv_setPlayerState("STOPPED" /* PLAYER_STATES.STOPPED */);
        }
    }
    /**
     * Free the resources used by the player.
     * /!\ The player cannot be "used" anymore after this method has been called.
     */
    dispose() {
        // free resources linked to the loaded content
        this.stop();
        if (this.videoElement !== null) {
            Player._priv_deregisterVideoElement(this.videoElement);
            // free resources used for decryption management
            disposeDecryptionResources(this.videoElement).catch((err) => {
                const message = err instanceof Error ? err.message : "Unknown error";
                log.error("API: Could not dispose decryption resources: " + message);
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
    }
    /**
     * Load a new video.
     * @param {Object} opts
     */
    loadVideo(opts) {
        const options = parseLoadVideoOptions(opts);
        log.info("API: Calling loadvideo", options.url, options.transport);
        this._priv_reloadingMetadata = { options };
        this._priv_initializeContentPlayback(options);
        this._priv_lastAutoPlay = options.autoPlay;
    }
    /**
     * Reload the last loaded content.
     * @param {Object} reloadOpts
     */
    reload(reloadOpts) {
        var _a, _b, _c;
        const { options, manifest, reloadPosition, reloadInPause } = this._priv_reloadingMetadata;
        if (options === undefined) {
            throw new Error("API: Can't reload without having previously loaded a content.");
        }
        checkReloadOptions(reloadOpts);
        let startAt;
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
        let autoPlay;
        if ((reloadOpts === null || reloadOpts === void 0 ? void 0 : reloadOpts.autoPlay) !== undefined) {
            autoPlay = reloadOpts.autoPlay;
        }
        else if (reloadInPause !== undefined) {
            autoPlay = !reloadInPause;
        }
        let keySystems;
        if ((reloadOpts === null || reloadOpts === void 0 ? void 0 : reloadOpts.keySystems) !== undefined) {
            keySystems = reloadOpts.keySystems;
        }
        else if (((_c = this._priv_reloadingMetadata.options) === null || _c === void 0 ? void 0 : _c.keySystems) !== undefined) {
            keySystems = this._priv_reloadingMetadata.options.keySystems;
        }
        const newOptions = Object.assign(Object.assign({}, options), { initialManifest: manifest });
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
    }
    createDebugElement(element) {
        if (features.createDebugElement === null) {
            throw new Error("Feature `DEBUG_ELEMENT` not added to the RxPlayer");
        }
        const canceller = new TaskCanceller();
        features.createDebugElement(element, this, canceller.signal);
        return {
            dispose() {
                canceller.cancel();
            },
        };
    }
    /**
     * From given options, initialize content playback.
     * @param {Object} options
     */
    _priv_initializeContentPlayback(options) {
        var _a, _b, _c, _d, _e, _f;
        const { autoPlay, defaultAudioTrackSwitchingMode, enableFastSwitching, initialManifest, keySystems, lowLatencyMode, minimumManifestUpdateInterval, requestConfig, onCodecSwitch, startAt, transport, checkMediaSegmentIntegrity, manifestLoader, referenceDateTime, segmentLoader, serverSyncInfos, mode, __priv_manifestUpdateUrl, __priv_patchLastSegmentInSidx, url, } = options;
        // Perform multiple checks on the given options
        if (this.videoElement === null) {
            throw new Error("the attached video element is disposed");
        }
        const isDirectFile = transport === "directfile";
        /** Emit to stop the current content. */
        const currentContentCanceller = new TaskCanceller();
        const videoElement = this.videoElement;
        let initializer;
        let useWorker = false;
        let mediaElementTracksStore = null;
        if (!isDirectFile) {
            /** Interface used to load and refresh the Manifest. */
            const manifestRequestSettings = {
                lowLatencyMode,
                maxRetry: (_a = requestConfig.manifest) === null || _a === void 0 ? void 0 : _a.maxRetry,
                requestTimeout: (_b = requestConfig.manifest) === null || _b === void 0 ? void 0 : _b.timeout,
                connectionTimeout: (_c = requestConfig.manifest) === null || _c === void 0 ? void 0 : _c.connectionTimeout,
                minimumManifestUpdateInterval,
                initialManifest,
            };
            const relyOnVideoVisibilityAndSize = canRelyOnVideoVisibilityAndSize();
            const throttlers = {
                throttleBitrate: {},
                limitResolution: {},
            };
            if (this._priv_throttleVideoBitrateWhenHidden) {
                if (!relyOnVideoVisibilityAndSize) {
                    log.warn("API: Can't apply throttleVideoBitrateWhenHidden because " +
                        "browser can't be trusted for visibility.");
                }
                else {
                    throttlers.throttleBitrate = {
                        video: createMappedReference(getVideoVisibilityRef(this._priv_pictureInPictureRef, currentContentCanceller.signal), (isActive) => (isActive ? Infinity : 0), currentContentCanceller.signal),
                    };
                }
            }
            if (this._priv_videoResolutionLimit === "videoElement") {
                if (!relyOnVideoVisibilityAndSize) {
                    log.warn("API: Can't apply videoResolutionLimit because browser can't be " +
                        "trusted for video size.");
                }
                else {
                    throttlers.limitResolution = {
                        video: getElementResolutionRef(videoElement, this._priv_pictureInPictureRef, currentContentCanceller.signal),
                    };
                }
            }
            else if (this._priv_videoResolutionLimit === "screen") {
                throttlers.limitResolution = {
                    video: getScreenResolutionRef(currentContentCanceller.signal),
                };
            }
            /** Options used by the adaptive logic. */
            const adaptiveOptions = {
                initialBitrates: this._priv_bitrateInfos.lastBitrates,
                lowLatencyMode,
                throttlers,
            };
            /** Options used by the TextTrack SegmentSink. */
            const textTrackOptions = options.textTrackMode === "native"
                ? { textTrackMode: "native" }
                : {
                    textTrackMode: "html",
                    textTrackElement: options.textTrackElement,
                };
            const bufferOptions = objectAssign({ enableFastSwitching, onCodecSwitch }, this._priv_bufferOptions);
            const segmentRequestOptions = {
                lowLatencyMode,
                maxRetry: (_d = requestConfig.segment) === null || _d === void 0 ? void 0 : _d.maxRetry,
                requestTimeout: (_e = requestConfig.segment) === null || _e === void 0 ? void 0 : _e.timeout,
                connectionTimeout: (_f = requestConfig.segment) === null || _f === void 0 ? void 0 : _f.connectionTimeout,
            };
            const canRunInMultiThread = features.multithread !== null &&
                this._priv_worker !== null &&
                transport === "dash" &&
                MULTI_THREAD_UNSUPPORTED_LOAD_VIDEO_OPTIONS.every((option) => isNullOrUndefined(options[option])) &&
                typeof options.representationFilter !== "function";
            if (mode === "main" || (mode === "auto" && !canRunInMultiThread)) {
                if (features.mainThreadMediaSourceInit === null) {
                    throw new Error("Cannot load video, neither in a WebWorker nor with the " +
                        "`MEDIA_SOURCE_MAIN` feature");
                }
                const transportFn = features.transports[transport];
                if (typeof transportFn !== "function") {
                    // Stop previous content and reset its state
                    this.stop();
                    this._priv_currentError = null;
                    throw new Error(`transport "${transport}" not supported`);
                }
                const representationFilter = typeof options.representationFilter === "string"
                    ? createRepresentationFilterFromFnString(options.representationFilter)
                    : options.representationFilter;
                log.info("API: Initializing MediaSource mode in the main thread");
                const transportPipelines = transportFn({
                    lowLatencyMode,
                    checkMediaSegmentIntegrity,
                    manifestLoader,
                    referenceDateTime,
                    representationFilter,
                    segmentLoader,
                    serverSyncInfos,
                    __priv_manifestUpdateUrl,
                    __priv_patchLastSegmentInSidx,
                });
                initializer = new features.mainThreadMediaSourceInit({
                    adaptiveOptions,
                    autoPlay,
                    bufferOptions,
                    keySystems,
                    lowLatencyMode,
                    transport: transportPipelines,
                    manifestRequestSettings,
                    segmentRequestOptions,
                    speed: this._priv_speed,
                    startAt,
                    textTrackOptions,
                    url,
                });
            }
            else {
                if (features.multithread === null) {
                    throw new Error("Cannot load video in multithread mode: `MULTI_THREAD` " +
                        "feature not imported.");
                }
                else if (this._priv_worker === null) {
                    throw new Error("Cannot load video in multithread mode: `attachWorker` " +
                        "method not called.");
                }
                assert(typeof options.representationFilter !== "function");
                useWorker = true;
                log.info("API: Initializing MediaSource mode in a WebWorker");
                const transportOptions = {
                    lowLatencyMode,
                    checkMediaSegmentIntegrity,
                    referenceDateTime,
                    serverSyncInfos,
                    manifestLoader: undefined,
                    segmentLoader: undefined,
                    representationFilter: options.representationFilter,
                    __priv_manifestUpdateUrl,
                    __priv_patchLastSegmentInSidx,
                };
                initializer = new features.multithread.init({
                    adaptiveOptions,
                    autoPlay,
                    bufferOptions,
                    keySystems,
                    lowLatencyMode,
                    transportOptions,
                    manifestRequestSettings,
                    segmentRequestOptions,
                    speed: this._priv_speed,
                    startAt,
                    textTrackOptions,
                    worker: this._priv_worker,
                    url,
                });
            }
        }
        else {
            if (features.directfile === null) {
                this.stop();
                this._priv_currentError = null;
                throw new Error("DirectFile feature not activated in your build.");
            }
            else if (isNullOrUndefined(url)) {
                throw new Error("No URL for a DirectFile content");
            }
            log.info("API: Initializing DirectFile mode in the main thread");
            mediaElementTracksStore = this._priv_initializeMediaElementTracksStore(currentContentCanceller.signal);
            if (currentContentCanceller.isUsed()) {
                return;
            }
            initializer = new features.directfile.initDirectFile({
                autoPlay,
                keySystems,
                speed: this._priv_speed,
                startAt,
                url,
            });
        }
        /** Future `this._priv_contentInfos` related to this content. */
        const contentInfos = {
            contentId: generateContentId(),
            originalUrl: url,
            currentContentCanceller,
            defaultAudioTrackSwitchingMode,
            initializer,
            isDirectFile,
            manifest: null,
            currentPeriod: null,
            activeAdaptations: null,
            activeRepresentations: null,
            tracksStore: null,
            mediaElementTracksStore,
            useWorker,
        };
        // Bind events
        initializer.addEventListener("error", (error) => {
            this._priv_onFatalError(error, contentInfos);
        });
        initializer.addEventListener("warning", (error) => {
            const formattedError = formatError(error, {
                defaultCode: "NONE",
                defaultReason: "An unknown error happened.",
            });
            log.warn("API: Sending warning:", formattedError);
            this.trigger("warning", formattedError);
        });
        initializer.addEventListener("reloadingMediaSource", (payload) => {
            if (contentInfos.tracksStore !== null) {
                contentInfos.tracksStore.resetPeriodObjects();
            }
            this._priv_segmentSinkMetricsCallback = null;
            this._priv_lastAutoPlay = payload.autoPlay;
        });
        initializer.addEventListener("inbandEvents", (inbandEvents) => this.trigger("inbandEvents", inbandEvents));
        initializer.addEventListener("streamEvent", (streamEvent) => this.trigger("streamEvent", streamEvent));
        initializer.addEventListener("streamEventSkip", (streamEventSkip) => this.trigger("streamEventSkip", streamEventSkip));
        initializer.addEventListener("activePeriodChanged", (periodInfo) => this._priv_onActivePeriodChanged(contentInfos, periodInfo));
        initializer.addEventListener("periodStreamReady", (periodReadyInfo) => this._priv_onPeriodStreamReady(contentInfos, periodReadyInfo));
        initializer.addEventListener("periodStreamCleared", (periodClearedInfo) => this._priv_onPeriodStreamCleared(contentInfos, periodClearedInfo));
        initializer.addEventListener("representationChange", (representationInfo) => this._priv_onRepresentationChange(contentInfos, representationInfo));
        initializer.addEventListener("adaptationChange", (adaptationInfo) => this._priv_onAdaptationChange(contentInfos, adaptationInfo));
        initializer.addEventListener("bitrateEstimateChange", (bitrateEstimateInfo) => this._priv_onBitrateEstimateChange(bitrateEstimateInfo));
        initializer.addEventListener("manifestReady", (manifest) => this._priv_onManifestReady(contentInfos, manifest));
        initializer.addEventListener("manifestUpdate", (updates) => this._priv_onManifestUpdate(contentInfos, updates));
        initializer.addEventListener("decipherabilityUpdate", (updates) => this._priv_onDecipherabilityUpdate(contentInfos, updates));
        initializer.addEventListener("loaded", (evt) => {
            this._priv_segmentSinkMetricsCallback = evt.getSegmentSinkMetrics;
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
        const playbackObserver = new MediaElementPlaybackObserver(videoElement, {
            withMediaSource: !isDirectFile,
            lowLatencyMode,
        });
        currentContentCanceller.signal.register(() => {
            playbackObserver.stop();
        });
        // Update the RxPlayer's state at the right events
        const playerStateRef = constructPlayerStateReference(initializer, videoElement, playbackObserver, currentContentCanceller.signal);
        currentContentCanceller.signal.register(() => {
            initializer.dispose();
        });
        /**
         * Function updating `this._priv_reloadingMetadata` in function of the
         * current state and playback conditions.
         * To call when either might change.
         * @param {string} state - The player state we're about to switch to.
         */
        const updateReloadingMetadata = (state) => {
            switch (state) {
                case "STOPPED":
                case "RELOADING":
                case "LOADING":
                    break; // keep previous metadata
                case "ENDED":
                    this._priv_reloadingMetadata.reloadInPause = true;
                    this._priv_reloadingMetadata.reloadPosition = playbackObserver
                        .getReference()
                        .getValue()
                        .position.getPolled();
                    break;
                default:
                    const o = playbackObserver.getReference().getValue();
                    this._priv_reloadingMetadata.reloadInPause = o.paused;
                    this._priv_reloadingMetadata.reloadPosition = o.position.getWanted();
                    break;
            }
        };
        /**
         * `TaskCanceller` allowing to stop emitting `"play"` and `"pause"`
         * events.
         * `null` when such events are not emitted currently.
         */
        let playPauseEventsCanceller = null;
        /**
         * Callback emitting `"play"` and `"pause`" events once the content is
         * loaded, starting from the state indicated in argument.
         * @param {boolean} willAutoPlay - If `false`, we're currently paused.
         */
        const triggerPlayPauseEventsWhenReady = (willAutoPlay) => {
            if (playPauseEventsCanceller !== null) {
                playPauseEventsCanceller.cancel(); // cancel previous logic
                playPauseEventsCanceller = null;
            }
            playerStateRef.onUpdate((val, stopListeningToStateUpdates) => {
                if (!isLoadedState(val)) {
                    return; // content not loaded yet: no event
                }
                stopListeningToStateUpdates();
                if (playPauseEventsCanceller !== null) {
                    playPauseEventsCanceller.cancel();
                }
                playPauseEventsCanceller = new TaskCanceller();
                playPauseEventsCanceller.linkToSignal(currentContentCanceller.signal);
                if (willAutoPlay !== !videoElement.paused) {
                    // paused status is not at the expected value on load: emit event
                    if (videoElement.paused) {
                        this.trigger("pause", null);
                    }
                    else {
                        this.trigger("play", null);
                    }
                }
                emitPlayPauseEvents(videoElement, () => this.trigger("play", null), () => this.trigger("pause", null), currentContentCanceller.signal);
            }, {
                emitCurrentValue: false,
                clearSignal: currentContentCanceller.signal,
            });
        };
        triggerPlayPauseEventsWhenReady(autoPlay);
        initializer.addEventListener("reloadingMediaSource", (payload) => {
            triggerPlayPauseEventsWhenReady(payload.autoPlay);
        });
        this._priv_currentError = null;
        this._priv_contentInfos = contentInfos;
        /**
         * `TaskCanceller` allowing to stop emitting `"seeking"` and `"seeked"`
         * events.
         * `null` when such events are not emitted currently.
         */
        let seekEventsCanceller = null;
        // React to player state change
        playerStateRef.onUpdate((newState) => {
            updateReloadingMetadata(newState);
            this._priv_setPlayerState(newState);
            if (currentContentCanceller.isUsed()) {
                return;
            }
            if (seekEventsCanceller !== null) {
                if (!isLoadedState(this.state)) {
                    seekEventsCanceller.cancel();
                    seekEventsCanceller = null;
                }
            }
            else if (isLoadedState(this.state)) {
                seekEventsCanceller = new TaskCanceller();
                seekEventsCanceller.linkToSignal(currentContentCanceller.signal);
                emitSeekEvents(videoElement, playbackObserver, () => this.trigger("seeking", null), () => this.trigger("seeked", null), seekEventsCanceller.signal);
            }
        }, { emitCurrentValue: true, clearSignal: currentContentCanceller.signal });
        // React to playback conditions change
        playbackObserver.listen((observation) => {
            updateReloadingMetadata(this.state);
            this._priv_triggerPositionUpdate(contentInfos, observation);
        }, { clearSignal: currentContentCanceller.signal });
        currentContentCanceller.signal.register(() => {
            initializer.removeEventListener();
        });
        // initialize the content only when the lock is inactive
        this._priv_contentLock.onUpdate((isLocked, stopListeningToLock) => {
            if (!isLocked) {
                stopListeningToLock();
                // start playback!
                initializer.start(videoElement, playbackObserver);
            }
        }, { emitCurrentValue: true, clearSignal: currentContentCanceller.signal });
    }
    /**
     * Returns fatal error if one for the current content.
     * null otherwise.
     * @returns {Object|null} - The current Error (`null` when no error).
     */
    getError() {
        return this._priv_currentError;
    }
    /**
     * Returns the media DOM element used by the player.
     * You should not its HTML5 API directly and use the player's method instead,
     * to ensure a well-behaved player.
     * @returns {HTMLMediaElement|null} - The HTMLMediaElement used (`null` when
     * disposed)
     */
    getVideoElement() {
        return this.videoElement;
    }
    /**
     * Returns the player's current state.
     * @returns {string} - The current Player's state
     */
    getPlayerState() {
        return this.state;
    }
    /**
     * Returns true if a content is loaded.
     * @returns {Boolean} - `true` if a content is loaded, `false` otherwise.
     */
    isContentLoaded() {
        return !arrayIncludes(["LOADING", "RELOADING", "STOPPED"], this.state);
    }
    /**
     * Returns true if the player is buffering.
     * @returns {Boolean} - `true` if the player is buffering, `false` otherwise.
     */
    isBuffering() {
        return arrayIncludes(["BUFFERING", "SEEKING", "LOADING", "RELOADING"], this.state);
    }
    /**
     * Returns the play/pause status of the player :
     *   - when `LOADING` or `RELOADING`, returns the scheduled play/pause condition
     *     for when loading is over,
     *   - in other states, returns the `<video>` element .paused value,
     *   - if the player is disposed, returns `true`.
     * @returns {Boolean} - `true` if the player is paused or will be after loading,
     * `false` otherwise.
     */
    isPaused() {
        if (this.videoElement) {
            if (arrayIncludes(["LOADING", "RELOADING"], this.state)) {
                return !this._priv_lastAutoPlay;
            }
            else {
                return this.videoElement.paused;
            }
        }
        return true;
    }
    /**
     * Returns true if both:
     *   - a content is loaded
     *   - the content loaded is a live content
     * @returns {Boolean} - `true` if we're playing a live content, `false` otherwise.
     */
    isLive() {
        if (this._priv_contentInfos === null) {
            return false;
        }
        const { isDirectFile, manifest } = this._priv_contentInfos;
        if (isDirectFile || manifest === null) {
            return false;
        }
        return manifest.isLive;
    }
    /**
     * Returns `true` if trickmode playback is active (usually through the usage
     * of the `setPlaybackRate` method), which means that the RxPlayer selects
     * "trickmode" video tracks in priority.
     * @returns {Boolean}
     */
    areTrickModeTracksEnabled() {
        return this._priv_preferTrickModeTracks;
    }
    /**
     * Returns the URL(s) of the currently considered Manifest, or of the content for
     * directfile content.
     * @returns {Array.<string>|undefined} - Current URL. `undefined` if not known
     * or no URL yet.
     */
    getContentUrls() {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        const { isDirectFile, manifest, originalUrl } = this._priv_contentInfos;
        if (isDirectFile) {
            return originalUrl === undefined ? undefined : [originalUrl];
        }
        if (manifest !== null) {
            return manifest.uris;
        }
        return undefined;
    }
    /**
     * Update URL of the content currently being played (e.g. DASH's MPD).
     * @param {Array.<string>|undefined} urls - URLs to reach that content /
     * Manifest from the most prioritized URL to the least prioritized URL.
     * @param {Object|undefined} [params]
     * @param {boolean} params.refresh - If `true` the resource in question
     * (e.g. DASH's MPD) will be refreshed immediately.
     */
    updateContentUrls(urls, params) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        const refreshNow = (params === null || params === void 0 ? void 0 : params.refresh) === true;
        this._priv_contentInfos.initializer.updateContentUrls(urls, refreshNow);
    }
    /**
     * Returns the video duration, in seconds.
     * NaN if no video is playing.
     * @returns {Number}
     */
    getMediaDuration() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        return this.videoElement.duration;
    }
    /**
     * Returns in seconds the difference between:
     *   - the end of the current contiguous loaded range.
     *   - the current time
     * @returns {Number}
     */
    getCurrentBufferGap() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        const videoElement = this.videoElement;
        const bufferGap = getLeftSizeOfBufferedTimeRange(videoElement.buffered, videoElement.currentTime);
        if (bufferGap === Infinity) {
            return 0;
        }
        return bufferGap;
    }
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
    getWallClockTime() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (this._priv_contentInfos === null) {
            return this.videoElement.currentTime;
        }
        const { isDirectFile, manifest } = this._priv_contentInfos;
        if (isDirectFile) {
            const startDate = getStartDate(this.videoElement);
            return (startDate !== null && startDate !== void 0 ? startDate : 0) + this.videoElement.currentTime;
        }
        if (manifest !== null) {
            const currentTime = this.videoElement.currentTime;
            const ast = manifest.availabilityStartTime !== undefined ? manifest.availabilityStartTime : 0;
            return currentTime + ast;
        }
        return 0;
    }
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
    getPosition() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        return this.videoElement.currentTime;
    }
    /**
     * Returns the last stored content position, in seconds.
     *
     * @returns {number|undefined}
     */
    getLastStoredContentPosition() {
        return this._priv_reloadingMetadata.reloadPosition;
    }
    /**
     * Returns the current playback rate at which the video plays.
     * @returns {Number}
     */
    getPlaybackRate() {
        return this._priv_speed.getValue();
    }
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
    setPlaybackRate(rate, opts) {
        var _a;
        if (rate !== this._priv_speed.getValue()) {
            this._priv_speed.setValue(rate);
        }
        const preferTrickModeTracks = opts === null || opts === void 0 ? void 0 : opts.preferTrickModeTracks;
        if (typeof preferTrickModeTracks !== "boolean") {
            return;
        }
        this._priv_preferTrickModeTracks = preferTrickModeTracks;
        const tracksStore = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.tracksStore;
        if (!isNullOrUndefined(tracksStore)) {
            if (preferTrickModeTracks && !tracksStore.isTrickModeEnabled()) {
                tracksStore.enableVideoTrickModeTracks();
            }
            else if (!preferTrickModeTracks && tracksStore.isTrickModeEnabled()) {
                tracksStore.disableVideoTrickModeTracks();
            }
        }
    }
    /**
     * Returns video Representation currently considered for the current Period.
     *
     * Returns `null` if no video track is playing for the current Period.
     *
     * Returns `undefined` either when are not currently playing any Period or
     * when we don't know which Representation is playing.
     * @returns {Object|null|undefined}
     */
    getVideoRepresentation() {
        const representations = this.__priv_getCurrentRepresentations();
        if (representations === null) {
            return undefined;
        }
        return representations.video;
    }
    /**
     * Returns audio Representation currently considered for the current Period.
     *
     * Returns `null` if no audio track is playing for the current Period.
     *
     * Returns `undefined` either when are not currently playing any Period or
     * when we don't know which Representation is playing.
     * @returns {Object|null|undefined}
     */
    getAudioRepresentation() {
        const representations = this.__priv_getCurrentRepresentations();
        if (representations === null) {
            return undefined;
        }
        return representations.audio;
    }
    /**
     * Play/Resume the current video.
     * @returns {Promise}
     */
    play() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        const playPromise = this.videoElement.play();
        /* eslint-disable @typescript-eslint/unbound-method */
        if (isNullOrUndefined(playPromise) || typeof playPromise.catch !== "function") {
            /* eslint-enable @typescript-eslint/unbound-method */
            return Promise.resolve();
        }
        return playPromise.catch((error) => {
            if (error.name === "NotAllowedError") {
                const warning = new MediaError("MEDIA_ERR_PLAY_NOT_ALLOWED", error.toString());
                this.trigger("warning", warning);
            }
            throw error;
        });
    }
    /**
     * Pause the current video.
     */
    pause() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        this.videoElement.pause();
    }
    /**
     * Seek to a given absolute position.
     * @param {Number|Object} time
     * @returns {Number} - The time the player has seek to
     */
    seekTo(time) {
        var _a;
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (this._priv_contentInfos === null) {
            throw new Error("player: no content loaded");
        }
        const { isDirectFile, manifest } = this._priv_contentInfos;
        if (!isDirectFile && manifest === null) {
            throw new Error("player: the content did not load yet");
        }
        let positionWanted;
        if (typeof time === "number") {
            positionWanted = time;
        }
        else if (typeof time === "object") {
            const timeObj = time;
            const currentTs = this.videoElement.currentTime;
            if (!isNullOrUndefined(timeObj.relative)) {
                positionWanted = currentTs + timeObj.relative;
            }
            else if (!isNullOrUndefined(timeObj.position)) {
                positionWanted = timeObj.position;
            }
            else if (!isNullOrUndefined(timeObj.wallClockTime)) {
                if (manifest !== null) {
                    positionWanted = timeObj.wallClockTime - ((_a = manifest.availabilityStartTime) !== null && _a !== void 0 ? _a : 0);
                }
                else if (isDirectFile && this.videoElement !== null) {
                    const startDate = getStartDate(this.videoElement);
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
        log.info("API: API Seek to", positionWanted);
        this.videoElement.currentTime = positionWanted;
        return positionWanted;
    }
    /**
     * Returns the current player's audio volume on the media element.
     * From 0 (no audio) to 1 (maximum volume).
     * @returns {Number}
     */
    getVolume() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        return this.videoElement.volume;
    }
    /**
     * Set the player's audio volume. From 0 (no volume) to 1 (maximum volume).
     * @param {Number} volume
     */
    setVolume(volume) {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        const videoElement = this.videoElement;
        if (volume !== videoElement.volume) {
            videoElement.volume = volume;
        }
    }
    /**
     * Returns `true` if audio is currently muted.
     * @returns {Boolean}
     */
    isMute() {
        var _a;
        return ((_a = this.videoElement) === null || _a === void 0 ? void 0 : _a.muted) === true;
    }
    /**
     * Mute audio.
     */
    mute() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (!this.videoElement.muted) {
            this.videoElement.muted = true;
        }
    }
    /**
     * Unmute audio.
     */
    unMute() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        if (this.videoElement.muted) {
            this.videoElement.muted = false;
        }
    }
    /**
     * Set the max buffer size for the buffer behind the current position.
     * Every buffer data before will be removed.
     * @param {Number} depthInSeconds
     */
    setMaxBufferBehind(depthInSeconds) {
        this._priv_bufferOptions.maxBufferBehind.setValue(depthInSeconds);
    }
    /**
     * Set the max buffer size for the buffer behind the current position.
     * Every buffer data before will be removed.
     * @param {Number} depthInSeconds
     */
    setMaxBufferAhead(depthInSeconds) {
        this._priv_bufferOptions.maxBufferAhead.setValue(depthInSeconds);
    }
    /**
     * Set the max buffer size for the buffer ahead of the current position.
     * The player will stop downloading chunks when this size is reached.
     * @param {Number} sizeInSeconds
     */
    setWantedBufferAhead(sizeInSeconds) {
        this._priv_bufferOptions.wantedBufferAhead.setValue(sizeInSeconds);
    }
    /**
     * Set the max buffer size the buffer should take in memory
     * The player . will stop downloading chunks when this size is reached.
     * @param {Number} sizeInKBytes
     */
    setMaxVideoBufferSize(sizeInKBytes) {
        this._priv_bufferOptions.maxVideoBufferSize.setValue(sizeInKBytes);
    }
    /**
     * Returns the max buffer size for the buffer behind the current position.
     * @returns {Number}
     */
    getMaxBufferBehind() {
        return this._priv_bufferOptions.maxBufferBehind.getValue();
    }
    /**
     * Returns the max buffer size for the buffer behind the current position.
     * @returns {Number}
     */
    getMaxBufferAhead() {
        return this._priv_bufferOptions.maxBufferAhead.getValue();
    }
    /**
     * Returns the max buffer size for the buffer ahead of the current position.
     * @returns {Number}
     */
    getWantedBufferAhead() {
        return this._priv_bufferOptions.wantedBufferAhead.getValue();
    }
    /**
     * Returns the max buffer memory size for the buffer in kilobytes
     * @returns {Number}
     */
    getMaxVideoBufferSize() {
        return this._priv_bufferOptions.maxVideoBufferSize.getValue();
    }
    getCurrentPeriod() {
        var _a;
        const currentPeriod = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.currentPeriod;
        if (isNullOrUndefined(currentPeriod)) {
            return null;
        }
        return {
            id: currentPeriod.id,
            start: currentPeriod.start,
            end: currentPeriod.end,
        };
    }
    /**
     * Returns both the name of the key system (e.g. `"com.widevine.alpha"`) and
     * the `MediaKeySystemConfiguration` currently associated to the
     * HTMLMediaElement linked to the RxPlayer.
     *
     * Returns `null` if no such capabilities is associated or if unknown.
     * @returns {Object|null}
     */
    getKeySystemConfiguration() {
        if (this.videoElement === null) {
            throw new Error("Disposed player");
        }
        const values = getKeySystemConfiguration(this.videoElement);
        if (values === null) {
            return null;
        }
        return { keySystem: values[0], configuration: values[1] };
    }
    /**
     * Returns the list of available Periods for which the current audio, video or
     * text track can now be changed.
     * @returns {Array.<Object>}
     */
    getAvailablePeriods() {
        if (this._priv_contentInfos === null) {
            return [];
        }
        const { isDirectFile, tracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            return [];
        }
        if (tracksStore === null) {
            return [];
        }
        return tracksStore.getAvailablePeriods().slice();
    }
    /**
     * Returns every available audio tracks for a given Period - or the current
     * one if no `periodId` is given.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks(periodId) {
        var _a;
        if (this._priv_contentInfos === null) {
            return [];
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            return (_a = mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.getAvailableAudioTracks()) !== null && _a !== void 0 ? _a : [];
        }
        return this._priv_callTracksStoreGetterSetter(periodId, [], (tcm, periodRef) => { var _a; return (_a = tcm.getAvailableAudioTracks(periodRef)) !== null && _a !== void 0 ? _a : []; });
    }
    /**
     * Returns every available text tracks for a given Period - or the current
     * one if no `periodId` is given.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(periodId) {
        var _a;
        if (this._priv_contentInfos === null) {
            return [];
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            return (_a = mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.getAvailableTextTracks()) !== null && _a !== void 0 ? _a : [];
        }
        return this._priv_callTracksStoreGetterSetter(periodId, [], (tcm, periodRef) => { var _a; return (_a = tcm.getAvailableTextTracks(periodRef)) !== null && _a !== void 0 ? _a : []; });
    }
    /**
     * Returns every available video tracks for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks(periodId) {
        var _a;
        if (this._priv_contentInfos === null) {
            return [];
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            return (_a = mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.getAvailableVideoTracks()) !== null && _a !== void 0 ? _a : [];
        }
        return this._priv_callTracksStoreGetterSetter(periodId, [], (tcm, periodRef) => { var _a; return (_a = tcm.getAvailableVideoTracks(periodRef)) !== null && _a !== void 0 ? _a : []; });
    }
    /**
     * Returns currently chosen audio language for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    getAudioTrack(periodId) {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            if (mediaElementTracksStore === null) {
                return undefined;
            }
            return mediaElementTracksStore.getChosenAudioTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.getChosenAudioTrack(periodRef));
    }
    /**
     * Returns currently chosen subtitle for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    getTextTrack(periodId) {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            if (mediaElementTracksStore === null) {
                return undefined;
            }
            return mediaElementTracksStore.getChosenTextTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.getChosenTextTrack(periodRef));
    }
    /**
     * Returns currently chosen video track for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    getVideoTrack(periodId) {
        if (this._priv_contentInfos === null) {
            return undefined;
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            if (mediaElementTracksStore === null) {
                return undefined;
            }
            return mediaElementTracksStore.getChosenVideoTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.getChosenVideoTrack(periodRef));
    }
    /**
     * Update the audio language for the current Period.
     * @param {string | object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no audio track.
     */
    setAudioTrack(arg) {
        var _a;
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            try {
                const audioId = typeof arg === "string" ? arg : arg.trackId;
                mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.setAudioTrackById(audioId);
                return;
            }
            catch (e) {
                throw new Error("player: unknown audio track");
            }
        }
        let periodId;
        let trackId;
        let switchingMode;
        let lockedRepresentations = null;
        let relativeResumingPosition;
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
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.setAudioTrack({
            periodRef,
            trackId,
            switchingMode,
            lockedRepresentations,
            relativeResumingPosition,
        }));
    }
    /**
     * Update the text language for the current Period.
     * @param {string | Object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no text track.
     */
    setTextTrack(arg) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            try {
                const textId = typeof arg === "string" ? arg : arg.trackId;
                mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.setTextTrackById(textId);
                return;
            }
            catch (e) {
                throw new Error("player: unknown text track");
            }
        }
        let periodId;
        let trackId;
        if (typeof arg === "string") {
            trackId = arg;
        }
        else {
            trackId = arg.trackId;
            periodId = arg.periodId;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.setTextTrack(periodRef, trackId));
    }
    /**
     * Disable subtitles for the current content.
     * @param {string|undefined} [periodId]
     */
    disableTextTrack(periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.disableTextTrack();
            return;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.disableTrack(periodRef, "text"));
    }
    /**
     * Update the video track for the current Period.
     * @param {string | Object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no video track.
     */
    setVideoTrack(arg) {
        var _a;
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile) {
            try {
                const videoId = typeof arg === "string" ? arg : arg.trackId;
                mediaElementTracksStore === null || mediaElementTracksStore === void 0 ? void 0 : mediaElementTracksStore.setVideoTrackById(videoId);
                return;
            }
            catch (e) {
                throw new Error("player: unknown video track");
            }
        }
        let periodId;
        let trackId;
        let switchingMode;
        let lockedRepresentations = null;
        let relativeResumingPosition;
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
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.setVideoTrack({
            periodRef,
            trackId,
            switchingMode,
            lockedRepresentations,
            relativeResumingPosition,
        }));
    }
    /**
     * Disable video track for the current content.
     * @param {string|undefined} [periodId]
     */
    disableVideoTrack(periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
        if (isDirectFile && mediaElementTracksStore !== null) {
            return mediaElementTracksStore.disableVideoTrack();
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.disableTrack(periodRef, "video"));
    }
    lockVideoRepresentations(arg) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        const { isDirectFile } = this._priv_contentInfos;
        if (isDirectFile) {
            throw new Error("Cannot lock video Representations in directfile mode.");
        }
        let repsId;
        let periodId;
        let switchingMode;
        if (Array.isArray(arg)) {
            repsId = arg;
            periodId = undefined;
        }
        else {
            repsId = arg.representations;
            periodId = arg.periodId;
            switchingMode = arg.switchingMode;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.lockVideoRepresentations(periodRef, {
            representations: repsId,
            switchingMode,
        }));
    }
    lockAudioRepresentations(arg) {
        if (this._priv_contentInfos === null) {
            throw new Error("No content loaded");
        }
        const { isDirectFile } = this._priv_contentInfos;
        if (isDirectFile) {
            throw new Error("Cannot lock audio Representations in directfile mode.");
        }
        let repsId;
        let periodId;
        let switchingMode;
        if (Array.isArray(arg)) {
            repsId = arg;
            periodId = undefined;
        }
        else {
            repsId = arg.representations;
            periodId = arg.periodId;
            switchingMode = arg.switchingMode;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.lockAudioRepresentations(periodRef, {
            representations: repsId,
            switchingMode,
        }));
    }
    getLockedVideoRepresentations(periodId) {
        if (this._priv_contentInfos === null) {
            return null;
        }
        const { isDirectFile } = this._priv_contentInfos;
        if (isDirectFile) {
            return null;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, null, (tcm, periodRef) => tcm.getLockedVideoRepresentations(periodRef));
    }
    getLockedAudioRepresentations(periodId) {
        if (this._priv_contentInfos === null) {
            return null;
        }
        const { isDirectFile } = this._priv_contentInfos;
        if (isDirectFile) {
            return null;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, null, (tcm, periodRef) => tcm.getLockedAudioRepresentations(periodRef));
    }
    unlockVideoRepresentations(periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        const { isDirectFile } = this._priv_contentInfos;
        if (isDirectFile) {
            return;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.unlockVideoRepresentations(periodRef));
    }
    unlockAudioRepresentations(periodId) {
        if (this._priv_contentInfos === null) {
            return;
        }
        const { isDirectFile } = this._priv_contentInfos;
        if (isDirectFile) {
            return;
        }
        return this._priv_callTracksStoreGetterSetter(periodId, undefined, (tcm, periodRef) => tcm.unlockAudioRepresentations(periodRef));
    }
    /**
     * Get minimum seek-able position.
     * @returns {number}
     */
    getMinimumPosition() {
        if (this._priv_contentInfos === null) {
            return null;
        }
        if (this._priv_contentInfos.isDirectFile) {
            return 0;
        }
        const { manifest } = this._priv_contentInfos;
        if (manifest !== null) {
            return getMinimumSafePosition(manifest);
        }
        return null;
    }
    /**
     * Returns the current position for live contents.
     *
     * Returns `null` if no content is loaded or if the current loaded content is
     * not considered as a live content.
     * Returns `undefined` if that live position is currently unknown.
     * @returns {number}
     */
    getLivePosition() {
        if (this._priv_contentInfos === null) {
            return null;
        }
        const { isDirectFile, manifest } = this._priv_contentInfos;
        if (isDirectFile) {
            return undefined;
        }
        if ((manifest === null || manifest === void 0 ? void 0 : manifest.isLive) !== true) {
            return null;
        }
        return getLivePosition(manifest);
    }
    /**
     * Get maximum seek-able position.
     * @returns {number}
     */
    getMaximumPosition() {
        if (this._priv_contentInfos === null) {
            return null;
        }
        const { isDirectFile, manifest } = this._priv_contentInfos;
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
            return getMaximumSafePosition(manifest);
        }
        return null;
    }
    // ---- Undocumented Private methods. ----
    //
    // Those methods are just here either to allow some tools relying on the
    // RxPlayer instance to work or to improve the RxPlayer's demo.
    //
    // They should not be used by any external code.
    /**
     * Used for the display of segmentSink metrics for the debug element
     * @param fn
     * @param cancellationSignal
     * @returns
     */
    async __priv_getSegmentSinkMetrics() {
        if (this._priv_segmentSinkMetricsCallback === null) {
            return undefined;
        }
        else {
            return this._priv_segmentSinkMetricsCallback();
        }
    }
    /**
     * /!\ For tools use only! Do not touch!
     *
     * Returns manifest/playlist object.
     * null if the player is STOPPED.
     * @returns {Manifest|null} - The current Manifest (`null` when not known).
     */
    // TODO remove the need for that public method
    __priv_getManifest() {
        if (this._priv_contentInfos === null) {
            return null;
        }
        return this._priv_contentInfos.manifest;
    }
    // TODO remove the need for that public method
    __priv_getCurrentAdaptation() {
        if (this._priv_contentInfos === null) {
            return null;
        }
        const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
        if (currentPeriod === null ||
            activeAdaptations === null ||
            isNullOrUndefined(activeAdaptations[currentPeriod.id])) {
            return null;
        }
        return activeAdaptations[currentPeriod.id];
    }
    // TODO remove the need for that public method
    __priv_getCurrentRepresentations() {
        if (this._priv_contentInfos === null) {
            return null;
        }
        const { currentPeriod, activeRepresentations } = this._priv_contentInfos;
        if (currentPeriod === null ||
            activeRepresentations === null ||
            isNullOrUndefined(activeRepresentations[currentPeriod.id])) {
            return null;
        }
        return activeRepresentations[currentPeriod.id];
    }
    // ---- Private methods ----
    /**
     * Reset all state properties relative to a playing content.
     */
    _priv_cleanUpCurrentContentState() {
        var _a, _b, _c, _d;
        log.debug("Locking `contentLock` to clean-up the current content.");
        // lock playback of new contents while cleaning up is pending
        this._priv_contentLock.setValue(true);
        (_b = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.tracksStore) === null || _b === void 0 ? void 0 : _b.dispose();
        (_d = (_c = this._priv_contentInfos) === null || _c === void 0 ? void 0 : _c.mediaElementTracksStore) === null || _d === void 0 ? void 0 : _d.dispose();
        this._priv_contentInfos = null;
        this._priv_segmentSinkMetricsCallback = null;
        this._priv_contentEventsMemory = {};
        // DRM-related clean-up
        const freeUpContentLock = () => {
            if (this.videoElement !== null) {
                // If not disposed
                log.debug("Unlocking `contentLock`. Next content can begin.");
                this._priv_contentLock.setValue(false);
            }
        };
        if (!isNullOrUndefined(this.videoElement)) {
            clearOnStop(this.videoElement).then(() => {
                log.debug("API: DRM session cleaned-up with success!");
                freeUpContentLock();
            }, (err) => {
                log.error("API: An error arised when trying to clean-up the DRM session:" +
                    (err instanceof Error ? err.toString() : "Unknown Error"));
                freeUpContentLock();
            });
        }
        else {
            freeUpContentLock();
        }
    }
    /**
     * Triggered when the Manifest has been loaded for the current content.
     * Initialize various private properties and emit initial event.
     * @param {Object} contentInfos
     * @param {Object} manifest
     */
    _priv_onManifestReady(contentInfos, manifest) {
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        contentInfos.manifest = manifest;
        if (manifest.manifestFormat === 0 /* ManifestMetadataFormat.Class */) {
            this._priv_reloadingMetadata.manifest = manifest;
        }
        const tracksStore = new TracksStore({
            preferTrickModeTracks: this._priv_preferTrickModeTracks,
            defaultAudioTrackSwitchingMode: contentInfos.defaultAudioTrackSwitchingMode,
        });
        contentInfos.tracksStore = tracksStore;
        tracksStore.addEventListener("newAvailablePeriods", (p) => {
            this.trigger("newAvailablePeriods", p);
        });
        tracksStore.addEventListener("brokenRepresentationsLock", (e) => {
            this.trigger("brokenRepresentationsLock", e);
        });
        tracksStore.addEventListener("trackUpdate", (e) => {
            var _a, _b;
            this.trigger("trackUpdate", e);
            const currentPeriod = (_b = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.currentPeriod) !== null && _b !== void 0 ? _b : undefined;
            if (e.reason === "no-playable-representation" &&
                e.period.id === (currentPeriod === null || currentPeriod === void 0 ? void 0 : currentPeriod.id)) {
                this._priv_onAvailableTracksMayHaveChanged(e.trackType);
            }
        });
        contentInfos.tracksStore.addEventListener("warning", (err) => {
            this.trigger("warning", err);
        });
        contentInfos.tracksStore.addEventListener("error", (err) => {
            this._priv_onFatalError(err, contentInfos);
        });
        contentInfos.tracksStore.onManifestUpdate(manifest);
    }
    /**
     * Triggered when the Manifest has been updated for the current content.
     * Initialize various private properties and emit initial event.
     * @param {Object} contentInfos
     * @param {Object} updates
     */
    _priv_onManifestUpdate(contentInfos, updates) {
        var _a, _b, _c;
        if (this._priv_contentInfos === null || this._priv_contentInfos.manifest === null) {
            return;
        }
        // Update the tracks chosen if it changed
        if (!isNullOrUndefined(contentInfos === null || contentInfos === void 0 ? void 0 : contentInfos.tracksStore)) {
            contentInfos.tracksStore.onManifestUpdate(this._priv_contentInfos.manifest);
        }
        const currentPeriod = (_b = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.currentPeriod) !== null && _b !== void 0 ? _b : undefined;
        const currTracksStore = (_c = this._priv_contentInfos) === null || _c === void 0 ? void 0 : _c.tracksStore;
        if (currentPeriod === undefined || isNullOrUndefined(currTracksStore)) {
            return;
        }
        for (const update of updates.updatedPeriods) {
            if (update.period.id === currentPeriod.id) {
                if (update.result.addedAdaptations.length > 0 ||
                    update.result.removedAdaptations.length > 0) {
                    // We might have new (or less) tracks, send events just to be sure
                    const periodRef = currTracksStore.getPeriodObjectFromPeriod(currentPeriod);
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
    _priv_onDecipherabilityUpdate(contentInfos, elts) {
        if (contentInfos === null || contentInfos.manifest === null) {
            return;
        }
        if (!isNullOrUndefined(contentInfos === null || contentInfos === void 0 ? void 0 : contentInfos.tracksStore)) {
            contentInfos.tracksStore.onDecipherabilityUpdates();
        }
        /**
         * Array of tuples only including once the Period/Track combination, and
         * only when it concerns the currently-selected track.
         */
        const periodsAndTrackTypes = elts.reduce((acc, elt) => {
            var _a, _b, _c;
            const isFound = arrayFind(acc, (x) => x[0].id === elt.period.id && x[1] === elt.adaptation.type) !== undefined;
            if (!isFound) {
                // Only consider the currently-selected tracks.
                // NOTE: Maybe there's room for optimizations? Unclear.
                const tStore = contentInfos.tracksStore;
                if (tStore === null) {
                    return acc;
                }
                let isCurrent = false;
                const periodRef = tStore.getPeriodObjectFromPeriod(elt.period);
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
        for (const [period, trackType] of periodsAndTrackTypes) {
            this._priv_triggerEventIfNotStopped("representationListUpdate", {
                period: { start: period.start, end: period.end, id: period.id },
                trackType,
                reason: "decipherability-update",
            }, contentInfos.currentContentCanceller.signal);
        }
    }
    /**
     * Triggered each times the current Period Changed.
     * Store and emit initial state for the Period.
     *
     * @param {Object} contentInfos
     * @param {Object} periodInfo
     */
    _priv_onActivePeriodChanged(contentInfos, { period }) {
        var _a, _b, _c, _d, _e, _f;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        contentInfos.currentPeriod = period;
        const cancelSignal = contentInfos.currentContentCanceller.signal;
        if (this._priv_contentEventsMemory.periodChange !== period) {
            this._priv_contentEventsMemory.periodChange = period;
            this._priv_triggerEventIfNotStopped("periodChange", { start: period.start, end: period.end, id: period.id }, cancelSignal);
        }
        this._priv_triggerEventIfNotStopped("availableAudioTracksChange", this.getAvailableAudioTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableTextTracksChange", this.getAvailableTextTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableVideoTracksChange", this.getAvailableVideoTracks(), cancelSignal);
        const tracksStore = (_b = this._priv_contentInfos) === null || _b === void 0 ? void 0 : _b.tracksStore;
        // Emit initial events for the Period
        if (!isNullOrUndefined(tracksStore)) {
            const periodRef = tracksStore.getPeriodObjectFromPeriod(period);
            if (periodRef) {
                const audioTrack = tracksStore.getChosenAudioTrack(periodRef);
                this._priv_triggerEventIfNotStopped("audioTrackChange", audioTrack, cancelSignal);
                const textTrack = tracksStore.getChosenTextTrack(periodRef);
                this._priv_triggerEventIfNotStopped("textTrackChange", textTrack, cancelSignal);
                const videoTrack = tracksStore.getChosenVideoTrack(periodRef);
                this._priv_triggerEventIfNotStopped("videoTrackChange", videoTrack, cancelSignal);
            }
        }
        else {
            this._priv_triggerEventIfNotStopped("audioTrackChange", null, cancelSignal);
            this._priv_triggerEventIfNotStopped("textTrackChange", null, cancelSignal);
            this._priv_triggerEventIfNotStopped("videoTrackChange", null, cancelSignal);
        }
        const audioRepresentation = (_d = (_c = this.__priv_getCurrentRepresentations()) === null || _c === void 0 ? void 0 : _c.audio) !== null && _d !== void 0 ? _d : null;
        this._priv_triggerEventIfNotStopped("audioRepresentationChange", audioRepresentation, cancelSignal);
        const videoRepresentation = (_f = (_e = this.__priv_getCurrentRepresentations()) === null || _e === void 0 ? void 0 : _e.video) !== null && _f !== void 0 ? _f : null;
        this._priv_triggerEventIfNotStopped("videoRepresentationChange", videoRepresentation, cancelSignal);
    }
    /**
     * Triggered each times a new "PeriodStream" is ready.
     * Choose the right Adaptation for the Period and emit it.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    _priv_onPeriodStreamReady(contentInfos, value) {
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        const { type, period, adaptationRef } = value;
        const tracksStore = contentInfos.tracksStore;
        switch (type) {
            case "video":
            case "audio":
            case "text":
                if (isNullOrUndefined(tracksStore)) {
                    log.error(`API: TracksStore not instanciated for a new ${type} period`);
                    adaptationRef.setValue(null);
                }
                else {
                    tracksStore.addTrackReference(type, period, adaptationRef);
                }
                break;
            default:
                assertUnreachable(type);
        }
    }
    /**
     * Triggered each times we "remove" a PeriodStream.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    _priv_onPeriodStreamCleared(contentInfos, value) {
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        const { type, period } = value;
        const tracksStore = contentInfos.tracksStore;
        // Clean-up track choices from TracksStore
        switch (type) {
            case "audio":
            case "text":
            case "video":
                if (!isNullOrUndefined(tracksStore)) {
                    tracksStore.removeTrackReference(type, period);
                }
                break;
        }
        // Clean-up stored Representation and Adaptation information
        const { activeAdaptations, activeRepresentations } = contentInfos;
        if (!isNullOrUndefined(activeAdaptations) &&
            !isNullOrUndefined(activeAdaptations[period.id])) {
            const activePeriodAdaptations = activeAdaptations[period.id];
            delete activePeriodAdaptations[type];
            if (Object.keys(activePeriodAdaptations).length === 0) {
                delete activeAdaptations[period.id];
            }
        }
        if (!isNullOrUndefined(activeRepresentations) &&
            !isNullOrUndefined(activeRepresentations[period.id])) {
            const activePeriodRepresentations = activeRepresentations[period.id];
            delete activePeriodRepresentations[type];
            if (Object.keys(activePeriodRepresentations).length === 0) {
                delete activeRepresentations[period.id];
            }
        }
    }
    /**
     * Triggered each times a new Adaptation is considered for the current
     * content.
     * Store given Adaptation and emit it if from the current Period.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    _priv_onAdaptationChange(contentInfos, { type, adaptation, period, }) {
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        // lazily create contentInfos.activeAdaptations
        if (contentInfos.activeAdaptations === null) {
            contentInfos.activeAdaptations = {};
        }
        const { activeAdaptations, currentPeriod } = contentInfos;
        const activePeriodAdaptations = activeAdaptations[period.id];
        if (isNullOrUndefined(activePeriodAdaptations)) {
            activeAdaptations[period.id] = { [type]: adaptation };
        }
        else {
            activePeriodAdaptations[type] = adaptation;
        }
        const { tracksStore } = contentInfos;
        const cancelSignal = contentInfos.currentContentCanceller.signal;
        if (tracksStore !== null &&
            currentPeriod !== null &&
            !isNullOrUndefined(period) &&
            period.id === currentPeriod.id) {
            const periodRef = tracksStore.getPeriodObjectFromPeriod(period);
            if (periodRef === undefined) {
                return;
            }
            switch (type) {
                case "audio":
                    const audioTrack = tracksStore.getChosenAudioTrack(periodRef);
                    this._priv_triggerEventIfNotStopped("audioTrackChange", audioTrack, cancelSignal);
                    break;
                case "text":
                    const textTrack = tracksStore.getChosenTextTrack(periodRef);
                    this._priv_triggerEventIfNotStopped("textTrackChange", textTrack, cancelSignal);
                    break;
                case "video":
                    const videoTrack = tracksStore.getChosenVideoTrack(periodRef);
                    this._priv_triggerEventIfNotStopped("videoTrackChange", videoTrack, cancelSignal);
                    break;
            }
        }
    }
    /**
     * Triggered each times a new Representation is considered during playback.
     *
     * Store given Representation and emit it if from the current Period.
     *
     * @param {Object} contentInfos
     * @param {Object} obj
     */
    _priv_onRepresentationChange(contentInfos, { type, period, representation, }) {
        var _a;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        // lazily create contentInfos.activeRepresentations
        if (contentInfos.activeRepresentations === null) {
            contentInfos.activeRepresentations = {};
        }
        const { activeRepresentations, currentPeriod } = contentInfos;
        const activePeriodRepresentations = activeRepresentations[period.id];
        if (isNullOrUndefined(activePeriodRepresentations)) {
            activeRepresentations[period.id] = { [type]: representation };
        }
        else {
            activePeriodRepresentations[type] = representation;
        }
        if (!isNullOrUndefined(period) &&
            currentPeriod !== null &&
            currentPeriod.id === period.id) {
            const cancelSignal = this._priv_contentInfos.currentContentCanceller.signal;
            if (type === "video") {
                this._priv_triggerEventIfNotStopped("videoRepresentationChange", representation, cancelSignal);
            }
            else if (type === "audio") {
                this._priv_triggerEventIfNotStopped("audioRepresentationChange", representation, cancelSignal);
            }
        }
    }
    /**
     * Triggered each time a bitrate estimate is calculated.
     *
     * Emit it.
     *
     * @param {Object} value
     */
    _priv_onBitrateEstimateChange({ type, bitrate, }) {
        if (bitrate !== undefined) {
            this._priv_bitrateInfos.lastBitrates[type] = bitrate;
        }
        this.trigger(
        // !!! undocumented API :O !!!
        /* eslint-disable-next-line */
        "__priv_bitrateEstimateChange", 
        /* eslint-disable-next-line */
        { type, bitrate });
    }
    /**
     * Triggered each time the player state updates.
     *
     * Trigger the right Player Event.
     *
     * @param {string} newState
     */
    _priv_setPlayerState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            log.info("API: playerStateChange event", newState);
            this.trigger("playerStateChange", newState);
        }
    }
    /**
     * Triggered each time a playback observation.
     *
     * Trigger the right Player Event
     *
     * @param {Object} contentInfos
     * @param {Object} observation
     */
    _priv_triggerPositionUpdate(contentInfos, observation) {
        var _a, _b;
        if (contentInfos.contentId !== ((_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.contentId)) {
            return; // Event for another content
        }
        const { isDirectFile, manifest } = contentInfos;
        if ((!isDirectFile && manifest === null) || isNullOrUndefined(observation)) {
            return;
        }
        const maximumPosition = manifest !== null ? getMaximumSafePosition(manifest) : undefined;
        const positionData = {
            position: observation.position.getPolled(),
            duration: observation.duration,
            playbackRate: observation.playbackRate,
            maximumPosition,
            // TODO bufferGap may be undefined
            bufferGap: observation.bufferGap === undefined || !isFinite(observation.bufferGap)
                ? 0
                : observation.bufferGap,
        };
        if (manifest !== null && manifest.isLive && observation.position.getPolled() > 0) {
            const ast = (_b = manifest.availabilityStartTime) !== null && _b !== void 0 ? _b : 0;
            positionData.wallClockTime = observation.position.getPolled() + ast;
            const livePosition = getLivePosition(manifest);
            if (livePosition !== undefined) {
                positionData.liveGap = livePosition - observation.position.getPolled();
            }
        }
        else if (isDirectFile && this.videoElement !== null) {
            const startDate = getStartDate(this.videoElement);
            if (startDate !== undefined) {
                positionData.wallClockTime = startDate + observation.position.getPolled();
            }
        }
        this.trigger("positionUpdate", positionData);
    }
    /**
     * @param {string} evt
     * @param {*} arg
     * @param {Object} currentContentCancelSignal
     */
    _priv_triggerEventIfNotStopped(evt, arg, currentContentCancelSignal) {
        if (!currentContentCancelSignal.isCancelled()) {
            this.trigger(evt, arg);
        }
    }
    /**
     * @param {Object} cancelSignal
     * @returns {Object}
     */
    _priv_initializeMediaElementTracksStore(cancelSignal) {
        var _a, _b, _c;
        assert(features.directfile !== null, "Initializing `MediaElementTracksStore` without Directfile feature");
        assert(this.videoElement !== null, "Initializing `MediaElementTracksStore` on a disposed RxPlayer");
        const mediaElementTracksStore = new features.directfile.mediaElementTracksStore(this.videoElement);
        this._priv_triggerEventIfNotStopped("availableAudioTracksChange", mediaElementTracksStore.getAvailableAudioTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableVideoTracksChange", mediaElementTracksStore.getAvailableVideoTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("availableTextTracksChange", mediaElementTracksStore.getAvailableTextTracks(), cancelSignal);
        this._priv_triggerEventIfNotStopped("audioTrackChange", (_a = mediaElementTracksStore.getChosenAudioTrack()) !== null && _a !== void 0 ? _a : null, cancelSignal);
        this._priv_triggerEventIfNotStopped("textTrackChange", (_b = mediaElementTracksStore.getChosenTextTrack()) !== null && _b !== void 0 ? _b : null, cancelSignal);
        this._priv_triggerEventIfNotStopped("videoTrackChange", (_c = mediaElementTracksStore.getChosenVideoTrack()) !== null && _c !== void 0 ? _c : null, cancelSignal);
        mediaElementTracksStore.addEventListener("availableVideoTracksChange", (val) => this.trigger("availableVideoTracksChange", val));
        mediaElementTracksStore.addEventListener("availableAudioTracksChange", (val) => this.trigger("availableAudioTracksChange", val));
        mediaElementTracksStore.addEventListener("availableTextTracksChange", (val) => this.trigger("availableTextTracksChange", val));
        mediaElementTracksStore.addEventListener("audioTrackChange", (val) => this.trigger("audioTrackChange", val));
        mediaElementTracksStore.addEventListener("videoTrackChange", (val) => this.trigger("videoTrackChange", val));
        mediaElementTracksStore.addEventListener("textTrackChange", (val) => this.trigger("textTrackChange", val));
        return mediaElementTracksStore;
    }
    _priv_callTracksStoreGetterSetter(periodId, defaultValue, cb) {
        var _a, _b;
        if (this._priv_contentInfos === null ||
            this._priv_contentInfos.tracksStore === null) {
            log.warn("API: Trying to call track API too soon");
            return defaultValue;
        }
        const { tracksStore } = this._priv_contentInfos;
        const currentPeriod = (_b = (_a = this._priv_contentInfos) === null || _a === void 0 ? void 0 : _a.currentPeriod) !== null && _b !== void 0 ? _b : undefined;
        const wantedPeriodId = periodId !== null && periodId !== void 0 ? periodId : currentPeriod === null || currentPeriod === void 0 ? void 0 : currentPeriod.id;
        if (wantedPeriodId === undefined) {
            return defaultValue;
        }
        const periodRef = wantedPeriodId === (currentPeriod === null || currentPeriod === void 0 ? void 0 : currentPeriod.id)
            ? tracksStore.getPeriodObjectFromPeriod(currentPeriod)
            : tracksStore.getPeriodObjectFromId(wantedPeriodId);
        if (periodRef === undefined) {
            return defaultValue;
        }
        return cb(tracksStore, periodRef);
    }
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
    _priv_onAvailableTracksMayHaveChanged(trackType, oPeriodRef) {
        const contentInfos = this._priv_contentInfos;
        if (contentInfos === null) {
            return;
        }
        const { currentPeriod, tracksStore, currentContentCanceller } = contentInfos;
        const cancelSignal = currentContentCanceller.signal;
        if (isNullOrUndefined(currentPeriod) || tracksStore === null) {
            return;
        }
        const periodRef = oPeriodRef !== null && oPeriodRef !== void 0 ? oPeriodRef : tracksStore.getPeriodObjectFromPeriod(currentPeriod);
        if (periodRef === undefined) {
            return;
        }
        switch (trackType) {
            case "video":
                const videoTracks = tracksStore.getAvailableVideoTracks(periodRef);
                this._priv_triggerEventIfNotStopped("availableVideoTracksChange", videoTracks !== null && videoTracks !== void 0 ? videoTracks : [], cancelSignal);
                break;
            case "audio":
                const audioTracks = tracksStore.getAvailableAudioTracks(periodRef);
                this._priv_triggerEventIfNotStopped("availableAudioTracksChange", audioTracks !== null && audioTracks !== void 0 ? audioTracks : [], cancelSignal);
                break;
            case "text":
                const textTracks = tracksStore.getAvailableTextTracks(periodRef);
                this._priv_triggerEventIfNotStopped("availableTextTracksChange", textTracks !== null && textTracks !== void 0 ? textTracks : [], cancelSignal);
                break;
            default:
                assertUnreachable(trackType);
        }
    }
    /**
     * Method to call when a fatal error lead to the stopping of the current
     * content.
     *
     * @param {*} err - The error encountered.
     * @param {Object} contentInfos - The `IPublicApiContentInfos` object linked
     * to the content for which the error was received.
     */
    _priv_onFatalError(err, contentInfos) {
        const formattedError = formatError(err, {
            defaultCode: "NONE",
            defaultReason: "An unknown error stopped content playback.",
        });
        formattedError.fatal = true;
        contentInfos.currentContentCanceller.cancel();
        this._priv_cleanUpCurrentContentState();
        this._priv_currentError = formattedError;
        log.error("API: The player stopped because of an error", formattedError);
        this._priv_setPlayerState("STOPPED" /* PLAYER_STATES.STOPPED */);
        // TODO This condition is here because the eventual callback called when the
        // player state is updated can launch a new content, thus the error will not
        // be here anymore, in which case triggering the "error" event is unwanted.
        // This is very ugly though, and we should probable have a better solution
        if (this._priv_currentError === formattedError) {
            this.trigger("error", formattedError);
        }
    }
}
/**
 * Store all video elements currently in use by an RxPlayer instance.
 * This is used to check that a video element is not shared between multiple instances.
 * Use of a WeakSet ensure the object is garbage collected if it's not used anymore.
 */
Player._priv_currentlyUsedVideoElements = new WeakSet();
Player.version = /* PLAYER_VERSION */ "4.1.0";
export default Player;
