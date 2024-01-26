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
import type {
  IAdaptation,
  IManifest,
  IPeriod,
  IRepresentation,
  ISegment,
} from "../../manifest";
import type {
  ObservationPosition,
  IReadOnlyPlaybackObserver,
} from "../../playback_observer";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import noop from "../../utils/noop";
import type { IRange } from "../../utils/ranges";
import { getLeftSizeOfRange } from "../../utils/ranges";
import type {
  IReadOnlySharedReference,
} from "../../utils/reference";
import SharedReference from "../../utils/reference";
import type {
  CancellationSignal,
} from "../../utils/task_canceller";
import TaskCanceller from "../../utils/task_canceller";
import type { IBufferType } from "../segment_sinks";
import BufferBasedChooser from "./buffer_based_chooser";
import GuessBasedChooser from "./guess_based_chooser";
import NetworkAnalyzer from "./network_analyzer";
import BandwidthEstimator from "./utils/bandwidth_estimator";
import filterByBitrate from "./utils/filter_by_bitrate";
import filterByResolution, {
  IResolutionInfo,
} from "./utils/filter_by_resolution";
import LastEstimateStorage, {
  ABRAlgorithmType,
} from "./utils/last_estimate_storage";
import type {
  IPendingRequestStoreBegin,
  IPendingRequestStoreProgress,
} from "./utils/pending_requests_store";
import PendingRequestsStore from "./utils/pending_requests_store";
import RepresentationScoreCalculator from "./utils/representation_score_calculator";
import selectOptimalRepresentation from "./utils/select_optimal_representation";

// Create default shared references

const limitResolutionDefaultRef = new SharedReference<
  IResolutionInfo | undefined
>(undefined);
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
export default function createAdaptiveRepresentationSelector(
  options : IAdaptiveRepresentationSelectorArguments
) : IRepresentationEstimator {
  /**
   * Allows to estimate the current network bandwidth.
   * One per active media type.
   */
  const bandwidthEstimators : Partial<Record<IBufferType, BandwidthEstimator>> = {};
  const { initialBitrates,
          throttlers,
          lowLatencyMode } = options;

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
  return function getEstimates(
    context : { manifest : IManifest;
                period : IPeriod;
                adaptation : IAdaptation; },
    currentRepresentation : IReadOnlySharedReference<IRepresentation | null>,
    representations : IReadOnlySharedReference<IRepresentation[]>,
    playbackObserver : IReadOnlyPlaybackObserver<
      IRepresentationEstimatorPlaybackObservation
    >,
    stopAllEstimates : CancellationSignal
  ) : IRepresentationEstimatorResponse {
    const { type } = context.adaptation;
    const bandwidthEstimator = _getBandwidthEstimator(type);
    const initialBitrate = initialBitrates[type] ?? 0;
    const filters = {
      limitResolution: throttlers.limitResolution[type] ?? limitResolutionDefaultRef,
      throttleBitrate: throttlers.throttleBitrate[type] ?? throttleBitrateDefaultRef,
    };
    return getEstimateReference({ bandwidthEstimator,
                                  context,
                                  currentRepresentation,
                                  filters,
                                  initialBitrate,
                                  playbackObserver,
                                  representations,
                                  lowLatencyMode },
                                stopAllEstimates);
  };

  /**
   * Returns interface allowing to estimate network throughtput for a given type.
   * @param {string} bufferType
   * @returns {Object}
   */
  function _getBandwidthEstimator(bufferType : IBufferType) : BandwidthEstimator {
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
function getEstimateReference(
  { bandwidthEstimator,
    context,
    currentRepresentation,
    filters,
    initialBitrate,
    lowLatencyMode,
    playbackObserver,
    representations : representationsRef } : IRepresentationEstimatorArguments,
  stopAllEstimates : CancellationSignal
) : IRepresentationEstimatorResponse {
  const scoreCalculator = new RepresentationScoreCalculator();
  const networkAnalyzer = new NetworkAnalyzer(initialBitrate ?? 0, lowLatencyMode);
  const requestsStore = new PendingRequestsStore();

  /**
   * Callback called each time a new segment is pushed, with the information on the
   * new pushed segment.
   */
  let onAddedSegment : (val : IAddedSegmentCallbackPayload) => void = noop;

  const callbacks : IRepresentationEstimatorCallbacks = {
    metrics: onMetric,
    requestBegin: onRequestBegin,
    requestProgress: onRequestProgress,
    requestEnd: onRequestEnd,
    addedSegment(val) { onAddedSegment(val); },
  };

  /**
   * `TaskCanceller` allowing to stop producing estimate.
   * This TaskCanceller is used both for restarting estimates with a new
   * configuration and to cancel them altogether.
   */
  let currentEstimatesCanceller = new TaskCanceller();
  currentEstimatesCanceller.linkToSignal(stopAllEstimates);

  // Create `SharedReference` on which estimates will be emitted.
  const estimateRef = createEstimateReference(representationsRef.getValue(),
                                              currentEstimatesCanceller.signal);
  representationsRef.onUpdate(restartEstimatesProductionFromCurrentConditions,
                              { clearSignal: stopAllEstimates });

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
  function createEstimateReference(
    unsortedRepresentations : IRepresentation[],
    innerCancellationSignal : CancellationSignal
  ) : SharedReference<IABREstimate> {
    if (unsortedRepresentations.length <= 1) {
      // There's only a single Representation. Just choose it.
      return new SharedReference<IABREstimate>({
        bitrate: undefined,
        representation: unsortedRepresentations[0],
        urgent: true,
        knownStableBitrate: undefined,
      });
    }

    /** If true, Representation estimates based on the buffer health might be used. */
    let allowBufferBasedEstimates = false;

    /** Ensure `Representation` objects are sorted by bitrates and only rely on this. */
    const sortedRepresentations = unsortedRepresentations
      .sort((ra, rb) => ra.bitrate - rb.bitrate);

    /**
     * Module calculating the optimal Representation based on the current
     * buffer's health (i.e. whether enough data is buffered, history of
     * buffer size etc.).
     */
    const bufferBasedChooser = new BufferBasedChooser(
      sortedRepresentations.map(r => r.bitrate)
    );

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
    const innerEstimateRef = new SharedReference<IABREstimate>(getCurrentEstimate());

    // Listen to playback observations
    playbackObserver.listen((obs) => {
      lastPlaybackObservation = obs;
      updateEstimate();
    }, { includeLastObservation: false, clearSignal: innerCancellationSignal });

    onAddedSegment = function (val : IAddedSegmentCallbackPayload) {
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

    filters.throttleBitrate.onUpdate(updateEstimate,
                                     { clearSignal: innerCancellationSignal });
    filters.limitResolution.onUpdate(updateEstimate,
                                     { clearSignal: innerCancellationSignal });

    return innerEstimateRef;

    function updateEstimate() : void {
      innerEstimateRef.setValue(getCurrentEstimate());
    }

    /** Returns the actual estimate based on all methods and algorithm available. */
    function getCurrentEstimate(): IABREstimate {
      const { bufferGap, position, maximumPosition } = lastPlaybackObservation;
      const resolutionLimit = filters.limitResolution.getValue();
      const bitrateThrottle = filters.throttleBitrate.getValue();
      const currentRepresentationVal = currentRepresentation.getValue();

      const filteredReps = getFilteredRepresentations(sortedRepresentations,
                                                      resolutionLimit,
                                                      bitrateThrottle);
      const requests = requestsStore.getRequests();
      const { bandwidthEstimate, bitrateChosen } = networkAnalyzer
        .getBandwidthEstimate(lastPlaybackObservation,
                              bandwidthEstimator,
                              currentRepresentationVal,
                              requests,
                              prevEstimate.bandwidth);

      const stableRepresentation = scoreCalculator.getLastStableRepresentation();
      const knownStableBitrate = stableRepresentation === null ?
        undefined :
        stableRepresentation.bitrate / (lastPlaybackObservation.speed > 0 ?
                                          lastPlaybackObservation.speed :
                                          1);

      const { ABR_ENTER_BUFFER_BASED_ALGO,
              ABR_EXIT_BUFFER_BASED_ALGO } = config.getCurrent();

      if (allowBufferBasedEstimates && bufferGap <= ABR_EXIT_BUFFER_BASED_ALGO) {
        allowBufferBasedEstimates = false;
      } else if (!allowBufferBasedEstimates &&
                 isFinite(bufferGap) &&
                 bufferGap >= ABR_ENTER_BUFFER_BASED_ALGO)
      {
        allowBufferBasedEstimates = true;
      }

      /**
       * Representation chosen when considering only [pessimist] bandwidth
       * calculation.
       * This is a safe enough choice but might be lower than what the user
       * could actually profit from.
       */
      const chosenRepFromBandwidth = selectOptimalRepresentation(filteredReps,
                                                                 bitrateChosen);

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
      let chosenRepFromBufferSize : IRepresentation | null = null;
      if (allowBufferBasedEstimates &&
          currentBufferBasedEstimate !== undefined &&
          currentBufferBasedEstimate > currentBestBitrate)
      {

        chosenRepFromBufferSize = selectOptimalRepresentation(filteredReps,
                                                              currentBufferBasedEstimate);
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
      let chosenRepFromGuessMode : IRepresentation | null = null;
      if (lowLatencyMode &&
          currentRepresentationVal !== null &&
          context.manifest.isDynamic &&
          maximumPosition - position.getWanted() < 40)
      {
        chosenRepFromGuessMode = guessBasedChooser
          .getGuess(sortedRepresentations,
                    lastPlaybackObservation,
                    currentRepresentationVal,
                    currentBestBitrate,
                    requests);
      }

      if (chosenRepFromGuessMode !== null &&
          chosenRepFromGuessMode.bitrate > currentBestBitrate) {
        log.debug("ABR: Choosing representation with guess-based estimation.",
                  chosenRepFromGuessMode.bitrate,
                  chosenRepFromGuessMode.id);
        prevEstimate.update(chosenRepFromGuessMode,
                            bandwidthEstimate,
                            ABRAlgorithmType.GuessBased);
        return { bitrate: bandwidthEstimate,
                 representation: chosenRepFromGuessMode,
                 urgent: currentRepresentationVal === null ||
                   chosenRepFromGuessMode.bitrate < currentRepresentationVal.bitrate,
                 knownStableBitrate };
      } else if (chosenRepFromBufferSize !== null) {
        log.debug("ABR: Choosing representation with buffer-based estimation.",
                  chosenRepFromBufferSize.bitrate,
                  chosenRepFromBufferSize.id);
        prevEstimate.update(chosenRepFromBufferSize,
                            bandwidthEstimate,
                            ABRAlgorithmType.BufferBased);
        return { bitrate: bandwidthEstimate,
                 representation: chosenRepFromBufferSize,
                 urgent: networkAnalyzer.isUrgent(chosenRepFromBufferSize.bitrate,
                                                  currentRepresentationVal,
                                                  requests,
                                                  lastPlaybackObservation),
                 knownStableBitrate };
      } else {
        log.debug("ABR: Choosing representation with bandwidth estimation.",
                  chosenRepFromBandwidth.bitrate,
                  chosenRepFromBandwidth.id);
        prevEstimate.update(chosenRepFromBandwidth,
                            bandwidthEstimate,
                            ABRAlgorithmType.BandwidthBased);
        return { bitrate: bandwidthEstimate,
                 representation: chosenRepFromBandwidth,
                 urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate,
                                                  currentRepresentationVal,
                                                  requests,
                                                  lastPlaybackObservation),
                 knownStableBitrate };
      }
    }
  }

  /**
   * Stop previous estimate production (if one) and restart it considering new
   * conditions (such as a new list of Representations).
   */
  function restartEstimatesProductionFromCurrentConditions() : void {
    const representations = representationsRef.getValue();
    currentEstimatesCanceller.cancel();
    currentEstimatesCanceller = new TaskCanceller();
    currentEstimatesCanceller.linkToSignal(stopAllEstimates);
    const newRef = createEstimateReference(representations,
                                           currentEstimatesCanceller.signal);

    newRef.onUpdate(function onNewEstimate(newEstimate : IABREstimate) : void {
      estimateRef.setValue(newEstimate);
    }, { clearSignal: currentEstimatesCanceller.signal,
         emitCurrentValue: true });
  }

  /**
   * Callback to call when new metrics are available
   * @param {Object} value
   */
  function onMetric(value : IMetricsCallbackPayload) : void {
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
      const segDur = segmentDuration ?? segment.duration;
      scoreCalculator.addSample(representation, requestDuration / 1000, segDur);
    }
  }

  /** Callback called when a new request begins. */
  function onRequestBegin(val : IRequestBeginCallbackPayload) : void {
    requestsStore.add(val);
  }

  /** Callback called when progress information is known on a pending request. */
  function onRequestProgress(val : IRequestProgressCallbackPayload) : void {
    requestsStore.addProgress(val);
  }

  /** Callback called when a pending request ends. */
  function onRequestEnd(val : IRequestEndCallbackPayload) : void {
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
function getFilteredRepresentations(
  representations : IRepresentation[],
  resolutionLimit : IResolutionInfo | undefined,
  bitrateThrottle : number | undefined
) : IRepresentation[] {
  let filteredReps = representations;

  if (bitrateThrottle !== undefined && bitrateThrottle < Infinity) {
    filteredReps = filterByBitrate(filteredReps, bitrateThrottle);
  }

  if (resolutionLimit !== undefined) {
    filteredReps = filterByResolution(filteredReps, resolutionLimit);
  }

  return filteredReps;
}

/**
 * Adaptive BitRate estimate object.
 *
 * Helps the player to choose a Representation (i.e. a quality) by frequently
 * measuring the current network and playback conditions.
 *
 * At regular intervals, an `IABREstimate` will be sent to that end.
 */
export interface IABREstimate {
  /**
   * If defined, the last calculated available bitrate for that type of
   * content (e.g. "video, "audio"...).
   * Note that it can be very different from the "real" user's bandwidth.
   *
   * If `undefined`, we do not currently know the bitrate for the current type.
   */
  bitrate: undefined | number;
  /**
   * The Representation considered as the most adapted to the current network
   * and playback conditions.
   * `null` in the rare occurence where there is no `Representation` to choose
   * from.
   */
  representation: IRepresentation | null;
  /**
   * If `true`, the current `representation` suggested should be switched to as
   * soon as possible. For example, you might want to interrupt all pending
   * downloads for the current representation and replace it immediately by this
   * one.
   *
   * If `false`, the suggested `representation` can be switched to less
   * urgently. For example, pending segment requests for the current
   * Representation can be finished before switching to that new Representation.
   */
  urgent : boolean;
  /**
   * Last bitrate which was known to be "maintainable".
   *
   * The estimates provided though `IABREstimate` objects sometimes indicate
   * that you should switch to a Representation with a much higher bitrate than
   * what the network bandwidth can sustain.
   * Such Representation are said to not be "maintainable": at a regular
   * playback speed, we cannot maintain this Representation without buffering
   * after some time.
   *
   * `knownStableBitrate` communicates the bitrate of the last Representation
   * that was known to be maintaninable: it could reliably be played continually
   * without interruption.
   *
   * This can be for example useful in some optimizations such as
   * "fast-switching", where the player will load segments of higher quality to
   * replace segments of low quality.
   * Because in that case you're pushing segment on top of buffer you already
   * have, you will most likely only want to do it when the Representation is
   * known to be maintaninable.
   */
  knownStableBitrate?: number | undefined;
}

/** Media properties `getEstimateReference` will need to keep track of. */
export interface IRepresentationEstimatorPlaybackObservation {
  /**
   * For the concerned media buffer, difference in seconds between the next
   * position where no segment data is available and the current position.
   */
  bufferGap : number;
  /**
   * Information on the current media position in seconds at the time of a
   * Playback Observation.
   */
  position : ObservationPosition;
  /**
   * Last "playback rate" set by the user. This is the ideal "playback rate" at
   * which the media should play.
   */
  speed : number;
  /** `duration` property of the HTMLMediaElement on which the content plays. */
  duration : number;
  /** Theoretical maximum position on the content that can currently be played. */
  maximumPosition : number;
}

/** Content of the `IABRMetricsEvent` event's payload. */
export interface IMetricsCallbackPayload {
  /** Time the request took to perform the request, in milliseconds. */
  requestDuration: number;
  /** Amount of bytes downloaded with this request. */
  size: number;
  /** Duration of the loaded segment, in seconds. */
  segmentDuration: number | undefined;
  /** Context about the segment downloaded. */
  content: { representation: IRepresentation;
             adaptation: IAdaptation;
             segment: ISegment; };
}

export type IRequestBeginCallbackPayload = IPendingRequestStoreBegin;
export type IRequestProgressCallbackPayload = IPendingRequestStoreProgress;
export interface IRequestEndCallbackPayload {
  /**
   * Same `id` value used to identify that request at the time the corresponding
   * callback was called.
   */
  id: string;
}

/** Object allowing to filter some Representations out based on different attributes. */
export interface IABRFiltersObject {
  /**
   * Filters out all Representations with a bitrate higher than this value.
   * If all Representations have a bitrate higher than this value, still
   * consider the Representation with the lowest bitrate.
   */
  bitrate?: number;
  /**
   * Consider only Representations with a width either unknown or lower or equal
   * to that value.
   *
   * As a special case, if no Representation has a width exactly equal to that
   * value, the Representation(s) with the `width` immediately higher will also
   * be considered.
   *
   * _This is usually used to filter out Representations for which the width
   * is much higher than the maximum width of the screen. In such cases, there
   * would be no difference between those higher-quality Representations._
   */
  width?: number;
}

/** Callbacks returned by `getEstimateReference`. */
export interface IRepresentationEstimatorCallbacks {
  /** Callback to call when a segment has been completely pushed to the buffer. */
  addedSegment(val : IAddedSegmentCallbackPayload) : void;
  /** Callback to call when network metrics are available. */
  metrics(val : IMetricsCallbackPayload) : void;
  /** Callback to call when an HTTP(S) request begins. */
  requestBegin(val : IRequestBeginCallbackPayload) : void;
  /**
   * Callback to call when an HTTP(S) request ends.
   * Important: `requestEnd` should only be called for requests for which the
   * `requestBegin` callback has been called. It should be called at most once.
   */
  requestEnd(val : IRequestEndCallbackPayload) : void;
  /**
   * Callback to call when progress information is available on a pending
   * request.
   * Important: `requestProgress` should only be called for requests for which
   * the `requestBegin` callback has been called but the `requestEnd` method has
   * not yet been called.
   */
  requestProgress(val : IRequestProgressCallbackPayload) : void;
}

export interface IAddedSegmentCallbackPayload {
  /**
   * The buffered ranges of the related media buffer after that segment has
   * been pushed.
   */
  buffered : IRange[];
  /** The context for the segment that has been pushed. */
  content : { representation : IRepresentation };
}

/** Arguments to give to `getEstimateReference`. */
export interface IRepresentationEstimatorArguments {
  /** Class allowing to estimate the current network bandwidth. */
  bandwidthEstimator : BandwidthEstimator;
  /** Emit regular playback information. */
  playbackObserver : IReadOnlyPlaybackObserver<
    IRepresentationEstimatorPlaybackObservation
  >;
  /**
   * The Representation currently loaded.
   * `null` if no Representation is currently loaded.
   */
  currentRepresentation : IReadOnlySharedReference<IRepresentation | null>;
  /** Throttle Representation pool according to filters. */
  filters: {
    limitResolution : IReadOnlySharedReference<IResolutionInfo |
                                               undefined>;
    throttleBitrate : IReadOnlySharedReference<number>;
  };
  /**
   * The initial bitrate you want to start with.
   *
   * The highest-quality Representation with a bitrate lower-or-equal to that
   * value will be chosen.
   * If no Representation has bitrate lower or equal to that value, the
   * Representation with the lowest bitrate will be chosen instead.
   */
  initialBitrate?: number;
  /**
   * If `true` the content is a "low-latency" content.
   * Such contents have specific settings.
   */
  lowLatencyMode: boolean;
  /** The list of Representations `getEstimateReference` can choose from. */
  representations : IReadOnlySharedReference<IRepresentation[]>;
  /** Context for the list of Representations to choose. */
  context : {
    /** In which Manifest the Representations are. */
    manifest : IManifest;
    /** In which Period the Representations are. */
    period : IPeriod;
    /** In which Adaptation the Representations are. */
    adaptation : IAdaptation;
  };
}

/**
 * Type of the function returned by `createAdaptiveRepresentationSelector`,
 * allowing to estimate the most adapted `Representation`.
 */
export type IRepresentationEstimator = (
  /** Information on the content for which a Representation will be chosen */
  context : { manifest : IManifest;
              period : IPeriod;
              adaptation : IAdaptation; },
  /** Reference emitting the Representation currently loaded. */
  currentRepresentation : IReadOnlySharedReference<IRepresentation | null>,
  /** Reference emitting the list of available Representations to choose from. */
  representations : IReadOnlySharedReference<IRepresentation[]>,
  /** Regularly emits playback conditions */
  playbackObserver : IReadOnlyPlaybackObserver<
    IRepresentationEstimatorPlaybackObservation
  >,
  /**
   * After this `CancellationSignal` emits, resources will be disposed and
   * estimates will stop to be emitted.
   */
  stopAllEstimates : CancellationSignal
) => IRepresentationEstimatorResponse;

/** Value returned by an `IRepresentationEstimator` */
export interface IRepresentationEstimatorResponse {
  /**
   * Regularly produces estimates of the best Representation to play (from the
   * list given).
   */
  estimates: IReadOnlySharedReference<IABREstimate>;
  /**
   * Callback which need to be called as soon as the corresponding events to
   * obtain accurate Representation estimates.
   */
  callbacks: IRepresentationEstimatorCallbacks;
}

/** Arguments received by `createAdaptiveRepresentationSelector`. */
export interface IAdaptiveRepresentationSelectorArguments {
  /** Initial bitrate chosen, per type (minimum if not set) */
  initialBitrates: Partial<Record<IBufferType, number>>;

  /**
   * Some settings can depend on wether you're playing a low-latency content.
   * Set it to `true` if you're playing such content.
   */
  lowLatencyMode: boolean;

  /** Allows to filter which Representations can be choosen. */
  throttlers: IRepresentationEstimatorThrottlers;
}

/**
 * Throttlers are interfaces allowing to limit the pool of Representations
 * to choose from.
 */
export interface IRepresentationEstimatorThrottlers {
  /** Limit Representations based on maximum authorized resolution. */
  limitResolution : Partial<Record<IBufferType, IReadOnlySharedReference<
    IResolutionInfo
  >>>;
  /** Limit Representations based on maximum authorized bitrate. */
  throttleBitrate : Partial<Record<IBufferType,
                                   IReadOnlySharedReference<number>>>;
}

export { IResolutionInfo };
