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
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("../../config");
var log_1 = require("../../log");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var noop_1 = require("../../utils/noop");
var ranges_1 = require("../../utils/ranges");
var reference_1 = require("../../utils/reference");
var task_canceller_1 = require("../../utils/task_canceller");
var buffer_based_chooser_1 = require("./buffer_based_chooser");
var guess_based_chooser_1 = require("./guess_based_chooser");
var network_analyzer_1 = require("./network_analyzer");
var bandwidth_estimator_1 = require("./utils/bandwidth_estimator");
var filter_by_bitrate_1 = require("./utils/filter_by_bitrate");
var filter_by_resolution_1 = require("./utils/filter_by_resolution");
var last_estimate_storage_1 = require("./utils/last_estimate_storage");
var pending_requests_store_1 = require("./utils/pending_requests_store");
var representation_score_calculator_1 = require("./utils/representation_score_calculator");
var select_optimal_representation_1 = require("./utils/select_optimal_representation");
// Create default shared references
var limitResolutionDefaultRef = new reference_1.default(undefined);
limitResolutionDefaultRef.finish();
var throttleBitrateDefaultRef = new reference_1.default(Infinity);
throttleBitrateDefaultRef.finish();
/**
 * Select the most adapted Representation according to the network and buffer
 * metrics it receives.
 *
 * @param {Object} options - Initial configuration (see type definition)
 * @returns {Object} - Interface allowing to select a Representation.
 * @see IRepresentationEstimator
 */
function createAdaptiveRepresentationSelector(options) {
    /**
     * Allows to estimate the current network bandwidth.
     * One per active media type.
     */
    var bandwidthEstimators = {};
    var initialBitrates = options.initialBitrates, throttlers = options.throttlers, lowLatencyMode = options.lowLatencyMode;
    /**
     * Returns Object emitting Representation estimates as well as callbacks
     * allowing to helping it produce them.
     *
     * @see IRepresentationEstimator
     * @param {Object} context
     * @param {Object} currentRepresentation
     * @param {Object} representations
     * @param {Object} playbackObserver
     * @param {Object} stopAllEstimates
     * @returns {Array.<Object>}
     */
    return function getEstimates(context, currentRepresentation, representations, playbackObserver, stopAllEstimates) {
        var _a, _b, _c;
        var type = context.adaptation.type;
        var bandwidthEstimator = _getBandwidthEstimator(type);
        var initialBitrate = (_a = initialBitrates[type]) !== null && _a !== void 0 ? _a : 0;
        var filters = {
            limitResolution: (_b = throttlers.limitResolution[type]) !== null && _b !== void 0 ? _b : limitResolutionDefaultRef,
            throttleBitrate: (_c = throttlers.throttleBitrate[type]) !== null && _c !== void 0 ? _c : throttleBitrateDefaultRef,
        };
        return getEstimateReference({
            bandwidthEstimator: bandwidthEstimator,
            context: context,
            currentRepresentation: currentRepresentation,
            filters: filters,
            initialBitrate: initialBitrate,
            playbackObserver: playbackObserver,
            representations: representations,
            lowLatencyMode: lowLatencyMode,
        }, stopAllEstimates);
    };
    /**
     * Returns interface allowing to estimate network throughtput for a given type.
     * @param {string} bufferType
     * @returns {Object}
     */
    function _getBandwidthEstimator(bufferType) {
        var originalBandwidthEstimator = bandwidthEstimators[bufferType];
        if ((0, is_null_or_undefined_1.default)(originalBandwidthEstimator)) {
            log_1.default.debug("ABR: Creating new BandwidthEstimator for ", bufferType);
            var bandwidthEstimator = new bandwidth_estimator_1.default();
            bandwidthEstimators[bufferType] = bandwidthEstimator;
            return bandwidthEstimator;
        }
        return originalBandwidthEstimator;
    }
}
exports.default = createAdaptiveRepresentationSelector;
/**
 * Estimate regularly the current network bandwidth and the best Representation
 * that can be played according to the current network and playback conditions.
 *
 * `getEstimateReference` only does estimations for a given type (e.g.
 * "audio", "video" etc.) and Period.
 *
 * If estimates for multiple types and/or Periods are needed, you should
 * call `getEstimateReference` as many times.
 *
 * This function returns a tuple:
 *   - the first element being the object through which estimates will be produced
 *   - the second element being callbacks that have to be triggered at various
 *     events to help it doing those estimates.
 *
 * @param {Object} args
 * @param {Object} stopAllEstimates
 * @returns {Array.<Object>}
 */
function getEstimateReference(_a, stopAllEstimates) {
    var bandwidthEstimator = _a.bandwidthEstimator, context = _a.context, currentRepresentation = _a.currentRepresentation, filters = _a.filters, initialBitrate = _a.initialBitrate, lowLatencyMode = _a.lowLatencyMode, playbackObserver = _a.playbackObserver, representationsRef = _a.representations;
    var scoreCalculator = new representation_score_calculator_1.default();
    var networkAnalyzer = new network_analyzer_1.default(initialBitrate !== null && initialBitrate !== void 0 ? initialBitrate : 0, lowLatencyMode);
    var requestsStore = new pending_requests_store_1.default();
    /**
     * Callback called each time a new segment is pushed, with the information on the
     * new pushed segment.
     */
    var onAddedSegment = noop_1.default;
    var callbacks = {
        metrics: onMetric,
        requestBegin: onRequestBegin,
        requestProgress: onRequestProgress,
        requestEnd: onRequestEnd,
        addedSegment: function (val) {
            onAddedSegment(val);
        },
    };
    /**
     * `TaskCanceller` allowing to stop producing estimate.
     * This TaskCanceller is used both for restarting estimates with a new
     * configuration and to cancel them altogether.
     */
    var currentEstimatesCanceller = new task_canceller_1.default();
    currentEstimatesCanceller.linkToSignal(stopAllEstimates);
    // Create `SharedReference` on which estimates will be emitted.
    var estimateRef = createEstimateReference(representationsRef.getValue(), currentEstimatesCanceller.signal);
    representationsRef.onUpdate(restartEstimatesProductionFromCurrentConditions, {
        clearSignal: stopAllEstimates,
    });
    return { estimates: estimateRef, callbacks: callbacks };
    /**
     * Emit the ABR estimates on various events through the returned
     * `SharedReference`.
     * @param {Array.<Object>} unsortedRepresentations - All `Representation` that
     * the ABR logic can choose from.
     * @param {Object} innerCancellationSignal - When this `CancellationSignal`
     * emits, all events registered to to emit new estimates will be unregistered.
     * Note that the returned reference may still be used to produce new estimates
     * in the future if you want to even after this signal emits.
     * @returns {Object} - `SharedReference` through which ABR estimates will be
     * produced.
     */
    function createEstimateReference(unsortedRepresentations, innerCancellationSignal) {
        if (unsortedRepresentations.length <= 1) {
            // There's only a single Representation. Just choose it.
            return new reference_1.default({
                bitrate: undefined,
                representation: unsortedRepresentations[0],
                urgent: true,
                knownStableBitrate: undefined,
            });
        }
        /** If true, Representation estimates based on the buffer health might be used. */
        var allowBufferBasedEstimates = false;
        /** Ensure `Representation` objects are sorted by bitrates and only rely on this. */
        var sortedRepresentations = unsortedRepresentations.sort(function (ra, rb) { return ra.bitrate - rb.bitrate; });
        /**
         * Module calculating the optimal Representation based on the current
         * buffer's health (i.e. whether enough data is buffered, history of
         * buffer size etc.).
         */
        var bufferBasedChooser = new buffer_based_chooser_1.default(sortedRepresentations.map(function (r) { return r.bitrate; }));
        /** Store the previous estimate made here. */
        var prevEstimate = new last_estimate_storage_1.default();
        /**
         * Module calculating the optimal Representation by "guessing it" with a
         * step-by-step algorithm.
         * Only used in very specific scenarios.
         */
        var guessBasedChooser = new guess_based_chooser_1.default(scoreCalculator, prevEstimate);
        // get initial observation for initial estimate
        var lastPlaybackObservation = playbackObserver.getReference().getValue();
        /** Reference through which estimates are emitted. */
        var innerEstimateRef = new reference_1.default(getCurrentEstimate());
        // Listen to playback observations
        playbackObserver.listen(function (obs) {
            lastPlaybackObservation = obs;
            updateEstimate();
        }, { includeLastObservation: false, clearSignal: innerCancellationSignal });
        onAddedSegment = function (val) {
            if (lastPlaybackObservation === null) {
                return;
            }
            var position = lastPlaybackObservation.position, speed = lastPlaybackObservation.speed;
            var timeRanges = val.buffered;
            var bufferGap = (0, ranges_1.getLeftSizeOfRange)(timeRanges, position.getWanted());
            var representation = val.content.representation;
            var currentScore = scoreCalculator.getEstimate(representation);
            var currentBitrate = representation.bitrate;
            var observation = { bufferGap: bufferGap, currentBitrate: currentBitrate, currentScore: currentScore, speed: speed };
            bufferBasedChooser.onAddedSegment(observation);
            updateEstimate();
        };
        innerCancellationSignal.register(function () {
            onAddedSegment = noop_1.default;
        });
        filters.throttleBitrate.onUpdate(updateEstimate, {
            clearSignal: innerCancellationSignal,
        });
        filters.limitResolution.onUpdate(updateEstimate, {
            clearSignal: innerCancellationSignal,
        });
        return innerEstimateRef;
        function updateEstimate() {
            innerEstimateRef.setValue(getCurrentEstimate());
        }
        /** Returns the actual estimate based on all methods and algorithm available. */
        function getCurrentEstimate() {
            var bufferGap = lastPlaybackObservation.bufferGap, position = lastPlaybackObservation.position, maximumPosition = lastPlaybackObservation.maximumPosition;
            var resolutionLimit = filters.limitResolution.getValue();
            var bitrateThrottle = filters.throttleBitrate.getValue();
            var currentRepresentationVal = currentRepresentation.getValue();
            var filteredReps = getFilteredRepresentations(sortedRepresentations, resolutionLimit, bitrateThrottle);
            var requests = requestsStore.getRequests();
            var _a = networkAnalyzer.getBandwidthEstimate(lastPlaybackObservation, bandwidthEstimator, currentRepresentationVal, requests, prevEstimate.bandwidth), bandwidthEstimate = _a.bandwidthEstimate, bitrateChosen = _a.bitrateChosen;
            var stableRepresentation = scoreCalculator.getLastStableRepresentation();
            var knownStableBitrate = stableRepresentation === null
                ? undefined
                : stableRepresentation.bitrate /
                    (lastPlaybackObservation.speed > 0 ? lastPlaybackObservation.speed : 1);
            var _b = config_1.default.getCurrent(), ABR_ENTER_BUFFER_BASED_ALGO = _b.ABR_ENTER_BUFFER_BASED_ALGO, ABR_EXIT_BUFFER_BASED_ALGO = _b.ABR_EXIT_BUFFER_BASED_ALGO;
            if (allowBufferBasedEstimates && bufferGap <= ABR_EXIT_BUFFER_BASED_ALGO) {
                allowBufferBasedEstimates = false;
            }
            else if (!allowBufferBasedEstimates &&
                isFinite(bufferGap) &&
                bufferGap >= ABR_ENTER_BUFFER_BASED_ALGO) {
                allowBufferBasedEstimates = true;
            }
            /**
             * Representation chosen when considering only [pessimist] bandwidth
             * calculation.
             * This is a safe enough choice but might be lower than what the user
             * could actually profit from.
             */
            var chosenRepFromBandwidth = (0, select_optimal_representation_1.default)(filteredReps, bitrateChosen);
            /**
             * Current optimal Representation's bandwidth choosen by a buffer-based
             * adaptive algorithm.
             */
            var currentBufferBasedEstimate = bufferBasedChooser.getLastEstimate();
            var currentBestBitrate = chosenRepFromBandwidth.bitrate;
            /**
             * Representation chosen when considering the current buffer size.
             * If defined, takes precedence over `chosenRepFromBandwidth`.
             *
             * This is a very safe choice, yet it is very slow and might not be
             * adapted to cases where a buffer cannot be build, such as live contents.
             *
             * `null` if this buffer size mode is not enabled or if we don't have a
             * choice from it yet.
             */
            var chosenRepFromBufferSize = null;
            if (allowBufferBasedEstimates &&
                currentBufferBasedEstimate !== undefined &&
                currentBufferBasedEstimate > currentBestBitrate) {
                chosenRepFromBufferSize = (0, select_optimal_representation_1.default)(filteredReps, currentBufferBasedEstimate);
                currentBestBitrate = chosenRepFromBufferSize.bitrate;
            }
            /**
             * Representation chosen by the more adventurous `GuessBasedChooser`,
             * which iterates through Representations one by one until finding one
             * that cannot be "maintained".
             *
             * If defined, takes precedence over both `chosenRepFromBandwidth` and
             * `chosenRepFromBufferSize`.
             *
             * This is the riskiest choice (in terms of rebuffering chances) but is
             * only enabled when no other solution is adapted (for now, this just
             * applies for low-latency contents when playing close to the live
             * edge).
             *
             * `null` if not enabled or if there's currently no guess.
             */
            var chosenRepFromGuessMode = null;
            if (lowLatencyMode &&
                currentRepresentationVal !== null &&
                context.manifest.isDynamic &&
                maximumPosition - position.getWanted() < 40) {
                chosenRepFromGuessMode = guessBasedChooser.getGuess(sortedRepresentations, lastPlaybackObservation, currentRepresentationVal, currentBestBitrate, requests);
            }
            if (chosenRepFromGuessMode !== null &&
                chosenRepFromGuessMode.bitrate > currentBestBitrate) {
                log_1.default.debug("ABR: Choosing representation with guess-based estimation.", chosenRepFromGuessMode.bitrate, chosenRepFromGuessMode.id);
                prevEstimate.update(chosenRepFromGuessMode, bandwidthEstimate, 2 /* ABRAlgorithmType.GuessBased */);
                return {
                    bitrate: bandwidthEstimate,
                    representation: chosenRepFromGuessMode,
                    urgent: currentRepresentationVal === null ||
                        chosenRepFromGuessMode.bitrate < currentRepresentationVal.bitrate,
                    knownStableBitrate: knownStableBitrate,
                };
            }
            else if (chosenRepFromBufferSize !== null) {
                log_1.default.debug("ABR: Choosing representation with buffer-based estimation.", chosenRepFromBufferSize.bitrate, chosenRepFromBufferSize.id);
                prevEstimate.update(chosenRepFromBufferSize, bandwidthEstimate, 0 /* ABRAlgorithmType.BufferBased */);
                return {
                    bitrate: bandwidthEstimate,
                    representation: chosenRepFromBufferSize,
                    urgent: networkAnalyzer.isUrgent(chosenRepFromBufferSize.bitrate, currentRepresentationVal, requests, lastPlaybackObservation),
                    knownStableBitrate: knownStableBitrate,
                };
            }
            else {
                log_1.default.debug("ABR: Choosing representation with bandwidth estimation.", chosenRepFromBandwidth.bitrate, chosenRepFromBandwidth.id);
                prevEstimate.update(chosenRepFromBandwidth, bandwidthEstimate, 1 /* ABRAlgorithmType.BandwidthBased */);
                return {
                    bitrate: bandwidthEstimate,
                    representation: chosenRepFromBandwidth,
                    urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate, currentRepresentationVal, requests, lastPlaybackObservation),
                    knownStableBitrate: knownStableBitrate,
                };
            }
        }
    }
    /**
     * Stop previous estimate production (if one) and restart it considering new
     * conditions (such as a new list of Representations).
     */
    function restartEstimatesProductionFromCurrentConditions() {
        var representations = representationsRef.getValue();
        currentEstimatesCanceller.cancel();
        currentEstimatesCanceller = new task_canceller_1.default();
        currentEstimatesCanceller.linkToSignal(stopAllEstimates);
        var newRef = createEstimateReference(representations, currentEstimatesCanceller.signal);
        newRef.onUpdate(function onNewEstimate(newEstimate) {
            estimateRef.setValue(newEstimate);
        }, { clearSignal: currentEstimatesCanceller.signal, emitCurrentValue: true });
    }
    /**
     * Callback to call when new metrics are available
     * @param {Object} value
     */
    function onMetric(value) {
        var requestDuration = value.requestDuration, segmentDuration = value.segmentDuration, size = value.size, content = value.content;
        // calculate bandwidth
        bandwidthEstimator.addSample(requestDuration, size);
        if (!content.segment.isInit) {
            // calculate "maintainability score"
            var segment = content.segment, representation = content.representation;
            if (segmentDuration === undefined && !segment.complete) {
                // We cannot know the real duration of the segment
                return;
            }
            var segDur = segmentDuration !== null && segmentDuration !== void 0 ? segmentDuration : segment.duration;
            scoreCalculator.addSample(representation, requestDuration / 1000, segDur);
        }
    }
    /** Callback called when a new request begins. */
    function onRequestBegin(val) {
        requestsStore.add(val);
    }
    /** Callback called when progress information is known on a pending request. */
    function onRequestProgress(val) {
        requestsStore.addProgress(val);
    }
    /** Callback called when a pending request ends. */
    function onRequestEnd(val) {
        requestsStore.remove(val.id);
    }
}
/**
 * Filter representations given through filters options.
 * @param {Array.<Representation>} representations
 * @param {Object | undefined} resolutionLimit
 * @param {number | undefined} bitrateThrottle
 * @returns {Array.<Representation>}
 */
function getFilteredRepresentations(representations, resolutionLimit, bitrateThrottle) {
    var filteredReps = representations;
    if (bitrateThrottle !== undefined && bitrateThrottle < Infinity) {
        filteredReps = (0, filter_by_bitrate_1.default)(filteredReps, bitrateThrottle);
    }
    if (resolutionLimit !== undefined) {
        filteredReps = (0, filter_by_resolution_1.default)(filteredReps, resolutionLimit);
    }
    return filteredReps;
}
