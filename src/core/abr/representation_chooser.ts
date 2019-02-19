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
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import { Representation } from "../../manifest";
import arrayFind from "../../utils/array_find";
import objectValues from "../../utils/object_values";
import { IBufferType } from "../source_buffers";
import BandwidthEstimator from "./bandwidth_estimator";
import EWMA from "./ewma";
import filterByBitrate from "./filter_by_bitrate";
import filterByWidth from "./filter_by_width";
import fromBitrateCeil from "./from_bitrate_ceil";

const {
  ABR_REGULAR_FACTOR,
  ABR_STARVATION_DURATION_DELTA,
  ABR_STARVATION_FACTOR,
  ABR_STARVATION_GAP,
  OUT_OF_STARVATION_GAP,
} = config;

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
}

interface IRepresentationChooserClockTick {
  downloadBitrate : number|undefined; // bitrate of the currently downloaded
                                      // segments, in bit per seconds
  bufferGap : number; // time to the end of the buffer, in seconds
  currentTime : number; // current position, in seconds
  speed : number; // current playback rate
  duration : number; // whole duration of the content
}

interface IProgressEventValue {
  duration : number; // current duration for the request, in ms
  id: string|number; // unique ID for the request
  size : number; // current downloaded size, in bytes
  timestamp : number; // timestamp of the progress event since unix epoch, in ms
  totalSize : number; // total size to download, in bytes
}

interface IRequestInfo {
  duration : number; // duration of the corresponding chunk, in seconds
  progress: IProgressEventValue[]; // progress events for this request
  requestTimestamp: number; // unix timestamp at which the request began, in ms
  time: number; // time at which the corresponding segment begins, in seconds
}

type IRequest = IProgressRequest | IBeginRequest | IEndRequest;

interface IProgressRequest {
  type: IBufferType;
  event: "progress";
  value: IProgressEventValue;
}

interface IBeginRequest {
  type: IBufferType;
  event: "requestBegin";
  value: {
    id: string|number;
    time: number;
    duration: number;
    requestTimestamp: number;
  };
}

interface IEndRequest {
  type: IBufferType;
  event: "requestEnd";
  value: {
    id: string|number;
  };
}

interface IFilters {
  bitrate?: number;
  width?: number;
}

interface IRepresentationChooserOptions {
  limitWidth$?: Observable<number>; // Emit maximum useful width
  throttle$?: Observable<number>; // Emit temporary bandwidth throttle
  initialBitrate?: number; // The initial wanted bitrate
  manualBitrate?: number; // A bitrate set manually
  maxAutoBitrate?: number; // The maximum bitrate we should set in adaptive mode
}

/**
 * Get the pending request starting with the asked segment position.
 * @param {Object} requests
 * @param {number} position
 * @returns {IRequestInfo|undefined}
 */
function getConcernedRequest(
  requests : Partial<Record<string, IRequestInfo>>,
  neededPosition : number
) : IRequestInfo|undefined {
  const currentRequestIds = Object.keys(requests);
  const len = currentRequestIds.length;

  for (let i = 0; i < len; i++) {
    const request = requests[currentRequestIds[i]];
    if (request != null && request.duration > 0) {
      const segmentEnd = request.time + request.duration;
      if (segmentEnd > neededPosition && neededPosition - request.time > -0.3) {
        return request;
      }
    }
  }
}

/**
 * Estimate the __VERY__ recent bandwidth based on a single unfinished request.
 * Useful when the current bandwidth seemed to have fallen quickly.
 *
 * @param {Object} request
 * @returns {number|undefined}
 */
function estimateRequestBandwidth(request : IRequestInfo) : number|undefined {
  if (request.progress.length < 2) {
    return undefined;
  }

  // try to infer quickly the current bitrate based on the
  // progress events
  const ewma1 = new EWMA(2);
  const { progress } = request;
  for (let i = 1; i < progress.length; i++) {
    const bytesDownloaded = progress[i].size - progress[i - 1].size;
    const timeElapsed = progress[i].timestamp - progress[i - 1].timestamp;
    const reqBitrate = (bytesDownloaded * 8) / (timeElapsed / 1000);
    ewma1.addSample(timeElapsed / 1000, reqBitrate);
  }
  return ewma1.getEstimate();
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

/**
 * Estimate remaining time for a pending request from a progress event.
 * @param {Object} lastProgressEvent
 * @param {number} bandwidthEstimate
 * @returns {number}
 */
function estimateRemainingTime(
  lastProgressEvent: IProgressEventValue,
  bandwidthEstimate : number
) : number {
  const remainingData = (lastProgressEvent.totalSize - lastProgressEvent.size) * 8;
  return Math.max(remainingData / bandwidthEstimate, 0);
}

/**
 * Check if the request for the most needed segment is too slow.
 * If that's the case, re-calculate the bandwidth urgently based on
 * this single request.
 * @param {Object} pendingRequests - Current pending requests.
 * @param {Object} clock - Informations on the current playback.
 * @param {Number} lastEstimatedBitrate - Last bitrate estimation emitted.
 * @returns {Number|undefined}
 */
function estimateStarvationModeBitrate(
  pendingRequests : Partial<Record<string, IRequestInfo>>,
  clock : IRepresentationChooserClockTick,
  lastEstimatedBitrate : number|undefined
) : number|undefined {
  const nextNeededPosition = clock.currentTime + clock.bufferGap;
  const concernedRequest = getConcernedRequest(pendingRequests, nextNeededPosition);
  if (!concernedRequest) {
    return undefined;
  }

  const chunkDuration = concernedRequest.duration;
  const now = performance.now();
  const lastProgressEvent = concernedRequest.progress ?
    concernedRequest.progress[concernedRequest.progress.length - 1] :
    null;

  // first, try to do a quick estimate from progress events
  const bandwidthEstimate = estimateRequestBandwidth(concernedRequest);
  if (lastProgressEvent != null && bandwidthEstimate != null) {
    const remainingTime =
      estimateRemainingTime(lastProgressEvent, bandwidthEstimate) * 1.2;

    // if this remaining time is reliable and is not enough to avoid buffering
    if (
      (now - lastProgressEvent.timestamp) / 1000 <= remainingTime &&
      remainingTime > (clock.bufferGap / clock.speed)
    ) {
      return bandwidthEstimate;
    }
  }

  const requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1000;
  const currentBitrate = clock.downloadBitrate;
  if (
    currentBitrate == null ||
    requestElapsedTime <= ((chunkDuration * 1.5 + 1) / clock.speed)
  ) {
    return undefined;
  }

  // calculate a reduced bitrate from the current one
  const reducedBitrate = currentBitrate * 0.7;
  if (lastEstimatedBitrate == null || reducedBitrate < lastEstimatedBitrate) {
    return reducedBitrate;
  }
}

/**
 * Returns true if, based on the current requests, it seems that the ABR should
 * switch immediately if a lower bitrate is more adapted.
 * Returns false if it estimates that you have time before switching to a lower
 * bitrate.
 * @param {Object} pendingRequests
 * @param {Object} clock
 */
function shouldDirectlySwitchToLowBitrate(
  pendingRequests : Partial<Record<string, IRequestInfo>>,
  clock : IRepresentationChooserClockTick
) : boolean {
  const nextNeededPosition = clock.currentTime + clock.bufferGap;
  const requests = objectValues(pendingRequests)
    .filter((a) : a is IRequestInfo => !!a)
    .sort((a, b) => a.time - b.time);

  const nextNeededRequest = arrayFind(requests, (r) =>
    (r.time + r.duration) > nextNeededPosition
  );
  if (!nextNeededRequest) {
    return true;
  }

  const now = performance.now();
  const lastProgressEvent = nextNeededRequest.progress ?
    nextNeededRequest.progress[nextNeededRequest.progress.length - 1] :
    null;

  // first, try to do a quick estimate from progress events
  const bandwidthEstimate = estimateRequestBandwidth(nextNeededRequest);
  if (lastProgressEvent == null || bandwidthEstimate == null) {
    return true;
  }

  const remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
  if (
    (now - lastProgressEvent.timestamp) / 1000 <= (remainingTime * 1.2) &&
    remainingTime < ((clock.bufferGap / clock.speed) + ABR_STARVATION_GAP)
  ) {
    return false;
  }
  return true;
}

/**
 * Choose the right representation based on multiple parameters given, such as:
 *   - the current user's bandwidth
 *   - the max bitrate authorized
 *   - the size of the video element
 *
 * Those parameters can be set through different subjects and methods.
 * The subjects (undocumented here are):
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
  private readonly estimator : BandwidthEstimator;
  private readonly _initialBitrate : number;
  private readonly _reEstimate$ : Subject<void>;
  private _currentRequests : Partial<Record<string, IRequestInfo>>;

  /**
   * @param {Object} options
   */
  constructor(options : IRepresentationChooserOptions) {
    this._dispose$ = new Subject();

    this.manualBitrate$ = new BehaviorSubject(
      options.manualBitrate != null ?
      options.manualBitrate : -1
    );

    this.maxAutoBitrate$ = new BehaviorSubject(
      options.maxAutoBitrate != null ?
      options.maxAutoBitrate : Infinity
    );

    this.estimator = new BandwidthEstimator();
    this._currentRequests = {};

    this._initialBitrate = options.initialBitrate || 0;

    this._limitWidth$ = options.limitWidth$;
    this._throttle$ = options.throttle$;
    this._reEstimate$ = new Subject<void>();
  }

  /**
   * @param {Observable} clock$
   * @param {Array.<Object>} representations
   * @returns {Observable}
   */
  public get$(
    clock$ : Observable<IRepresentationChooserClockTick>,
    representations : Representation[]
  ) : Observable<IABREstimation> {
    if (!representations.length) {
      throw new Error("ABRManager: no representation choice given");
    }
    if (representations.length === 1) {
      return observableOf({
        bitrate: undefined, // Bitrate estimation is deactivated here
        representation: representations[0],
        manual: false,
        urgent: true,
      });
    }

    const { manualBitrate$, maxAutoBitrate$, _initialBitrate }  = this;
    const _deviceEventsArray : Array<Observable<IFilters>> = [];

    if (this._limitWidth$) {
      _deviceEventsArray.push(
        this._limitWidth$
          .pipe(map(width => ({ width })))
      );
    }
    if (this._throttle$) {
      _deviceEventsArray.push(
        this._throttle$
          .pipe(map(bitrate => ({ bitrate })))
      );
    }

    // Emit restrictions on the pools of available Representations to choose
    // from.
    const deviceEvents$ : Observable<IFilters> = _deviceEventsArray.length ?
      observableCombineLatest(..._deviceEventsArray)
        .pipe(map((args : IFilters[]) => objectAssign({}, ...args))) :
      observableOf({});

    // Store the last client's bitrate generated by our estimation algorithms.
    let lastEstimatedBitrate : number|undefined;

    return manualBitrate$.pipe(switchMap(manualBitrate => {
      if (manualBitrate >= 0) {
        // -- MANUAL mode --
        return observableOf({
          bitrate: undefined, // Bitrate estimation is deactivated here
          representation: fromBitrateCeil(representations, manualBitrate) ||
            representations[0],
          manual: true,
          urgent: true, // a manual bitrate switch should happen immediately
        });
      }

      // -- AUTO mode --
      let inStarvationMode = false; // == buffer gap too low == panic mode
      return observableCombineLatest(
        clock$,
        maxAutoBitrate$,
        deviceEvents$,
        this._reEstimate$.pipe(startWith(null))
      ).pipe(
        map(([ clock, maxAutoBitrate, deviceEvents ]) => {
          let newBitrateCeil; // bitrate ceil for the chosen Representation
          let bandwidthEstimate;
          const { bufferGap, currentTime, duration } = clock;

          // check if should get in/out of starvation mode
          if (bufferGap + currentTime < duration - ABR_STARVATION_DURATION_DELTA) {
            if (!inStarvationMode && bufferGap <= ABR_STARVATION_GAP) {
              log.info("ABR: enter starvation mode.");
              inStarvationMode = true;
            } else if (inStarvationMode && bufferGap >= OUT_OF_STARVATION_GAP) {
              log.info("ABR: exit starvation mode.");
              inStarvationMode = false;
            }
          } else if (inStarvationMode) {
            log.info("ABR: exit starvation mode.");
            inStarvationMode = false;
          }

          // If in starvation mode, check if a quick new estimate can be done
          // from the last requests.
          // If so, cancel previous estimations and replace it by the new one
          if (inStarvationMode) {
            bandwidthEstimate = estimateStarvationModeBitrate(
              this._currentRequests, clock, lastEstimatedBitrate);

            if (bandwidthEstimate != null) {
              log.info("ABR: starvation mode emergency estimate:", bandwidthEstimate);
              this.estimator.reset();
              const currentBitrate = clock.downloadBitrate;
              newBitrateCeil = currentBitrate == null ?
                Math.min(bandwidthEstimate, maxAutoBitrate) :
                Math.min(bandwidthEstimate, maxAutoBitrate, currentBitrate);
            }
          }

          // if newBitrateCeil is not yet defined, do the normal estimation
          if (newBitrateCeil == null) {
            bandwidthEstimate = this.estimator.getEstimate();

            let nextEstimate;
            if (bandwidthEstimate != null) {
              nextEstimate = inStarvationMode ?
                bandwidthEstimate * ABR_STARVATION_FACTOR :
                bandwidthEstimate * ABR_REGULAR_FACTOR;
            } else if (lastEstimatedBitrate != null) {
              nextEstimate = inStarvationMode ?
                lastEstimatedBitrate * ABR_STARVATION_FACTOR :
                lastEstimatedBitrate * ABR_REGULAR_FACTOR;
            } else {
              nextEstimate = _initialBitrate;
            }
            newBitrateCeil = Math.min(nextEstimate, maxAutoBitrate);
          }

          if (clock.speed > 1) {
            newBitrateCeil /= clock.speed;
          }

          const _representations =
            getFilteredRepresentations(representations, deviceEvents);

          const chosenRepresentation =
            fromBitrateCeil(_representations, newBitrateCeil) || representations[0];

          const urgent = (() => {
            if (clock.downloadBitrate == null) {
              return true;
            } else if (chosenRepresentation.bitrate === clock.downloadBitrate) {
              return false;
            } else if (chosenRepresentation.bitrate > clock.downloadBitrate) {
              return !inStarvationMode;
            }
            return shouldDirectlySwitchToLowBitrate(this._currentRequests, clock);
          })();
          return {
            bitrate: bandwidthEstimate,
            representation: chosenRepresentation,
            manual: false,
            urgent,
          };

        }),

        tap(({ bitrate }) => {
          if (bitrate != null) {
            lastEstimatedBitrate = bitrate;
          }
        }),

        takeUntil(this._dispose$)
      );
    }));
  }

  /**
   * Add a bandwidth estimate by giving:
   *   - the duration of the request, in s
   *   - the size of the request in bytes
   * @param {number} duration
   * @param {number} size
   */
  public addEstimate(duration : number, size : number) : void {
    if (duration != null && size != null) {
      this.estimator.addSample(duration, size);
      this._reEstimate$.next();
    }
  }

  /**
   * Add informations about a new pending request.
   * This can be useful if the network bandwidth drastically changes to infer
   * a new bandwidth through this single request.
   * @param {string|number} id
   * @param {Object} payload
   */
  public addPendingRequest(id : string|number, payload: IBeginRequest) : void {
    if (this._currentRequests[id]) {
      if (__DEV__) {
        throw new Error("ABR: request already added.");
      }
      log.warn("ABR: request already added.");
      return;
    }
    const { time, duration, requestTimestamp } = payload.value;
    this._currentRequests[id] = {
      time,
      duration,
      requestTimestamp,
      progress: [],
    };
  }

  /**
   * Add progress informations to a pending request.
   * Progress objects are a key part to calculate the bandwidth from a single
   * request, in the case the user's bandwidth changes drastically while doing
   * it.
   * @param {string|number} id
   * @param {Object} progress
   */
  public addRequestProgress(id : string|number, progress: IProgressRequest) : void {
    const request = this._currentRequests[id];
    if (!request) {
      if (__DEV__) {
        throw new Error("ABR: progress for a request not added");
      }
      log.warn("ABR: progress for a request not added");
      return;
    }
    request.progress.push(progress.value);
  }

  /**
   * Remove a request previously set as pending through the addPendingRequest
   * method.
   * @param {string|number} id
   */
  public removePendingRequest(id : string|number) : void {
    if (!this._currentRequests[id]) {
      if (__DEV__) {
        throw new Error("ABR: can't remove unknown request");
      }
      log.warn("ABR: can't remove unknown request");
    }
    delete this._currentRequests[id];
  }

  /**
   * Free up the resources used by the RepresentationChooser.
   */
  public dispose() : void {
    this._dispose$.next();
    this._dispose$.complete();
    this._reEstimate$.next();
    this._reEstimate$.complete();
    this.manualBitrate$.complete();
    this.maxAutoBitrate$.complete();
  }
}

export {
  IRequest,
  IRepresentationChooserClockTick,
  IRepresentationChooserOptions,
};
