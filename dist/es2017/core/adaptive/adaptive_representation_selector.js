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
import config from "../../config";
import log from "../../log";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import noop from "../../utils/noop";
import { getLeftSizeOfRange } from "../../utils/ranges";
import SharedReference from "../../utils/reference";
import TaskCanceller from "../../utils/task_canceller";
import BufferBasedChooser from "./buffer_based_chooser";
import GuessBasedChooser from "./guess_based_chooser";
import NetworkAnalyzer from "./network_analyzer";
import BandwidthEstimator from "./utils/bandwidth_estimator";
import filterByBitrate from "./utils/filter_by_bitrate";
import filterByResolution from "./utils/filter_by_resolution";
import LastEstimateStorage from "./utils/last_estimate_storage";
import PendingRequestsStore from "./utils/pending_requests_store";
import RepresentationScoreCalculator from "./utils/representation_score_calculator";
import selectOptimalRepresentation from "./utils/select_optimal_representation";
// Create default shared references
const limitResolutionDefaultRef = new SharedReference(undefined);
limitResolutionDefaultRef.finish();
const throttleBitrateDefaultRef = new SharedReference(Infinity);
throttleBitrateDefaultRef.finish();
/**
 * Select the most adapted Representation according to the network and buffer
 * metrics it receives.
 *
 * @param {Object} options - Initial configuration (see type definition)
 * @returns {Object} - Interface allowing to select a Representation.
 * @see IRepresentationEstimator
 */
export default function createAdaptiveRepresentationSelector(options) {
    /**
     * Allows to estimate the current network bandwidth.
     * One per active media type.
     */
    const bandwidthEstimators = {};
    const { initialBitrates, throttlers, lowLatencyMode } = options;
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
        const { type } = context.adaptation;
        const bandwidthEstimator = _getBandwidthEstimator(type);
        const initialBitrate = (_a = initialBitrates[type]) !== null && _a !== void 0 ? _a : 0;
        const filters = {
            limitResolution: (_b = throttlers.limitResolution[type]) !== null && _b !== void 0 ? _b : limitResolutionDefaultRef,
            throttleBitrate: (_c = throttlers.throttleBitrate[type]) !== null && _c !== void 0 ? _c : throttleBitrateDefaultRef,
        };
        return getEstimateReference({
            bandwidthEstimator,
            context,
            currentRepresentation,
            filters,
            initialBitrate,
            playbackObserver,
            representations,
            lowLatencyMode,
        }, stopAllEstimates);
    };
    /**
     * Returns interface allowing to estimate network throughtput for a given type.
     * @param {string} bufferType
     * @returns {Object}
     */
    function _getBandwidthEstimator(bufferType) {
        const originalBandwidthEstimator = bandwidthEstimators[bufferType];
        if (isNullOrUndefined(originalBandwidthEstimator)) {
            log.debug("ABR: Creating new BandwidthEstimator for ", bufferType);
            const bandwidthEstimator = new BandwidthEstimator();
            bandwidthEstimators[bufferType] = bandwidthEstimator;
            return bandwidthEstimator;
        }
        return originalBandwidthEstimator;
    }
}
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
function getEstimateReference({ bandwidthEstimator, context, currentRepresentation, filters, initialBitrate, lowLatencyMode, playbackObserver, representations: representationsRef, }, stopAllEstimates) {
    const scoreCalculator = new RepresentationScoreCalculator();
    const networkAnalyzer = new NetworkAnalyzer(initialBitrate !== null && initialBitrate !== void 0 ? initialBitrate : 0, lowLatencyMode);
    const requestsStore = new PendingRequestsStore();
    /**
     * Callback called each time a new segment is pushed, with the information on the
     * new pushed segment.
     */
    let onAddedSegment = noop;
    const callbacks = {
        metrics: onMetric,
        requestBegin: onRequestBegin,
        requestProgress: onRequestProgress,
        requestEnd: onRequestEnd,
        addedSegment(val) {
            onAddedSegment(val);
        },
    };
    /**
     * `TaskCanceller` allowing to stop producing estimate.
     * This TaskCanceller is used both for restarting estimates with a new
     * configuration and to cancel them altogether.
     */
    let currentEstimatesCanceller = new TaskCanceller();
    currentEstimatesCanceller.linkToSignal(stopAllEstimates);
    // Create `SharedReference` on which estimates will be emitted.
    const estimateRef = createEstimateReference(representationsRef.getValue(), currentEstimatesCanceller.signal);
    representationsRef.onUpdate(restartEstimatesProductionFromCurrentConditions, {
        clearSignal: stopAllEstimates,
    });
    return { estimates: estimateRef, callbacks };
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
            return new SharedReference({
                bitrate: undefined,
                representation: unsortedRepresentations[0],
                urgent: true,
                knownStableBitrate: undefined,
            });
        }
        /** If true, Representation estimates based on the buffer health might be used. */
        let allowBufferBasedEstimates = false;
        /** Ensure `Representation` objects are sorted by bitrates and only rely on this. */
        const sortedRepresentations = unsortedRepresentations.sort((ra, rb) => ra.bitrate - rb.bitrate);
        /**
         * Module calculating the optimal Representation based on the current
         * buffer's health (i.e. whether enough data is buffered, history of
         * buffer size etc.).
         */
        const bufferBasedChooser = new BufferBasedChooser(sortedRepresentations.map((r) => r.bitrate));
        /** Store the previous estimate made here. */
        const prevEstimate = new LastEstimateStorage();
        /**
         * Module calculating the optimal Representation by "guessing it" with a
         * step-by-step algorithm.
         * Only used in very specific scenarios.
         */
        const guessBasedChooser = new GuessBasedChooser(scoreCalculator, prevEstimate);
        // get initial observation for initial estimate
        let lastPlaybackObservation = playbackObserver.getReference().getValue();
        /** Reference through which estimates are emitted. */
        const innerEstimateRef = new SharedReference(getCurrentEstimate());
        // Listen to playback observations
        playbackObserver.listen((obs) => {
            lastPlaybackObservation = obs;
            updateEstimate();
        }, { includeLastObservation: false, clearSignal: innerCancellationSignal });
        onAddedSegment = function (val) {
            if (lastPlaybackObservation === null) {
                return;
            }
            const { position, speed } = lastPlaybackObservation;
            const timeRanges = val.buffered;
            const bufferGap = getLeftSizeOfRange(timeRanges, position.getWanted());
            const { representation } = val.content;
            const currentScore = scoreCalculator.getEstimate(representation);
            const currentBitrate = representation.bitrate;
            const observation = { bufferGap, currentBitrate, currentScore, speed };
            bufferBasedChooser.onAddedSegment(observation);
            updateEstimate();
        };
        innerCancellationSignal.register(() => {
            onAddedSegment = noop;
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
            const { bufferGap, position, maximumPosition } = lastPlaybackObservation;
            const resolutionLimit = filters.limitResolution.getValue();
            const bitrateThrottle = filters.throttleBitrate.getValue();
            const currentRepresentationVal = currentRepresentation.getValue();
            const filteredReps = getFilteredRepresentations(sortedRepresentations, resolutionLimit, bitrateThrottle);
            const requests = requestsStore.getRequests();
            const { bandwidthEstimate, bitrateChosen } = networkAnalyzer.getBandwidthEstimate(lastPlaybackObservation, bandwidthEstimator, currentRepresentationVal, requests, prevEstimate.bandwidth);
            const stableRepresentation = scoreCalculator.getLastStableRepresentation();
            const knownStableBitrate = stableRepresentation === null
                ? undefined
                : stableRepresentation.bitrate /
                    (lastPlaybackObservation.speed > 0 ? lastPlaybackObservation.speed : 1);
            const { ABR_ENTER_BUFFER_BASED_ALGO, ABR_EXIT_BUFFER_BASED_ALGO } = config.getCurrent();
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
            const chosenRepFromBandwidth = selectOptimalRepresentation(filteredReps, bitrateChosen);
            /**
             * Current optimal Representation's bandwidth choosen by a buffer-based
             * adaptive algorithm.
             */
            const currentBufferBasedEstimate = bufferBasedChooser.getLastEstimate();
            let currentBestBitrate = chosenRepFromBandwidth.bitrate;
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
            let chosenRepFromBufferSize = null;
            if (allowBufferBasedEstimates &&
                currentBufferBasedEstimate !== undefined &&
                currentBufferBasedEstimate > currentBestBitrate) {
                chosenRepFromBufferSize = selectOptimalRepresentation(filteredReps, currentBufferBasedEstimate);
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
            let chosenRepFromGuessMode = null;
            if (lowLatencyMode &&
                currentRepresentationVal !== null &&
                context.manifest.isDynamic &&
                maximumPosition - position.getWanted() < 40) {
                chosenRepFromGuessMode = guessBasedChooser.getGuess(sortedRepresentations, lastPlaybackObservation, currentRepresentationVal, currentBestBitrate, requests);
            }
            if (chosenRepFromGuessMode !== null &&
                chosenRepFromGuessMode.bitrate > currentBestBitrate) {
                log.debug("ABR: Choosing representation with guess-based estimation.", chosenRepFromGuessMode.bitrate, chosenRepFromGuessMode.id);
                prevEstimate.update(chosenRepFromGuessMode, bandwidthEstimate, 2 /* ABRAlgorithmType.GuessBased */);
                return {
                    bitrate: bandwidthEstimate,
                    representation: chosenRepFromGuessMode,
                    urgent: currentRepresentationVal === null ||
                        chosenRepFromGuessMode.bitrate < currentRepresentationVal.bitrate,
                    knownStableBitrate,
                };
            }
            else if (chosenRepFromBufferSize !== null) {
                log.debug("ABR: Choosing representation with buffer-based estimation.", chosenRepFromBufferSize.bitrate, chosenRepFromBufferSize.id);
                prevEstimate.update(chosenRepFromBufferSize, bandwidthEstimate, 0 /* ABRAlgorithmType.BufferBased */);
                return {
                    bitrate: bandwidthEstimate,
                    representation: chosenRepFromBufferSize,
                    urgent: networkAnalyzer.isUrgent(chosenRepFromBufferSize.bitrate, currentRepresentationVal, requests, lastPlaybackObservation),
                    knownStableBitrate,
                };
            }
            else {
                log.debug("ABR: Choosing representation with bandwidth estimation.", chosenRepFromBandwidth.bitrate, chosenRepFromBandwidth.id);
                prevEstimate.update(chosenRepFromBandwidth, bandwidthEstimate, 1 /* ABRAlgorithmType.BandwidthBased */);
                return {
                    bitrate: bandwidthEstimate,
                    representation: chosenRepFromBandwidth,
                    urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate, currentRepresentationVal, requests, lastPlaybackObservation),
                    knownStableBitrate,
                };
            }
        }
    }
    /**
     * Stop previous estimate production (if one) and restart it considering new
     * conditions (such as a new list of Representations).
     */
    function restartEstimatesProductionFromCurrentConditions() {
        const representations = representationsRef.getValue();
        currentEstimatesCanceller.cancel();
        currentEstimatesCanceller = new TaskCanceller();
        currentEstimatesCanceller.linkToSignal(stopAllEstimates);
        const newRef = createEstimateReference(representations, currentEstimatesCanceller.signal);
        newRef.onUpdate(function onNewEstimate(newEstimate) {
            estimateRef.setValue(newEstimate);
        }, { clearSignal: currentEstimatesCanceller.signal, emitCurrentValue: true });
    }
    /**
     * Callback to call when new metrics are available
     * @param {Object} value
     */
    function onMetric(value) {
        const { requestDuration, segmentDuration, size, content } = value;
        // calculate bandwidth
        bandwidthEstimator.addSample(requestDuration, size);
        if (!content.segment.isInit) {
            // calculate "maintainability score"
            const { segment, representation } = content;
            if (segmentDuration === undefined && !segment.complete) {
                // We cannot know the real duration of the segment
                return;
            }
            const segDur = segmentDuration !== null && segmentDuration !== void 0 ? segmentDuration : segment.duration;
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
    let filteredReps = representations;
    if (bitrateThrottle !== undefined && bitrateThrottle < Infinity) {
        filteredReps = filterByBitrate(filteredReps, bitrateThrottle);
    }
    if (resolutionLimit !== undefined) {
        filteredReps = filterByResolution(filteredReps, resolutionLimit);
    }
    return filteredReps;
}
