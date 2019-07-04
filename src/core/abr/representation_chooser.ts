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

import objectAssign from "object-assign";
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  filter,
  map,
  startWith,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs/operators";
import {
  ISegment,
  Representation,
} from "../../manifest";
import { IBufferType } from "../source_buffers";
import BufferBasedChooser from "./buffer_based_chooser";
import EWMA from "./ewma";
import filterByBitrate from "./filter_by_bitrate";
import filterByWidth from "./filter_by_width";
import fromBitrateCeil from "./from_bitrate_ceil";
import NetworkAnalyzer from "./network_analyzer";
import PendingRequestsStore from "./pending_requests_store";

import { getLeftSizeOfRange } from "../../utils/ranges";

// Adaptive BitRate estimation object
export interface IABREstimation {
  bitrate: undefined|number; // If defined, the currently calculated bitrate
  manual: boolean; // True if the representation choice was manually dictated
                   // by the user
  representation: Representation; // The chosen representation
  urgent : boolean; // True if current downloads should be canceled to
                    // download the one of the chosen Representation
                    // immediately
                    // False if we can chose to wait for the current
                    // download(s) to finish before switching.
  knownStableBitrate?: number;
}

interface IRepresentationChooserClockTick {
  representation : Representation|null; // Current downloaded Representation
  bufferGap : number; // time to the end of the buffer, in seconds
  currentTime : number; // current position, in seconds
  speed : number; // current playback rate
  duration : number; // whole duration of the content
}

interface IProgressEventValue {
  duration : number; // current duration for the request, in ms
  id: string; // unique ID for the request
  size : number; // current downloaded size, in bytes
  timestamp : number; // timestamp of the progress event since unix epoch, in ms
  totalSize : number; // total size to download, in bytes
}

type IRequest = IProgressRequest |
                IBeginRequest |
                IEndRequest;

interface IProgressRequest { type: IBufferType;
                             event: "progress";
                             value: IProgressEventValue; }

interface IBeginRequest { type: IBufferType;
                          event: "requestBegin";
                          value: { id: string;
                                   time: number;
                                   duration: number;
                                   requestTimestamp: number; }; }

interface IEndRequest { type: IBufferType;
                        event: "requestEnd";
                        value: { id: string }; }

interface IFilters { bitrate?: number;
                     width?: number; }

// Event emitted each time a segment is added
interface IBufferEventAddedSegment {
  type : "added-segment";
  value : { buffered : TimeRanges;
            content : { representation : Representation }; };
}

// Buffer events needed by the ABRManager
export type IABRBufferEvents = IBufferEventAddedSegment;

interface IRepresentationChooserOptions {
  limitWidth$?: Observable<number>; // Emit maximum useful width
  throttle$?: Observable<number>; // Emit temporary bandwidth throttle
  throttleBitrate$?: Observable<number>; // Emit temporary bandwidth throttle
  initialBitrate?: number; // The initial wanted bitrate
  manualBitrate?: number; // A bitrate set manually
  maxAutoBitrate?: number; // The maximum bitrate we should set in adaptive mode
}

/**
 * Filter representations given through filters options.
 * @param {Array.<Representation>} representations
 * @param {Object} filters - Filter Object.
 * _Can_ contain each of the following properties:
 *   - bitrate {Number} - max bitrate authorized (included).
 *   - width {Number} - max width authorized (included).
 * @returns {Array.<Representation>}
 */
function getFilteredRepresentations(
  representations : Representation[],
  filters : IFilters
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

function getScoreForRepresentation(
  scoreKeeper: { estimator : EWMA;
                 representation : Representation; } |
               null,
  representation : Representation
) : number|undefined {
  return scoreKeeper != null &&
         scoreKeeper.representation.id === representation.id ?
           scoreKeeper.estimator.getEstimate() :
           undefined;
}

/**
 * Create Observable that merge several throttling Observables into one.
 * @param {Observable} limitWidth$ - Emit the width at which the chosen
 * Representation should be limited.
 * @param {Observable} throttleBitrate$ - Emit the maximum bitrate authorized.
 * @returns {Observable}
 */
function createDeviceEvents(
  limitWidth$? : Observable<number>,
  throttle$? : Observable<number>,
  throttleBitrate$? : Observable<number>
) : Observable<IFilters> {
  const deviceEventsArray : Array<Observable<IFilters>> = [];

  if (limitWidth$) {
    deviceEventsArray.push(limitWidth$.pipe(map(width => ({ width }))));
  }
  if (throttle$) {
    deviceEventsArray.push(throttle$.pipe(map(bitrate => ({ bitrate }))));
  }
  if (throttleBitrate$) {
    deviceEventsArray.push(throttleBitrate$.pipe(map(bitrate => ({ bitrate }))));
  }

  // Emit restrictions on the pools of available representations to choose
  // from.
  return deviceEventsArray.length ?
    observableCombineLatest(deviceEventsArray)
      .pipe(map((args : IFilters[]) => objectAssign({}, ...args))) :
    observableOf({});
}

/**
 * Choose the right Representation thanks to "choosers":
 *
 * - The throughput chooser choose the Representation relatively to the current
 *   user's bandwidth.
 *
 * - The buffer-based chooser choose the Representation relatively to the
 *   current size of the buffer.
 *
 * To have more control over which Representation should be choosen, you can
 * also use the following exposed subjects:
 *
 *   - manualBitrate$ {Subject}: Set the bitrate manually, if no representation
 *     is found with the given bitrate. An immediately inferior one will be
 *     taken instead. If still, none are found, the representation with the
 *     minimum bitrate will be taken.
 *     Set it to a negative value to go into automatic bitrate mode.
 *
 *   - maxBitrate$ {Subject}: Set the maximum automatic bitrate. If the manual
 *     bitrate is not set / set to a negative value, this will be the maximum
 *     switch-able bitrate. If no representation is found inferior or equal to
 *     this bitrate, the representation with the minimum bitrate will be taken.
 *
 * @class RepresentationChooser
 */
export default class RepresentationChooser {
  public readonly manualBitrate$ : BehaviorSubject<number>;
  public readonly maxAutoBitrate$ : BehaviorSubject<number>;

  private readonly _dispose$ : Subject<void>;
  private readonly _limitWidth$ : Observable<number>|undefined;
  private readonly _throttle$ : Observable<number>|undefined;
  private readonly _throttleBitrate$ : Observable<number>|undefined;
  private readonly _networkAnalyzer : NetworkAnalyzer;
  private readonly _pendingRequests : PendingRequestsStore;

  private _mediaElement : HTMLMediaElement;

  // "Maintainability score" estimator for the last downloaded Representation.
  // null when no representation has been chosen yet.
  //
  // The "score" here is a number which defines if the Representation can be
  // downloaded reliably without buffering, when playing at *1 speed.
  // A score higher than 1 means the Representation can continue to be
  // downloaded reliably.
  // A score lower or equal to 1 means that we could rebuffer if we stay on
  // that Representation for too long.
  private _scoreKeeper : { representation : Representation; estimator : EWMA } |
                         null;

  // Last Representation found to have a positive score.
  // Used to give a feedback to the buffers about which Representation chosen
  // are actually in higher quality than what it can reliably play.
  private _lastStableRepresentation : Representation | null;

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} options
   */
  constructor(
    mediaElement : HTMLMediaElement,
    options : IRepresentationChooserOptions
  ) {
    this._dispose$ = new Subject();
    this._scoreKeeper = null;
    this._lastStableRepresentation = null;
    this._networkAnalyzer = new NetworkAnalyzer(options.initialBitrate || 0);
    this._pendingRequests = new PendingRequestsStore();
    this._mediaElement = mediaElement;
    this._limitWidth$ = options.limitWidth$;
    this._throttle$ = options.throttle$;
    this._throttleBitrate$ = options.throttleBitrate$;

    this.manualBitrate$ =
      new BehaviorSubject(options.manualBitrate != null ? options.manualBitrate :
                                                          -1);
    this.maxAutoBitrate$ =
      new BehaviorSubject(options.maxAutoBitrate != null ? options.maxAutoBitrate :
                                                           Infinity);
  }

  public get$(
    representations : Representation[],
    clock$: Observable<IRepresentationChooserClockTick>,
    bufferEvents$ : Observable<IABRBufferEvents>
  ): Observable<IABREstimation> {
    if (!representations.length) {
      throw new Error("ABRManager: no representation choice given");
    }
    if (representations.length === 1) {
      return observableOf({ bitrate: undefined,
                            representation: representations[0],
                            manual: false,
                            urgent: true,
                            knownStableBitrate: undefined });
    }

    const { manualBitrate$,
            maxAutoBitrate$,
            _limitWidth$,
            _throttle$,
            _throttleBitrate$ }  = this;
    const deviceEvents$ = createDeviceEvents(_limitWidth$, _throttle$, _throttleBitrate$);

    return manualBitrate$.pipe(switchMap(manualBitrate => {
      if (manualBitrate >= 0) {
        // -- MANUAL mode --
        return observableOf({
          representation: fromBitrateCeil(representations, manualBitrate) ||
                          representations[0],
          bitrate: undefined, // Bitrate estimation is deactivated here
          knownStableBitrate: undefined,
          manual: true,
          urgent: true, // a manual bitrate switch should happen immediately
        });
      }

      // -- AUTO mode --
      let lastEstimatedBitrate: number|undefined;
      let forceBandwidthMode = true;

      // Emit each time a buffer-based estimation should be actualized (each
      // time a segment is added).
      const bufferBasedClock$ = bufferEvents$.pipe(
        filter((e) : e is IBufferEventAddedSegment => e.type === "added-segment"),
        withLatestFrom(clock$),
        map(([{ value: evtValue }, { speed } ]) => {
          const { currentTime } = this._mediaElement;
          const timeRanges = evtValue.buffered;
          const bufferGap = getLeftSizeOfRange(timeRanges, currentTime);
          const { representation } = evtValue.content;
          const currentScore = getScoreForRepresentation(this._scoreKeeper,
                                                         representation);
          const currentBitrate = representation.bitrate;
          return { bufferGap, currentBitrate, currentScore, speed };
        })
      );

      const bitrates = representations.map(r => r.bitrate);
      const bufferBasedEstimation$ = BufferBasedChooser(bufferBasedClock$, bitrates)
        .pipe(startWith(undefined));

      return observableCombineLatest([ clock$,
                                       maxAutoBitrate$,
                                       deviceEvents$,
                                       bufferBasedEstimation$ ]
      ).pipe(
        map(([ clock,
               maxAutoBitrate,
               deviceEvents,
               bufferBasedBitrate ]
        ) : IABREstimation => {
          const _representations = getFilteredRepresentations(representations,
                                                              deviceEvents);
          const requests = this._pendingRequests.getRequests();
          const { bandwidthEstimate, bitrateChosen } = this._networkAnalyzer
            .getBandwidthEstimate(clock, requests, lastEstimatedBitrate);

          lastEstimatedBitrate = bandwidthEstimate;

          const knownStableBitrate = this._lastStableRepresentation == null ?
            undefined :
            this._lastStableRepresentation.bitrate / (clock.speed > 0 ? clock.speed :
                                                                        1);

          const { bufferGap } = clock;
          if (!forceBandwidthMode && bufferGap <= 5) {
            forceBandwidthMode = true;
          } else if (forceBandwidthMode &&
                     Number.isFinite(bufferGap) && bufferGap > 10)
          {
            forceBandwidthMode = false;
          }

          const chosenRepFromBandwidth =
            fromBitrateCeil(_representations, Math.min(bitrateChosen, maxAutoBitrate)) ||
            _representations[0] ||
            representations[0];

          if (forceBandwidthMode) {
            return { bitrate: bandwidthEstimate,
                     representation: chosenRepFromBandwidth,
                     urgent: this._networkAnalyzer
                       .isUrgent(chosenRepFromBandwidth.bitrate, requests, clock),
                     manual: false,
                     knownStableBitrate };
          }
          if (bufferBasedBitrate == null ||
              chosenRepFromBandwidth.bitrate >= bufferBasedBitrate)
          {
            return { bitrate: bandwidthEstimate,
                     representation: chosenRepFromBandwidth,
                     urgent: this._networkAnalyzer
                       .isUrgent(chosenRepFromBandwidth.bitrate, requests, clock),
                     manual: false,
                     knownStableBitrate, };
          }
          const limitedBitrate = Math.min(bufferBasedBitrate, maxAutoBitrate);
          const chosenRepresentation = fromBitrateCeil(_representations,
                                                       limitedBitrate) ||
                                       _representations[0] ||
                                       representations[0];
          return { bitrate: bandwidthEstimate,
                   representation: chosenRepresentation,
                   urgent: this._networkAnalyzer
                     .isUrgent(bufferBasedBitrate, requests, clock),
                   manual: false,
                   knownStableBitrate, };
        }),
        takeUntil(this._dispose$)
      );
    }));
  }

  /**
   * Add bandwidth and "maintainability score" estimate by giving:
   *   - the duration of the request, in s
   *   - the size of the request in bytes
   *   - the content downloaded
   * @param {number} duration
   * @param {number} size
   * @param {Object} content
   */
  public addEstimate(
    duration : number,
    size : number,
    content: { segment : ISegment; representation : Representation }
  ) : void {
    // calculate bandwidth
    this._networkAnalyzer.addEstimate(duration, size);

    // calculate "maintainability score"
    const { segment } = content;
    if (segment.duration == null) {
      return;
    }
    const requestDuration = duration / 1000;
    const segmentDuration = segment.duration / segment.timescale;
    const ratio = segmentDuration / requestDuration;

    const { representation } = content;
    if (this._scoreKeeper != null &&
        this._scoreKeeper.representation.id === representation.id)
    {
      this._scoreKeeper.estimator.addSample(requestDuration, ratio);
    } else {
      const estimator = new EWMA(5);
      estimator.addSample(requestDuration, ratio);
      this._scoreKeeper = { estimator, representation };
    }

    const estimate = this._scoreKeeper.estimator.getEstimate();
    if (estimate > 1) {
      this._lastStableRepresentation = representation;
    }
  }

  /**
   * Add informations about a new pending request.
   * This can be useful if the network bandwidth drastically changes to infer
   * a new bandwidth through this single request.
   * @param {string} id
   * @param {Object} payload
   */
  public addPendingRequest(id : string, payload: IBeginRequest) : void {
    this._pendingRequests.add(id, payload);
  }

  /**
   * Add progress informations to a pending request.
   * Progress objects are a key part to calculate the bandwidth from a single
   * request, in the case the user's bandwidth changes drastically while doing
   * it.
   * @param {string} id
   * @param {Object} progress
   */
  public addRequestProgress(id : string, progress: IProgressRequest) : void {
    this._pendingRequests.addProgress(id, progress);
  }

  /**
   * Remove a request previously set as pending through the addPendingRequest
   * method.
   * @param {string} id
   */
  public removePendingRequest(id : string) : void {
    this._pendingRequests.remove(id);
  }

  /**
   * Free up the resources used by the RepresentationChooser.
   */
  public dispose() : void {
    this._dispose$.next();
    this._dispose$.complete();
    this.manualBitrate$.complete();
    this.maxAutoBitrate$.complete();
  }
}

export {
  IRequest,
  IRepresentationChooserClockTick,
  IRepresentationChooserOptions,
};
