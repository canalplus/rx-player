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
  share,
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

interface IRepresentationChooserClockTick {
  bitrate : number|undefined; // currently set bitrate, in bit per seconds
  bufferGap : number; // time to the end of the buffer, in seconds
  position : number; // current position, in seconds
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
) : Observable<{
  bitrate: undefined;
  representation: Representation;
}> {
  const chosenRepresentation =
    fromBitrateCeil(representations, bitrate) ||
    representations[0];

  return observableOf({
    bitrate: undefined, // Bitrate estimation is deactivated here
    representation: chosenRepresentation,
  });
}

/**
 * Get the pending request containing the asked segment position.
 * @param {Object} requests
 * @param {number} segmentPosition
 * @returns {IRequestInfo|undefined}
 */
function getConcernedRequest(
  requests : Partial<Record<string, IRequestInfo>>,
  segmentPosition : number
) : IRequestInfo|undefined {
  const currentRequestIds = Object.keys(requests);
  const len = currentRequestIds.length;

  for (let i = 0; i < len; i++) {
    const request = requests[currentRequestIds[i]];

    if (request != null) {
      const {
        time: chunkTime,
        duration: chunkDuration,
      } = request;

      // TODO review this
      if (Math.abs(segmentPosition - chunkTime) < chunkDuration) {
        return request;
      }
    }
  }
}

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
function estimateRequestBandwidth(
  request : IRequestInfo,
  requestTime : number,
  bitrate : number|undefined
) : number|undefined {
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
  if (!estimate && bitrate) {
    const chunkDuration = request.duration;
    const chunkSize = chunkDuration * bitrate;

    // take current duration of request as a base
    estimate = chunkSize / (requestTime * 5 / 4);
  }
  return estimate;
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
 * Returns true if the request takes too much time relatively to how much we
 * should actually wait.
 * Depends on the chunk duration.
 * @param {number} durationOfRequest - time, in s, since the request has been
 * performed.
 * @param {number} chunkDuration - duration, in s, of a single chunk
 * @returns {Boolean}
 */
function requestTakesTime(
  durationOfRequest : number,
  chunkDuration : number
) : boolean {
  return durationOfRequest > chunkDuration * 1.2 + 1;
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
  ) : Observable<{
    bitrate: undefined|number; // bitrate estimation
    representation: Representation|null; // chosen representation
  }> {
    if (representations.length < 2) {
      return observableOf({
        bitrate: undefined, // Bitrate estimation is deactivated here
        representation: representations.length ?
          representations[0] : null,
      })
        .pipe(takeUntil(this._dispose$));
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
        // MANUAL mode
        return setManualRepresentation(representations, manualBitrate);
      }

      // AUTO mode
      let inStarvationMode = false;
      return observableCombineLatest(clock$, maxAutoBitrate$, deviceEvents$)
        .pipe(
          map(([ clock, maxAutoBitrate, deviceEvents ]) => {
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
                    if (bitrate != null) {
                      nextBitrate = Math.min(
                        bandwidthEstimate,
                        bitrate,
                        maxAutoBitrate
                      );
                    } else {
                      nextBitrate = Math.min(
                        bandwidthEstimate,
                        maxAutoBitrate
                      );
                    }
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

          }),

          tap(({ bitrate }) => {
            if (bitrate != null) {
              lastEstimatedBitrate = bitrate;
            }
          }),

          share()
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
   * TODO See if we can avoid this
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
