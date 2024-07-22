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
var may_media_element_fail_on_undecipherable_data_1 = require("../../compat/may_media_element_fail_on_undecipherable_data");
var should_reload_media_source_on_decipherability_update_1 = require("../../compat/should_reload_media_source_on_decipherability_update");
var config_1 = require("../../config");
var adaptive_1 = require("../../core/adaptive");
var cmcd_1 = require("../../core/cmcd");
var fetchers_1 = require("../../core/fetchers");
var create_content_time_boundaries_observer_1 = require("../../core/main/common/create_content_time_boundaries_observer");
var DecipherabilityFreezeDetector_1 = require("../../core/main/common/DecipherabilityFreezeDetector");
var segment_sinks_1 = require("../../core/segment_sinks");
var stream_1 = require("../../core/stream");
var errors_1 = require("../../errors");
var features_1 = require("../../features");
var log_1 = require("../../log");
var are_arrays_of_numbers_equal_1 = require("../../utils/are_arrays_of_numbers_equal");
var assert_1 = require("../../utils/assert");
var create_cancellable_promise_1 = require("../../utils/create_cancellable_promise");
var noop_1 = require("../../utils/noop");
var object_assign_1 = require("../../utils/object_assign");
var reference_1 = require("../../utils/reference");
var sync_or_async_1 = require("../../utils/sync_or_async");
var task_canceller_1 = require("../../utils/task_canceller");
var decrypt_1 = require("../decrypt");
var types_1 = require("./types");
var create_core_playback_observer_1 = require("./utils/create_core_playback_observer");
var create_media_source_1 = require("./utils/create_media_source");
var get_initial_time_1 = require("./utils/get_initial_time");
var get_loaded_reference_1 = require("./utils/get_loaded_reference");
var initial_seek_and_play_1 = require("./utils/initial_seek_and_play");
var initialize_content_decryption_1 = require("./utils/initialize_content_decryption");
var main_thread_text_displayer_interface_1 = require("./utils/main_thread_text_displayer_interface");
var rebuffering_controller_1 = require("./utils/rebuffering_controller");
var stream_events_emitter_1 = require("./utils/stream_events_emitter");
var throw_on_media_error_1 = require("./utils/throw_on_media_error");
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
var MediaSourceContentInitializer = /** @class */ (function (_super) {
    __extends(MediaSourceContentInitializer, _super);
    /**
     * Create a new `MediaSourceContentInitializer`, associated to the given
     * settings.
     * @param {Object} settings
     */
    function MediaSourceContentInitializer(settings) {
        var _this = _super.call(this) || this;
        _this._settings = settings;
        _this._initCanceller = new task_canceller_1.default();
        _this._manifest = null;
        var urls = settings.url === undefined ? undefined : [settings.url];
        _this._cmcdDataBuilder =
            settings.cmcd === undefined ? null : new cmcd_1.default(settings.cmcd);
        _this._manifestFetcher = new fetchers_1.ManifestFetcher(urls, settings.transport, __assign(__assign({}, settings.manifestRequestSettings), { lowLatencyMode: settings.lowLatencyMode, cmcdDataBuilder: _this._cmcdDataBuilder }));
        return _this;
    }
    /**
     * Perform non-destructive preparation steps, to prepare a future content.
     * For now, this mainly mean loading the Manifest document.
     */
    MediaSourceContentInitializer.prototype.prepare = function () {
        var _this = this;
        if (this._manifest !== null) {
            return;
        }
        this._manifest = sync_or_async_1.default.createAsync((0, create_cancellable_promise_1.default)(this._initCanceller.signal, function (res, rej) {
            _this._manifestFetcher.addEventListener("warning", function (err) {
                return _this.trigger("warning", err);
            });
            _this._manifestFetcher.addEventListener("error", function (err) {
                _this.trigger("error", err);
                rej(err);
            });
            _this._manifestFetcher.addEventListener("manifestReady", function (manifest) {
                res(manifest);
            });
        }));
        this._manifestFetcher.start();
        this._initCanceller.signal.register(function () {
            _this._manifestFetcher.dispose();
        });
    };
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    MediaSourceContentInitializer.prototype.start = function (mediaElement, playbackObserver) {
        var _this = this;
        this.prepare(); // Load Manifest if not already done
        /** Translate errors coming from the media element into RxPlayer errors. */
        (0, throw_on_media_error_1.default)(mediaElement, function (error) { return _this._onFatalError(error); }, this._initCanceller.signal);
        /** Send content protection initialization data to the decryption logic. */
        var protectionRef = new reference_1.default(null, this._initCanceller.signal);
        this._initializeMediaSourceAndDecryption(mediaElement, protectionRef)
            .then(function (initResult) {
            return _this._onInitialMediaSourceReady(mediaElement, initResult.mediaSource, playbackObserver, initResult.drmSystemId, protectionRef, initResult.unlinkMediaSource);
        })
            .catch(function (err) {
            _this._onFatalError(err);
        });
    };
    /**
     * Update URL of the Manifest.
     * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
     * the most prioritized URL to the least prioritized URL.
     * @param {boolean} refreshNow - If `true` the resource in question (e.g.
     * DASH's MPD) will be refreshed immediately.
     */
    MediaSourceContentInitializer.prototype.updateContentUrls = function (urls, refreshNow) {
        this._manifestFetcher.updateContentUrls(urls, refreshNow);
    };
    MediaSourceContentInitializer.prototype.dispose = function () {
        this._initCanceller.cancel();
    };
    MediaSourceContentInitializer.prototype._onFatalError = function (err) {
        if (this._initCanceller.isUsed()) {
            return;
        }
        this._initCanceller.cancel();
        this.trigger("error", err);
    };
    MediaSourceContentInitializer.prototype._initializeMediaSourceAndDecryption = function (mediaElement, protectionRef) {
        var _this = this;
        var initCanceller = this._initCanceller;
        return (0, create_cancellable_promise_1.default)(initCanceller.signal, function (resolve) {
            var keySystems = _this._settings.keySystems;
            /** Initialize decryption capabilities. */
            var drmInitRef = (0, initialize_content_decryption_1.default)(mediaElement, keySystems, protectionRef, {
                onWarning: function (err) { return _this.trigger("warning", err); },
                onError: function (err) { return _this._onFatalError(err); },
                onBlackListProtectionData: function (val) {
                    // Ugly IIFE workaround to allow async event listener
                    (function () { return __awaiter(_this, void 0, void 0, function () {
                        var manifest, _a;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    if (this._manifest === null) {
                                        return [2 /*return*/];
                                    }
                                    if (!((_b = this._manifest.syncValue) !== null && _b !== void 0)) return [3 /*break*/, 1];
                                    _a = _b;
                                    return [3 /*break*/, 3];
                                case 1: return [4 /*yield*/, this._manifest.getValueAsAsync()];
                                case 2:
                                    _a = (_c.sent());
                                    _c.label = 3;
                                case 3:
                                    manifest = _a;
                                    blackListProtectionDataOnManifest(manifest, val);
                                    return [2 /*return*/];
                            }
                        });
                    }); })().catch(noop_1.default);
                },
                onKeyIdsCompatibilityUpdate: function (updates) {
                    // Ugly IIFE workaround to allow async event listener
                    (function () { return __awaiter(_this, void 0, void 0, function () {
                        var manifest, _a;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    if (this._manifest === null) {
                                        return [2 /*return*/];
                                    }
                                    if (!((_b = this._manifest.syncValue) !== null && _b !== void 0)) return [3 /*break*/, 1];
                                    _a = _b;
                                    return [3 /*break*/, 3];
                                case 1: return [4 /*yield*/, this._manifest.getValueAsAsync()];
                                case 2:
                                    _a = (_c.sent());
                                    _c.label = 3;
                                case 3:
                                    manifest = _a;
                                    updateKeyIdsDecipherabilityOnManifest(manifest, updates.whitelistedKeyIds, updates.blacklistedKeyIds, updates.delistedKeyIds);
                                    return [2 /*return*/];
                            }
                        });
                    }); })().catch(noop_1.default);
                },
            }, initCanceller.signal);
            drmInitRef.onUpdate(function (drmStatus, stopListeningToDrmUpdates) {
                if (drmStatus.initializationState.type === "uninitialized") {
                    return;
                }
                stopListeningToDrmUpdates();
                var mediaSourceCanceller = new task_canceller_1.default();
                mediaSourceCanceller.linkToSignal(initCanceller.signal);
                (0, create_media_source_1.default)(mediaElement, mediaSourceCanceller.signal)
                    .then(function (mediaSource) {
                    var lastDrmStatus = drmInitRef.getValue();
                    if (lastDrmStatus.initializationState.type === "awaiting-media-link") {
                        lastDrmStatus.initializationState.value.isMediaLinked.setValue(true);
                        drmInitRef.onUpdate(function (newDrmStatus, stopListeningToDrmUpdatesAgain) {
                            if (newDrmStatus.initializationState.type === "initialized") {
                                stopListeningToDrmUpdatesAgain();
                                resolve({
                                    mediaSource: mediaSource,
                                    drmSystemId: newDrmStatus.drmSystemId,
                                    unlinkMediaSource: mediaSourceCanceller,
                                });
                                return;
                            }
                        }, { emitCurrentValue: true, clearSignal: initCanceller.signal });
                    }
                    else if (drmStatus.initializationState.type === "initialized") {
                        resolve({
                            mediaSource: mediaSource,
                            drmSystemId: drmStatus.drmSystemId,
                            unlinkMediaSource: mediaSourceCanceller,
                        });
                        return;
                    }
                })
                    .catch(function (err) {
                    if (mediaSourceCanceller.isUsed()) {
                        return;
                    }
                    _this._onFatalError(err);
                });
            }, { emitCurrentValue: true, clearSignal: initCanceller.signal });
        });
    };
    MediaSourceContentInitializer.prototype._onInitialMediaSourceReady = function (mediaElement, initialMediaSource, playbackObserver, drmSystemId, protectionRef, initialMediaSourceCanceller) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
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
                var opts = {
                    mediaElement: mediaElement,
                    playbackObserver: playbackObserver,
                    mediaSource: mediaSource,
                    initialTime: startingPos,
                    autoPlay: shouldPlay,
                    manifest: manifest,
                    representationEstimator: representationEstimator,
                    segmentFetcherCreator: segmentFetcherCreator,
                    speed: speed,
                    protectionRef: protectionRef,
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
                    var newCanceller = new task_canceller_1.default();
                    newCanceller.linkToSignal(initCanceller.signal);
                    (0, create_media_source_1.default)(mediaElement, newCanceller.signal)
                        .then(function (newMediaSource) {
                        recursivelyLoadOnMediaSource(newMediaSource, reloadOrder.position, reloadOrder.autoPlay, newCanceller);
                    })
                        .catch(function (err) {
                        if (newCanceller.isUsed()) {
                            return;
                        }
                        onFatalError(err);
                    });
                }
            }
            var _b, adaptiveOptions, autoPlay, bufferOptions, lowLatencyMode, segmentRequestOptions, speed, startAt, textTrackOptions, transport, initCanceller, manifest, _c, _e_1, initialTime, representationEstimator, subBufferOptions, segmentFetcherCreator, bufferOnMediaSource, triggerEvent, onFatalError;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = this._settings, adaptiveOptions = _b.adaptiveOptions, autoPlay = _b.autoPlay, bufferOptions = _b.bufferOptions, lowLatencyMode = _b.lowLatencyMode, segmentRequestOptions = _b.segmentRequestOptions, speed = _b.speed, startAt = _b.startAt, textTrackOptions = _b.textTrackOptions, transport = _b.transport;
                        initCanceller = this._initCanceller;
                        (0, assert_1.default)(this._manifest !== null);
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 5, , 6]);
                        if (!((_a = this._manifest.syncValue) !== null && _a !== void 0)) return [3 /*break*/, 2];
                        _c = _a;
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this._manifest.getValueAsAsync()];
                    case 3:
                        _c = (_d.sent());
                        _d.label = 4;
                    case 4:
                        manifest = _c;
                        return [3 /*break*/, 6];
                    case 5:
                        _e_1 = _d.sent();
                        return [2 /*return*/]; // The error should already have been processed through an event listener
                    case 6:
                        manifest.addEventListener("manifestUpdate", function (updates) {
                            _this.trigger("manifestUpdate", updates);
                        }, initCanceller.signal);
                        manifest.addEventListener("decipherabilityUpdate", function (elts) {
                            _this.trigger("decipherabilityUpdate", elts);
                        }, initCanceller.signal);
                        log_1.default.debug("Init: Calculating initial time");
                        initialTime = (0, get_initial_time_1.default)(manifest, lowLatencyMode, startAt);
                        log_1.default.debug("Init: Initial time calculated:", initialTime);
                        representationEstimator = (0, adaptive_1.default)(adaptiveOptions);
                        subBufferOptions = (0, object_assign_1.default)({ textTrackOptions: textTrackOptions, drmSystemId: drmSystemId }, bufferOptions);
                        segmentFetcherCreator = new fetchers_1.SegmentFetcherCreator(transport, this._cmcdDataBuilder, segmentRequestOptions, initCanceller.signal);
                        this.trigger("manifestReady", manifest);
                        if (initCanceller.isUsed()) {
                            return [2 /*return*/];
                        }
                        bufferOnMediaSource = this._startBufferingOnMediaSource.bind(this);
                        triggerEvent = this.trigger.bind(this);
                        onFatalError = this._onFatalError.bind(this);
                        // handle initial load and reloads
                        recursivelyLoadOnMediaSource(initialMediaSource, initialTime, autoPlay, initialMediaSourceCanceller);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Buffer the content on the given MediaSource.
     * @param {Object} args
     * @param {function} onReloadOrder
     * @param {Object} cancelSignal
     */
    MediaSourceContentInitializer.prototype._startBufferingOnMediaSource = function (args, onReloadOrder, cancelSignal) {
        var _this = this;
        var _a, _b;
        var autoPlay = args.autoPlay, bufferOptions = args.bufferOptions, initialTime = args.initialTime, manifest = args.manifest, mediaElement = args.mediaElement, mediaSource = args.mediaSource, playbackObserver = args.playbackObserver, protectionRef = args.protectionRef, representationEstimator = args.representationEstimator, segmentFetcherCreator = args.segmentFetcherCreator, speed = args.speed;
        var initialPeriod = (_a = manifest.getPeriodForTime(initialTime)) !== null && _a !== void 0 ? _a : manifest.getNextPeriod(initialTime);
        if (initialPeriod === undefined) {
            var error = new errors_1.MediaError("MEDIA_STARTING_TIME_NOT_FOUND", "Wanted starting time not found in the Manifest.");
            return this._onFatalError(error);
        }
        var textDisplayerInterface = null;
        var textDisplayer = null;
        if (this._settings.textTrackOptions.textTrackMode === "html" &&
            features_1.default.htmlTextDisplayer !== null) {
            textDisplayer = new features_1.default.htmlTextDisplayer(mediaElement, this._settings.textTrackOptions.textTrackElement);
        }
        else if (features_1.default.nativeTextDisplayer !== null) {
            textDisplayer = new features_1.default.nativeTextDisplayer(mediaElement);
        }
        if (textDisplayer !== null) {
            var sender_1 = new main_thread_text_displayer_interface_1.default(textDisplayer);
            textDisplayerInterface = sender_1;
            cancelSignal.register(function () {
                sender_1.stop();
                textDisplayer === null || textDisplayer === void 0 ? void 0 : textDisplayer.stop();
            });
        }
        /** Interface to create media buffers. */
        var segmentSinksStore = new segment_sinks_1.default(mediaSource, mediaElement.nodeName === "VIDEO", textDisplayerInterface);
        cancelSignal.register(function () {
            segmentSinksStore.disposeAll();
        });
        var _c = (0, initial_seek_and_play_1.default)({
            mediaElement: mediaElement,
            playbackObserver: playbackObserver,
            startTime: initialTime,
            mustAutoPlay: autoPlay,
            onWarning: function (err) {
                _this.trigger("warning", err);
            },
            isDirectfile: false,
        }, cancelSignal), autoPlayResult = _c.autoPlayResult, initialPlayPerformed = _c.initialPlayPerformed;
        if (cancelSignal.isCancelled()) {
            return;
        }
        initialPlayPerformed.onUpdate(function (isPerformed, stopListening) {
            if (isPerformed) {
                stopListening();
                var streamEventsEmitter_1 = new stream_events_emitter_1.default(manifest, mediaElement, playbackObserver);
                manifest.addEventListener("manifestUpdate", function () {
                    streamEventsEmitter_1.onManifestUpdate(manifest);
                }, cancelSignal);
                streamEventsEmitter_1.addEventListener("event", function (payload) {
                    _this.trigger("streamEvent", payload);
                }, cancelSignal);
                streamEventsEmitter_1.addEventListener("eventSkip", function (payload) {
                    _this.trigger("streamEventSkip", payload);
                }, cancelSignal);
                streamEventsEmitter_1.start();
                cancelSignal.register(function () {
                    streamEventsEmitter_1.stop();
                });
            }
        }, { clearSignal: cancelSignal, emitCurrentValue: true });
        var coreObserver = (0, create_core_playback_observer_1.default)(playbackObserver, {
            autoPlay: autoPlay,
            manifest: manifest,
            mediaSource: mediaSource,
            textDisplayer: textDisplayer,
            initialPlayPerformed: initialPlayPerformed,
            speed: speed,
        }, cancelSignal);
        (_b = this._cmcdDataBuilder) === null || _b === void 0 ? void 0 : _b.startMonitoringPlayback(coreObserver);
        cancelSignal.register(function () {
            var _a;
            (_a = _this._cmcdDataBuilder) === null || _a === void 0 ? void 0 : _a.stopMonitoringPlayback();
        });
        var rebufferingController = this._createRebufferingController(playbackObserver, manifest, speed, cancelSignal);
        var decipherabilityFreezeDetector = new DecipherabilityFreezeDetector_1.default(segmentSinksStore);
        if (may_media_element_fail_on_undecipherable_data_1.default) {
            // On some devices, just reload immediately when data become undecipherable
            manifest.addEventListener("decipherabilityUpdate", function (elts) {
                if (elts.some(function (e) { return e.representation.decipherable !== true; })) {
                    reloadMediaSource(0, undefined, undefined);
                }
            }, cancelSignal);
        }
        playbackObserver.listen(function (observation) {
            if (decipherabilityFreezeDetector.needToReload(observation)) {
                var position = void 0;
                var lastObservation = playbackObserver.getReference().getValue();
                if (lastObservation.position.isAwaitingFuturePosition()) {
                    position = lastObservation.position.getWanted();
                }
                else {
                    position = playbackObserver.getCurrentTime();
                }
                var autoplay = initialPlayPerformed.getValue()
                    ? !playbackObserver.getIsPaused()
                    : autoPlay;
                onReloadOrder({ position: position, autoPlay: autoplay });
            }
        }, { clearSignal: cancelSignal });
        // Synchronize SegmentSinks with what has been buffered.
        coreObserver.listen(function (observation) {
            ["video", "audio", "text"].forEach(function (tType) {
                var _a;
                var segmentSinkStatus = segmentSinksStore.getStatus(tType);
                if (segmentSinkStatus.type === "initialized") {
                    segmentSinkStatus.value.synchronizeInventory((_a = observation.buffered[tType]) !== null && _a !== void 0 ? _a : []);
                }
            });
        }, { clearSignal: cancelSignal });
        var contentTimeBoundariesObserver = (0, create_content_time_boundaries_observer_1.default)(manifest, mediaSource, coreObserver, segmentSinksStore, {
            onWarning: function (err) { return _this.trigger("warning", err); },
            onPeriodChanged: function (period) {
                return _this.trigger("activePeriodChanged", { period: period });
            },
        }, cancelSignal);
        /**
         * Emit a "loaded" events once the initial play has been performed and the
         * media can begin playback.
         * Also emits warning events if issues arise when doing so.
         */
        autoPlayResult
            .then(function () {
            (0, get_loaded_reference_1.default)(playbackObserver, mediaElement, false, cancelSignal).onUpdate(function (isLoaded, stopListening) {
                if (isLoaded) {
                    stopListening();
                    _this.trigger("loaded", {
                        getSegmentSinkMetrics: function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, new Promise(function (resolve) {
                                        return resolve(segmentSinksStore.getSegmentSinksMetrics());
                                    })];
                            });
                        }); },
                    });
                }
            }, { emitCurrentValue: true, clearSignal: cancelSignal });
        })
            .catch(function (err) {
            if (cancelSignal.isCancelled()) {
                return; // Current loading cancelled, no need to trigger the error
            }
            _this._onFatalError(err);
        });
        /* eslint-disable-next-line @typescript-eslint/no-this-alias */
        var self = this;
        (0, stream_1.default)({ manifest: manifest, initialPeriod: initialPeriod }, coreObserver, representationEstimator, segmentSinksStore, segmentFetcherCreator, bufferOptions, handleStreamOrchestratorCallbacks(), cancelSignal);
        /**
         * Returns Object handling the callbacks from a `StreamOrchestrator`, which
         * are basically how it communicates about events.
         * @returns {Object}
         */
        function handleStreamOrchestratorCallbacks() {
            return {
                needsBufferFlush: function (payload) {
                    var _a;
                    var wantedSeekingTime;
                    var currentTime = playbackObserver.getCurrentTime();
                    var relativeResumingPosition = (_a = payload === null || payload === void 0 ? void 0 : payload.relativeResumingPosition) !== null && _a !== void 0 ? _a : 0;
                    var canBeApproximateSeek = Boolean(payload === null || payload === void 0 ? void 0 : payload.relativePosHasBeenDefaulted);
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
                    playbackObserver.listen(function (obs, stopListening) {
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
                streamStatusUpdate: function (value) {
                    // Announce discontinuities if found
                    var period = value.period, bufferType = value.bufferType, imminentDiscontinuity = value.imminentDiscontinuity, position = value.position;
                    rebufferingController.updateDiscontinuityInfo({
                        period: period,
                        bufferType: bufferType,
                        discontinuity: imminentDiscontinuity,
                        position: position,
                    });
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    // If the status for the last Period indicates that segments are all loaded
                    // or on the contrary that the loading resumed, announce it to the
                    // ContentTimeBoundariesObserver.
                    if (manifest.isLastPeriodKnown &&
                        value.period.id === manifest.periods[manifest.periods.length - 1].id) {
                        var hasFinishedLoadingLastPeriod = value.hasFinishedLoading || value.isEmptyStream;
                        if (hasFinishedLoadingLastPeriod) {
                            contentTimeBoundariesObserver.onLastSegmentFinishedLoading(value.bufferType);
                        }
                        else {
                            contentTimeBoundariesObserver.onLastSegmentLoadingResume(value.bufferType);
                        }
                    }
                },
                needsManifestRefresh: function () {
                    return self._manifestFetcher.scheduleManualRefresh({
                        enablePartialRefresh: true,
                        canUseUnsafeMode: true,
                    });
                },
                manifestMightBeOufOfSync: function () {
                    var OUT_OF_SYNC_MANIFEST_REFRESH_DELAY = config_1.default.getCurrent().OUT_OF_SYNC_MANIFEST_REFRESH_DELAY;
                    self._manifestFetcher.scheduleManualRefresh({
                        enablePartialRefresh: false,
                        canUseUnsafeMode: false,
                        delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                    });
                },
                lockedStream: function (value) {
                    return rebufferingController.onLockedStream(value.bufferType, value.period);
                },
                adaptationChange: function (value) {
                    self.trigger("adaptationChange", value);
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    contentTimeBoundariesObserver.onAdaptationChange(value.type, value.period, value.adaptation);
                },
                representationChange: function (value) {
                    self.trigger("representationChange", value);
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
                },
                inbandEvent: function (value) { return self.trigger("inbandEvents", value); },
                warning: function (value) { return self.trigger("warning", value); },
                periodStreamReady: function (value) { return self.trigger("periodStreamReady", value); },
                periodStreamCleared: function (value) {
                    contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
                    if (cancelSignal.isCancelled()) {
                        return; // Previous call has stopped streams due to a side-effect
                    }
                    self.trigger("periodStreamCleared", value);
                },
                bitrateEstimateChange: function (value) {
                    var _a;
                    (_a = self._cmcdDataBuilder) === null || _a === void 0 ? void 0 : _a.updateThroughput(value.type, value.bitrate);
                    self.trigger("bitrateEstimateChange", value);
                },
                needsMediaSourceReload: function (payload) {
                    reloadMediaSource(payload.timeOffset, payload.minimumPosition, payload.maximumPosition);
                },
                needsDecipherabilityFlush: function () {
                    var _a, _b, _c, _d;
                    var keySystem = (0, decrypt_1.getKeySystemConfiguration)(mediaElement);
                    if ((0, should_reload_media_source_on_decipherability_update_1.default)(keySystem === null || keySystem === void 0 ? void 0 : keySystem[0])) {
                        var lastObservation = coreObserver.getReference().getValue();
                        var position = lastObservation.position.isAwaitingFuturePosition()
                            ? lastObservation.position.getWanted()
                            : (_a = coreObserver.getCurrentTime()) !== null && _a !== void 0 ? _a : lastObservation.position.getPolled();
                        var isPaused = (_c = (_b = lastObservation.paused.pending) !== null && _b !== void 0 ? _b : coreObserver.getIsPaused()) !== null && _c !== void 0 ? _c : lastObservation.paused.last;
                        onReloadOrder({ position: position, autoPlay: !isPaused });
                    }
                    else {
                        var lastObservation = coreObserver.getReference().getValue();
                        var position = lastObservation.position.isAwaitingFuturePosition()
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
                encryptionDataEncountered: function (value) {
                    var e_1, _a;
                    try {
                        for (var value_1 = __values(value), value_1_1 = value_1.next(); !value_1_1.done; value_1_1 = value_1.next()) {
                            var protectionData = value_1_1.value;
                            protectionRef.setValue(protectionData);
                            if (cancelSignal.isCancelled()) {
                                return; // Previous call has stopped streams due to a side-effect
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (value_1_1 && !value_1_1.done && (_a = value_1.return)) _a.call(value_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                },
                error: function (err) { return self._onFatalError(err); },
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
            var lastObservation = coreObserver.getReference().getValue();
            var currentPosition = lastObservation.position.isAwaitingFuturePosition()
                ? lastObservation.position.getWanted()
                : (_a = coreObserver.getCurrentTime()) !== null && _a !== void 0 ? _a : lastObservation.position.getPolled();
            var isPaused = (_c = (_b = lastObservation.paused.pending) !== null && _b !== void 0 ? _b : coreObserver.getIsPaused()) !== null && _c !== void 0 ? _c : lastObservation.paused.last;
            var position = currentPosition + deltaPosition;
            if (minimumPosition !== undefined) {
                position = Math.max(minimumPosition, position);
            }
            if (maximumPosition !== undefined) {
                position = Math.min(maximumPosition, position);
            }
            onReloadOrder({ position: position, autoPlay: !isPaused });
        }
    };
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
    MediaSourceContentInitializer.prototype._createRebufferingController = function (playbackObserver, manifest, speed, cancelSignal) {
        var _this = this;
        var rebufferingController = new rebuffering_controller_1.default(playbackObserver, manifest, speed);
        // Bubble-up events
        rebufferingController.addEventListener("stalled", function (evt) {
            return _this.trigger("stalled", evt);
        });
        rebufferingController.addEventListener("unstalled", function () {
            return _this.trigger("unstalled", null);
        });
        rebufferingController.addEventListener("warning", function (err) {
            return _this.trigger("warning", err);
        });
        cancelSignal.register(function () { return rebufferingController.destroy(); });
        rebufferingController.start();
        return rebufferingController;
    };
    return MediaSourceContentInitializer;
}(types_1.ContentInitializer));
exports.default = MediaSourceContentInitializer;
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
    manifest.updateRepresentationsDeciperability(function (ctx) {
        var e_2, _a, e_3, _b, e_4, _c, e_5, _d;
        var representation = ctx.representation;
        if (representation.contentProtections === undefined) {
            return representation.decipherable;
        }
        var contentKIDs = representation.contentProtections.keyIds;
        if (contentKIDs !== undefined) {
            try {
                for (var contentKIDs_1 = __values(contentKIDs), contentKIDs_1_1 = contentKIDs_1.next(); !contentKIDs_1_1.done; contentKIDs_1_1 = contentKIDs_1.next()) {
                    var elt = contentKIDs_1_1.value;
                    try {
                        for (var blacklistedKeyIds_1 = (e_3 = void 0, __values(blacklistedKeyIds)), blacklistedKeyIds_1_1 = blacklistedKeyIds_1.next(); !blacklistedKeyIds_1_1.done; blacklistedKeyIds_1_1 = blacklistedKeyIds_1.next()) {
                            var blacklistedKeyId = blacklistedKeyIds_1_1.value;
                            if ((0, are_arrays_of_numbers_equal_1.default)(blacklistedKeyId, elt.keyId)) {
                                return false;
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (blacklistedKeyIds_1_1 && !blacklistedKeyIds_1_1.done && (_b = blacklistedKeyIds_1.return)) _b.call(blacklistedKeyIds_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    try {
                        for (var whitelistedKeyIds_1 = (e_4 = void 0, __values(whitelistedKeyIds)), whitelistedKeyIds_1_1 = whitelistedKeyIds_1.next(); !whitelistedKeyIds_1_1.done; whitelistedKeyIds_1_1 = whitelistedKeyIds_1.next()) {
                            var whitelistedKeyId = whitelistedKeyIds_1_1.value;
                            if ((0, are_arrays_of_numbers_equal_1.default)(whitelistedKeyId, elt.keyId)) {
                                return true;
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (whitelistedKeyIds_1_1 && !whitelistedKeyIds_1_1.done && (_c = whitelistedKeyIds_1.return)) _c.call(whitelistedKeyIds_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    try {
                        for (var delistedKeyIds_1 = (e_5 = void 0, __values(delistedKeyIds)), delistedKeyIds_1_1 = delistedKeyIds_1.next(); !delistedKeyIds_1_1.done; delistedKeyIds_1_1 = delistedKeyIds_1.next()) {
                            var delistedKeyId = delistedKeyIds_1_1.value;
                            if ((0, are_arrays_of_numbers_equal_1.default)(delistedKeyId, elt.keyId)) {
                                return undefined;
                            }
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (delistedKeyIds_1_1 && !delistedKeyIds_1_1.done && (_d = delistedKeyIds_1.return)) _d.call(delistedKeyIds_1);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (contentKIDs_1_1 && !contentKIDs_1_1.done && (_a = contentKIDs_1.return)) _a.call(contentKIDs_1);
                }
                finally { if (e_2) throw e_2.error; }
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
    manifest.updateRepresentationsDeciperability(function (ctx) {
        var e_6, _a;
        var _b, _c;
        var rep = ctx.representation;
        if (rep.decipherable === false) {
            return false;
        }
        var segmentProtections = (_c = (_b = rep.contentProtections) === null || _b === void 0 ? void 0 : _b.initData) !== null && _c !== void 0 ? _c : [];
        var _loop_1 = function (protection) {
            if (initData.type === undefined || protection.type === initData.type) {
                var containedInitData = initData.values
                    .getFormattedValues()
                    .every(function (undecipherableVal) {
                    return protection.values.some(function (currVal) {
                        return ((undecipherableVal.systemId === undefined ||
                            currVal.systemId === undecipherableVal.systemId) &&
                            (0, are_arrays_of_numbers_equal_1.default)(currVal.data, undecipherableVal.data));
                    });
                });
                if (containedInitData) {
                    return { value: false };
                }
            }
        };
        try {
            for (var segmentProtections_1 = __values(segmentProtections), segmentProtections_1_1 = segmentProtections_1.next(); !segmentProtections_1_1.done; segmentProtections_1_1 = segmentProtections_1.next()) {
                var protection = segmentProtections_1_1.value;
                var state_1 = _loop_1(protection);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (segmentProtections_1_1 && !segmentProtections_1_1.done && (_a = segmentProtections_1.return)) _a.call(segmentProtections_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return rep.decipherable;
    });
}
