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
  concat as observableConcat,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
  timer as observableTimer,
} from "rxjs";
import {
  catchError,
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  multicast,
  refCount,
  takeUntil,
  tap,
} from "rxjs/operators";
import { ErrorTypes } from "../../errors";
import log from "../../log";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import ABRManager, {
  IABREstimation,
} from "../abr";
import { IPrioritizedSegmentFetcher } from "../pipelines";
import { QueuedSourceBuffer } from "../source_buffers";
import createFakeBuffer from "./create_fake_buffer";
import EVENTS from "./events_generators";
import RepresentationBuffer, {
  IRepresentationBufferClockTick,
} from "./representation_buffer";
import SegmentBookkeeper from "./segment_bookkeeper";
import {
  IAdaptationBufferEvent,
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
  IRepresentationBufferEvent,
} from "./types";

export interface IAdaptationBufferClockTick extends IRepresentationBufferClockTick {
  isLive : boolean;
  speed : number;
  bufferGap : number;
  readyState : number;
  duration : number;
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
 * @param {Observable} clock$ - Clock at which the Buffer will check for
 * segments download
 * @param {QueuedSourceBuffer} queuedSourceBuffer - QueuedSourceBuffer used
 * to push segments and know about the current real buffer's health.
 * @param {SegmentBookkeeper} segmentBookkeeper - Used to synchronize and
 * retrieve the Segments currently present in the QueuedSourceBuffer
 * @param {Function} segmentFetcher - Function used to download segments
 * @param {Observable} wantedBufferAhead$ - Emits the buffer goal
 * @param {Object} content - Content to download
 * @param {Object} abrManager
 * @returns {Observable}
 */
export default function AdaptationBuffer<T>(
  clock$ : Observable<IAdaptationBufferClockTick>,
  queuedSourceBuffer : QueuedSourceBuffer<T>,
  segmentBookkeeper : SegmentBookkeeper,
  segmentFetcher : IPrioritizedSegmentFetcher<T>,
  wantedBufferAhead$ : Observable<number>,
  content : { manifest : Manifest; period : Period; adaptation : Adaptation },
  abrManager : ABRManager,
  options : { manualBitrateSwitchingMode : "seamless"|"direct" }
) : Observable<IAdaptationBufferEvent<T>> {
  const directManualBitrateSwitching = options.manualBitrateSwitchingMode === "direct";
  const { manifest, period, adaptation } = content;

  // Keep track of the currently considered representation to add informations
  // to the ABR clock.
  let currentRepresentation : Representation|null = null;

  const abrClock$ = clock$.pipe(map((tick) => {
    const downloadBitrate = currentRepresentation ?
      currentRepresentation.bitrate : undefined;
    return objectAssign({ downloadBitrate }, tick);
  }));

  const abr$ : Observable<IABREstimation> =
    abrManager.get$(adaptation.type, abrClock$, adaptation.representations).pipe(
      // equivalent to a sane shareReplay:
      // https://github.com/ReactiveX/rxjs/issues/3336
      // TODO Replace it when that issue is resolved
      multicast(() => new ReplaySubject(1)),
      refCount()
    );

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

  const adaptationBuffer$ = abr$.pipe(
    distinctUntilChanged((a, b) =>
      a.manual === b.manual && a.representation.id === b.representation.id
    ),

    tap((estimation) => {
      if (estimation.urgent) {
        log.info("Buffer: urgent Representation switch", adaptation.type);
        killCurrentBuffer$.next();
      } else {
        log.info("Buffer: slow Representation switch", adaptation.type);
        terminateCurrentBuffer$.next();
      }
    }),

    concatMap((estimate, i) : Observable<IAdaptationBufferEvent<T>> => {
      const { representation } = estimate;
      currentRepresentation = representation;

      // Manual switch needs an immediate feedback.
      // To do that properly, we need to reload the stream
      if (directManualBitrateSwitching && estimate.manual && i !== 0) {
        return observableOf(EVENTS.needsStreamReload());
      }
      const representationChange$ = observableOf(
        EVENTS.representationChange(adaptation.type, period, representation));
      const representationBuffer$ = createRepresentationBuffer(representation)
        .pipe(takeUntil(killCurrentBuffer$));
      return observableConcat(representationChange$, representationBuffer$);
    })
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
      log.info("Buffer: changing representation", adaptation.type, representation);
      return RepresentationBuffer({
        clock$,
        content: {
          representation,
          adaptation,
          period,
          manifest,
        },
        queuedSourceBuffer,
        segmentBookkeeper,
        segmentFetcher,
        terminate$: terminateCurrentBuffer$,
        wantedBufferAhead$,
      }).pipe(
        catchError((error) => {
          // TODO only for smooth/to Delete? Do it in the stream?
          // for live adaptations, handle 412 errors as precondition-
          // failed errors, ie: we are requesting for segments before they
          // exist
          // (In case of smooth streaming, 412 errors are requests that are
          // performed to early).
          if (
            !manifest.isLive ||
            error.type !== ErrorTypes.NETWORK_ERROR ||
            !error.isHttpError(412)
          ) {
            throw error;
          }

          manifest.updateLiveGap(1); // go back 1s for now
          log.warn("Buffer: precondition failed", manifest.presentationLiveGap);

          return observableTimer(2000).pipe(
            mergeMap(() => createRepresentationBuffer(representation)));
        }));
    });
  }
}

// Re-export RepresentationBuffer events used by the AdaptationBufferManager
export {
  createFakeBuffer,
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
};
