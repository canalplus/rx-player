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

import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";

import config from "../../config";
import assert from "../../utils/assert";

import BandwidthEstimator from "./bandwidth_estimator";
import filterByWidth from "./filterByWidth";
import filterByBitrate from "./filterByBitrate";
import fromBitrateCeil from "./fromBitrateCeil";
import Representation from "../../manifest/representation";

import EWMA from "./ewma";

const {
  ABR_STARVATION_GAP,
  OUT_OF_STARVATION_GAP,
  ABR_STARVATION_FACTOR,
  ABR_REGULAR_FACTOR,
} = config;

interface IRequestInfo {
  time: number;
  duration: number;
  requestTimestamp: number;
  progress: Array<{
    size: number,
    timestamp: number,
  }>;
}

type IRequest = IProgressRequest | IBeginRequest | IEndRequest;

interface IProgressRequest {
  type: string;
  event: "progress";
  value: {
    id: string|number,
    size: number,
    timestamp: number,
  };
}

interface IBeginRequest {
  type: string;
  event: "requestBegin";
  value: {
    id: string|number,
    time: number,
    duration: number,
    requestTimestamp: number,
  };
}

interface IEndRequest {
  type: string;
  event: "requestEnd";
  value: {
    id: string|number,
  };
}

interface IFilters {
  bitrate?: number;
  width?: number;
}

interface ChooserOption {
  limitWidth$: Observable<number>;
  throttle$: Observable<number>;
  initialBitrate: number;
  manualBitrate: number;
  maxAutoBitrate: number;
}

interface ChooserOptions {
  limitWidth: IDictionary<Observable<number>>;
  throttle: IDictionary<Observable<number>>;
  initialBitrates: IDictionary<number>;
  manualBitrates: IDictionary<number>;
  maxAutoBitrates: IDictionary<number>;
}

/**
 * Returns an observable emitting only the representation concerned by the
 * bitrate ceil given.
 * @param {Representation[]} representations
 * @param {number} bitrate
 * @returns {Observable}
 */
const setManualRepresentation = (
  representations : Representation[],
  bitrate : number
) : Observable<{bitrate: number|undefined, representation: Representation}> => {
  const chosenRepresentation =
    fromBitrateCeil(representations, bitrate) ||
    representations[0];

  return Observable.of({
    bitrate: undefined, // Bitrate estimation is deactivated here
    representation: chosenRepresentation,
  });
};

/**
 * Get the pending request containing the asked segment position.
 * @param {Object} requests
 * @param {number} segmentPosition
 * @returns {IRequestInfo|undefined}
 */
const getConcernedRequest = (
  requests : IDictionary<IRequestInfo>,
  segmentPosition : number
) : IRequestInfo|undefined => {
  const currentRequestIds = Object.keys(requests);
  const len = currentRequestIds.length;

  for (let i = 0; i < len - 1; i++) {
    const request = requests[currentRequestIds[i]];

    const {
      time: chunkTime,
      duration: chunkDuration,
    } = request;

    // TODO review this
    if (Math.abs(segmentPosition - chunkTime) < chunkDuration) {
      return request;
    }
  }
};

/**
 * Estimate the __VERY__ recent bandwidth based on a single unfinished request.
 * Useful when the current bandwidth seemed to have fallen quickly.
 *
 * Use progress events if available, set a much more random lower bitrate
 * if no progress events are available.
 *
 * @param {Object} request
 * @param {number} requestTime - Amount of time the request has taken for now,
 * in seconds.
 * @param {number} bitrate - Current bitrate at the time of download
 * @returns {number}
 */
const estimateRequestBandwidth = (
  request : IRequestInfo,
  requestTime : number,
  bitrate : number
) : number => {
  let estimate;

  // try to infer quickly the current bitrate based on the
  // progress events

  if (request.progress.length >= 2) {
    const ewma1 = new EWMA(2);

    const { progress } = request;
    for (let i = 1; i < progress.length; i++) {
      const bytesDownloaded =
        progress[i].size - progress[i - 1].size;

      const timeElapsed =
        progress[i].timestamp - progress[i - 1].timestamp;

      const reqBitrate =
        (bytesDownloaded * 8) / (timeElapsed / 1000);

      ewma1.addSample(timeElapsed / 1000, reqBitrate);
    }
    estimate = ewma1.getEstimate();
  }

  // if that fails / no progress event, take a guess
  if (!estimate) {
    const chunkDuration = request.duration;
    const chunkSize = chunkDuration * bitrate;

    // take current duration of request as a base
    estimate = chunkSize / (requestTime * 5 / 4);
  }
  return estimate;
};

/**
 * Filter representations given through filters options.
 * @param {Representation[]} representations
 * @param {Object} filters
 * @param {number} [filters.bitrate] - max bitrate authorized (included).
 * @param {number} [filters.width] - max width authorized (included).
 * @returns {Representation[]}
 */
const getFilteredRepresentations = (
  representations : Representation[],
  filters : IFilters
) : Representation[] => {
  let _representations = representations;

  if (filters.hasOwnProperty("bitrate")) {
    _representations = filterByBitrate(
      _representations, filters.bitrate as number);
  }

  if (filters.hasOwnProperty("width")) {
    _representations = filterByWidth(
      _representations, filters.width as number);
  }

  return _representations;
};

/**
 * Returns true if the request takes too much time relatively to how much we
 * should actually wait.
 * Depends on the chunk duration.
 * @param {number} durationOfRequest - time, in s, since the request has been
 * performed.
 * @param {number} chunkDuration - duration, in s, of a single chunk
 * @returns {Boolean}
 */
const requestTakesTime = (
  durationOfRequest : number,
  chunkDuration : number
) : boolean => {
  return durationOfRequest > 1 + chunkDuration * 1.2;
};

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
 */
export default class RepresentationChooser {
  public manualBitrate$ : BehaviorSubject<number>;
  public maxAutoBitrate$ : BehaviorSubject<number>;

  private _dispose$ : Subject<void>;
  private _currentRequests : IDictionary<IRequestInfo>;
  private _limitWidth$ : Observable<number>|undefined;
  private _throttle$ : Observable<number>|undefined;
  private estimator : BandwidthEstimator;
  private _initialBitrate : number;

  /**
   * @param {ChooserOption} options
   */

  constructor(options : ChooserOption) {
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

  public get$(
    clock$ : Observable<any>,
    representations : Representation[]
  ): Observable<{bitrate: undefined|number, representation: Representation|null}> {
    if (representations.length < 2) {
      return Observable.of({
        bitrate: undefined, // Bitrate estimation is deactivated here
        representation: representations.length ?
          representations[0] : null,
      })
      .takeUntil(this._dispose$);
    }

    const {
      manualBitrate$,
      maxAutoBitrate$,
      _initialBitrate,
    }  = this;

    const _deviceEventsArray : Array<Observable<IFilters>> = [];

    if (this._limitWidth$) {
      _deviceEventsArray.push(this._limitWidth$.map(width => ({ width })));
    }

    if (this._throttle$) {
      _deviceEventsArray.push(this._throttle$.map(bitrate => ({ bitrate })));
    }

    /**
     * Emit restrictions on the pools of available representations to choose
     * from.
     * @type {Observable}
     */
    const deviceEvents$ = _deviceEventsArray.length ?
      Observable.combineLatest(..._deviceEventsArray)
        .map((args) => objectAssign({}, ...args)) : Observable.of({});

    /**
     * Store the last client's bitrate generated by our estimation algorithms.
     * @type {Number|undefined}
     */
    let lastEstimatedBitrate : number|undefined;

    return manualBitrate$.switchMap(manualBitrate => {
      if (manualBitrate >= 0) {
        // MANUAL mode
        return setManualRepresentation(representations, manualBitrate);
      }

      // AUTO mode
      let inStarvationMode = false;
      return Observable.combineLatest(clock$, maxAutoBitrate$, deviceEvents$)
        .map(([ clock, maxAutoBitrate, deviceEvents ]) => {

          let nextBitrate;
          let bandwidthEstimate;
          const { bufferGap } = clock;

          // Check for starvation == not much left to play
          if (bufferGap <= ABR_STARVATION_GAP) {
            inStarvationMode = true;
          } else if (inStarvationMode && bufferGap >= OUT_OF_STARVATION_GAP) {
            inStarvationMode = false;
          }

          // If in starvation mode, check if the request for the next segment
          // takes too much time relatively to the chunk's duration.
          // If that's the case, re-calculate the bandwidth urgently based on
          // this single request.
          if (inStarvationMode) {
            const {
              position,
              bitrate,
            } = clock;

            const nextSegmentPosition = bufferGap + position;
            const request = getConcernedRequest(
              this._currentRequests, nextSegmentPosition);

            if (request) {
              const {
                duration: chunkDuration,
                requestTimestamp,
              } = request;

              const now = Date.now();
              const requestTimeInSeconds = (now - requestTimestamp) / 1000;
              if (
                chunkDuration &&
                requestTakesTime(requestTimeInSeconds, chunkDuration)
              ) {
                bandwidthEstimate = estimateRequestBandwidth(
                  request, requestTimeInSeconds, bitrate);

                if (bandwidthEstimate != null) {
                  // Reset all estimations to zero
                  // Note: this is weird to do this type of "global" side effect
                  // (for this class) in an observable, not too comfortable with
                  // that.
                  this.resetEstimate();
                  nextBitrate = Math.min(
                    bandwidthEstimate,
                    bitrate,
                    maxAutoBitrate
                  );
                }
              }
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
            representation: fromBitrateCeil(_representations, nextBitrate) ||
            representations[0],
          };

        }).do(({ bitrate }) => {
          if (bitrate != null) {
            lastEstimatedBitrate = bitrate;
          }
        }).share();
    });
  }

  /**
   * Add a bandwidth estimate by giving:
   *   - the duration of the request, in s
   *   - the size of the request in bytes
   * @param {number} duration
   * @param {number} size
   */
  public addEstimate(duration : number, size : number): void {
    if (duration != null && size != null) {
      this.estimator.addSample(duration, size);
    }
  }

  /**
   * Reset all the estimates done until now.
   * Useful when the network situation changed completely.
   */
  public resetEstimate(): void {
    this.estimator.reset();
  }

  /**
   * Add informations about a new pending request.
   * This can be useful if the network bandwidth drastically changes to infer
   * a new bandwidth through this single request.
   * @param {string|number} id
   * @param {Object} payload
   */
  public addPendingRequest(id : string|number, payload: IBeginRequest): void {
    if (__DEV__) {
      assert(!this._currentRequests[id], "request already added");
    }
    const { time, duration, requestTimestamp } = payload.value;
    this._currentRequests[id] = {
      time,
      duration,
      requestTimestamp,
      progress: [],
    };
    this._currentRequests[id].progress = [];
  }

  /**
   * Add progress informations to a pending request.
   * Progress objects are a key part to calculate the bandwidth from a single
   * request, in the case the user's bandwidth changes drastically while doing
   * it.
   * @param {string|number} id
   * @param {Object} progress
   */
  public addRequestProgress(id : string|number, progress: IProgressRequest): void {
    if (__DEV__) {
      assert(this._currentRequests[id] &&
        this._currentRequests[id].progress, "not a valid request");
    }
    this._currentRequests[id].progress.push(progress.value);
  }

  /**
   * Remove a request previously set as pending through the addPendingRequest
   * method.
   * @param {string|number} id
   */
  public removePendingRequest(id : string|number): void {
    if (__DEV__) {
      assert(this._currentRequests[id], "can't remove request: id not found");
    }
    delete this._currentRequests[id];
  }

  /**
   * Remove informations about all pending requests.
   */
  public resetRequests(): void {
    this._currentRequests = {};
  }

  /**
   * TODO See if we can avoid this
   */
  public dispose(): void {
    this._dispose$.next();
    this.manualBitrate$.complete();
    this.maxAutoBitrate$.complete();
  }
}

export {
  IRequest,
  ChooserOption,
  ChooserOptions,
};
