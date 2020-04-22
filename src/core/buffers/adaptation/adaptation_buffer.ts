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
 * This file allows to create `AdaptationBuffer`s.
 *
 * An `AdaptationBuffer` downloads and push segment for a single Adaptation
 * (e.g.  a single audio, video or text track).
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrates a RepresentationBuffer, which will download and
 * push segments corresponding to a chosen Representation.
 */

import {
  BehaviorSubject,
  concat as observableConcat,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
  throwError,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  multicast,
  share,
  startWith,
  takeUntil,
  tap,
} from "rxjs/operators";
import {
  formatError,
  MediaError,
} from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import concatMapLatest from "../../../utils/concat_map_latest";
import deferSubscriptions from "../../../utils/defer_subscriptions";
import ABRManager, {
  IABREstimate,
  IABRMetric,
  IABRRequest,
} from "../../abr";
import { SegmentFetcherCreator } from "../../fetchers";
import { QueuedSourceBuffer } from "../../source_buffers";
import EVENTS from "../events_generators";
import RepresentationBuffer, {
  IRepresentationBufferClockTick,
} from "../representation";
import {
  IAdaptationBufferEvent,
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
  IRepresentationBufferEvent,
  IRepresentationChangeEvent,
} from "../types";

/** `Clock tick` information needed by the AdaptationBuffer. */
export interface IAdaptationBufferClockTick extends IRepresentationBufferClockTick {
  /**
   * For the current SourceBuffer, difference in seconds between the next position
   * where no segment data is available and the current position.
   */
  bufferGap : number;
  /** `duration` property of the HTMLMediaElement on which the content plays. */
  duration : number;
  /** If true, the player has been put on pause. */
  isPaused: boolean;
  /** Last "playback rate" asked by the user. */
  speed : number;
}

/** Arguments given when creating a new `AdaptationBuffer`. */
export interface IAdaptationBufferArguments<T> {
  /**
   * Module allowing to find the best Representation depending on the current
   * conditions like the current network bandwidth.
   */
  abrManager : ABRManager;
  /**
   * Regularly emit playback conditions.
   * The main AdaptationBuffer logic will be triggered on each `tick`.
   */
  clock$ : Observable<IAdaptationBufferClockTick>;
  /** Content you want to create this buffer for. */
  content : { manifest : Manifest;
              period : Period;
              adaptation : Adaptation; };
  /**
   * Strategy taken when the user switch manually the current Representation:
   *   - "seamless": the switch will happen smoothly, with the Representation
   *     with the new bitrate progressively being pushed alongside the old
   *     Representation.
   *   - "direct": hard switch. The Representation switch will be directly
   *     visible but may necessitate the current MediaSource to be reloaded.
   */
  options: { manualBitrateSwitchingMode : "seamless" | "direct" };
  /** SourceBuffer wrapper - needed to push media segments. */
  queuedSourceBuffer : QueuedSourceBuffer<T>;
  /** Module used to fetch the wanted media segments. */
  segmentFetcherCreator : SegmentFetcherCreator<any>;
  /**
   * "Buffer goal" wanted, or the ideal amount of time ahead of the current
   * position in the current SourceBuffer. When this amount has been reached
   * this AdaptationBuffer won't try to download new segments.
   */
  wantedBufferAhead$ : BehaviorSubject<number>;
}

/**
 * Create new AdaptationBuffer Observable, which task will be to download the
 * media data for a given Adaptation (i.e. "track").
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SourceBuffer.
 *
 * After being subscribed to, it will start running and will emit various events
 * to report its current status.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function AdaptationBuffer<T>({
  abrManager,
  clock$,
  content,
  options,
  queuedSourceBuffer,
  segmentFetcherCreator,
  wantedBufferAhead$,
} : IAdaptationBufferArguments<T>) : Observable<IAdaptationBufferEvent<T>> {
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

  /** Emit when the current RepresentationBuffer should be stopped right now. */
  const killCurrentBuffer$ = new Subject<void>();

  /**
   * Emit when the current RepresentationBuffer should stop making new
   * downloads, and terminate itself when done.
   */
  const terminateCurrentBuffer$ = new Subject<void>();

  // use ABRManager for choosing the Representation
  const bufferEvents$ = new Subject<IBufferEventAddedSegment<T> |
                                    IRepresentationChangeEvent>();
  const requestsEvents$ = new Subject<IABRMetric | IABRRequest>();
  const abrEvents$ = observableMerge(bufferEvents$, requestsEvents$);

  const playableRepresentations = adaptation.getPlayableRepresentations();

  if (playableRepresentations.length <= 0) {
    const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION",
                                    "No Representation in the chosen " +
                                    "Adaptation can be played");
    return throwError(noRepErr);
  }

  const abr$ : Observable<IABREstimate> = abrManager.get$(adaptation.type,
                                                          playableRepresentations,
                                                          clock$,
                                                          abrEvents$)
      .pipe(deferSubscriptions(), share());

  const segmentFetcher = segmentFetcherCreator.createSegmentFetcher(adaptation.type,
                                                                    requestsEvents$);

  // Bitrate higher or equal to this value should not be replaced by segments of
  // better quality.
  // undefined means everything can potentially be replaced
  const knownStableBitrate$ = abr$.pipe(
    map(({ knownStableBitrate }) => knownStableBitrate),
    // always emit the last on subscribe
    multicast(() => new ReplaySubject< number | undefined >(1)),
    startWith(undefined),
    distinctUntilChanged());

  // Emit at each bitrate estimate done by the ABRManager
  const bitrateEstimates$ = abr$.pipe(
    filter(({ bitrate }) => bitrate != null),
    distinctUntilChanged((old, current) => old.bitrate === current.bitrate),
    map(({ bitrate }) => {
      log.debug(`Buffer: new ${adaptation.type} bitrate estimation`, bitrate);
      return EVENTS.bitrateEstimationChange(adaptation.type, bitrate);
    })
  );

  const newRepresentation$ = abr$
    .pipe(distinctUntilChanged((a, b) => a.manual === b.manual &&
                                         a.representation.id === b.representation.id));

  const adaptationBuffer$ = observableMerge(
    newRepresentation$
      .pipe(concatMapLatest((estimate, i) : Observable<IAdaptationBufferEvent<T>> => {
        const { representation } = estimate;

        // A manual bitrate switch might need an immediate feedback.
        // To do that properly, we need to reload the MediaSource
        if (directManualBitrateSwitching && estimate.manual && i !== 0) {
          return clock$.pipe(map(t => EVENTS.needsMediaSourceReload(period, t)));
        }

        const representationChange$ =
          observableOf(EVENTS.representationChange(adaptation.type,
                                                   period,
                                                   representation));
        const representationBuffer$ = createRepresentationBuffer(representation)
          .pipe(takeUntil(killCurrentBuffer$));

        return observableConcat(representationChange$, representationBuffer$)
          .pipe(tap((evt) : void => {
            if (evt.type === "representationChange" ||
                evt.type === "added-segment")
            {
              return bufferEvents$.next(evt);
            }
          }));
      })),

    // NOTE: This operator was put in a merge on purpose. It's a "clever"
    // hack to allow it to be called just *AFTER* the concatMapLatest one.
    newRepresentation$.pipe(map((estimation, i) => {
      if (i === 0) { // Initial run == no Buffer pending. We have nothing to do:
        return;      // The one just created will be launched right away.
      }
      if (estimation.urgent) {
        log.info("Buffer: urgent Representation switch", adaptation.type);

        // Kill current Buffer immediately. The one just chosen take its place.
        killCurrentBuffer$.next();
      } else {
        log.info("Buffer: slow Representation switch", adaptation.type);

        // terminate current Buffer. The last chosen Representation at the time
        // it will be finished will take its place.
        terminateCurrentBuffer$.next();
      }
    }), ignoreElements())
  );

  return observableMerge(adaptationBuffer$, bitrateEstimates$);

  /**
   * Create and returns a new RepresentationBuffer Observable, linked to the
   * given Representation.
   * @param {Representation} representation
   * @returns {Observable}
   */
  function createRepresentationBuffer(
    representation : Representation
  ) : Observable<IRepresentationBufferEvent<T>> {
    return observableDefer(() => {
      const oldBufferGoalRatio = bufferGoalRatioMap[representation.id];
      const bufferGoalRatio = oldBufferGoalRatio != null ? oldBufferGoalRatio :
                                                           1;
      bufferGoalRatioMap[representation.id] = bufferGoalRatio;

      const bufferGoal$ = wantedBufferAhead$.pipe(
        map((wba) => wba * bufferGoalRatio)
      );

      log.info("Buffer: changing representation", adaptation.type, representation);
      return RepresentationBuffer({ clock$,
                                    content: { representation,
                                               adaptation,
                                               period,
                                               manifest },
                                    queuedSourceBuffer,
                                    segmentFetcher,
                                    terminate$: terminateCurrentBuffer$,
                                    bufferGoal$,
                                    knownStableBitrate$ })
        .pipe(catchError((err : unknown) => {
          const formattedError = formatError(err, {
            defaultCode: "NONE",
            defaultReason: "Unknown `RepresentationBuffer` error",
          });
          if (formattedError.code === "BUFFER_FULL_ERROR") {
            const wantedBufferAhead = wantedBufferAhead$.getValue();
            const lastBufferGoalRatio = bufferGoalRatio;
            if (lastBufferGoalRatio <= 0.25 ||
                wantedBufferAhead * lastBufferGoalRatio <= 2)
            {
              throw formattedError;
            }
            bufferGoalRatioMap[representation.id] = lastBufferGoalRatio - 0.25;
            return createRepresentationBuffer(representation);
          }
          throw formattedError;
        }));
    });
  }
}

// Re-export RepresentationBuffer events used by the AdaptationBuffer
export {
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
};
