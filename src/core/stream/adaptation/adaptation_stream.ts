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
 * IRepresentationEstimator, and orchestrates a RepresentationStream,
 * which will download and push segments corresponding to a chosen
 * Representation.
 */

import {
  catchError,
  concat as observableConcat,
  defer as observableDefer,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  finalize,
  ignoreElements,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  shareReplay,
  switchMap,
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
import {
  createSharedReference,
  IReadOnlySharedReference,
} from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import {
  IABREstimate,
  IRepresentationEstimator,
} from "../../adaptive";
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
  IRepresentationsChoice,
  IRepresentationStreamEvent,
} from "../types";
import getRepresentationsSwitchingStrategy from "./get_representations_switch_strategy";

/**
 * Create new AdaptationStream Observable, which task will be to download the
 * media data for a given Adaptation (i.e. "track").
 *
 * It will rely on the IRepresentationEstimator to choose at any time the
 * best Representation for this Adaptation and then run the logic to download
 * and push the corresponding segments in the SegmentBuffer.
 *
 * After being subscribed to, it will start running and will emit various events
 * to report its current status.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function AdaptationStream({
  playbackObserver,
  content,
  options,
  representationEstimator,
  segmentBuffer,
  segmentFetcherCreator,
  wantedBufferAhead,
  maxVideoBufferSize,
} : IAdaptationStreamArguments) : Observable<IAdaptationStreamEvent> {
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

  /** The Representation currently loaded by the RepresentationStream. */
  const currentRepresentation = createSharedReference<Representation | null>(null);

  /** Allows to abort adaptative estimates. */
  const adaptiveCanceller = new TaskCanceller();

  /** The array of Representations the adaptative logic can choose from. */
  const representationsChoice = createSharedReference<Representation[]>(
    content.representations.getValue().representations
  );

  // Start-up Adaptive logic
  const { estimates: estimateRef, callbacks: abrCallbacks } =
    representationEstimator({ manifest, period, adaptation },
                            currentRepresentation,
                            representationsChoice,
                            playbackObserver,
                            adaptiveCanceller.signal);

  /** Allows the `RepresentationStream` to easily fetch media segments. */
  const segmentFetcher = segmentFetcherCreator
    .createSegmentFetcher(adaptation.type,
                          /* eslint-disable @typescript-eslint/unbound-method */
                          { onRequestBegin: abrCallbacks.requestBegin,
                            onRequestEnd: abrCallbacks.requestEnd,
                            onProgress: abrCallbacks.requestProgress,
                            onMetrics: abrCallbacks.metrics });
                          /* eslint-enable @typescript-eslint/unbound-method */


  const representations$ = content.representations.asObservable();
  return representations$.pipe(switchMap((representationsInfo, i) => {
    if (i > 0) {
      // (first one already has been emitted)
      representationsChoice.setValue(representationsInfo.representations);
    }

    /**
     * Stores the last estimate emitted, starting with `null`.
     * This allows to easily rely on that value in inner Observables which might also
     * need the last already-considered value.
     */
    const lastRepEstimate = createSharedReference<IABREstimate | null>(null);

    /** Emits estimates on Subscription. */
    const representationEstimate$ = estimateRef.asObservable().pipe(
      tap((estimate) => { lastRepEstimate.setValue(estimate); }),
      shareReplay({ refCount: true }));

    /** Emit at each bitrate estimate done by the adaptive logic. */
    const bitrateEstimate$ = representationEstimate$.pipe(
      filter(({ bitrate }) => bitrate !== undefined),
      distinctUntilChanged((prev, next) =>
        prev.bitrate === next.bitrate),
      map(({ bitrate }) => {
        log.debug(`Stream: new ${adaptation.type} bitrate estimate`, bitrate);
        return EVENTS.bitrateEstimationChange(adaptation.type, bitrate);
      })
    );

    /**
     * Recursively create `RepresentationStream`s according to the last
     * Representation estimate.
     */
    const representationStreams$ = representationEstimate$
      .pipe(exhaustMap((estimate) : Observable<IAdaptationStreamEvent> => {
        return recursivelyCreateRepresentationStreams(estimate);
      }));

    const { DELTA_POSITION_AFTER_RELOAD } = config.getCurrent();
    const switchStrat = getRepresentationsSwitchingStrategy(period,
                                                            adaptation,
                                                            representationsInfo,
                                                            segmentBuffer,
                                                            playbackObserver);


    let obs$;
    switch (switchStrat.type) {
      case "continue":
        obs$ = representationStreams$;
        break;

      case "needs-reload":
        obs$ = reloadAfterSwitch(period,
                                 adaptation.type,
                                 playbackObserver,
                                 DELTA_POSITION_AFTER_RELOAD.bitrateSwitch);
        break;

      default:
        const needsBufferFlush$ = switchStrat.type === "flush-buffer"
          ? observableOf(EVENTS.needsBufferFlush())
          : EMPTY;
        const cleanBuffer$ = observableConcat(...switchStrat.value.map(({ start, end }) =>
          segmentBuffer.removeBuffer(start, end))
          // NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
          // first type parameter as `any` instead of the perfectly fine `unknown`,
          // leading to linter issues, as it forbids the usage of `any`.
          // This is why we're disabling the eslint rule.
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
        ).pipe(ignoreElements());
        obs$ = observableConcat(cleanBuffer$, needsBufferFlush$, representationStreams$);
    }

    return observableMerge(obs$, bitrateEstimate$);

    /**
     * Create `RepresentationStream`s starting with the Representation indicated in
     * `currEstimate` argument.
     * Each time a new estimate is made, this function will create a new
     * `RepresentationStream` corresponding to that new estimate.
     * @param {Object} currEstimate - The first estimate we should start with
     * @returns {Observable}
     */
    function recursivelyCreateRepresentationStreams(
      currEstimate : IABREstimate
    ) : Observable<IAdaptationStreamEvent> {
      const { representation } = currEstimate;


      /**
       * Emit when the current RepresentationStream should be terminated to make
       * place for a new one (e.g. when switching quality).
       */
      const terminateCurrentStream$ = lastRepEstimate.asObservable().pipe(
        filter((newEstimate) =>
          newEstimate === null ||
          newEstimate.representation.id !== representation.id ||
          (newEstimate.manual && !currEstimate.manual)),
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
        lastRepEstimate.asObservable().pipe(
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
        mergeMap((evt) => {
          if (evt.type === "added-segment") {
            abrCallbacks.addedSegment(evt.value);
            return EMPTY;
          }
          if (evt.type === "representationChange") {
            currentRepresentation.setValue(evt.value.representation);
          }
          if (evt.type === "stream-terminating") {
            const lastChoice = lastRepEstimate.getValue();
            if (lastChoice === null) {
              return EMPTY;
            }
            return recursivelyCreateRepresentationStreams(lastChoice);
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

        const maxBufferSize$ = adaptation.type === "video" ?
          maxVideoBufferSize.asObservable() :
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
  }), finalize(() => {
    // Clean-up adaptive logic
    adaptiveCanceller.cancel();
  }));

}

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
    /**
     * Information on whether the media element was paused at the time of the
     * Observation.
     */
    paused : IPausedPlaybackObservation;
    /** Last "playback rate" asked by the user. */
    speed : number;
    /** Theoretical maximum position on the content that can currently be played. */
    maximumPosition : number;
  }

/** Pause-related information linked to an emitted Playback observation. */
export interface IPausedPlaybackObservation {
  /**
   * Known paused state at the time the Observation was emitted.
   *
   * `true` indicating that the HTMLMediaElement was in a paused state.
   *
   * Note that it might have changed since. If you want truly precize
   * information, you should recuperate it from the HTMLMediaElement directly
   * through another mean.
   */
  last : boolean;
  /**
   * Actually wanted paused state not yet reached.
   * This might for example be set to `false` when the content is currently
   * loading (and thus paused) but with autoPlay enabled.
   */
  pending : boolean | undefined;
}

/** Arguments given when creating a new `AdaptationStream`. */
export interface IAdaptationStreamArguments {
  /** Regularly emit playback conditions. */
  playbackObserver : IReadOnlyPlaybackObserver<IAdaptationStreamPlaybackObservation>;
  /** Content you want to create this Stream for. */
  content : {
    manifest : Manifest;
    period : Period;
    adaptation : Adaptation;
    representations : IReadOnlySharedReference<IRepresentationsChoice>;
  };
  options: IAdaptationStreamOptions;
  /** Estimate the right Representation to play. */
  representationEstimator : IRepresentationEstimator;
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
