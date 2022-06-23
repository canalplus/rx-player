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

import {
  combineLatest as observableCombineLatest,
  defer as observableDefer,
  filter,
  ignoreElements,
  map,
  merge as observableMerge,
  Observable,
  of as observableOf,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
import log from "../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { getLeftSizeOfRange } from "../../utils/ranges";
import BandwidthEstimator from "./bandwidth_estimator";
import BufferBasedChooser from "./buffer_based_chooser";
import GuessBasedChooser from "./guess_based_chooser";
import LastEstimateStorage, {
  ABRAlgorithmType,
} from "./last_estimate_storage";
import NetworkAnalyzer from "./network_analyzer";
import PendingRequestsStore, {
  IPendingRequestStoreBegin,
  IPendingRequestStoreProgress,
} from "./pending_requests_store";
import RepresentationScoreCalculator from "./representation_score_calculator";
import filterByBitrate from "./utils/filter_by_bitrate";
import filterByWidth from "./utils/filter_by_width";
import selectOptimalRepresentation from "./utils/select_optimal_representation";

// NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
// first type parameter as `any` instead of the perfectly fine `unknown`,
// leading to linter issues, as it forbids the usage of `any`.
// This is why we're disabling the eslint rule.
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/**
 * Adaptive BitRate estimate object.
 *
 * The `RepresentationEstimator` helps the player to choose a Representation
 * (i.e. a quality) by frequently measuring the current network and playback
 * conditions.
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
   * If `true`, the `representation` chosen in the current estimate object is
   * linked to a choice chosen manually by the user.
   *
   * If `false`, this estimate is just due to the adaptative logic.
   */
  manual: boolean;
  /**
   * The Representation considered as the most adapted to the current network
   * and playback conditions.
   */
  representation: Representation;
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

/** Media properties the `RepresentationEstimator` will need to keep track of. */
export interface IRepresentationEstimatorPlaybackObservation {
  /**
   * For the concerned media buffer, difference in seconds between the next
   * position where no segment data is available and the current position.
   */
  bufferGap : number;
  /**
   * The position, in seconds, the media element was in at the time of the
   * observation.
   */
  position : number;
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
export interface IABRMetricsEventValue {
  /** Time the request took to perform the request, in milliseconds. */
  requestDuration: number;
  /** Amount of bytes downloaded with this request. */
  size: number;
  /** Duration of the loaded segment, in seconds. */
  segmentDuration: number | undefined;
  /** Context about the segment downloaded. */
  content: { representation: Representation;
             adaptation: Adaptation;
             segment: ISegment; };
}

/**
 * "metrics" event which allows to communicate current network conditions to the
 * `RepresentationEstimator`.
 *
 * This event should be generated and sent after all segment requests for the
 * current type (e.g. "audio", "video" etc.) and Period.
 */
export interface IABRMetricsEvent { type : "metrics";
                                   value : IABRMetricsEventValue; }

/**
 * "representationChange" event, allowing to communicate to the
 * `RepresentationEstimator` when a new `Representation` is now downloaded for
 * the current type (e.g. "audio", "video" etc.) and Period.
 */
export interface IABRRepresentationChangeEvent {
  type: "representationChange";
  value: {
    /** The new loaded `Representation`. `null` if no Representation is chosen. */
    representation : Representation |
                     null;
  };
}

/**
 * Event emitted when a new segment request is done.
 *
 * This event should only concern segment requests for the current type (e.g.
 * "audio", "video" etc.) and Period.
 */
export interface IABRRequestBeginEvent {
  type: "requestBegin";
  value: IABRRequestBeginEventValue;
}

/**
 * Event emitted when progression information is available on a segment request.
 *
 * This event should only concern segment requests for the current type (e.g.
 * "audio", "video" etc.) and Period.
 */
export interface IABRRequestProgressEvent {
  type: "progress";
  value: IABRRequestProgressEventValue;
}

/**
 * Event emitted when a segment request ends.
 *
 * This event should only concern segment requests for the current type (e.g.
 * "audio", "video" etc.) and Period.
 */
export interface IABRRequestEndEvent {
  type: "requestEnd";
  value: IABRRequestEndEventValue;
}

/** Value associated with a `IABRRequestBeginEvent`. */
export type IABRRequestBeginEventValue = IPendingRequestStoreBegin;

/** Value associated with a `IABRRequestProgressEvent`. */
export type IABRRequestProgressEventValue = IPendingRequestStoreProgress;

/** Value associated with a `IABRRequestEndEvent`. */
export interface IABRRequestEndEventValue {
  /**
   * Same `id` value used to identify that request at the time the corresponding
   * `IABRRequestBeginEvent` event was sent.
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

/**
 * "added-segment" event emitted to indicate to the `RepresentationEstimator`
 * that a new segment for the given type (e.g. "audio", "video" etc.) and
 * Period has been correctly added to the underlying media buffer.
 */
export interface IABRAddedSegmentEvent {
  type : "added-segment";
  value : {
    /**
     * The buffered ranges of the related media buffer after that segment has
     * been pushed.
     */
    buffered : TimeRanges;
    /** The context for the segment that has been pushed. */
    content : { representation : Representation }; };
}

/**
 * Events allowing to communicate to the `RepresentationEstimator` the current
 * playback and network conditions for the current type (e.g.  "audio", "video"
 * etc.) and Period.
 */
export type IABRStreamEvents = IABRAddedSegmentEvent |
                               IABRMetricsEvent |
                               IABRRepresentationChangeEvent |
                               IABRRequestBeginEvent |
                               IABRRequestProgressEvent |
                               IABRRequestEndEvent;

/** Arguments to give to a `RepresentationEstimator`. */
export interface IRepresentationEstimatorArguments {
  /** Class allowing to estimate the current network bandwidth. */
  bandwidthEstimator : BandwidthEstimator;
  /** Events indicating current playback and network conditions. */
  streamEvents$ : Observable<IABRStreamEvents>;
  /** Observable emitting regularly the current playback situation. */
  observation$ : Observable<IRepresentationEstimatorPlaybackObservation>;
  /** Observable allows to filter out Representation in our estimations. */
  filters$ : Observable<IABRFiltersObject>;
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
  /**
   * Observable allowing to set manually choose a Representation:
   *
   * The highest-quality Representation with a bitrate lower-or-equal to that
   * value will be chosen.
   * If no Representation has bitrate lower or equal to that value, the
   * Representation with the lowest bitrate will be chosen instead.
   *
   * If no Representation has a bitrate lower or equal to that value, the
   * Representation with the lowest bitrate will be chosen instead.
   *
   * Set it to a negative value to enable "adaptative mode" instead: the
   * RepresentationEstimator will choose the best Representation based on the
   * current network and playback conditions.
   */
  manualBitrate$ : Observable<number>;
  /**
   * Set a bitrate floor (the minimum reachable bitrate) for adaptative
   * streaming.
   *
   * When the `RepresentationEstimator` is choosing a `Representation` in
   * adaptative mode (e.g. no Representation has been manually chosen through
   * the `manualBitrate$` Observable), it will never choose a Representation
   * having a bitrate inferior to that value, with a notable exception:
   * If no Representation has a bitrate superior or equal to that value, the
   * Representation with the lowest bitrate will be chosen instead.
   *
   * You can set it to `0` to disable any effect of that option.
   */
  minAutoBitrate$ : Observable<number>;
  /**
   * Set a bitrate ceil (the maximum reachable bitrate) for adaptative
   * streaming.
   *
   * When the `RepresentationEstimator` is choosing a `Representation` in
   * adaptative mode (e.g. no Representation has been manually chosen through
   * the `manualBitrate$` Observable), it will never choose a Representation
   * having a bitrate superior to that value, with a notable exception:
   * If no Representation has a bitrate lower or equal to that value, the
   * Representation with the lowest bitrate will be chosen instead.
   *
   * You can set it to `Infinity` to disable any effect of that option.
   */
  maxAutoBitrate$ : Observable<number>;
  /** The list of Representations the `RepresentationEstimator` can choose from. */
  representations : Representation[];
  /** Context for the list of Representations to choose. */
  context : {
    /** In which Manifest the Representations are. */
    manifest : Manifest;
    /** In which Period the Representations are. */
    period : Period;
    /** In which Adaptation the Representations are. */
    adaptation : Adaptation;
  };
}

/**
 * Filter representations given through filters options.
 * @param {Array.<Representation>} representations
 * @param {Object} filters - Filter Object.
 * @returns {Array.<Representation>}
 */
function getFilteredRepresentations(
  representations : Representation[],
  filters : IABRFiltersObject
) : Representation[] {
  let filteredReps = representations;

  if (filters.bitrate != null) {
    filteredReps = filterByBitrate(filteredReps, filters.bitrate);
  }

  if (filters.width != null) {
    filteredReps = filterByWidth(filteredReps, filters.width);
  }

  return filteredReps;
}

/**
 * Estimate regularly the current network bandwidth and the best Representation
 * that can be played according to the current network and playback conditions.
 *
 * A `RepresentationEstimator` only does estimations for a given type (e.g.
 * "audio", "video" etc.) and Period.
 *
 * If estimates for multiple types and/or Periods are needed, you should
 * create as many `RepresentationEstimator`.
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationEstimator({
  bandwidthEstimator,
  context,
  observation$,
  filters$,
  initialBitrate,
  lowLatencyMode,
  manualBitrate$,
  minAutoBitrate$,
  maxAutoBitrate$,
  representations,
  streamEvents$,
} : IRepresentationEstimatorArguments) : Observable<IABREstimate> {
  const scoreCalculator = new RepresentationScoreCalculator();
  const networkAnalyzer = new NetworkAnalyzer(initialBitrate == null ? 0 :
                                                                       initialBitrate,
                                              lowLatencyMode);
  const requestsStore = new PendingRequestsStore();

  /**
   * Callback to call when new metrics are available
   * @param {Object} value
   */
  function onMetric(value : IABRMetricsEventValue) : void {
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

  const metrics$ = streamEvents$.pipe(
    filter((e) : e is IABRMetricsEvent => e.type === "metrics"),
    tap(({ value }) => onMetric(value)),
    ignoreElements());

  const requests$ = streamEvents$.pipe(
    tap((evt) => {
      switch (evt.type) {
        case "requestBegin":
          requestsStore.add(evt.value);
          break;
        case "requestEnd":
          requestsStore.remove(evt.value.id);
          break;
        case "progress":
          requestsStore.addProgress(evt.value);
          break;
      }
    }),
    ignoreElements());

  const currentRepresentation$ = streamEvents$.pipe(
    filter((e) : e is IABRRepresentationChangeEvent => e.type === "representationChange"),
    map((e) => e.value.representation),
    startWith(null));

  const estimate$ = observableDefer(() => {
    if (representations.length === 0) {
      throw new Error("ABRManager: no representation choice given");
    }

    if (representations.length === 1) {
      return observableOf({ bitrate: undefined,
                            representation: representations[0],
                            manual: false,
                            urgent: true,
                            knownStableBitrate: undefined });
    }

    return manualBitrate$.pipe(switchMap(manualBitrate => {
      if (manualBitrate >= 0) {
        // -- MANUAL mode --
        const manualRepresentation = selectOptimalRepresentation(representations,
                                                                 manualBitrate,
                                                                 0,
                                                                 Infinity);
        return observableOf({
          representation: manualRepresentation,
          bitrate: undefined, // Bitrate estimation is deactivated here
          knownStableBitrate: undefined,
          manual: true,
          urgent: true, // a manual bitrate switch should happen immediately
        });
      }

      // -- AUTO mode --

      /** Store the previous estimate made here. */
      const prevEstimate = new LastEstimateStorage();

      let allowBufferBasedEstimates = false;
      const guessBasedChooser = new GuessBasedChooser(scoreCalculator, prevEstimate);

      // Emit each time a buffer-based estimation should be actualized (each
      // time a segment is added).
      const bufferBasedobservation$ = streamEvents$.pipe(
        filter((e) : e is IABRAddedSegmentEvent => e.type === "added-segment"),
        withLatestFrom(observation$),
        map(([{ value: evtValue }, { speed, position } ]) => {
          const timeRanges = evtValue.buffered;
          const bufferGap = getLeftSizeOfRange(timeRanges, position);
          const { representation } = evtValue.content;
          const scoreData = scoreCalculator.getEstimate(representation);
          const currentScore = scoreData?.[0];
          const currentBitrate = representation.bitrate;
          return { bufferGap, currentBitrate, currentScore, speed };
        })
      );

      const bitrates = representations.map(r => r.bitrate);
      const bufferBasedChooser = new BufferBasedChooser(bitrates);
      const bufferBasedEstimation$ = bufferBasedobservation$.pipe(
        map(bbo => bufferBasedChooser.getEstimate(bbo)),
        startWith(undefined)
      );

      return observableCombineLatest([ observation$,
                                       minAutoBitrate$,
                                       maxAutoBitrate$,
                                       filters$,
                                       bufferBasedEstimation$ ]
      ).pipe(
        withLatestFrom(currentRepresentation$),
        map(([ [ observation,
                 minAutoBitrate,
                 maxAutoBitrate,
                 filters,
                 bufferBasedBitrate ],
               currentRepresentation ]
        ) : IABREstimate => {
          const { bufferGap, position, maximumPosition } = observation;

          const filteredReps = getFilteredRepresentations(representations,
                                                          filters);
          const requests = requestsStore.getRequests();
          const { bandwidthEstimate, bitrateChosen } = networkAnalyzer
            .getBandwidthEstimate(observation,
                                  bandwidthEstimator,
                                  currentRepresentation,
                                  requests,
                                  prevEstimate.bandwidth);

          const stableRepresentation = scoreCalculator.getLastStableRepresentation();
          const knownStableBitrate = stableRepresentation === null ?
            undefined :
            stableRepresentation.bitrate / (observation.speed > 0 ? observation.speed :
                                                                    1);

          if (allowBufferBasedEstimates && bufferGap <= 5) {
            allowBufferBasedEstimates = false;
          } else if (!allowBufferBasedEstimates &&
                     isFinite(bufferGap) &&
                      bufferGap > 10)
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
                                                                     bitrateChosen,
                                                                     minAutoBitrate,
                                                                     maxAutoBitrate);

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
          let chosenRepFromBufferSize : Representation | null = null;
          if (allowBufferBasedEstimates &&
              bufferBasedBitrate !== undefined &&
              bufferBasedBitrate > currentBestBitrate)
          {

            chosenRepFromBufferSize = selectOptimalRepresentation(filteredReps,
                                                                  bufferBasedBitrate,
                                                                  minAutoBitrate,
                                                                  maxAutoBitrate);
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
          let chosenRepFromGuessMode : Representation | null = null;
          if (lowLatencyMode &&
              currentRepresentation !== null &&
              context.manifest.isDynamic &&
              maximumPosition - position < 40)
          {
            chosenRepFromGuessMode = guessBasedChooser.getGuess(representations,
                                                                observation,
                                                                currentRepresentation,
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
                     urgent: currentRepresentation === null ||
                       chosenRepFromGuessMode.bitrate < currentRepresentation.bitrate,
                     manual: false,
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
                                                      currentRepresentation,
                                                      requests,
                                                      observation),
                     manual: false,
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
                                                      currentRepresentation,
                                                      requests,
                                                      observation),
                     manual: false,
                     knownStableBitrate };
          }
        })
      );
    }));
  });

  return observableMerge(metrics$, requests$, estimate$);
}
