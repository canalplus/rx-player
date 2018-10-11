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
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import { Representation } from "../../manifest";
import { IBufferType } from "../source_buffers";
import BandwidthEstimator from "./bandwidth_estimator";
import EWMA from "./ewma";
import filterByBitrate from "./filterByBitrate";
import filterByWidth from "./filterByWidth";
import fromBitrateCeil from "./fromBitrateCeil";

const {
  ABR_REGULAR_FACTOR,
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
}

interface IRepresentationChooserClockTick {
  bitrate : number|undefined; // currently set bitrate, in bit per seconds
  bufferGap : number; // time to the end of the buffer, in seconds
  currentTime : number; // current position, in seconds
  speed : number; // current playback rate
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
  limitWidth$?: Observable<number>;
  throttle$?: Observable<number>;
  initialBitrate?: number;
  manualBitrate?: number;
  maxAutoBitrate?: number;
}

/**
 * Returns an observable emitting only the representation concerned by the
 * bitrate ceil given.
 * @param {Array.<Representation>} representations
 * @param {number} bitrate
 * @returns {Observable}
 */
function setManualRepresentation(
  representations : Representation[],
  bitrate : number
) : Observable<IABREstimation> {
  const chosenRepresentation =
    fromBitrateCeil(representations, bitrate) ||
    representations[0];

  return observableOf({
    bitrate: undefined, // Bitrate estimation is deactivated here
    manual: true,
    representation: chosenRepresentation,
  });
}

/**
 * Get the pending request starting with the asked segment position.
 * @param {Object} requests
 * @param {number} position
 * @returns {IRequestInfo|undefined}
 */
function getConcernedRequest(
  requests : Partial<Record<string, IRequestInfo>>,
  position : number
) : IRequestInfo|undefined {
  const currentRequestIds = Object.keys(requests);
  const len = currentRequestIds.length;

  for (let i = 0; i < len; i++) {
    const request = requests[currentRequestIds[i]];

    // We check that this chunk has a high probability of being the one we want
    if (
      request != null &&
      Math.abs(request.time - position) < request.duration * 0.3
    ) {
      return request;
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
 * @param {Object} requests - Current pending requests.
 * @param {Object} clock - Informations on the current playback.
 * @param {Number} lastEstimatedBitrate - Last bitrate estimation emitted.
 * @returns {Number|undefined}
 */
function estimateStarvationModeBitrate(
  requests : Partial<Record<string, IRequestInfo>>,
  clock : IRepresentationChooserClockTick,
  lastEstimatedBitrate : number|undefined
) : number|undefined {
  const nextNeededPosition = clock.currentTime + clock.bufferGap;
  const concernedRequest = getConcernedRequest(requests, nextNeededPosition);
  if (!concernedRequest) {
    return undefined;
  }

  const currentBitrate = clock.bitrate;
  const chunkDuration = concernedRequest.duration;
  const now = Date.now();
  const requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1000;
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
 * Choose the right representation based on multiple parameters given, such as:
 *   - the current user's bandwidth
 *   - the max bitrate authorized
 *   - the size of the video element
 *   - etc.
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
        manual: false,
        representation: representations[0],
      }).pipe(takeUntil(this._dispose$));
    }

    const {
      manualBitrate$,
      maxAutoBitrate$,
      _initialBitrate,
    }  = this;

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

    /**
     * Emit restrictions on the pools of available representations to choose
     * from.
     * @type {Observable}
     */
    const deviceEvents$ : Observable<IFilters> = _deviceEventsArray.length ?
      observableCombineLatest(..._deviceEventsArray)
        .pipe(map((args : IFilters[]) => objectAssign({}, ...args))) :
      observableOf({});

    /**
     * Store the last client's bitrate generated by our estimation algorithms.
     * @type {Number|undefined}
     */
    let lastEstimatedBitrate : number|undefined;

    return manualBitrate$.pipe(switchMap(manualBitrate => {
      if (manualBitrate >= 0) {
        // -- MANUAL mode --
        return setManualRepresentation(representations, manualBitrate);
      }

      // -- AUTO mode --
      let inStarvationMode = false; // == buffer gap too low == panic mode
      return observableCombineLatest(clock$, maxAutoBitrate$, deviceEvents$)
        .pipe(
          map(([ clock, maxAutoBitrate, deviceEvents ]) => {
            let nextBitrate;
            let bandwidthEstimate;
            const { bufferGap } = clock;

            // check if should get in/out of starvation mode
            if (!inStarvationMode && bufferGap <= ABR_STARVATION_GAP) {
              log.info("ABR - enter starvation mode.");
              inStarvationMode = true;
            } else if (inStarvationMode && bufferGap >= OUT_OF_STARVATION_GAP) {
              log.info("ABR - exit starvation mode.");
              inStarvationMode = false;
            }

            // If in starvation mode, check if a quick new estimate can be done
            // from the last requests.
            // If so, cancel previous estimations and replace it by the new one
            if (inStarvationMode) {
              bandwidthEstimate = estimateStarvationModeBitrate(
                this._currentRequests, clock, lastEstimatedBitrate);

              if (bandwidthEstimate != null) {
                log.info("ABR - starvation mode emergency estimate:", bandwidthEstimate);
                this.resetEstimate();
                const currentBitrate = clock.bitrate;
                nextBitrate = currentBitrate == null ?
                  Math.min(bandwidthEstimate, maxAutoBitrate) :
                  Math.min(bandwidthEstimate, maxAutoBitrate, currentBitrate);
              }
            }

            // if nextBitrate is not yet defined, do the normal estimation
            if (nextBitrate == null) {
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
              nextBitrate = Math.min(nextEstimate, maxAutoBitrate);
            }

            if (clock.speed > 1) {
              nextBitrate /= clock.speed;
            }

            const _representations =
              getFilteredRepresentations(representations, deviceEvents);

            return {
              bitrate: bandwidthEstimate,
              manual: false,
              representation: fromBitrateCeil(_representations, nextBitrate) ||
              representations[0],
            };

          }),

          tap(({ bitrate }) => {
            if (bitrate != null) {
              log.debug("ABR - calculated bitrate:", bitrate);
              lastEstimatedBitrate = bitrate;
            }
          }),

          shareReplay()
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
    }
  }

  /**
   * Reset all the estimates done until now.
   * Useful when the network situation changed completely.
   */
  public resetEstimate() : void {
    this.estimator.reset();
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
   * Remove informations about all pending requests.
   */
  public resetRequests() : void {
    this._currentRequests = {};
  }

  /**
   * Free up the resources used by the RepresentationChooser.
   */
  public dispose() : void {
    this._dispose$.next();
    this.manualBitrate$.complete();
    this.maxAutoBitrate$.complete();
  }
}

export {
  IRequest,
  IRepresentationChooserClockTick,
  IRepresentationChooserOptions,
};
