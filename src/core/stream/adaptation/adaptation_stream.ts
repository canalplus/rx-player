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

/**
 * This file allows to create `AdaptationStream`s.
 *
 * An `AdaptationStream` downloads and push segment for a single Adaptation
 * (e.g.  a single audio, video or text track).
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrates a RepresentationStream, which will download and
 * push segments corresponding to a chosen Representation.
 */

import {
  catchError,
  concat as observableConcat,
  defer as observableDefer,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  share,
  take,
  tap,
} from "rxjs";
import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import deferSubscriptions from "../../../utils/defer_subscriptions";
import {
  createSharedReference,
  IReadOnlySharedReference,
} from "../../../utils/reference";
import ABRManager, {
  IABREstimate,
  IABRMetricsEventValue,
  IABRRequestBeginEventValue,
  IABRRequestEndEventValue,
  IABRRequestProgressEventValue,
} from "../../abr";
import { IReadOnlyPlaybackObserver } from "../../api";
import { SegmentFetcherCreator } from "../../fetchers";
import { SegmentBuffer } from "../../segment_buffers";
import EVENTS from "../events_generators";
import reloadAfterSwitch from "../reload_after_switch";
import RepresentationStream, {
  IRepresentationStreamPlaybackObservation,
  ITerminationOrder,
} from "../representation";
import {
  IAdaptationStreamEvent,
  IRepresentationStreamEvent,
} from "../types";
import createRepresentationEstimator from "./create_representation_estimator";


/** Regular playback information needed by the AdaptationStream. */
export interface IAdaptationStreamPlaybackObservation extends
  IRepresentationStreamPlaybackObservation {
    /**
     * For the current SegmentBuffer, difference in seconds between the next position
     * where no segment data is available and the current position.
     */
    bufferGap : number;
    /** `duration` property of the HTMLMediaElement on which the content plays. */
    duration : number;
    /** If true, the player has been put on pause. */
    isPaused: boolean;
    /** Last "playback rate" asked by the user. */
    speed : number;
    /**
     * Only set for live contents.
     * Difference between the live edge and the current position, in seconds.
     */
    liveGap : number | undefined;
  }

/** Arguments given when creating a new `AdaptationStream`. */
export interface IAdaptationStreamArguments {
  /**
   * Module allowing to find the best Representation depending on the current
   * conditions like the current network bandwidth.
   */
  abrManager : ABRManager;
  /** Regularly emit playback conditions. */
  playbackObserver : IReadOnlyPlaybackObserver<IAdaptationStreamPlaybackObservation>;
  /** Content you want to create this Stream for. */
  content : { manifest : Manifest;
              period : Period;
              adaptation : Adaptation; };
  options: IAdaptationStreamOptions;
  /** SourceBuffer wrapper - needed to push media segments. */
  segmentBuffer : SegmentBuffer;
  /** Module used to fetch the wanted media segments. */
  segmentFetcherCreator : SegmentFetcherCreator;
  /**
   * "Buffer goal" wanted, or the ideal amount of time ahead of the current
   * position in the current SegmentBuffer. When this amount has been reached
   * this AdaptationStream won't try to download new segments.
   */
  wantedBufferAhead : IReadOnlySharedReference<number>;
  maxVideoBufferSize : IReadOnlySharedReference<number>;
}

/**
 * Various specific stream "options" which tweak the behavior of the
 * AdaptationStream.
 */
export interface IAdaptationStreamOptions {
  /**
   * Hex-encoded DRM "system ID" as found in:
   * https://dashif.org/identifiers/content_protection/
   *
   * Allows to identify which DRM system is currently used, to allow potential
   * optimizations.
   *
   * Set to `undefined` in two cases:
   *   - no DRM system is used (e.g. the content is unencrypted).
   *   - We don't know which DRM system is currently used.
   */
  drmSystemId : string | undefined;
  /**
   * Strategy taken when the user switch manually the current Representation:
   *   - "seamless": the switch will happen smoothly, with the Representation
   *     with the new bitrate progressively being pushed alongside the old
   *     Representation.
   *   - "direct": hard switch. The Representation switch will be directly
   *     visible but may necessitate the current MediaSource to be reloaded.
   */
  manualBitrateSwitchingMode : "seamless" | "direct";
  /**
   * If `true`, the AdaptationStream might replace segments of a lower-quality
   * (with a lower bitrate) with segments of a higher quality (with a higher
   * bitrate). This allows to have a fast transition when network conditions
   * improve.
   * If `false`, this strategy will be disabled: segments of a lower-quality
   * will not be replaced.
   *
   * Some targeted devices support poorly segment replacement in a
   * SourceBuffer.
   * As such, this option can be used to disable that unnecessary behavior on
   * those devices.
   */
  enableFastSwitching : boolean;
}

/**
 * Create new AdaptationStream Observable, which task will be to download the
 * media data for a given Adaptation (i.e. "track").
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SegmentBuffer.
 *
 * After being subscribed to, it will start running and will emit various events
 * to report its current status.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function AdaptationStream({
  abrManager,
  playbackObserver,
  content,
  options,
  segmentBuffer,
  segmentFetcherCreator,
  wantedBufferAhead,
  maxVideoBufferSize,
} : IAdaptationStreamArguments) : Observable<IAdaptationStreamEvent> {
  const directManualBitrateSwitching = options.manualBitrateSwitchingMode === "direct";
  const { manifest, period, adaptation } = content;

  /**
   * The buffer goal ratio base itself on the value given by `wantedBufferAhead`
   * to determine a more dynamic buffer goal for a given Representation.
   *
   * It can help in cases such as : the current browser has issues with
   * buffering and tells us that we should try to bufferize less data :
   * https://developers.google.com/web/updates/2017/10/quotaexceedederror
   */
  const bufferGoalRatioMap: Partial<Record<string, number>> = {};

  const { estimator$, abrFeedbacks$ } =
    createRepresentationEstimator(content, abrManager, playbackObserver.observe(true));

  /** Allows the `RepresentationStream` to easily fetch media segments. */
  const segmentFetcher = segmentFetcherCreator
    .createSegmentFetcher(adaptation.type,
                          {
                            onRequestBegin(value : IABRRequestBeginEventValue) {
                              abrFeedbacks$.next({ type: "requestBegin", value });
                            },
                            onRequestEnd(value : IABRRequestEndEventValue) {
                              abrFeedbacks$.next({ type: "requestEnd", value });
                            },
                            onProgress(value : IABRRequestProgressEventValue) {
                              abrFeedbacks$.next({ type: "progress", value });
                            },
                            onMetrics(value : IABRMetricsEventValue) {
                              abrFeedbacks$.next({ type: "metrics", value });
                            },
                          });

  /**
   * Stores the last estimate emitted through the `abrEstimate$` Observable,
   * starting with `null`.
   * This allows to easily rely on that value in inner Observables which might also
   * need the last already-considered value.
   */
  const lastEstimate = createSharedReference<IABREstimate | null>(null);

  /** Emits abr estimates on Subscription. */
  const abrEstimate$ = estimator$.pipe(
    tap((estimate) => { lastEstimate.setValue(estimate); }),
    deferSubscriptions(),
    share());

  /** Emit at each bitrate estimate done by the ABRManager. */
  const bitrateEstimate$ = abrEstimate$.pipe(
    filter(({ bitrate }) => bitrate != null),
    distinctUntilChanged((old, current) => old.bitrate === current.bitrate),
    map(({ bitrate }) => {
      log.debug(`Stream: new ${adaptation.type} bitrate estimate`, bitrate);
      return EVENTS.bitrateEstimationChange(adaptation.type, bitrate);
    })
  );

  /** Recursively create `RepresentationStream`s according to the last estimate. */
  const representationStreams$ = abrEstimate$
    .pipe(exhaustMap((estimate, i) : Observable<IAdaptationStreamEvent> => {
      return recursivelyCreateRepresentationStreams(estimate, i === 0);
    }));

  return observableMerge(representationStreams$, bitrateEstimate$);

  /**
   * Create `RepresentationStream`s starting with the Representation indicated in
   * `fromEstimate` argument.
   * Each time a new estimate is made, this function will create a new
   * `RepresentationStream` corresponding to that new estimate.
   * @param {Object} fromEstimate - The first estimate we should start with
   * @param {boolean} isFirstEstimate - Whether this is the first time we're
   * creating a RepresentationStream in the corresponding `AdaptationStream`.
   * This is important because manual quality switches might need a full reload
   * of the MediaSource _except_ if we are talking about the first quality chosen.
   * @returns {Observable}
   */
  function recursivelyCreateRepresentationStreams(
    fromEstimate : IABREstimate,
    isFirstEstimate : boolean
  ) : Observable<IAdaptationStreamEvent> {
    const { representation } = fromEstimate;

    // A manual bitrate switch might need an immediate feedback.
    // To do that properly, we need to reload the MediaSource
    if (directManualBitrateSwitching &&
        fromEstimate.manual &&
        !isFirstEstimate)
    {
      const { DELTA_POSITION_AFTER_RELOAD } = config.getCurrent();
      return reloadAfterSwitch(period,
                               adaptation.type,
                               playbackObserver,
                               DELTA_POSITION_AFTER_RELOAD.bitrateSwitch);
    }

    /**
     * Emit when the current RepresentationStream should be terminated to make
     * place for a new one (e.g. when switching quality).
     */
    const terminateCurrentStream$ = lastEstimate.asObservable().pipe(
      filter((newEstimate) => newEstimate === null ||
                              newEstimate.representation.id !== representation.id ||
                              (newEstimate.manual && !fromEstimate.manual)),
      take(1),
      map((newEstimate) => {
        if (newEstimate === null) {
          log.info("Stream: urgent Representation termination", adaptation.type);
          return ({ urgent: true });
        }
        if (newEstimate.urgent) {
          log.info("Stream: urgent Representation switch", adaptation.type);
          return ({ urgent: true });
        } else {
          log.info("Stream: slow Representation switch", adaptation.type);
          return ({ urgent: false });
        }
      }));

    /**
     * "Fast-switching" is a behavior allowing to replace low-quality segments
     * (i.e. with a low bitrate) with higher-quality segments (higher bitrate) in
     * the buffer.
     * This threshold defines a bitrate from which "fast-switching" is disabled.
     * For example with a fastSwitchThreshold set to `100`, segments with a
     * bitrate of `90` can be replaced. But segments with a bitrate of `100`
     * onward won't be replaced by higher quality segments.
     * Set to `undefined` to indicate that there's no threshold (anything can be
     * replaced by higher-quality segments).
     */
    const fastSwitchThreshold$ = !options.enableFastSwitching ?
      observableOf(0) : // Do not fast-switch anything
      lastEstimate.asObservable().pipe(
        map((estimate) => estimate === null ? undefined :
                                              estimate.knownStableBitrate),
        distinctUntilChanged());

    const representationChange$ =
      observableOf(EVENTS.representationChange(adaptation.type,
                                               period,
                                               representation));

    return observableConcat(representationChange$,
                            createRepresentationStream(representation,
                                                       terminateCurrentStream$,
                                                       fastSwitchThreshold$)).pipe(
      tap((evt) : void => {
        if (evt.type === "representationChange" ||
            evt.type === "added-segment")
        {
          return abrFeedbacks$.next(evt);
        }
      }),
      mergeMap((evt) => {
        if (evt.type === "stream-terminating") {
          const estimate = lastEstimate.getValue();
          if (estimate === null) {
            return EMPTY;
          }
          return recursivelyCreateRepresentationStreams(estimate, false);
        }
        return observableOf(evt);
      }));
  }

  /**
   * Create and returns a new RepresentationStream Observable, linked to the
   * given Representation.
   * @param {Representation} representation
   * @returns {Observable}
   */
  function createRepresentationStream(
    representation : Representation,
    terminateCurrentStream$ : Observable<ITerminationOrder>,
    fastSwitchThreshold$ : Observable<number | undefined>
  ) : Observable<IRepresentationStreamEvent> {
    return observableDefer(() => {
      const oldBufferGoalRatio = bufferGoalRatioMap[representation.id];
      const bufferGoalRatio = oldBufferGoalRatio != null ? oldBufferGoalRatio :
                                                           1;
      bufferGoalRatioMap[representation.id] = bufferGoalRatio;

      const bufferGoal$ = wantedBufferAhead.asObservable().pipe(
        map((wba) => wba * bufferGoalRatio)
      );
      // eslint-disable-next-line max-len
      const maxBufferSize$ = adaptation.type === "video" ? maxVideoBufferSize.asObservable() :
                                                           observableOf(Infinity);

      log.info("Stream: changing representation",
               adaptation.type,
               representation.id,
               representation.bitrate);
      return RepresentationStream({ playbackObserver,
                                    content: { representation,
                                               adaptation,
                                               period,
                                               manifest },
                                    segmentBuffer,
                                    segmentFetcher,
                                    terminate$: terminateCurrentStream$,
                                    options: { bufferGoal$,
                                               maxBufferSize$,
                                               drmSystemId: options.drmSystemId,
                                               fastSwitchThreshold$ } })
        .pipe(catchError((err : unknown) => {
          const formattedError = formatError(err, {
            defaultCode: "NONE",
            defaultReason: "Unknown `RepresentationStream` error",
          });
          if (formattedError.code === "BUFFER_FULL_ERROR") {
            const wba = wantedBufferAhead.getValue();
            const lastBufferGoalRatio = bufferGoalRatio;
            if (lastBufferGoalRatio <= 0.25 || wba * lastBufferGoalRatio <= 2) {
              throw formattedError;
            }
            bufferGoalRatioMap[representation.id] = lastBufferGoalRatio - 0.25;
            return createRepresentationStream(representation,
                                              terminateCurrentStream$,
                                              fastSwitchThreshold$);
          }
          throw formattedError;
        }));
    });
  }
}
