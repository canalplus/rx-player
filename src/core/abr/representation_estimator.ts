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
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  ignoreElements,
  map,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import log from "../../log";
import {
  Adaptation,
  ISegment,
  Representation,
} from "../../manifest";
import { getLeftSizeOfRange } from "../../utils/ranges";
import BandwidthEstimator from "./bandwidth_estimator";
import BufferBasedChooser from "./buffer_based_chooser";
import generateCachedSegmentDetector from "./cached_segment_detector";
import filterByBitrate from "./filter_by_bitrate";
import filterByWidth from "./filter_by_width";
import NetworkAnalyzer from "./network_analyzer";
import PendingRequestsStore from "./pending_requests_store";
import RepresentationScoreCalculator from "./representation_score_calculator";
import selectOptimalRepresentation from "./select_optimal_representation";

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
  knownStableBitrate?: number;
}

/** Properties the `RepresentationEstimator` will need at each "clock tick". */
export interface IRepresentationEstimatorClockTick {
  /**
   * For the concerned media buffer, difference in seconds between the next
   * position where no segment data is available and the current position.
   */
  bufferGap : number;
  /** The position, in seconds, the media element was in at the time of the tick. */
  position : number;
  /**
   * Last "playback rate" set by the user. This is the ideal "playback rate" at
   * which the media should play.
   */
  speed : number;
  /** `duration` property of the HTMLMediaElement on which the content plays. */
  duration : number;
}

/** Content of the `IABRMetricsEvent` event's payload. */
interface IABRMetricsEventValue {
  /** Time the request took to perform the request, in milliseconds. */
  duration: number;
  /** Amount of bytes downloaded with this request. */
  size: number;
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
  value: {
    /**
     * String identifying this request.
     *
     * Only one request communicated to the current `RepresentationEstimator`
     * should have this `id` at the same time.
     */
    id: string;
    /** Presentation time at which the corresponding segment begins, in seconds. */
    time: number;
    /**
     * Difference between the presentation end time and start time of the
     * corresponding segment, in seconds.
     */
    duration: number;
    /** Value of `performance.now` at the time the request began.  */
    requestTimestamp: number;
  };
}

/**
 * Event emitted when progression information is available on a segment request.
 *
 * This event should only concern segment requests for the current type (e.g.
 * "audio", "video" etc.) and Period.
 */
export interface IABRRequestProgressEvent {
  type: "progress";
  value: {
    /** Amount of time since the request has started, in seconds. */
    duration : number;
    /**
     * Same `id` value used to identify that request at the time the corresponding
     * `IABRRequestBeginEvent` event was sent.
     */
    id: string;
    /** Current downloaded size, in bytes. */
    size : number;
    /** Value of `performance.now` at the time this progression report was available. */
    timestamp : number;
    /**
     * Total size of the segment to download (including already-loaded data),
     * in bytes.
     */
    totalSize : number;
  };
}

/**
 * Event emitted when a segment request ends.
 *
 * This event should only concern segment requests for the current type (e.g.
 * "audio", "video" etc.) and Period.
 */
export interface IABRRequestEndEvent {
  type: "requestEnd";
  value: {
    /**
     * Same `id` value used to identify that request at the time the corresponding
     * `IABRRequestBeginEvent` event was sent.
     */
    id: string;
  };
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
  clock$ : Observable<IRepresentationEstimatorClockTick>;
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
  let _representations = representations;

  if (filters.bitrate != null) {
    _representations = filterByBitrate(_representations, filters.bitrate);
  }

  if (filters.width != null) {
    _representations = filterByWidth(_representations, filters.width);
  }

  return _representations;
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
  clock$,
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
  const shouldIgnoreMetrics = generateCachedSegmentDetector();

  /**
   * Callback to call when new metrics are available
   * @param {Object} value
   */
  function onMetric(value : IABRMetricsEventValue) : void {
    const { duration, size, content } = value;

    if (shouldIgnoreMetrics(content, duration)) {
      // We already loaded not cached segments.
      // Do not consider cached segments anymore.
      return;
    }

    // calculate bandwidth
    bandwidthEstimator.addSample(duration, size);

    // calculate "maintainability score"
    const { segment } = content;
    const requestDuration = duration / 1000;
    const segmentDuration = segment.duration;

    const { representation } = content;
    scoreCalculator.addSample(representation, requestDuration, segmentDuration);
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
      let lastEstimatedBitrate : number | undefined;
      let forceBandwidthMode = true;

      // Emit each time a buffer-based estimation should be actualized (each
      // time a segment is added).
      const bufferBasedClock$ = streamEvents$.pipe(
        filter((e) : e is IABRAddedSegmentEvent => e.type === "added-segment"),
        withLatestFrom(clock$),
        map(([{ value: evtValue }, { speed, position } ]) => {
          const timeRanges = evtValue.buffered;
          const bufferGap = getLeftSizeOfRange(timeRanges, position);
          const { representation } = evtValue.content;
          const currentScore = scoreCalculator.getEstimate(representation);
          const currentBitrate = representation.bitrate;
          return { bufferGap, currentBitrate, currentScore, speed };
        })
      );

      const bitrates = representations.map(r => r.bitrate);
      const bufferBasedEstimation$ = BufferBasedChooser(bufferBasedClock$, bitrates)
        .pipe(startWith(undefined));

      return observableCombineLatest([ clock$,
                                       minAutoBitrate$,
                                       maxAutoBitrate$,
                                       filters$,
                                       bufferBasedEstimation$ ]
      ).pipe(
        withLatestFrom(currentRepresentation$),
        map(([ [ clock, minAutoBitrate, maxAutoBitrate, filters, bufferBasedBitrate ],
               currentRepresentation ]
        ) : IABREstimate => {
          const _representations = getFilteredRepresentations(representations,
                                                              filters);
          const requests = requestsStore.getRequests();
          const { bandwidthEstimate, bitrateChosen } = networkAnalyzer
            .getBandwidthEstimate(clock,
                                  bandwidthEstimator,
                                  currentRepresentation,
                                  requests,
                                  lastEstimatedBitrate);

          lastEstimatedBitrate = bandwidthEstimate;

          const stableRepresentation = scoreCalculator.getLastStableRepresentation();
          const knownStableBitrate = stableRepresentation == null ?
            undefined :
            stableRepresentation.bitrate / (clock.speed > 0 ? clock.speed : 1);

          const { bufferGap } = clock;
          if (!forceBandwidthMode && bufferGap <= 5) {
            forceBandwidthMode = true;
          } else if (forceBandwidthMode && isFinite(bufferGap) && bufferGap > 10) {
            forceBandwidthMode = false;
          }

          const chosenRepFromBandwidth = selectOptimalRepresentation(_representations,
                                                                     bitrateChosen,
                                                                     minAutoBitrate,
                                                                     maxAutoBitrate);
          if (forceBandwidthMode) {
            log.debug("ABR: Choosing representation with bandwidth estimation.",
                      chosenRepFromBandwidth);
            return { bitrate: bandwidthEstimate,
                     representation: chosenRepFromBandwidth,
                     urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate,
                                                      currentRepresentation,
                                                      requests,
                                                      clock),
                     manual: false,
                     knownStableBitrate };
          }
          if (bufferBasedBitrate == null ||
              chosenRepFromBandwidth.bitrate >= bufferBasedBitrate)
          {
            log.debug("ABR: Choosing representation with bandwidth estimation.",
                      chosenRepFromBandwidth);
            return { bitrate: bandwidthEstimate,
                     representation: chosenRepFromBandwidth,
                     urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate,
                                                      currentRepresentation,
                                                      requests,
                                                      clock),
                     manual: false,
                     knownStableBitrate };
          }
          const chosenRepresentation = selectOptimalRepresentation(_representations,
                                                                   bufferBasedBitrate,
                                                                   minAutoBitrate,
                                                                   maxAutoBitrate);
          if (bufferBasedBitrate <= maxAutoBitrate) {
            log.debug("ABR: Choosing representation with buffer based bitrate ceiling.",
                      chosenRepresentation);
          }
          return { bitrate: bandwidthEstimate,
                   representation: chosenRepresentation,
                   urgent: networkAnalyzer.isUrgent(bufferBasedBitrate,
                                                    currentRepresentation,
                                                    requests,
                                                    clock),
                   manual: false,
                   knownStableBitrate };
        })
      );
    }));
  });

  return observableMerge(metrics$, requests$, estimate$);
}
