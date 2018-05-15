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

import objectAssign = require("object-assign");
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
  switchMap,
  tap,
} from "rxjs/operators";
import { ErrorTypes } from "../../errors";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import log from "../../utils/log";
import ABRManager from "../abr";
import { IPrioritizedSegmentFetcher } from "../pipelines";
import {
  IBufferType,
  QueuedSourceBuffer,
} from "../source_buffers";
import { SegmentBookkeeper } from "../stream";
import createFakeBuffer from "./create_fake_buffer";
import RepresentationBuffer, {
  IBufferClockTick,
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
  IRepresentationBufferEvent,
} from "./representation_buffer";

// Clock wanted by the AdaptationBufferManager
export interface IAdaptationBufferClockTick {
  bufferGap : number;
  duration : number;
  isLive : boolean;
  position : number;
  speed : number;
}

// Emitted as new bitrate estimations are done
export interface IBitrateEstimationChangeEvent {
  type : "bitrateEstimationChange";
  value : {
    type : IBufferType;
    bitrate : number|undefined;
  };
}

// Emitted when the current Representation considered changes
export interface IRepresentationChangeEvent {
  type : "representationChange";
  value : {
    type : IBufferType;
    period : Period;
    representation : Representation|null;
  };
}

// Every events sent by the AdaptationBufferManager
export type IAdaptationBufferEvent<T> =
  IRepresentationBufferEvent<T> |
  IBitrateEstimationChangeEvent |
  IRepresentationChangeEvent;

/**
 * Create Buffers linked to an Adaptation.
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SourceBuffer.
 *
 * @example
 * ```js
 * const bufferManager = new AdaptationBufferManager(
 *   abrManager,
 *   abrClock$
 * );
 *
 * const buffer$ = bufferManager.createBuffer(
 *  bufferClock$,
 *  queuedSourceBuffer,
 *  segmentBookkeeper,
 *  segmentFetcher,
 *  wantedBufferAhead$,
 *  { manifest, period, adaptation},
 * );
 * ```
 * @class AdaptationBufferManager
 */
export default class AdaptationBufferManager {
  private readonly _abrManager : ABRManager;
  private readonly _abrBaseClock$ : Observable<IAdaptationBufferClockTick>;

  /**
   * @param {ABRManager} abrManager
   * @param {Observable} abrBaseClock$ - Clock at which the ABR manager will
   * estimate the right Representation to play.
   */
  constructor(
    abrManager : ABRManager,
    abrBaseClock$ : Observable<IAdaptationBufferClockTick>
  ) {
    this._abrManager = abrManager;
    this._abrBaseClock$ = abrBaseClock$;
  }

  /**
   * Create new Buffer Observable linked to the given Adaptation.
   *
   * This Buffer will download and push segments from a single Adaptation,
   * linked to a single Period.
   * It will emit various events to report its status to the caller.
   *
   * @param {Observable} bufferClock$ - Clock at which the Buffer will check
   * for segments download
   * @param {QueuedSourceBuffer} queuedSourceBuffer - QueuedSourceBuffer used
   * to push segments and know about the current real buffer's health.
   * @param {SegmentBookkeeper} segmentBookkeeper - Used to synchronize and
   * retrieve the Segments currently present in the QueuedSourceBuffer
   * @param {Function} segmentFetcher - Function used to download segments
   * @param {Observable} wantedBufferAhead$ - Emits the buffer goal
   * @param {Object} content - Content to download
   * @returns {Observable}
   */
  public createBuffer<T>(
    bufferClock$ : Observable<IBufferClockTick>,
    queuedSourceBuffer : QueuedSourceBuffer<T>,
    segmentBookkeeper : SegmentBookkeeper,
    segmentFetcher : IPrioritizedSegmentFetcher<T>,
    wantedBufferAhead$ : Observable<number>,
    content : { manifest : Manifest; period : Period; adaptation : Adaptation }
  ) : Observable<IAdaptationBufferEvent<T>> {

    const { manifest, period, adaptation } = content;
    const abr$ = this._getABRForAdaptation(adaptation);

    /**
     * Emit at each bitrate estimate done by the ABRManager
     * @type {Observable}
     */
    const bitrateEstimate$ = abr$.pipe(
      filter(({ bitrate } : { bitrate? : number }) => bitrate != null),
      map(({ bitrate } : { bitrate? : number }) => {
        return {
          type: "bitrateEstimationChange" as "bitrateEstimationChange",
          value: {
            type: adaptation.type,
            bitrate,
          },
        };
      }));

    /**
     * Emit the chosen representation each time it changes.
     * @type {Observable}
     */
    const representation$ : Observable<Representation> = abr$
      .pipe(map((abr) : Representation|null => abr.representation))
      .pipe(
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
          observableOf({
            type: "representationChange" as "representationChange",
            value: {
              type: adaptation.type,
              period,
              representation,
            },
          }),
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
        clock$: bufferClock$,
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
        // TODO only for smooth/to Delete?
        // TODO Do it in the stream?
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
   * @returns {Observable}
   */
  private _getABRForAdaptation(
    adaptation : Adaptation
  ) : Observable<{
    bitrate: undefined|number;
    representation: Representation|null;
  }> {
    const representations = adaptation.representations;

    /**
     * Keep track of the current representation to add informations to the
     * ABR clock.
     * TODO isn't that a little bit ugly?
     * @type {Object|null}
     */
    let currentRepresentation : Representation|null = null;

    const abrClock$ = this._abrBaseClock$.pipe(
      map((tick) => {
        let bitrate;
        let lastIndexPosition;

        if (currentRepresentation) {
          bitrate = currentRepresentation.bitrate;

          if (currentRepresentation.index) {
            lastIndexPosition =
              currentRepresentation.index.getLastPosition();
          }
        }

        return objectAssign({
          bitrate,
          lastIndexPosition,
        }, tick);
      }));

    return this._abrManager.get$(adaptation.type, abrClock$, representations).pipe(
      tap(({ representation }) => {
        currentRepresentation = representation;
      }));
  }
}

// Re-export RepresentationBuffer events used by the AdaptationBufferManager
export {
  createFakeBuffer,
  IBufferClockTick,
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
};
