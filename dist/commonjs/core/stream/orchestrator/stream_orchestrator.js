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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("../../../config");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var queue_microtask_1 = require("../../../utils/queue_microtask");
var reference_1 = require("../../../utils/reference");
var sorted_list_1 = require("../../../utils/sorted_list");
var task_canceller_1 = require("../../../utils/task_canceller");
var weak_map_memory_1 = require("../../../utils/weak_map_memory");
var segment_sinks_1 = require("../../segment_sinks");
var period_1 = require("../period");
var get_time_ranges_for_content_1 = require("./get_time_ranges_for_content");
/**
 * Create and manage the various "Streams" needed for the content to
 * play:
 *
 *   - Create or dispose SegmentSinks depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SegmentSinks depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Streams for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Call various callbacks to notify of its health and issues
 *
 * @param {Object} content
 * @param {Object} playbackObserver - Emit position information
 * @param {Object} representationEstimator - Emit bitrate estimates and best
 * Representation to play.
 * @param {Object} segmentSinksStore - Will be used to lazily create
 * SegmentSink instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
 * @param {Object} options
 * @param {Object} callbacks - The `StreamOrchestrator` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `StreamOrchestrator` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `StreamOrchestrator`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, or until the `error` callback is called, whichever comes first.
 * @param {Object} orchestratorCancelSignal - `CancellationSignal` allowing,
 * when triggered, to immediately stop all operations the `PeriodStream` is
 * doing.
 */
function StreamOrchestrator(content, playbackObserver, representationEstimator, segmentSinksStore, segmentFetcherCreator, options, callbacks, orchestratorCancelSignal) {
    var e_1, _a;
    var manifest = content.manifest, initialPeriod = content.initialPeriod;
    var maxBufferAhead = options.maxBufferAhead, maxBufferBehind = options.maxBufferBehind, wantedBufferAhead = options.wantedBufferAhead, maxVideoBufferSize = options.maxVideoBufferSize;
    var _b = config_1.default.getCurrent(), MINIMUM_MAX_BUFFER_AHEAD = _b.MINIMUM_MAX_BUFFER_AHEAD, MAXIMUM_MAX_BUFFER_AHEAD = _b.MAXIMUM_MAX_BUFFER_AHEAD, MAXIMUM_MAX_BUFFER_BEHIND = _b.MAXIMUM_MAX_BUFFER_BEHIND;
    // Some DRM issues force us to check whether we're initially pushing clear
    // segments.
    //
    // NOTE: Theoretically `initialPeriod` may not be the first Period for
    // which we push segments (e.g. we may have a small seek which lead to
    // another Period being streamed instead).
    // This means that we could have an issue if `initialPeriod` leads to encrypted
    // content, but the actually first-pushed segments do not. Here
    // `shouldReloadOnEncryptedContent` would be set to `false` despiste the fact
    // that it should be set to `true`.
    // Yet, checking the first Period for which we pushed segments seems very hard,
    // and all that for what is now (2024-07-31) a PlayReady bug, I don't have the
    // will.
    var shouldReloadOnEncryptedContent = options.failOnEncryptedAfterClear && !hasEncryptedContentInPeriod(initialPeriod);
    // Keep track of a unique BufferGarbageCollector created per
    // SegmentSink.
    var garbageCollectors = new weak_map_memory_1.default(function (segmentSink) {
        var _a, _b;
        var bufferType = segmentSink.bufferType;
        var defaultMaxBehind = (_a = MAXIMUM_MAX_BUFFER_BEHIND[bufferType]) !== null && _a !== void 0 ? _a : Infinity;
        var maxAheadHigherBound = (_b = MAXIMUM_MAX_BUFFER_AHEAD[bufferType]) !== null && _b !== void 0 ? _b : Infinity;
        return function (gcCancelSignal) {
            (0, segment_sinks_1.BufferGarbageCollector)({
                segmentSink: segmentSink,
                playbackObserver: playbackObserver,
                maxBufferBehind: (0, reference_1.createMappedReference)(maxBufferBehind, function (val) { return Math.min(val, defaultMaxBehind); }, gcCancelSignal),
                maxBufferAhead: (0, reference_1.createMappedReference)(maxBufferAhead, function (val) {
                    var _a;
                    var lowerBound = Math.max(val, (_a = MINIMUM_MAX_BUFFER_AHEAD[bufferType]) !== null && _a !== void 0 ? _a : 0);
                    return Math.min(lowerBound, maxAheadHigherBound);
                }, gcCancelSignal),
            }, gcCancelSignal);
        };
    });
    try {
        // Create automatically the right `PeriodStream` for every possible types
        for (var _c = __values(segmentSinksStore.getBufferTypes()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var bufferType = _d.value;
            manageEveryStreams(bufferType, initialPeriod);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    /**
     * Manage creation and removal of Streams for every Periods for a given type.
     *
     * Works by creating consecutive Streams through the
     * `manageConsecutivePeriodStreams` function, and restarting it when the
     * current position goes out of the bounds of these Streams.
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     */
    function manageEveryStreams(bufferType, basePeriod) {
        /** Each Period for which there is currently a Stream, chronologically */
        var periodList = new sorted_list_1.default(function (a, b) { return a.start - b.start; });
        /**
         * When set to `true`, all the currently active PeriodStream will be destroyed
         * and re-created from the new current position if we detect it to be out of
         * their bounds.
         * This is set to false when we're in the process of creating the first
         * PeriodStream, to avoid interferences while no PeriodStream is available.
         */
        var enableOutOfBoundsCheck = false;
        /** Cancels currently created `PeriodStream`s. */
        var currentCanceller = new task_canceller_1.default();
        currentCanceller.linkToSignal(orchestratorCancelSignal);
        // Restart the current Stream when the wanted time is in another period
        // than the ones already considered
        playbackObserver.listen(function (_a) {
            var _b;
            var position = _a.position;
            var time = position.getWanted();
            if (!enableOutOfBoundsCheck || !isOutOfPeriodList(time)) {
                return;
            }
            log_1.default.info("Stream: Destroying all PeriodStreams due to out of bounds situation", bufferType, time);
            enableOutOfBoundsCheck = false;
            while (periodList.length() > 0) {
                var period = periodList.get(periodList.length() - 1);
                periodList.removeElement(period);
                callbacks.periodStreamCleared({ type: bufferType, manifest: manifest, period: period });
            }
            currentCanceller.cancel();
            currentCanceller = new task_canceller_1.default();
            currentCanceller.linkToSignal(orchestratorCancelSignal);
            var nextPeriod = (_b = manifest.getPeriodForTime(time)) !== null && _b !== void 0 ? _b : manifest.getNextPeriod(time);
            if (nextPeriod === undefined) {
                log_1.default.warn("Stream: The wanted position is not found in the Manifest.");
                enableOutOfBoundsCheck = true;
                return;
            }
            launchConsecutiveStreamsForPeriod(nextPeriod);
        }, { clearSignal: orchestratorCancelSignal, includeLastObservation: true });
        manifest.addEventListener("decipherabilityUpdate", function (evt) {
            if (orchestratorCancelSignal.isCancelled()) {
                return;
            }
            onDecipherabilityUpdates(evt).catch(function (err) {
                if (orchestratorCancelSignal.isCancelled()) {
                    return;
                }
                currentCanceller.cancel();
                callbacks.error(err);
            });
        }, orchestratorCancelSignal);
        return launchConsecutiveStreamsForPeriod(basePeriod);
        /**
         * @param {Object} period
         */
        function launchConsecutiveStreamsForPeriod(period) {
            var consecutivePeriodStreamCb = __assign(__assign({}, callbacks), { waitingMediaSourceReload: function (payload) {
                    // Only reload the MediaSource when the more immediately required
                    // Period is the one it is asked for
                    var firstPeriod = periodList.head();
                    if (firstPeriod === undefined || firstPeriod.id !== payload.period.id) {
                        callbacks.lockedStream({
                            bufferType: payload.bufferType,
                            period: payload.period,
                        });
                    }
                    else {
                        callbacks.needsMediaSourceReload({
                            timeOffset: payload.timeOffset,
                            minimumPosition: payload.stayInPeriod ? payload.period.start : undefined,
                            maximumPosition: payload.stayInPeriod ? payload.period.end : undefined,
                        });
                    }
                }, periodStreamReady: function (payload) {
                    enableOutOfBoundsCheck = true;
                    periodList.add(payload.period);
                    callbacks.periodStreamReady(payload);
                }, periodStreamCleared: function (payload) {
                    periodList.removeElement(payload.period);
                    callbacks.periodStreamCleared(payload);
                }, error: function (err) {
                    currentCanceller.cancel();
                    callbacks.error(err);
                } });
            manageConsecutivePeriodStreams(bufferType, period, consecutivePeriodStreamCb, currentCanceller.signal);
        }
        /**
         * Returns true if the given time is either:
         *   - less than the start of the chronologically first Period
         *   - more than the end of the chronologically last Period
         * @param {number} time
         * @returns {boolean}
         */
        function isOutOfPeriodList(time) {
            var head = periodList.head();
            var last = periodList.last();
            if (head === undefined || last === undefined) {
                // if no period
                return true;
            }
            return (head.start > time || ((0, is_null_or_undefined_1.default)(last.end) ? Infinity : last.end) < time);
        }
        /**
         * React to a Manifest's decipherability updates.
         * @param {Array.<Object>} updates
         * @returns {Promise}
         */
        function onDecipherabilityUpdates(updates) {
            return __awaiter(this, void 0, void 0, function () {
                var segmentSinkStatus, ofCurrentType, segmentSink, resettedContent, undecipherableContent, undecipherableRanges, rangesToRemove, period, _a, _b, _c, start, end, e_2_1;
                var e_2, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
                            ofCurrentType = updates.filter(function (update) { return update.adaptation.type === bufferType; });
                            if (
                            // No update concerns the current type of data
                            ofCurrentType.length === 0 ||
                                segmentSinkStatus.type !== "initialized" ||
                                // The update only notifies of now-decipherable streams
                                ofCurrentType.every(function (x) { return x.representation.decipherable === true; })) {
                                // Data won't have to be removed from the buffers, no need to stop the
                                // current Streams.
                                return [2 /*return*/];
                            }
                            segmentSink = segmentSinkStatus.value;
                            resettedContent = ofCurrentType.filter(function (update) { return update.representation.decipherable === undefined; });
                            undecipherableContent = ofCurrentType.filter(function (update) { return update.representation.decipherable === false; });
                            undecipherableRanges = (0, get_time_ranges_for_content_1.default)(segmentSink, undecipherableContent);
                            rangesToRemove = (0, get_time_ranges_for_content_1.default)(segmentSink, resettedContent);
                            // First close all Stream currently active so they don't continue to
                            // load and push segments.
                            enableOutOfBoundsCheck = false;
                            log_1.default.info("Stream: Destroying all PeriodStreams for decipherability matters", bufferType);
                            while (periodList.length() > 0) {
                                period = periodList.get(periodList.length() - 1);
                                periodList.removeElement(period);
                                callbacks.periodStreamCleared({ type: bufferType, manifest: manifest, period: period });
                            }
                            currentCanceller.cancel();
                            currentCanceller = new task_canceller_1.default();
                            currentCanceller.linkToSignal(orchestratorCancelSignal);
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 6, 7, 8]);
                            _a = __values(__spreadArray(__spreadArray([], __read(undecipherableRanges), false), __read(rangesToRemove), false)), _b = _a.next();
                            _e.label = 2;
                        case 2:
                            if (!!_b.done) return [3 /*break*/, 5];
                            _c = _b.value, start = _c.start, end = _c.end;
                            if (orchestratorCancelSignal.isCancelled()) {
                                return [2 /*return*/];
                            }
                            if (!(start < end)) return [3 /*break*/, 4];
                            if (orchestratorCancelSignal.isCancelled()) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, segmentSink.removeBuffer(start, end)];
                        case 3:
                            _e.sent();
                            _e.label = 4;
                        case 4:
                            _b = _a.next();
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 8];
                        case 6:
                            e_2_1 = _e.sent();
                            e_2 = { error: e_2_1 };
                            return [3 /*break*/, 8];
                        case 7:
                            try {
                                if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                            }
                            finally { if (e_2) throw e_2.error; }
                            return [7 /*endfinally*/];
                        case 8:
                            // Schedule micro task before checking the last playback observation
                            // to reduce the risk of race conditions where the next observation
                            // was going to be emitted synchronously.
                            (0, queue_microtask_1.default)(function () {
                                if (orchestratorCancelSignal.isCancelled()) {
                                    return;
                                }
                                var observation = playbackObserver.getReference().getValue();
                                if (needsFlushingAfterClean(observation, undecipherableRanges)) {
                                    // Bind to Period start and end
                                    callbacks.needsDecipherabilityFlush();
                                    if (orchestratorCancelSignal.isCancelled()) {
                                        return;
                                    }
                                }
                                else if (needsFlushingAfterClean(observation, rangesToRemove)) {
                                    callbacks.needsBufferFlush();
                                    if (orchestratorCancelSignal.isCancelled()) {
                                        return;
                                    }
                                }
                                var lastPosition = observation.position.getWanted();
                                var newInitialPeriod = manifest.getPeriodForTime(lastPosition);
                                if (newInitialPeriod === undefined) {
                                    callbacks.error(new errors_1.MediaError("MEDIA_TIME_NOT_FOUND", "The wanted position is not found in the Manifest."));
                                    return;
                                }
                                launchConsecutiveStreamsForPeriod(newInitialPeriod);
                            });
                            return [2 /*return*/];
                    }
                });
            });
        }
    }
    /**
     * Create lazily consecutive PeriodStreams:
     *
     * It first creates the `PeriodStream` for `basePeriod` and - once it becomes
     * full - automatically creates the next chronological one.
     * This process repeats until the `PeriodStream` linked to the last Period is
     * full.
     *
     * If an "old" `PeriodStream` becomes active again, it destroys all
     * `PeriodStream` coming after it (from the last chronological one to the
     * first).
     *
     * To clean-up PeriodStreams, each one of them are also automatically
     * destroyed once the current position is superior or equal to the end of
     * the concerned Period.
     *
     * The "periodStreamReady" callback is alled each times a new `PeriodStream`
     * is created.
     *
     * The "periodStreamCleared" callback is called each times a PeriodStream is
     * destroyed (this callback is though not called if it was destroyed due to
     * the given `cancelSignal` emitting or due to a fatal error).
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     * @param {Object} consecutivePeriodStreamCb - Callbacks called on various
     * events. See type for more information.
     * @param {Object} cancelSignal - `CancellationSignal` allowing to stop
     * everything that this function was doing. Callbacks in
     * `consecutivePeriodStreamCb` might still be sent as a consequence of this
     * signal emitting.
     */
    function manageConsecutivePeriodStreams(bufferType, basePeriod, consecutivePeriodStreamCb, cancelSignal) {
        log_1.default.info("Stream: Creating new Stream for", bufferType, basePeriod.start);
        if (shouldReloadOnEncryptedContent) {
            if (hasEncryptedContentInPeriod(basePeriod)) {
                playbackObserver.listen(function (pos) {
                    if (pos.position.getWanted() > basePeriod.start - 0.01) {
                        callbacks.needsMediaSourceReload({
                            timeOffset: 0,
                            minimumPosition: basePeriod.start,
                            maximumPosition: basePeriod.end,
                        });
                    }
                    else {
                        callbacks.lockedStream({
                            period: basePeriod,
                            bufferType: bufferType,
                        });
                    }
                });
                return;
            }
        }
        /**
         * Contains properties linnked to the next chronological `PeriodStream` that
         * may be created here.
         */
        var nextStreamInfo = null;
        /** Emits when the `PeriodStream` linked to `basePeriod` should be destroyed. */
        var currentStreamCanceller = new task_canceller_1.default();
        currentStreamCanceller.linkToSignal(cancelSignal);
        // Stop current PeriodStream when the current position goes over the end of
        // that Period.
        playbackObserver.listen(function (_a, stopListeningObservations) {
            var position = _a.position;
            if (basePeriod.end !== undefined && position.getWanted() >= basePeriod.end) {
                var nextPeriod = manifest.getPeriodAfter(basePeriod);
                // Handle special wantedPosition === basePeriod.end cases
                if (basePeriod.containsTime(position.getWanted(), nextPeriod)) {
                    return;
                }
                log_1.default.info("Stream: Destroying PeriodStream as the current playhead moved above it", bufferType, basePeriod.start, position.getWanted(), basePeriod.end);
                stopListeningObservations();
                consecutivePeriodStreamCb.periodStreamCleared({
                    type: bufferType,
                    manifest: manifest,
                    period: basePeriod,
                });
                currentStreamCanceller.cancel();
            }
        }, { clearSignal: cancelSignal, includeLastObservation: true });
        var periodStreamArgs = {
            bufferType: bufferType,
            content: { manifest: manifest, period: basePeriod },
            garbageCollectors: garbageCollectors,
            maxVideoBufferSize: maxVideoBufferSize,
            segmentFetcherCreator: segmentFetcherCreator,
            segmentSinksStore: segmentSinksStore,
            options: options,
            playbackObserver: playbackObserver,
            representationEstimator: representationEstimator,
            wantedBufferAhead: wantedBufferAhead,
        };
        var periodStreamCallbacks = __assign(__assign({}, consecutivePeriodStreamCb), { streamStatusUpdate: function (value) {
                if (value.hasFinishedLoading) {
                    var nextPeriod = manifest.getPeriodAfter(basePeriod);
                    if (nextPeriod !== null) {
                        // current Stream is full, create the next one if not
                        checkOrCreateNextPeriodStream(nextPeriod);
                    }
                }
                else if (nextStreamInfo !== null) {
                    // current Stream is active, destroy next Stream if created
                    log_1.default.info("Stream: Destroying next PeriodStream due to current one being active", bufferType, nextStreamInfo.period.start);
                    consecutivePeriodStreamCb.periodStreamCleared({
                        type: bufferType,
                        manifest: manifest,
                        period: nextStreamInfo.period,
                    });
                    nextStreamInfo.canceller.cancel();
                    nextStreamInfo = null;
                }
                consecutivePeriodStreamCb.streamStatusUpdate(value);
            }, error: function (err) {
                if (nextStreamInfo !== null) {
                    nextStreamInfo.canceller.cancel();
                    nextStreamInfo = null;
                }
                currentStreamCanceller.cancel();
                consecutivePeriodStreamCb.error(err);
            } });
        (0, period_1.default)(periodStreamArgs, periodStreamCallbacks, currentStreamCanceller.signal);
        handleUnexpectedManifestUpdates(currentStreamCanceller.signal);
        /**
         * Create `PeriodStream` for the next Period, specified under `nextPeriod`.
         * @param {Object} nextPeriod
         */
        function checkOrCreateNextPeriodStream(nextPeriod) {
            if (nextStreamInfo !== null) {
                if (nextStreamInfo.period.id === nextPeriod.id) {
                    return;
                }
                log_1.default.warn("Stream: Creating next `PeriodStream` while one was already created.", bufferType, nextPeriod.id, nextStreamInfo.period.id);
                consecutivePeriodStreamCb.periodStreamCleared({
                    type: bufferType,
                    manifest: manifest,
                    period: nextStreamInfo.period,
                });
                nextStreamInfo.canceller.cancel();
            }
            var nextStreamCanceller = new task_canceller_1.default();
            nextStreamCanceller.linkToSignal(cancelSignal);
            nextStreamInfo = { canceller: nextStreamCanceller, period: nextPeriod };
            manageConsecutivePeriodStreams(bufferType, nextPeriod, consecutivePeriodStreamCb, nextStreamInfo.canceller.signal);
        }
        /**
         * Check on Manifest updates that the Manifest still appears coherent
         * regarding its internal Period structure to what we created for now,
         * handling cases where it does not.
         * @param {Object} innerCancelSignal - When that cancel signal emits, stop
         * performing checks.
         */
        function handleUnexpectedManifestUpdates(innerCancelSignal) {
            manifest.addEventListener("manifestUpdate", function (updates) {
                var e_3, _a;
                try {
                    // If current period has been unexpectedly removed, ask to reload
                    for (var _b = __values(updates.removedPeriods), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var period = _c.value;
                        if (period.id === basePeriod.id) {
                            // Check that this was not just one  of the earliests Periods that
                            // was removed, in which case this is a normal cleanup scenario
                            if (manifest.periods.length > 0 &&
                                manifest.periods[0].start <= period.start) {
                                // We begin by scheduling a micro-task to reduce the possibility of race
                                // conditions where the inner logic would be called synchronously before
                                // the next observation (which may reflect very different playback
                                // conditions) is actually received.
                                return (0, queue_microtask_1.default)(function () {
                                    if (innerCancelSignal.isCancelled()) {
                                        return;
                                    }
                                    return callbacks.needsMediaSourceReload({
                                        timeOffset: 0,
                                        minimumPosition: undefined,
                                        maximumPosition: undefined,
                                    });
                                });
                            }
                        }
                        else if (period.start > basePeriod.start) {
                            break;
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                if (updates.addedPeriods.length > 0) {
                    // If the next period changed, cancel the next created one if one
                    if (nextStreamInfo !== null) {
                        var newNextPeriod = manifest.getPeriodAfter(basePeriod);
                        if (newNextPeriod === null ||
                            nextStreamInfo.period.id !== newNextPeriod.id) {
                            log_1.default.warn("Stream: Destroying next PeriodStream due to new one being added", bufferType, nextStreamInfo.period.start);
                            consecutivePeriodStreamCb.periodStreamCleared({
                                type: bufferType,
                                manifest: manifest,
                                period: nextStreamInfo.period,
                            });
                            nextStreamInfo.canceller.cancel();
                            nextStreamInfo = null;
                        }
                    }
                }
            }, innerCancelSignal);
        }
    }
}
exports.default = StreamOrchestrator;
/**
 * Return `true` if the given Period has at least one Representation which is
 * known to be encrypted.
 *
 * @param {Object} period
 * @returns {boolean}
 */
function hasEncryptedContentInPeriod(period) {
    var e_4, _a, e_5, _b;
    try {
        for (var _c = __values(period.getAdaptations()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var adaptation = _d.value;
            try {
                for (var _e = (e_5 = void 0, __values(adaptation.representations)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var representation = _f.value;
                    if (representation.contentProtections !== undefined) {
                        return true;
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return false;
}
/**
 * Returns `true` if low-level buffers have to be "flushed" after the given
 * `cleanedRanges` time ranges have been removed from an audio or video
 * SourceBuffer, to prevent playback issues.
 * @param {Object} observation
 * @param {Array.<Object>} cleanedRanges
 * @returns {boolean}
 */
function needsFlushingAfterClean(observation, cleanedRanges) {
    if (cleanedRanges.length === 0) {
        return false;
    }
    var curPos = observation.position.getPolled();
    // Based on the playback direction, we just check whether we may encounter
    // the corresponding ranges, without seeking or re-switching playback
    // direction which is expected to lead to a low-level flush anyway.
    // There's a 5 seconds security, just to be sure.
    return observation.speed >= 0
        ? cleanedRanges[cleanedRanges.length - 1].end >= curPos - 5
        : cleanedRanges[0].start <= curPos + 5;
}
