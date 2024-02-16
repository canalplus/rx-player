"use strict";
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
var array_includes_1 = require("../../../utils/array_includes");
var assert_1 = require("../../../utils/assert");
var cancellable_sleep_1 = require("../../../utils/cancellable_sleep");
var noop_1 = require("../../../utils/noop");
var object_assign_1 = require("../../../utils/object_assign");
var queue_microtask_1 = require("../../../utils/queue_microtask");
var reference_1 = require("../../../utils/reference");
var task_canceller_1 = require("../../../utils/task_canceller");
var representation_1 = require("../representation");
var get_representations_switch_strategy_1 = require("./get_representations_switch_strategy");
/**
 * Create new `AdaptationStream` whose task will be to download the media data
 * for a given Adaptation (i.e. "track").
 *
 * It will rely on the IRepresentationEstimator to choose at any time the
 * best Representation for this Adaptation and then run the logic to download
 * and push the corresponding segments in the SegmentSink.
 *
 * @param {Object} args - Various arguments allowing the `AdaptationStream` to
 * determine which Representation to choose and which segments to load from it.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `AdaptationStream` relies on a system of
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
 * triggered, to immediately stop all operations the `AdaptationStream` is
 * doing.
 */
function AdaptationStream(_a, callbacks, parentCancelSignal) {
    var playbackObserver = _a.playbackObserver, content = _a.content, options = _a.options, representationEstimator = _a.representationEstimator, segmentSink = _a.segmentSink, segmentFetcherCreator = _a.segmentFetcherCreator, wantedBufferAhead = _a.wantedBufferAhead, maxVideoBufferSize = _a.maxVideoBufferSize;
    var manifest = content.manifest, period = content.period, adaptation = content.adaptation;
    /** Allows to cancel everything the `AdaptationStream` is doing. */
    var adapStreamCanceller = new task_canceller_1.default();
    adapStreamCanceller.linkToSignal(parentCancelSignal);
    /**
     * The buffer goal ratio base itself on the value given by `wantedBufferAhead`
     * to determine a more dynamic buffer goal for a given Representation.
     *
     * It can help in cases such as : the current browser has issues with
     * buffering and tells us that we should try to bufferize less data :
     * https://developers.google.com/web/updates/2017/10/quotaexceedederror
     */
    var bufferGoalRatioMap = new Map();
    /**
     * Emit the currently chosen `Representation`.
     * `null` if no Representation is chosen for now.
     */
    var currentRepresentation = new reference_1.default(null, adapStreamCanceller.signal);
    /** Stores the last emitted bitrate. */
    var previouslyEmittedBitrate;
    var initialRepIds = content.representations.getValue().representationIds;
    var initialRepresentations = content.adaptation.representations.filter(function (r) {
        return (0, array_includes_1.default)(initialRepIds, r.id) &&
            r.decipherable !== false &&
            r.isSupported !== false;
    });
    /** Emit the list of Representation for the adaptive logic. */
    var representationsList = new reference_1.default(initialRepresentations, adapStreamCanceller.signal);
    // Start-up Adaptive logic
    var _b = representationEstimator({ manifest: manifest, period: period, adaptation: adaptation }, currentRepresentation, representationsList, playbackObserver, adapStreamCanceller.signal), estimateRef = _b.estimates, abrCallbacks = _b.callbacks;
    /** Allows a `RepresentationStream` to easily fetch media segments. */
    var segmentFetcher = segmentFetcherCreator.createSegmentFetcher(adaptation.type, 
    /* eslint-disable @typescript-eslint/unbound-method */
    {
        onRequestBegin: abrCallbacks.requestBegin,
        onRequestEnd: abrCallbacks.requestEnd,
        onProgress: abrCallbacks.requestProgress,
        onMetrics: abrCallbacks.metrics,
    });
    /* eslint-enable @typescript-eslint/unbound-method */
    /** Used to determine when "fast-switching" is possible. */
    var fastSwitchThreshold = new reference_1.default(0);
    estimateRef.onUpdate(function (_a) {
        var bitrate = _a.bitrate, knownStableBitrate = _a.knownStableBitrate;
        if (options.enableFastSwitching) {
            fastSwitchThreshold.setValueIfChanged(knownStableBitrate);
        }
        if (bitrate === undefined || bitrate === previouslyEmittedBitrate) {
            return;
        }
        previouslyEmittedBitrate = bitrate;
        log_1.default.debug("Stream: new ".concat(adaptation.type, " bitrate estimate"), bitrate);
        callbacks.bitrateEstimateChange({ type: adaptation.type, bitrate: bitrate });
    }, { emitCurrentValue: true, clearSignal: adapStreamCanceller.signal });
    /**
     * When triggered, cancel all `RepresentationStream`s currently created.
     * Set to `undefined` initially.
     */
    var cancelCurrentStreams;
    // Each time the list of wanted Representations changes, we restart the logic
    content.representations.onUpdate(function (val) {
        if (cancelCurrentStreams !== undefined) {
            cancelCurrentStreams.cancel();
        }
        var newRepIds = content.representations.getValue().representationIds;
        var newRepresentations = content.adaptation.representations.filter(function (r) {
            return (0, array_includes_1.default)(newRepIds, r.id);
        });
        representationsList.setValueIfChanged(newRepresentations);
        cancelCurrentStreams = new task_canceller_1.default();
        cancelCurrentStreams.linkToSignal(adapStreamCanceller.signal);
        onRepresentationsChoiceChange(val, cancelCurrentStreams.signal).catch(function (err) {
            if ((cancelCurrentStreams === null || cancelCurrentStreams === void 0 ? void 0 : cancelCurrentStreams.isUsed()) === true &&
                task_canceller_1.default.isCancellationError(err)) {
                return;
            }
            adapStreamCanceller.cancel();
            callbacks.error(err);
        });
    }, { clearSignal: adapStreamCanceller.signal, emitCurrentValue: true });
    return;
    /**
     * Function called each time the list of wanted Representations is updated.
     *
     * Returns a Promise to profit from async/await syntax. The Promise resolution
     * does not indicate anything. The Promise may reject however, either on some
     * error or on some cancellation.
     * @param {Object} choice - The last Representations choice that has been
     * made.
     * @param {Object} fnCancelSignal - `CancellationSignal` allowing to cancel
     * everything this function is doing and free all related resources.
     */
    function onRepresentationsChoiceChange(choice, fnCancelSignal) {
        return __awaiter(this, void 0, void 0, function () {
            var switchStrat, _a, _b, _c, range, e_1_1;
            var e_1, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        switchStrat = (0, get_representations_switch_strategy_1.default)(period, adaptation, choice, segmentSink, playbackObserver);
                        _a = switchStrat.type;
                        switch (_a) {
                            case "continue": return [3 /*break*/, 1];
                            case "needs-reload": return [3 /*break*/, 2];
                            case "flush-buffer": return [3 /*break*/, 3];
                            case "clean-buffer": return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 11];
                    case 1: return [3 /*break*/, 12]; // nothing to do
                    case 2: // Just ask to reload
                    // We begin by scheduling a micro-task to reduce the possibility of race
                    // conditions where the inner logic would be called synchronously before
                    // the next observation (which may reflect very different playback conditions)
                    // is actually received.
                    return [2 /*return*/, (0, queue_microtask_1.default)(function () {
                            playbackObserver.listen(function () {
                                if (fnCancelSignal.isCancelled()) {
                                    return;
                                }
                                var DELTA_POSITION_AFTER_RELOAD = config_1.default.getCurrent().DELTA_POSITION_AFTER_RELOAD;
                                var timeOffset = DELTA_POSITION_AFTER_RELOAD.bitrateSwitch;
                                return callbacks.waitingMediaSourceReload({
                                    bufferType: adaptation.type,
                                    period: period,
                                    timeOffset: timeOffset,
                                    stayInPeriod: true,
                                });
                            }, { includeLastObservation: true, clearSignal: fnCancelSignal });
                        })];
                    case 3:
                        _e.trys.push([3, 8, 9, 10]);
                        _b = __values(switchStrat.value), _c = _b.next();
                        _e.label = 4;
                    case 4:
                        if (!!_c.done) return [3 /*break*/, 7];
                        range = _c.value;
                        return [4 /*yield*/, segmentSink.removeBuffer(range.start, range.end)];
                    case 5:
                        _e.sent();
                        if (fnCancelSignal.isCancelled()) {
                            return [2 /*return*/];
                        }
                        _e.label = 6;
                    case 6:
                        _c = _b.next();
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 10];
                    case 8:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 10];
                    case 9:
                        try {
                            if (_c && !_c.done && (_d = _b.return)) _d.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 10:
                        if (switchStrat.type === "flush-buffer") {
                            callbacks.needsBufferFlush();
                            if (fnCancelSignal.isCancelled()) {
                                return [2 /*return*/];
                            }
                        }
                        return [3 /*break*/, 12];
                    case 11:
                        (0, assert_1.assertUnreachable)(switchStrat);
                        _e.label = 12;
                    case 12:
                        recursivelyCreateRepresentationStreams(fnCancelSignal);
                        return [2 /*return*/];
                }
            });
        });
    }
    /**
     * Create `RepresentationStream`s starting with the Representation of the last
     * estimate performed.
     * Each time a new estimate is made, this function will create a new
     * `RepresentationStream` corresponding to that new estimate.
     * @param {Object} fnCancelSignal - `CancellationSignal` which will abort
     * anything this function is doing and free allocated resources.
     */
    function recursivelyCreateRepresentationStreams(fnCancelSignal) {
        /**
         * `TaskCanceller` triggered when the current `RepresentationStream` is
         * terminating and as such the next one might be immediately created
         * recursively.
         */
        var repStreamTerminatingCanceller = new task_canceller_1.default();
        repStreamTerminatingCanceller.linkToSignal(fnCancelSignal);
        var representation = estimateRef.getValue().representation;
        if (representation === null) {
            return;
        }
        /**
         * Stores the last estimate emitted, starting with `null`.
         * This allows to easily rely on that value in inner Observables which might also
         * need the last already-considered value.
         */
        var terminateCurrentStream = new reference_1.default(null, repStreamTerminatingCanceller.signal);
        /** Allows to stop listening to estimateRef on the following line. */
        estimateRef.onUpdate(function (estimate) {
            if (estimate.representation === null ||
                estimate.representation.id === representation.id) {
                return;
            }
            if (estimate.urgent) {
                log_1.default.info("Stream: urgent Representation switch", adaptation.type);
                return terminateCurrentStream.setValue({ urgent: true });
            }
            else {
                log_1.default.info("Stream: slow Representation switch", adaptation.type);
                return terminateCurrentStream.setValue({ urgent: false });
            }
        }, {
            clearSignal: repStreamTerminatingCanceller.signal,
            emitCurrentValue: true,
        });
        var repInfo = {
            type: adaptation.type,
            adaptation: adaptation,
            period: period,
            representation: representation,
        };
        currentRepresentation.setValue(representation);
        if (adapStreamCanceller.isUsed()) {
            return; // previous callback has stopped everything by side-effect
        }
        callbacks.representationChange(repInfo);
        if (adapStreamCanceller.isUsed()) {
            return; // previous callback has stopped everything by side-effect
        }
        var representationStreamCallbacks = {
            streamStatusUpdate: callbacks.streamStatusUpdate,
            encryptionDataEncountered: callbacks.encryptionDataEncountered,
            manifestMightBeOufOfSync: callbacks.manifestMightBeOufOfSync,
            needsManifestRefresh: callbacks.needsManifestRefresh,
            inbandEvent: callbacks.inbandEvent,
            warning: callbacks.warning,
            error: function (err) {
                adapStreamCanceller.cancel();
                callbacks.error(err);
            },
            addedSegment: function (segmentInfo) {
                abrCallbacks.addedSegment(segmentInfo);
            },
            terminating: function () {
                if (repStreamTerminatingCanceller.isUsed()) {
                    return; // Already handled
                }
                repStreamTerminatingCanceller.cancel();
                return recursivelyCreateRepresentationStreams(fnCancelSignal);
            },
        };
        createRepresentationStream(representation, terminateCurrentStream, representationStreamCallbacks, fnCancelSignal);
    }
    /**
     * Create and returns a new `RepresentationStream`, linked to the
     * given Representation.
     * @param {Object} representation - The Representation the
     * `RepresentationStream` has to be created for.
     * @param {Object} terminateCurrentStream - Gives termination orders,
     * indicating that the `RepresentationStream` should stop what it's doing.
     * @param {Object} representationStreamCallbacks - Callbacks to call on
     * various `RepresentationStream` events.
     * @param {Object} fnCancelSignal - `CancellationSignal` which will abort
     * anything this function is doing and free allocated resources.
     */
    function createRepresentationStream(representation, terminateCurrentStream, representationStreamCallbacks, fnCancelSignal) {
        var bufferGoalCanceller = new task_canceller_1.default();
        bufferGoalCanceller.linkToSignal(fnCancelSignal);
        var bufferGoal = (0, reference_1.createMappedReference)(wantedBufferAhead, function (prev) {
            return prev * getBufferGoalRatio(representation);
        }, bufferGoalCanceller.signal);
        var maxBufferSize = adaptation.type === "video" ? maxVideoBufferSize : new reference_1.default(Infinity);
        log_1.default.info("Stream: changing representation", adaptation.type, representation.id, representation.bitrate);
        var updatedCallbacks = (0, object_assign_1.default)({}, representationStreamCallbacks, {
            error: function (err) {
                var _a;
                var formattedError = (0, errors_1.formatError)(err, {
                    defaultCode: "NONE",
                    defaultReason: "Unknown `RepresentationStream` error",
                });
                if (formattedError.code !== "BUFFER_FULL_ERROR") {
                    representationStreamCallbacks.error(err);
                }
                else {
                    var wba = wantedBufferAhead.getValue();
                    var lastBufferGoalRatio = (_a = bufferGoalRatioMap.get(representation.id)) !== null && _a !== void 0 ? _a : 1;
                    // 70%, 49%, 34.3%, 24%, 16.81%, 11.76%, 8.24% and 5.76%
                    var newBufferGoalRatio = lastBufferGoalRatio * 0.7;
                    if (newBufferGoalRatio <= 0.05 || wba * newBufferGoalRatio <= 2) {
                        throw formattedError;
                    }
                    bufferGoalRatioMap.set(representation.id, newBufferGoalRatio);
                    // We wait 4 seconds to let the situation evolve by itself before
                    // retrying loading segments with a lower buffer goal
                    (0, cancellable_sleep_1.default)(4000, adapStreamCanceller.signal)
                        .then(function () {
                        return createRepresentationStream(representation, terminateCurrentStream, representationStreamCallbacks, fnCancelSignal);
                    })
                        .catch(noop_1.default);
                }
            },
            terminating: function () {
                bufferGoalCanceller.cancel();
                representationStreamCallbacks.terminating();
            },
        });
        (0, representation_1.default)({
            playbackObserver: playbackObserver,
            content: { representation: representation, adaptation: adaptation, period: period, manifest: manifest },
            segmentSink: segmentSink,
            segmentFetcher: segmentFetcher,
            terminate: terminateCurrentStream,
            options: {
                bufferGoal: bufferGoal,
                maxBufferSize: maxBufferSize,
                drmSystemId: options.drmSystemId,
                fastSwitchThreshold: fastSwitchThreshold,
            },
        }, updatedCallbacks, fnCancelSignal);
        // reload if the Representation disappears from the Manifest
        manifest.addEventListener("manifestUpdate", function (updates) {
            var e_2, _a, e_3, _b, e_4, _c;
            try {
                for (var _d = __values(updates.updatedPeriods), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var element = _e.value;
                    if (element.period.id === period.id) {
                        try {
                            for (var _f = (e_3 = void 0, __values(element.result.updatedAdaptations)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var updated = _g.value;
                                if (updated.adaptation === adaptation.id) {
                                    try {
                                        for (var _h = (e_4 = void 0, __values(updated.removedRepresentations)), _j = _h.next(); !_j.done; _j = _h.next()) {
                                            var rep = _j.value;
                                            if (rep === representation.id) {
                                                if (fnCancelSignal.isCancelled()) {
                                                    return;
                                                }
                                                return callbacks.waitingMediaSourceReload({
                                                    bufferType: adaptation.type,
                                                    period: period,
                                                    timeOffset: 0,
                                                    stayInPeriod: true,
                                                });
                                            }
                                        }
                                    }
                                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                                    finally {
                                        try {
                                            if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                                        }
                                        finally { if (e_4) throw e_4.error; }
                                    }
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
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
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }, fnCancelSignal);
    }
    /**
     * @param {Object} representation
     * @returns {number}
     */
    function getBufferGoalRatio(representation) {
        var oldBufferGoalRatio = bufferGoalRatioMap.get(representation.id);
        var bufferGoalRatio = oldBufferGoalRatio !== undefined ? oldBufferGoalRatio : 1;
        if (oldBufferGoalRatio === undefined) {
            bufferGoalRatioMap.set(representation.id, bufferGoalRatio);
        }
        return bufferGoalRatio;
    }
}
exports.default = AdaptationStream;
