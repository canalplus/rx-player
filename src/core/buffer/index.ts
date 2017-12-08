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

import { Observable } from "rxjs/Observable";
import { ErrorTypes } from "../../errors";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import { ISegmentLoaderArguments } from "../../net/types";
import log from "../../utils/log";
import ABRManager from "../abr";
import {
  QueuedSourceBuffer,
  SupportedBufferTypes,
} from "../source_buffers";
import { SegmentBookkeeper } from "../stream";
import RepresentationBuffer, {
  IAddedSegmentEvent,
  IBufferActiveEvent,
  IBufferClockTick,
  IBufferFullEvent,
  IDiscontinuityEvent,
  INeedingManifestRefreshEvent,
  IRepresentationBufferEvent,
} from "./representation_buffer";

export interface IAdaptationBufferClockTick {
  bufferGap : number;
  currentTime : number;
  duration : number;
}

export interface IBitrateEstimationChangeEvent {
  type : "bitrateEstimationChange";
  value : {
    type : SupportedBufferTypes;
    bitrate : number|undefined;
  };
}

export interface IRepresentationChangeEvent {
  type : "representationChange";
  value : {
    type : SupportedBufferTypes;
    period : Period;
    representation : Representation|null;
  };
}

export type IAdaptationBufferEvent =
  IRepresentationBufferEvent |
  IBitrateEstimationChangeEvent |
  IRepresentationChangeEvent;

/**
 * Allows to create Buffers, each being linked to a single adaptation.
 *
 * They will download the right segments in the representations chosen by the
 * ABRManager.
 *
 * @example
 * ```js
 * const bufferManager = new AdaptationBufferManager(
 *   abrManager,
 *   abrClock$,
 *   speed$,
 *   seekings$,
 *   wantedBufferAhead$
 * );
 *
 * const buffer$ = bufferManager.createBuffer(
 *  bufferClock$,
 *  queuedSourceBuffer,
 *  segmentBookkeeper,
 *  pipeline,
 *  { manifest, period, adaptation},
 * );
 * ```
 * @class AdaptationBufferManager
 */
export default class AdaptationBufferManager {
  private _abrManager : ABRManager;
  private _abrBaseClock$ : Observable<IAdaptationBufferClockTick>;
  private _speed$ : Observable<number>;
  private _seeking$ : Observable<null>;
  private _wantedBufferAhead$ : Observable<number>;

  /**
   * @param {ABRManager} abrManager
   * @param {Observable} abrBaseClock$ - Clock$ at which the ABR manager will
   * make estimates.
   * @param {BehaviorSubject} speed$ - emits the speed each time it changes
   * @param {Observable} seeking$ - emits each time the user seeks
   * @param {Observable} wantedBufferAhead$ - emits the buffer goal
   * @param {Subject} warnings$ - Subject to emit non-fatal errors
   */
  constructor(
    abrManager : ABRManager,
    abrBaseClock$ : Observable<IAdaptationBufferClockTick>,
    speed$ : Observable<number>,
    seeking$ : Observable<null>,
    wantedBufferAhead$ : Observable<number>
  ) {
    this._abrManager = abrManager;
    this._abrBaseClock$ = abrBaseClock$;
    this._speed$ = speed$;
    this._seeking$ = seeking$;
    this._wantedBufferAhead$ = wantedBufferAhead$;
  }

  /**
   * Create new Buffer Observable linked to the given Adaptation.
   *
   * This Buffer will download and push segments from a single Adaptation,
   * linked to a single Period.
   * It will emit various events to report its status to the caller.
   *
   * @param {Observable} bufferClock$
   * @param {QueuedSourceBuffer} queuedSourceBuffer
   * @param {SegmentBookkeeper} segmentBookkeeper
   * @param {Function} pipeline
   * @param {Object} content
   * @returns {Observable}
   */
  public createBuffer(
    bufferClock$ : Observable<IBufferClockTick>,
    queuedSourceBuffer : QueuedSourceBuffer<any>,
    segmentBookkeeper : SegmentBookkeeper,
    pipeline : (content : ISegmentLoaderArguments) => Observable<any>,
    content : { manifest : Manifest; period : Period; adaptation : Adaptation }
  ) : Observable<IAdaptationBufferEvent> {

    const { manifest, period, adaptation } = content;
    const wantedBufferAhead$ = this._wantedBufferAhead$;
    const abr$ = this._getABRForAdaptation(manifest, adaptation);

    /**
     * Emit at each bitrate estimate done by the ABRManager
     * @type {Observable}
     */
    const bitrateEstimate$ = abr$
      .filter(({ bitrate } : { bitrate? : number }) => bitrate != null)
      .map(({ bitrate } : { bitrate? : number }) => {
        return {
          type: "bitrateEstimationChange" as "bitrateEstimationChange",
          value: {
            type: adaptation.type,
            bitrate,
          },
        };
      });

    /**
     * Emit the chosen representation each time it changes.
     * @type {Observable}
     */
    const representation$ : Observable<Representation> = abr$
      .map(abr => abr.representation)
      .distinctUntilChanged((a, b) =>
        !a || !b || (a.bitrate === b.bitrate && a.id === b.id)
      ) as Observable<Representation>;

    /**
     * Emit each times the RepresentationBuffer should be re-initialized:
     *   - Each time the Representation change
     *   - Each time the user seek
     * @type {Observable}
     */
    const shouldSwitchRepresentationBuffer$ : Observable<Representation> =
      Observable.combineLatest(representation$, this._seeking$)
        .map(([representation]) => representation);

    /**
     * @type {Observable}
     */
    const buffer$ = shouldSwitchRepresentationBuffer$
      .switchMap((representation) =>
        Observable.of({
          type: "representationChange" as "representationChange",
          value: {
            type: adaptation.type,
            period,
            representation,
          },
        }).concat(createRepresentationBuffer(representation))
      );

    return Observable.merge(buffer$, bitrateEstimate$);

    /**
     * Create and returns a new RepresentationBuffer Observable, linked to the
     * given Representation.
     * @param {Representation} representation
     * @returns {Observable}
     */
    function createRepresentationBuffer(
      representation : Representation
    ) : Observable<IRepresentationBufferEvent> {

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
        pipeline,
        wantedBufferAhead$,
      })
      .catch((error) => {
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

        return Observable.timer(2000)
          .mergeMap(() => createRepresentationBuffer(representation));
      });
    }
  }

  /**
   * Create empty Buffer Observable, linked to a Period.
   *
   * This observable will never download any segment and just emit a "full"
   * event when reaching the end.
   * @param {Object} content
   * @returns {Observable}
   */
  public createEmptyBuffer(
    bufferClock$ : Observable<IBufferClockTick>,
    content : { manifest : Manifest; period : Period }
  ) : Observable<IAdaptationBufferEvent> {
    const period = content.period;
    return Observable.combineLatest(bufferClock$, this._wantedBufferAhead$)
      .filter(([clockTick, wantedBufferAhead]) =>
        period.end != null && clockTick.currentTime + wantedBufferAhead >= period.end
      )
      .mergeMap(([clockTick, wantedBufferAhead]) => {
        const periodEnd = period.end || Infinity;
        return Observable.of({
          type: "full" as "full",
          value: {
            wantedRange: {
              start: Math.min(clockTick.currentTime, periodEnd),
              end: Math.min(clockTick.currentTime + wantedBufferAhead, periodEnd),
            },
          },
        });
      });
  }

  private _getABRForAdaptation(
    manifest : Manifest,
    adaptation : Adaptation
  ) {
    const representations = adaptation.representations;

    /**
     * Keep track of the current representation to add informations to the
     * ABR clock.
     * TODO isn't that a little bit ugly?
     * @type {Object|null}
     */
    let currentRepresentation : Representation|null = null;

    const abrClock$ = Observable.combineLatest(
      this._abrBaseClock$,
      this._speed$
    ) .map(([timing, speed]) => {
      let bitrate;
      let lastIndexPosition;

      if (currentRepresentation) {
        bitrate = currentRepresentation.bitrate;

        if (currentRepresentation.index) {
          lastIndexPosition =
            currentRepresentation.index.getLastPosition();
        }
      }

      return {
        bufferGap: timing.bufferGap,
        duration: timing.duration,
        position: timing.currentTime,
        bitrate,
        isLive: manifest.isLive,
        lastIndexPosition,
        speed,
      };
    });

    return this._abrManager.get$(adaptation.type, abrClock$, representations)
      .do(({ representation }) => {
        currentRepresentation = representation;
      });
  }
}

// Re-export RepresentationBuffer events used by the AdaptationBufferManager
export {
  IAddedSegmentEvent,
  IBufferActiveEvent,
  IBufferClockTick,
  IBufferFullEvent,
  IDiscontinuityEvent,
  INeedingManifestRefreshEvent,
};
