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
import mayMediaElementFailOnUndecipherableData from "../../compat/may_media_element_fail_on_undecipherable_data";
import shouldReloadMediaSourceOnDecipherabilityUpdate from "../../compat/should_reload_media_source_on_decipherability_update";
import config from "../../config";
import AdaptiveRepresentationSelector from "../../core/adaptive";
import { ManifestFetcher, SegmentFetcherCreator } from "../../core/fetchers";
import createContentTimeBoundariesObserver from "../../core/main/common/create_content_time_boundaries_observer";
import DecipherabilityFreezeDetector from "../../core/main/common/DecipherabilityFreezeDetector";
import SegmentSinksStore from "../../core/segment_sinks";
import StreamOrchestrator from "../../core/stream";
import { MediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import assert from "../../utils/assert";
import createCancellablePromise from "../../utils/create_cancellable_promise";
import noop from "../../utils/noop";
import objectAssign from "../../utils/object_assign";
import SharedReference from "../../utils/reference";
import SyncOrAsync from "../../utils/sync_or_async";
import TaskCanceller from "../../utils/task_canceller";
import { getKeySystemConfiguration } from "../decrypt";
import { ContentInitializer } from "./types";
import createCorePlaybackObserver from "./utils/create_core_playback_observer";
import createMediaSource from "./utils/create_media_source";
import getInitialTime from "./utils/get_initial_time";
import getLoadedReference from "./utils/get_loaded_reference";
import performInitialSeekAndPlay from "./utils/initial_seek_and_play";
import initializeContentDecryption from "./utils/initialize_content_decryption";
import MainThreadTextDisplayerInterface from "./utils/main_thread_text_displayer_interface";
import RebufferingController from "./utils/rebuffering_controller";
import StreamEventsEmitter from "./utils/stream_events_emitter";
import listenToMediaError from "./utils/throw_on_media_error";
/**
 * Allows to load a new content thanks to the MediaSource Extensions (a.k.a. MSE)
 * Web APIs.
 *
 * Through this `ContentInitializer`, a Manifest will be fetched (and depending
 * on the situation, refreshed), a `MediaSource` instance will be linked to the
 * wanted `HTMLMediaElement` and chunks of media data, called segments, will be
 * pushed on buffers associated to this `MediaSource` instance.
 *
 * @class MediaSourceContentInitializer
 */
export default class MediaSourceContentInitializer extends ContentInitializer {
    /**
     * Create a new `MediaSourceContentInitializer`, associated to the given
     * settings.
     * @param {Object} settings
     */
    constructor(settings) {
        super();
        this._settings = settings;
        this._initCanceller = new TaskCanceller();
        this._manifest = null;
        const urls = settings.url === undefined ? undefined : [settings.url];
        this._manifestFetcher = new ManifestFetcher(urls, settings.transport, settings.manifestRequestSettings);
    }
    /**
     * Perform non-destructive preparation steps, to prepare a future content.
     * For now, this mainly mean loading the Manifest document.
     */
    prepare() {
        if (this._manifest !== null) {
            return;
        }
        this._manifest = SyncOrAsync.createAsync(createCancellablePromise(this._initCanceller.signal, (res, rej) => {
            this._manifestFetcher.addEventListener("warning", (err) => this.trigger("warning", err));
            this._manifestFetcher.addEventListener("error", (err) => {
                this.trigger("error", err);
                rej(err);
            });
            this._manifestFetcher.addEventListener("manifestReady", (manifest) => {
                res(manifest);
            });
        }));
        this._manifestFetcher.start();
        this._initCanceller.signal.register(() => {
            this._manifestFetcher.dispose();
        });
    }
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    start(mediaElement, playbackObserver) {
        this.prepare(); // Load Manifest if not already done
        /** Translate errors coming from the media element into RxPlayer errors. */
        listenToMediaError(mediaElement, (error) => this._onFatalError(error), this._initCanceller.signal);
        /** Send content protection initialization data to the decryption logic. */
        const protectionRef = new SharedReference(null, this._initCanceller.signal);
        this._initializeMediaSourceAndDecryption(mediaElement, protectionRef)
            .then((initResult) => this._onInitialMediaSourceReady(mediaElement, initResult.mediaSource, playbackObserver, initResult.drmSystemId, protectionRef, initResult.unlinkMediaSource))
            .catch((err) => {
            this._onFatalError(err);
        });
    }
    /**
     * Update URL of the Manifest.
     * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
     * the most prioritized URL to the least prioritized URL.
     * @param {boolean} refreshNow - If `true` the resource in question (e.g.
     * DASH's MPD) will be refreshed immediately.
     */
    updateContentUrls(urls, refreshNow) {
        this._manifestFetcher.updateContentUrls(urls, refreshNow);
    }
    dispose() {
        this._initCanceller.cancel();
    }
    _onFatalError(err) {
        if (this._initCanceller.isUsed()) {
            return;
        }
        this._initCanceller.cancel();
        this.trigger("error", err);
    }
    _initializeMediaSourceAndDecryption(mediaElement, protectionRef) {
        const initCanceller = this._initCanceller;
        return createCancellablePromise(initCanceller.signal, (resolve) => {
            const { keySystems } = this._settings;
            /** Initialize decryption capabilities. */
            const drmInitRef = initializeContentDecryption(mediaElement, keySystems, protectionRef, {
                onWarning: (err) => this.trigger("warning", err),
                onError: (err) => this._onFatalError(err),
                onBlackListProtectionData: (val) => {
                    // Ugly IIFE workaround to allow async event listener
                    (async () => {
                        var _a;
                        if (this._manifest === null) {
                            return;
                        }
                        const manifest = (_a = this._manifest.syncValue) !== null && _a !== void 0 ? _a : (await this._manifest.getValueAsAsync());
                        blackListProtectionDataOnManifest(manifest, val);
                    })().catch(noop);
                },
                onKeyIdsCompatibilityUpdate: (updates) => {
                    // Ugly IIFE workaround to allow async event listener
                    (async () => {
                        var _a;
                        if (this._manifest === null) {
                            return;
                        }
                        const manifest = (_a = this._manifest.syncValue) !== null && _a !== void 0 ? _a : (await this._manifest.getValueAsAsync());
                        updateKeyIdsDecipherabilityOnManifest(manifest, updates.whitelistedKeyIds, updates.blacklistedKeyIds, updates.delistedKeyIds);
                    })().catch(noop);
                },
            }, initCanceller.signal);
            drmInitRef.onUpdate((drmStatus, stopListeningToDrmUpdates) => {
                if (drmStatus.initializationState.type === "uninitialized") {
                    return;
                }
                stopListeningToDrmUpdates();
                const mediaSourceCanceller = new TaskCanceller();
                mediaSourceCanceller.linkToSignal(initCanceller.signal);
                createMediaSource(mediaElement, mediaSourceCanceller.signal)
                    .then((mediaSource) => {
                    const lastDrmStatus = drmInitRef.getValue();
                    if (lastDrmStatus.initializationState.type === "awaiting-media-link") {
                        lastDrmStatus.initializationState.value.isMediaLinked.setValue(true);
                        drmInitRef.onUpdate((newDrmStatus, stopListeningToDrmUpdatesAgain) => {
                            if (newDrmStatus.initializationState.type === "initialized") {
                                stopListeningToDrmUpdatesAgain();
                                resolve({
                                    mediaSource,
                                    drmSystemId: newDrmStatus.drmSystemId,
                                    unlinkMediaSource: mediaSourceCanceller,
                                });
                                return;
                            }
                        }, { emitCurrentValue: true, clearSignal: initCanceller.signal });
                    }
                    else if (drmStatus.initializationState.type === "initialized") {
                        resolve({
                            mediaSource,
                            drmSystemId: drmStatus.drmSystemId,
                            unlinkMediaSource: mediaSourceCanceller,
                        });
                        return;
                    }
                })
                    .catch((err) => {
                    if (mediaSourceCanceller.isUsed()) {
                        return;
                    }
                    this._onFatalError(err);
                });
            }, { emitCurrentValue: true, clearSignal: initCanceller.signal });
        });
    }
    async _onInitialMediaSourceReady(mediaElement, initialMediaSource, playbackObserver, drmSystemId, protectionRef, initialMediaSourceCanceller) {
        var _a;
        const { adaptiveOptions, autoPlay, bufferOptions, lowLatencyMode, segmentRequestOptions, speed, startAt, textTrackOptions, transport, } = this._settings;
        const initCanceller = this._initCanceller;
        assert(this._manifest !== null);
        let manifest;
        try {
            manifest = (_a = this._manifest.syncValue) !== null && _a !== void 0 ? _a : (await this._manifest.getValueAsAsync());
        }
        catch (_e) {
            return; // The error should already have been processed through an event listener
        }
        manifest.addEventListener("manifestUpdate", (updates) => {
            this.trigger("manifestUpdate", updates);
        }, initCanceller.signal);
        manifest.addEventListener("decipherabilityUpdate", (elts) => {
            this.trigger("decipherabilityUpdate", elts);
        }, initCanceller.signal);
        log.debug("Init: Calculating initial time");
        const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
        log.debug("Init: Initial time calculated:", initialTime);
        /** Choose the right "Representation" for a given "Adaptation". */
        const representationEstimator = AdaptiveRepresentationSelector(adaptiveOptions);
        const subBufferOptions = objectAssign({ textTrackOptions, drmSystemId }, bufferOptions);
        const segmentFetcherCreator = new SegmentFetcherCreator(transport, segmentRequestOptions, initCanceller.signal);
        this.trigger("manifestReady", manifest);
        if (initCanceller.isUsed()) {
            return;
        }
        const bufferOnMediaSource = this._startBufferingOnMediaSource.bind(this);
        const triggerEvent = this.trigger.bind(this);
        const onFatalError = this._onFatalError.bind(this);
        // handle initial load and reloads
        recursivelyLoadOnMediaSource(initialMediaSource, initialTime, autoPlay, initialMediaSourceCanceller);
        /**
         * Load the content defined by the Manifest in the mediaSource given at the
         * given position and playing status.
         * This function recursively re-call itself when a MediaSource reload is
         * wanted.
         * @param {MediaSource} mediaSource
         * @param {number} startingPos
         * @param {Object} currentCanceller
         * @param {boolean} shouldPlay
         */
        function recursivelyLoadOnMediaSource(mediaSource, startingPos, shouldPlay, currentCanceller) {
            const opts = {
                mediaElement,
                playbackObserver,
                mediaSource,
                initialTime: startingPos,
                autoPlay: shouldPlay,
                manifest,
                representationEstimator,
                segmentFetcherCreator,
                speed,
                protectionRef,
                bufferOptions: subBufferOptions,
            };
            bufferOnMediaSource(opts, onReloadMediaSource, currentCanceller.signal);
            function onReloadMediaSource(reloadOrder) {
                currentCanceller.cancel();
                if (initCanceller.isUsed()) {
                    return;
                }
                triggerEvent("reloadingMediaSource", reloadOrder);
                if (initCanceller.isUsed()) {
                    return;
                }
                const newCanceller = new TaskCanceller();
                newCanceller.linkToSignal(initCanceller.signal);
                createMediaSource(mediaElement, newCanceller.signal)
                    .then((newMediaSource) => {
                    recursivelyLoadOnMediaSource(newMediaSource, reloadOrder.position, reloadOrder.autoPlay, newCanceller);
                })
                    .catch((err) => {
                    if (newCanceller.isUsed()) {
                        return;
                    }
                    onFatalError(err);
                });
            }
        }
    }
    /**
     * Buffer the content on the given MediaSource.
     * @param {Object} args
     * @param {function} onReloadOrder
     * @param {Object} cancelSignal
     */
    _startBufferingOnMediaSource(args, onReloadOrder, cancelSignal) {
        var _a;
        const { autoPlay, bufferOptions, initialTime, manifest, mediaElement, mediaSource, playbackObserver, protectionRef, representationEstimator, segmentFetcherCreator, speed, } = args;
        const initialPeriod = (_a = manifest.getPeriodForTime(initialTime)) !== null && _a !== void 0 ? _a : manifest.getNextPeriod(initialTime);
        if (initialPeriod === undefined) {
            const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", "Wanted starting time not found in the Manifest.");
            return this._onFatalError(error);
        }
        let textDisplayerInterface = null;
        let textDisplayer = null;
        if (this._settings.textTrackOptions.textTrackMode === "html" &&
            features.htmlTextDisplayer !== null) {
            textDisplayer = new features.htmlTextDisplayer(mediaElement, this._settings.textTrackOptions.textTrackElement);
        }
        else if (features.nativeTextDisplayer !== null) {
            textDisplayer = new features.nativeTextDisplayer(mediaElement);
        }
        if (textDisplayer !== null) {
            const sender = new MainThreadTextDisplayerInterface(textDisplayer);
            textDisplayerInterface = sender;
            cancelSignal.register(() => {
                sender.stop();
                textDisplayer === null || textDisplayer === void 0 ? void 0 : textDisplayer.stop();
            });
        }
        /** Interface to create media buffers. */
        const segmentSinksStore = new SegmentSinksStore(mediaSource, mediaElement.nodeName === "VIDEO", textDisplayerInterface);
        cancelSignal.register(() => {
            segmentSinksStore.disposeAll();
        });
        const { autoPlayResult, initialPlayPerformed } = performInitialSeekAndPlay({
            mediaElement,
            playbackObserver,
            startTime: initialTime,
            mustAutoPlay: autoPlay,
            onWarning: (err) => {
                this.trigger("warning", err);
            },
            isDirectfile: false,
        }, cancelSignal);
        if (cancelSignal.isCancelled()) {
            return;
        }
        initialPlayPerformed.onUpdate((isPerformed, stopListening) => {
            if (isPerformed) {
                stopListening();
                const streamEventsEmitter = new StreamEventsEmitter(manifest, mediaElement, playbackObserver);
                manifest.addEventListener("manifestUpdate", () => {
                    streamEventsEmitter.onManifestUpdate(manifest);
                }, cancelSignal);
                streamEventsEmitter.addEventListener("event", (payload) => {
                    this.trigger("streamEvent", payload);
                }, cancelSignal);
                streamEventsEmitter.addEventListener("eventSkip", (payload) => {
                    this.trigger("streamEventSkip", payload);
                }, cancelSignal);
                streamEventsEmitter.start();
                cancelSignal.register(() => {
                    streamEventsEmitter.stop();
                });
            }
        }, { clearSignal: cancelSignal, emitCurrentValue: true });
        const coreObserver = createCorePlaybackObserver(playbackObserver, {
            autoPlay,
            manifest,
            mediaSource,
            textDisplayer,
            initialPlayPerformed,
            speed,
        }, cancelSignal);
        const rebufferingController = this._createRebufferingController(playbackObserver, manifest, speed, cancelSignal);
        const decipherabilityFreezeDetector = new DecipherabilityFreezeDetector(segmentSinksStore);
        if (mayMediaElementFailOnUndecipherableData) {
            // On some devices, just reload immediately when data become undecipherable
            manifest.addEventListener("decipherabilityUpdate", (elts) => {
                if (elts.some((e) => e.representation.decipherable !== true)) {
                    reloadMediaSource(0, undefined, undefined);
                }
            }, cancelSignal);
        }
        playbackObserver.listen((observation) => {
            if (decipherabilityFreezeDetector.needToReload(observation)) {
                let position;
                const lastObservation = playbackObserver.getReference().getValue();
                if (lastObservation.position.isAwaitingFuturePosition()) {
                    position = lastObservation.position.getWanted();
                }
                else {
                    position = playbackObserver.getCurrentTime();
                }
                const autoplay = initialPlayPerformed.getValue()
                    ? !playbackObserver.getIsPaused()
                    : autoPlay;
                onReloadOrder({ position, autoPlay: autoplay });
            }
        }, { clearSignal: cancelSignal });
        // Synchronize SegmentSinks with what has been buffered.
        coreObserver.listen((observation) => {
            ["video", "audio", "text"].forEach((tType) => {
                var _a;
                const segmentSinkStatus = segmentSinksStore.getStatus(tType);
                if (segmentSinkStatus.type === "initialized") {
                    segmentSinkStatus.value.synchronizeInventory((_a = observation.buffered[tType]) !== null && _a !== void 0 ? _a : []);
                }
            });
        }, { clearSignal: cancelSignal });
        const contentTimeBoundariesObserver = createContentTimeBoundariesObserver(manifest, mediaSource, coreObserver, segmentSinksStore, {
            onWarning: (err) => this.trigger("warning", err),
            onPeriodChanged: (period) => this.trigger("activePeriodChanged", { period }),
        }, cancelSignal);
        /**
         * Emit a "loaded" events once the initial play has been performed and the
         * media can begin playback.
         * Also emits warning events if issues arise when doing so.
         */
        autoPlayResult
            .then(() => {
            getLoadedReference(playbackObserver, mediaElement, false, cancelSignal).onUpdate((isLoaded, stopListening) => {
                if (isLoaded) {
                    stopListening();
                    this.trigger("loaded", { segmentSinksStore });
                }
            }, { emitCurrentValue: true, clearSignal: cancelSignal });
        })
            .catch((err) => {
            if (cancelSignal.isCancelled()) {
                return; // Current loading cancelled, no need to trigger the error
            }
            this._onFatalError(err);
        });
        /* eslint-disable-next-line @typescript-eslint/no-this-alias */
        const self = this;
        StreamOrchestrator({ manifest, initialPeriod }, coreObserver, representationEstimator, segmentSinksStore, segmentFetcherCreator, bufferOptions, handleStreamOrchestratorCallbacks(), cancelSignal);
        /**
         * Returns Object handling the callbacks from a `StreamOrchestrator`, which
         * are basically how it communicates about events.
         * @returns {Object}
         */
        function handleStreamOrchestratorCallbacks() {
            return {
                needsBufferFlush: (payload) => {
                    var _a;
                    let wantedSeekingTime;
                    const currentTime = playbackObserver.getCurrentTime();
                    const relativeResumingPosition = (_a = payload === null || payload === void 0 ? void 0 : payload.relativeResumingPosition) !== null && _a !== void 0 ? _a : 0;
                    const canBeApproximateSeek = Boolean(payload === null || payload === void 0 ? void 0 : payload.relativePosHasBeenDefaulted);
                    if (relativeResumingPosition === 0 && canBeApproximateSeek) {
                        // in case relativeResumingPosition is 0, we still perform
                        // a tiny seek to be sure that the browser will correclty reload the video.
                        wantedSeekingTime = currentTime + 0.001;
                    }
                    else {
                        wantedSeekingTime = currentTime + relativeResumingPosition;
                    }
                    playbackObserver.setCurrentTime(wantedSeekingTime);
                    // Seek again once data begins to be buffered.
                    // This is sadly necessary on some browsers to avoid decoding
                    // issues after a flush.
                    //
                    // NOTE: there's in theory a potential race condition in the following
                    // logic as the callback could be called when media data is still
                    // being removed by the browser - which is an asynchronous process.
                    // The following condition checking for buffered data could thus lead
                    // to a false positive where we're actually checking previous data.
                    // For now, such scenario is avoided by setting the
                    // `includeLastObservation` option to `false` and calling
                    // `needsBufferFlush` once MSE media removal operations have been
                    // explicitely validated by the browser, but that's a complex and easy
                    // to break system.
                    playbackObserver.listen((obs, stopListening) => {
                        if (
                        // Data is buffered around the current position
                        obs.currentRange !== null ||
                            // Or, for whatever reason, we have no buffer but we're already advancing
                            obs.position.getPolled() > wantedSeekingTime + 0.1) {
                            stopListening();
                            playbackObserver.setCurrentTime(obs.position.getWanted() + 0.001);
                        }
                    }, { includeLastObservation: false, clearSignal: cancelSignal });
                },
                streamStatusUpdate(value) {
                    // Announce discontinuities if found
                    const { period, bufferType, imminentDiscontinuity, position } = value;
                    rebufferingController.updateDiscontinuityInfo({
                        period,
                        bufferType,
                        discontinuity: imminentDiscontinuity,
                        position,
                    });
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    // If the status for the last Period indicates that segments are all loaded
                    // or on the contrary that the loading resumed, announce it to the
                    // ContentTimeBoundariesObserver.
                    if (manifest.isLastPeriodKnown &&
                        value.period.id === manifest.periods[manifest.periods.length - 1].id) {
                        const hasFinishedLoadingLastPeriod = value.hasFinishedLoading || value.isEmptyStream;
                        if (hasFinishedLoadingLastPeriod) {
                            contentTimeBoundariesObserver.onLastSegmentFinishedLoading(value.bufferType);
                        }
                        else {
                            contentTimeBoundariesObserver.onLastSegmentLoadingResume(value.bufferType);
                        }
                    }
                },
                needsManifestRefresh: () => self._manifestFetcher.scheduleManualRefresh({
                    enablePartialRefresh: true,
                    canUseUnsafeMode: true,
                }),
                manifestMightBeOufOfSync: () => {
                    const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config.getCurrent();
                    self._manifestFetcher.scheduleManualRefresh({
                        enablePartialRefresh: false,
                        canUseUnsafeMode: false,
                        delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                    });
                },
                lockedStream: (value) => rebufferingController.onLockedStream(value.bufferType, value.period),
                adaptationChange: (value) => {
                    self.trigger("adaptationChange", value);
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    contentTimeBoundariesObserver.onAdaptationChange(value.type, value.period, value.adaptation);
                },
                representationChange: (value) => {
                    self.trigger("representationChange", value);
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
                },
                inbandEvent: (value) => self.trigger("inbandEvents", value),
                warning: (value) => self.trigger("warning", value),
                periodStreamReady: (value) => self.trigger("periodStreamReady", value),
                periodStreamCleared: (value) => {
                    contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    self.trigger("periodStreamCleared", value);
                },
                bitrateEstimateChange: (value) => self.trigger("bitrateEstimateChange", value),
                needsMediaSourceReload: (payload) => {
                    reloadMediaSource(payload.timeOffset, payload.minimumPosition, payload.maximumPosition);
                },
                needsDecipherabilityFlush() {
                    var _a, _b, _c, _d;
                    const keySystem = getKeySystemConfiguration(mediaElement);
                    if (shouldReloadMediaSourceOnDecipherabilityUpdate(keySystem === null || keySystem === void 0 ? void 0 : keySystem[0])) {
                        const lastObservation = coreObserver.getReference().getValue();
                        const position = lastObservation.position.isAwaitingFuturePosition()
                            ? lastObservation.position.getWanted()
                            : (_a = coreObserver.getCurrentTime()) !== null && _a !== void 0 ? _a : lastObservation.position.getPolled();
                        const isPaused = (_c = (_b = lastObservation.paused.pending) !== null && _b !== void 0 ? _b : coreObserver.getIsPaused()) !== null && _c !== void 0 ? _c : lastObservation.paused.last;
                        onReloadOrder({ position, autoPlay: !isPaused });
                    }
                    else {
                        const lastObservation = coreObserver.getReference().getValue();
                        const position = lastObservation.position.isAwaitingFuturePosition()
                            ? lastObservation.position.getWanted()
                            : (_d = coreObserver.getCurrentTime()) !== null && _d !== void 0 ? _d : lastObservation.position.getPolled();
                        // simple seek close to the current position
                        // to flush the buffers
                        if (position + 0.001 < lastObservation.duration) {
                            playbackObserver.setCurrentTime(mediaElement.currentTime + 0.001);
                        }
                        else {
                            playbackObserver.setCurrentTime(position);
                        }
                    }
                },
                encryptionDataEncountered: (value) => {
                    for (const protectionData of value) {
                        protectionRef.setValue(protectionData);
                        if (cancelSignal.isCancelled()) {
                            return; // Previous call has stopped streams due to a side-effect
                        }
                    }
                },
                error: (err) => self._onFatalError(err),
            };
        }
        /**
         * Callback allowing to reload the current content.
         * @param {number} deltaPosition - Position you want to seek to after
         * reloading, as a delta in seconds from the last polled playing position.
         * @param {number|undefined} minimumPosition - If set, minimum time bound
         * in seconds after `deltaPosition` has been applied.
         * @param {number|undefined} maximumPosition - If set, minimum time bound
         * in seconds after `deltaPosition` has been applied.
         */
        function reloadMediaSource(deltaPosition, minimumPosition, maximumPosition) {
            var _a, _b, _c;
            const lastObservation = coreObserver.getReference().getValue();
            const currentPosition = lastObservation.position.isAwaitingFuturePosition()
                ? lastObservation.position.getWanted()
                : (_a = coreObserver.getCurrentTime()) !== null && _a !== void 0 ? _a : lastObservation.position.getPolled();
            const isPaused = (_c = (_b = lastObservation.paused.pending) !== null && _b !== void 0 ? _b : coreObserver.getIsPaused()) !== null && _c !== void 0 ? _c : lastObservation.paused.last;
            let position = currentPosition + deltaPosition;
            if (minimumPosition !== undefined) {
                position = Math.max(minimumPosition, position);
            }
            if (maximumPosition !== undefined) {
                position = Math.min(maximumPosition, position);
            }
            onReloadOrder({ position, autoPlay: !isPaused });
        }
    }
    /**
     * Creates a `RebufferingController`, a class trying to avoid various stalling
     * situations (such as rebuffering periods), and returns it.
     *
     * Various methods from that class need then to be called at various events
     * (see `RebufferingController` definition).
     *
     * This function also handles the `RebufferingController`'s events:
     *   - emit "stalled" events when stalling situations cannot be prevented,
     *   - emit "unstalled" events when we could get out of one,
     *   - emit "warning" on various rebuffering-related minor issues
     *     like discontinuity skipping.
     * @param {Object} playbackObserver
     * @param {Object} manifest
     * @param {Object} speed
     * @param {Object} cancelSignal
     * @returns {Object}
     */
    _createRebufferingController(playbackObserver, manifest, speed, cancelSignal) {
        const rebufferingController = new RebufferingController(playbackObserver, manifest, speed);
        // Bubble-up events
        rebufferingController.addEventListener("stalled", (evt) => this.trigger("stalled", evt));
        rebufferingController.addEventListener("unstalled", () => this.trigger("unstalled", null));
        rebufferingController.addEventListener("warning", (err) => this.trigger("warning", err));
        cancelSignal.register(() => rebufferingController.destroy());
        rebufferingController.start();
        return rebufferingController;
    }
}
/**
 * Change the decipherability of Representations which have their key id in one
 * of the given Arrays:
 *
 *   - Those who have a key id listed in `whitelistedKeyIds` will have their
 *     decipherability updated to `true`
 *
 *   - Those who have a key id listed in `blacklistedKeyIds` will have their
 *     decipherability updated to `false`
 *
 *   - Those who have a key id listed in `delistedKeyIds` will have their
 *     decipherability updated to `undefined`.
 *
 * @param {Object} manifest
 * @param {Array.<Uint8Array>} whitelistedKeyIds
 * @param {Array.<Uint8Array>} blacklistedKeyIds
 * @param {Array.<Uint8Array>} delistedKeyIds
 */
function updateKeyIdsDecipherabilityOnManifest(manifest, whitelistedKeyIds, blacklistedKeyIds, delistedKeyIds) {
    manifest.updateRepresentationsDeciperability((ctx) => {
        const { representation } = ctx;
        if (representation.contentProtections === undefined) {
            return representation.decipherable;
        }
        const contentKIDs = representation.contentProtections.keyIds;
        if (contentKIDs !== undefined) {
            for (const elt of contentKIDs) {
                for (const blacklistedKeyId of blacklistedKeyIds) {
                    if (areArraysOfNumbersEqual(blacklistedKeyId, elt.keyId)) {
                        return false;
                    }
                }
                for (const whitelistedKeyId of whitelistedKeyIds) {
                    if (areArraysOfNumbersEqual(whitelistedKeyId, elt.keyId)) {
                        return true;
                    }
                }
                for (const delistedKeyId of delistedKeyIds) {
                    if (areArraysOfNumbersEqual(delistedKeyId, elt.keyId)) {
                        return undefined;
                    }
                }
            }
        }
        return representation.decipherable;
    });
}
/**
 * Update decipherability to `false` to any Representation which is linked to
 * the given initialization data.
 * @param {Object} manifest
 * @param {Object} initData
 */
function blackListProtectionDataOnManifest(manifest, initData) {
    manifest.updateRepresentationsDeciperability((ctx) => {
        var _a, _b;
        const rep = ctx.representation;
        if (rep.decipherable === false) {
            return false;
        }
        const segmentProtections = (_b = (_a = rep.contentProtections) === null || _a === void 0 ? void 0 : _a.initData) !== null && _b !== void 0 ? _b : [];
        for (const protection of segmentProtections) {
            if (initData.type === undefined || protection.type === initData.type) {
                const containedInitData = initData.values
                    .getFormattedValues()
                    .every((undecipherableVal) => {
                    return protection.values.some((currVal) => {
                        return ((undecipherableVal.systemId === undefined ||
                            currVal.systemId === undecipherableVal.systemId) &&
                            areArraysOfNumbersEqual(currVal.data, undecipherableVal.data));
                    });
                });
                if (containedInitData) {
                    return false;
                }
            }
        }
        return rep.decipherable;
    });
}
