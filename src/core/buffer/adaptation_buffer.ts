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
 * An AdaptationBuffer downloads and push segment for a single Adaptation.
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrate the various RepresentationBuffer, which will
 * download and push segments for a single Representation.
 */

import objectAssign from "object-assign";
import {
  concat as observableConcat,
  merge as observableMerge,
  Observable,
  of as observableOf,
  timer as observableTimer,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  shareReplay,
  switchMap,
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
  abrManager : ABRManager
) : Observable<IAdaptationBufferEvent<T>> {
  const { manifest, period, adaptation } = content;
  const abr$ = getABRForAdaptation(adaptation, abrManager, clock$)
    .pipe(shareReplay());

  /**
   * Emit at each bitrate estimate done by the ABRManager
   * @type {Observable}
   */
  const bitrateEstimate$ = abr$.pipe(
    filter(({ bitrate } : { bitrate? : number }) => bitrate != null),
    map(({ bitrate } : { bitrate? : number }) =>
      EVENTS.bitrateEstimationChange(adaptation.type, bitrate)
    ));

  /**
   * Emit the chosen representation each time it changes.
   * @type {Observable}
   */
  const representation$ : Observable<Representation> = abr$.pipe(
    map((abr) : Representation|null => abr.representation),
    distinctUntilChanged((a : Representation|null, b : Representation|null) =>
      !a || !b || (a.bitrate === b.bitrate && a.id === b.id)
    )
  ) as Observable<Representation>;

  /**
   * Emit each times the RepresentationBuffer should be re-initialized:
   *   - Each time the Representation change
   *   - Each time the user seek
   * @type {Observable}
   */
  const shouldSwitchRepresentationBuffer$ : Observable<Representation> =
    representation$.pipe(
      distinctUntilChanged((oldRepresentation, newRepresentation) => {
        return oldRepresentation.id === newRepresentation.id;
      }));

  /**
   * @type {Observable}
   */
  const buffer$ = shouldSwitchRepresentationBuffer$.pipe(
    switchMap((representation) =>
      observableConcat(
        observableOf(
          EVENTS.representationChange(adaptation.type, period, representation)
        ),
        createRepresentationBuffer(representation)
      )
    ));

  return observableMerge(buffer$, bitrateEstimate$);

  /**
   * Create and returns a new RepresentationBuffer Observable, linked to the
   * given Representation.
   * @param {Representation} representation
   * @returns {Observable}
   */
  function createRepresentationBuffer(
    representation : Representation
  ) : Observable<IRepresentationBufferEvent<T>> {

    log.info("changing representation", adaptation.type, representation);
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
      log.warn("precondition failed", manifest.presentationLiveGap);

      return observableTimer(2000).pipe(
        mergeMap(() => createRepresentationBuffer(representation)));
    }));
  }
}

/**
 * Returns ABR Observable.
 * @param {Object} adaptation
 * @param {Object} abrManager
 * @param {Observable} abrBaseClock$
 * @returns {Observable}
 */
function getABRForAdaptation(
  adaptation : Adaptation,
  abrManager : ABRManager,
  abrBaseClock$ : Observable<IAdaptationBufferClockTick>
) : Observable<IABREstimation> {
  const representations = adaptation.representations;

  /**
   * Keep track of the current representation to add informations to the
   * ABR clock.
   * TODO isn't that a little bit ugly?
   * @type {Object|null}
   */
  let currentRepresentation : Representation|null = null;

  const abrClock$ = abrBaseClock$.pipe(
    map((tick) => {
      const bitrate = currentRepresentation ?
        currentRepresentation.bitrate : undefined;
      return objectAssign({ bitrate }, tick);
    }));

  return abrManager.get$(adaptation.type, abrClock$, representations).pipe(
    tap(({ representation }) => {
      currentRepresentation = representation;
    }));
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
