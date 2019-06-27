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
 * This file allows to create AdaptationBuffers.
 *
 * An AdaptationBuffer downloads and push segment for a single Adaptation (e.g.
 * a single audio or text track).
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrates the various RepresentationBuffer, which will
 * download and push segments for a single Representation.
 */

import objectAssign from "object-assign";
import {
  asapScheduler,
  BehaviorSubject,
  concat as observableConcat,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  observeOn,
  share,
  takeUntil,
} from "rxjs/operators";
import { formatError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../../manifest";
import concatMapLatest from "../../../utils/concat_map_latest";
import ABRManager, {
  IABREstimation,
} from "../../abr";
import { IPrioritizedSegmentFetcher } from "../../pipelines";
import { QueuedSourceBuffer } from "../../source_buffers";
import EVENTS from "../events_generators";
import RepresentationBuffer, {
  IRepresentationBufferClockTick,
} from "../representation";
import SegmentBookkeeper from "../segment_bookkeeper";
import {
  IAdaptationBufferEvent,
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
  IRepresentationBufferEvent,
} from "../types";

export interface IAdaptationBufferClockTick extends IRepresentationBufferClockTick {
  bufferGap : number; // /!\ bufferGap of the SourceBuffer
  duration : number; // duration of the HTMLMediaElement
  isLive : boolean; // If true, we're playing a live content
  speed : number; // Current regular speed asked by the user
}

/**
 * Create new Buffer Observable linked to the given Adaptation.
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SourceBuffer.
 *
 * It will emit various events to report its status to the caller.
 *
 * @param {Observable} clock$ - Clock emitting current playback conditions.
 * Triggers the main logic on each tick.
 * @param {QueuedSourceBuffer} queuedSourceBuffer - QueuedSourceBuffer used to
 * push segments to and to know about the current buffer's health.
 * @param {SegmentBookkeeper} segmentBookkeeper - Synchronize and retrieve the
 * actual Segments currently present in the SourceBuffer.
 * @param {Function} segmentFetcher - Allow to download segments.
 * @param {Observable} wantedBufferAhead$ - Emits the buffer goal.
 * @param {Object} content - Content to download.
 * @param {Object} abrManager - Calculate Bitrate and choose the right
 * Representation.
 * @param {Object} options - Tinkering options.
 * @returns {Observable}
 */
export default function AdaptationBuffer<T>(
  clock$ : Observable<IAdaptationBufferClockTick>,
  queuedSourceBuffer : QueuedSourceBuffer<T>,
  segmentBookkeeper : SegmentBookkeeper,
  segmentFetcher : IPrioritizedSegmentFetcher<T>,
  wantedBufferAhead$ : BehaviorSubject<number>,
  content : { manifest : Manifest;
              period : Period; adaptation : Adaptation; },
  abrManager : ABRManager,
  options : { manualBitrateSwitchingMode : "seamless" | "direct" }
) : Observable<IAdaptationBufferEvent<T>> {

  // The buffer goal ratio limits the wanted buffer ahead to determine the
  // buffer goal.
  //
  // It can help in cases such as : the current browser has issues with
  // buffering and tells us that we should try to bufferize less data :
  // https://developers.google.com/web/updates/2017/10/quotaexceedederror
  const bufferGoalRatioMap: Partial<Record<string, number>> = {};

  const directManualBitrateSwitching = options.manualBitrateSwitchingMode === "direct";
  const { manifest, period, adaptation } = content;

  // Keep track of the currently considered representation to add informations
  // to the ABR clock.
  let currentRepresentation : Representation|null = null;

  const abrClock$ = clock$.pipe(map((tick) => {
    const downloadBitrate = currentRepresentation ? currentRepresentation.bitrate :
                                                    undefined;
    return objectAssign({ downloadBitrate }, tick);
  }));

  const decryptableRepresentations = adaptation.representations
    .filter((representation) => representation.canBeDecrypted !== false);
  const abr$ : Observable<IABREstimation> =
    abrManager.get$(adaptation.type, abrClock$, decryptableRepresentations)
      .pipe(observeOn(asapScheduler), share());

  // emit when the current RepresentationBuffer should be stopped right now
  const killCurrentBuffer$ = new Subject<void>();

  // emit when the current RepresentationBuffer should stop making new downloads
  const terminateCurrentBuffer$ = new Subject<void>();

  // Emit at each bitrate estimate done by the ABRManager
  const bitrateEstimate$ = abr$.pipe(
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
        currentRepresentation = representation;

        // A manual bitrate switch might need an immediate feedback.
        // To do that properly, we need to reload the MediaSource
        if (directManualBitrateSwitching && estimate.manual && i !== 0) {
          return observableOf(EVENTS.needsMediaSourceReload());
        }
        const representationChange$ =
          observableOf(EVENTS.representationChange(adaptation.type,
                                                   period,
                                                   representation));
        const representationBuffer$ = createRepresentationBuffer(representation)
          .pipe(takeUntil(killCurrentBuffer$));
        return observableConcat(representationChange$, representationBuffer$);
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

  return observableMerge(adaptationBuffer$, bitrateEstimate$);

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
      const bufferGoalRatio: number = oldBufferGoalRatio != null ? oldBufferGoalRatio :
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
                                    segmentBookkeeper,
                                    segmentFetcher,
                                    terminate$: terminateCurrentBuffer$,
                                    bufferGoal$ })
        .pipe(catchError((err : unknown) => {
          const formattedError = formatError(err,
                                             "NONE",
                                             "Unknown `RepresentationBuffer` error");
          if (formattedError.code === "BUFFER_FULL_ERROR") {
            const wantedBufferAhead = wantedBufferAhead$.getValue();
            const lastBufferGoalRatio = bufferGoalRatio;
            if (lastBufferGoalRatio <= 0.25 ||
                wantedBufferAhead * lastBufferGoalRatio <= 2
            ) {
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

// Re-export RepresentationBuffer events used by the AdaptationBufferManager
export {
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
};
