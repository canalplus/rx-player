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
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("../../../config");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var array_find_1 = require("../../../utils/array_find");
var object_assign_1 = require("../../../utils/object_assign");
var queue_microtask_1 = require("../../../utils/queue_microtask");
var ranges_1 = require("../../../utils/ranges");
var reference_1 = require("../../../utils/reference");
var task_canceller_1 = require("../../../utils/task_canceller");
var segment_sinks_1 = require("../../segment_sinks");
var adaptation_1 = require("../adaptation");
var get_adaptation_switch_strategy_1 = require("./utils/get_adaptation_switch_strategy");
/**
 * Create a single PeriodStream:
 *   - Lazily create (or reuse) a SegmentSink for the given type.
 *   - Create a Stream linked to an Adaptation each time it changes, to
 *     download and append the corresponding segments to the SegmentSink.
 *   - Announce when the Stream is full or is awaiting new Segments through
 *     events
 *
 * @param {Object} args - Various arguments allowing the `PeriodStream` to
 * determine which Adaptation and which Representation to choose, as well as
 * which segments to load from it.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `PeriodStream` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `AdaptationStream` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `AdaptationStream`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, or until the `error` callback is called, whichever comes first.
 * @param {Object} parentCancelSignal - `CancellationSignal` allowing, when
 * triggered, to immediately stop all operations the `PeriodStream` is
 * doing.
 */
function PeriodStream(_a, callbacks, parentCancelSignal) {
    var _this = this;
    var bufferType = _a.bufferType, content = _a.content, garbageCollectors = _a.garbageCollectors, playbackObserver = _a.playbackObserver, representationEstimator = _a.representationEstimator, segmentFetcherCreator = _a.segmentFetcherCreator, segmentSinksStore = _a.segmentSinksStore, options = _a.options, wantedBufferAhead = _a.wantedBufferAhead, maxVideoBufferSize = _a.maxVideoBufferSize;
    var manifest = content.manifest, period = content.period;
    /**
     * Emits the chosen Adaptation and Representations for the current type.
     * `null` when no Adaptation is chosen (e.g. no subtitles)
     * `undefined` at the beginning (it can be ignored.).
     */
    var adaptationRef = new reference_1.default(undefined, parentCancelSignal);
    callbacks.periodStreamReady({
        type: bufferType,
        manifest: manifest,
        period: period,
        adaptationRef: adaptationRef,
    });
    if (parentCancelSignal.isCancelled()) {
        return;
    }
    var currentStreamCanceller;
    var isFirstAdaptationSwitch = true;
    adaptationRef.onUpdate(function (choice) {
        // As an IIFE to profit from async/await while respecting onUpdate's signature
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var streamCanceller, segmentSinkStatus, periodEnd, adaptations, adaptation, DELTA_POSITION_AFTER_RELOAD, relativePosHasBeenDefaulted, relativePosAfterSwitch, representations, segmentSink, strategy, _a, _b, _c, start, end, e_1_1;
            var e_1, _d;
            var _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (choice === undefined) {
                            return [2 /*return*/];
                        }
                        streamCanceller = new task_canceller_1.default();
                        streamCanceller.linkToSignal(parentCancelSignal);
                        currentStreamCanceller === null || currentStreamCanceller === void 0 ? void 0 : currentStreamCanceller.cancel(); // Cancel oreviously created stream if one
                        currentStreamCanceller = streamCanceller;
                        if (!(choice === null)) return [3 /*break*/, 7];
                        // Current type is disabled for that Period
                        log_1.default.info("Stream: Set no ".concat(bufferType, " Adaptation. P:"), period.start);
                        segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
                        if (!(segmentSinkStatus.type === "initialized")) return [3 /*break*/, 5];
                        log_1.default.info("Stream: Clearing previous ".concat(bufferType, " SegmentSink"));
                        if (!segment_sinks_1.default.isNative(bufferType)) return [3 /*break*/, 1];
                        return [2 /*return*/, askForMediaSourceReload(0, true, streamCanceller.signal)];
                    case 1:
                        periodEnd = (_e = period.end) !== null && _e !== void 0 ? _e : Infinity;
                        if (!(period.start > periodEnd)) return [3 /*break*/, 2];
                        log_1.default.warn("Stream: Can't free buffer: period's start is after its end");
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, segmentSinkStatus.value.removeBuffer(period.start, periodEnd)];
                    case 3:
                        _f.sent();
                        if (streamCanceller.isUsed()) {
                            return [2 /*return*/]; // The stream has been cancelled
                        }
                        _f.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        if (segmentSinkStatus.type === "uninitialized") {
                            segmentSinksStore.disableSegmentSink(bufferType);
                            if (streamCanceller.isUsed()) {
                                return [2 /*return*/]; // The stream has been cancelled
                            }
                        }
                        _f.label = 6;
                    case 6:
                        callbacks.adaptationChange({
                            type: bufferType,
                            adaptation: null,
                            period: period,
                        });
                        if (streamCanceller.isUsed()) {
                            return [2 /*return*/]; // Previous call has provoken Stream cancellation by side-effect
                        }
                        return [2 /*return*/, createEmptyAdaptationStream(playbackObserver, wantedBufferAhead, bufferType, { period: period }, callbacks, streamCanceller.signal)];
                    case 7:
                        adaptations = period.adaptations[bufferType];
                        adaptation = (0, array_find_1.default)(adaptations !== null && adaptations !== void 0 ? adaptations : [], function (a) { return a.id === choice.adaptationId; });
                        if (adaptation === undefined) {
                            currentStreamCanceller.cancel();
                            log_1.default.warn("Stream: Unfound chosen Adaptation choice", choice.adaptationId);
                            return [2 /*return*/];
                        }
                        DELTA_POSITION_AFTER_RELOAD = config_1.default.getCurrent().DELTA_POSITION_AFTER_RELOAD;
                        relativePosHasBeenDefaulted = false;
                        if (isFirstAdaptationSwitch) {
                            relativePosAfterSwitch = 0;
                        }
                        else if (choice.relativeResumingPosition !== undefined) {
                            relativePosAfterSwitch = choice.relativeResumingPosition;
                        }
                        else {
                            relativePosHasBeenDefaulted = true;
                            switch (bufferType) {
                                case "audio":
                                    relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.audio;
                                    break;
                                case "video":
                                    relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.video;
                                    break;
                                default:
                                    relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.other;
                                    break;
                            }
                        }
                        isFirstAdaptationSwitch = false;
                        if (segment_sinks_1.default.isNative(bufferType) &&
                            segmentSinksStore.getStatus(bufferType).type === "disabled") {
                            return [2 /*return*/, askForMediaSourceReload(relativePosAfterSwitch, true, streamCanceller.signal)];
                        }
                        // Reload if the Adaptation disappears from the manifest
                        manifest.addEventListener("manifestUpdate", function (updates) {
                            var e_2, _a, e_3, _b;
                            try {
                                // If current period has been unexpectedly removed, ask to reload
                                for (var _c = __values(updates.updatedPeriods), _d = _c.next(); !_d.done; _d = _c.next()) {
                                    var element = _d.value;
                                    if (element.period.id === period.id) {
                                        try {
                                            for (var _e = (e_3 = void 0, __values(element.result.removedAdaptations)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                                var adap = _f.value;
                                                if (adap.id === adaptation.id) {
                                                    return askForMediaSourceReload(relativePosAfterSwitch, true, streamCanceller.signal);
                                                }
                                            }
                                        }
                                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                                        finally {
                                            try {
                                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                                            }
                                            finally { if (e_3) throw e_3.error; }
                                        }
                                    }
                                    else if (element.period.start > period.start) {
                                        break;
                                    }
                                }
                            }
                            catch (e_2_1) { e_2 = { error: e_2_1 }; }
                            finally {
                                try {
                                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                                }
                                finally { if (e_2) throw e_2.error; }
                            }
                        }, currentStreamCanceller.signal);
                        representations = choice.representations;
                        log_1.default.info("Stream: Updating ".concat(bufferType, " adaptation"), "A: ".concat(adaptation.id), "P: ".concat(period.start));
                        callbacks.adaptationChange({ type: bufferType, adaptation: adaptation, period: period });
                        if (streamCanceller.isUsed()) {
                            return [2 /*return*/]; // Previous call has provoken cancellation by side-effect
                        }
                        segmentSink = createOrReuseSegmentSink(segmentSinksStore, bufferType, adaptation);
                        strategy = (0, get_adaptation_switch_strategy_1.default)(segmentSink, period, adaptation, choice.switchingMode, playbackObserver, options);
                        if (strategy.type === "needs-reload") {
                            return [2 /*return*/, askForMediaSourceReload(relativePosAfterSwitch, true, streamCanceller.signal)];
                        }
                        return [4 /*yield*/, segmentSinksStore.waitForUsableBuffers(streamCanceller.signal)];
                    case 8:
                        _f.sent();
                        if (streamCanceller.isUsed()) {
                            return [2 /*return*/]; // The Stream has since been cancelled
                        }
                        if (!(strategy.type === "flush-buffer" || strategy.type === "clean-buffer")) return [3 /*break*/, 17];
                        _f.label = 9;
                    case 9:
                        _f.trys.push([9, 14, 15, 16]);
                        _a = __values(strategy.value), _b = _a.next();
                        _f.label = 10;
                    case 10:
                        if (!!_b.done) return [3 /*break*/, 13];
                        _c = _b.value, start = _c.start, end = _c.end;
                        return [4 /*yield*/, segmentSink.removeBuffer(start, end)];
                    case 11:
                        _f.sent();
                        if (streamCanceller.isUsed()) {
                            return [2 /*return*/]; // The Stream has since been cancelled
                        }
                        _f.label = 12;
                    case 12:
                        _b = _a.next();
                        return [3 /*break*/, 10];
                    case 13: return [3 /*break*/, 16];
                    case 14:
                        e_1_1 = _f.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 16];
                    case 15:
                        try {
                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 16:
                        if (strategy.type === "flush-buffer") {
                            // The seek to `relativePosAfterSwitch` is only performed if strategy.type
                            // is "flush-buffer" because there should be no interuption when playing in
                            // with `clean-buffer` strategy
                            callbacks.needsBufferFlush({
                                relativeResumingPosition: relativePosAfterSwitch,
                                relativePosHasBeenDefaulted: relativePosHasBeenDefaulted,
                            });
                            if (streamCanceller.isUsed()) {
                                return [2 /*return*/]; // Previous callback cancelled the Stream by side-effect
                            }
                        }
                        _f.label = 17;
                    case 17:
                        garbageCollectors.get(segmentSink)(streamCanceller.signal);
                        createAdaptationStream(adaptation, representations, segmentSink, streamCanceller.signal);
                        return [2 /*return*/];
                }
            });
        }); })().catch(function (err) {
            if (err instanceof task_canceller_1.CancellationError) {
                return;
            }
            currentStreamCanceller === null || currentStreamCanceller === void 0 ? void 0 : currentStreamCanceller.cancel();
            callbacks.error(err);
        });
    }, { clearSignal: parentCancelSignal, emitCurrentValue: true });
    /**
     * @param {Object} adaptation
     * @param {Object} representations
     * @param {Object} segmentSink
     * @param {Object} cancelSignal
     */
    function createAdaptationStream(adaptation, representations, segmentSink, cancelSignal) {
        var adaptationPlaybackObserver = createAdaptationStreamPlaybackObserver(playbackObserver, adaptation.type);
        (0, adaptation_1.default)({
            content: { manifest: manifest, period: period, adaptation: adaptation, representations: representations },
            options: options,
            playbackObserver: adaptationPlaybackObserver,
            representationEstimator: representationEstimator,
            segmentSink: segmentSink,
            segmentFetcherCreator: segmentFetcherCreator,
            wantedBufferAhead: wantedBufferAhead,
            maxVideoBufferSize: maxVideoBufferSize,
        }, __assign(__assign({}, callbacks), { error: onAdaptationStreamError }), cancelSignal);
        function onAdaptationStreamError(error) {
            // Stream linked to a non-native media buffer should not impact the
            // stability of the player. ie: if a text buffer sends an error, we want
            // to continue playing without any subtitles
            if (!segment_sinks_1.default.isNative(bufferType)) {
                log_1.default.error("Stream: ".concat(bufferType, " Stream crashed. Aborting it."), error instanceof Error ? error : "");
                segmentSinksStore.disposeSegmentSink(bufferType);
                var formattedError = (0, errors_1.formatError)(error, {
                    defaultCode: "NONE",
                    defaultReason: "Unknown `AdaptationStream` error",
                });
                callbacks.warning(formattedError);
                if (cancelSignal.isCancelled()) {
                    return; // Previous callback cancelled the Stream by side-effect
                }
                return createEmptyAdaptationStream(playbackObserver, wantedBufferAhead, bufferType, { period: period }, callbacks, cancelSignal);
            }
            log_1.default.error("Stream: ".concat(bufferType, " Stream crashed. Stopping playback."), error instanceof Error ? error : "");
            callbacks.error(error);
        }
    }
    /**
     * Regularly ask to reload the MediaSource on each playback observation
     * performed by the playback observer.
     *
     * @param {number} timeOffset - Relative position, compared to the current
     * playhead, at which we should restart playback after reloading.
     * For example `-2` will reload 2 seconds before the current position.
     * @param {boolean} stayInPeriod - If `true`, we will control that the position
     * we reload at, after applying `timeOffset`, is still part of the Period
     * `period`.
     *
     * If it isn't we will re-calculate that reloaded position to be:
     *   - either the Period's start if the calculated position is before the
     *     Period's start.
     *   - either the Period'end start if the calculated position is after the
     *     Period's end.
     * @param {Object} cancelSignal
     */
    function askForMediaSourceReload(timeOffset, stayInPeriod, cancelSignal) {
        // We begin by scheduling a micro-task to reduce the possibility of race
        // conditions where `askForMediaSourceReload` would be called synchronously before
        // the next observation (which may reflect very different playback conditions)
        // is actually received.
        // It can happen when `askForMediaSourceReload` is called as a side-effect of
        // the same event that triggers the playback observation to be emitted.
        (0, queue_microtask_1.default)(function () {
            playbackObserver.listen(function () {
                if (cancelSignal.isCancelled()) {
                    return;
                }
                callbacks.waitingMediaSourceReload({
                    bufferType: bufferType,
                    period: period,
                    timeOffset: timeOffset,
                    stayInPeriod: stayInPeriod,
                });
            }, { includeLastObservation: true, clearSignal: cancelSignal });
        });
    }
}
exports.default = PeriodStream;
/**
 * @param {string} bufferType
 * @param {Object} adaptation
 * @returns {Object}
 */
function createOrReuseSegmentSink(segmentSinksStore, bufferType, adaptation) {
    var segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
    if (segmentSinkStatus.type === "initialized") {
        log_1.default.info("Stream: Reusing a previous SegmentSink for the type", bufferType);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return segmentSinkStatus.value;
    }
    var codec = getFirstDeclaredMimeType(adaptation);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return segmentSinksStore.createSegmentSink(bufferType, codec);
}
/**
 * Get mime-type string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation) {
    var representations = adaptation.representations.filter(function (r) {
        return r.isSupported === true && r.decipherable !== false;
    });
    if (representations.length === 0) {
        var noRepErr = new errors_1.MediaError("NO_PLAYABLE_REPRESENTATION", "No Representation in the chosen " + adaptation.type + " Adaptation can be played", { tracks: [(0, manifest_1.toTaggedTrack)(adaptation)] });
        throw noRepErr;
    }
    return representations[0].getMimeTypeString();
}
/**
 * Create AdaptationStream's version of a playback observer.
 * @param {Object} initialPlaybackObserver
 * @param {string} trackType
 * @returns {Object}
 */
function createAdaptationStreamPlaybackObserver(initialPlaybackObserver, trackType) {
    return initialPlaybackObserver.deriveReadOnlyObserver(function transform(observationRef, cancellationSignal) {
        var newRef = new reference_1.default(constructAdaptationStreamPlaybackObservation(), cancellationSignal);
        observationRef.onUpdate(emitAdaptationStreamPlaybackObservation, {
            clearSignal: cancellationSignal,
            emitCurrentValue: false,
        });
        return newRef;
        function constructAdaptationStreamPlaybackObservation() {
            var baseObservation = observationRef.getValue();
            var buffered = baseObservation.buffered[trackType];
            var bufferGap = buffered !== null
                ? (0, ranges_1.getLeftSizeOfRange)(buffered, baseObservation.position.getWanted())
                : 0;
            return (0, object_assign_1.default)({}, baseObservation, { bufferGap: bufferGap, buffered: buffered });
        }
        function emitAdaptationStreamPlaybackObservation() {
            newRef.setValue(constructAdaptationStreamPlaybackObservation());
        }
    });
}
/**
 * Create empty AdaptationStream, linked to a Period.
 * This AdaptationStream will never download any segment and just emit a "full"
 * event when reaching the end.
 * @param {Object} playbackObserver
 * @param {Object} wantedBufferAhead
 * @param {string} bufferType
 * @param {Object} content
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 */
function createEmptyAdaptationStream(playbackObserver, wantedBufferAhead, bufferType, content, callbacks, cancelSignal) {
    var period = content.period;
    var hasFinishedLoading = false;
    wantedBufferAhead.onUpdate(sendStatus, {
        emitCurrentValue: false,
        clearSignal: cancelSignal,
    });
    playbackObserver.listen(sendStatus, {
        includeLastObservation: false,
        clearSignal: cancelSignal,
    });
    sendStatus();
    function sendStatus() {
        var observation = playbackObserver.getReference().getValue();
        var wba = wantedBufferAhead.getValue();
        var position = observation.position.getWanted();
        if (period.end !== undefined && position + wba >= period.end) {
            log_1.default.debug('Stream: full "empty" AdaptationStream', bufferType);
            hasFinishedLoading = true;
        }
        callbacks.streamStatusUpdate({
            period: period,
            bufferType: bufferType,
            imminentDiscontinuity: null,
            position: position,
            isEmptyStream: true,
            hasFinishedLoading: hasFinishedLoading,
            neededSegments: [],
        });
    }
}
