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
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";

import config from "../../config.js";
import assert from "../../utils/assert.js";
// import takeFirstSet from "../../utils/takeFirstSet.js";

import BandwidthEstimator from "./bandwidth_estimator.js";
import filterByWidth from "./filterByWidth.js";
import filterByBitrate from "./filterByBitrate.js";
import fromBitrateCeil from "./fromBitrateCeil.js";
import EWMA from "./ewma.js";

const {
  ABR_STARVATION_GAP,
  OUT_OF_STARVATION_GAP,
  ABR_STARVATION_FACTOR,
  ABR_REGULAR_FACTOR,
} = config;

/**
 * Returns an observable emitting only the representation concerned by the
 * bitrate ceil given.
 * @param {Array.<Representation>} representations
 * @param {Number} bitrate
 * @returns {Observable}
 */
const setManualRepresentation = (representations, bitrate) => {
  const chosenRepresentation =
    fromBitrateCeil(representations, bitrate) ||
    representations[0];

  return Observable.of({
    bitrate: undefined, // Bitrate estimation is deactivated here
    representation: chosenRepresentation,
  }).concat(Observable.never());
};

/**
 * Get the pending request containing the asked segment position.
 * @param {Object} requests
 * @param {Number} segmentPosition
 * @returns {Object|undefined}
 */
const getConcernedRequest = (requests, segmentPosition) => {
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
 * @param {Number} requestTime - Amount of time the request has taken for now,
 * in seconds.
 * @param {Number} bitrate - Current bitrate at the time of download
 */
const estimateRequestBandwidth = (request, requestTime, bitrate) => {
  let estimate;
  const chunkDuration = request.duration;

  // try to infer quickly the current bitrate based on the
  // progress events
  if (request.progress.length >= 2) {
    const ewma1 = new EWMA(2);

    const { progress } = request;
    for (let i = 1; i < progress.length; i++) {
      const bytesDownloaded =
        progress[i].size - progress[i-1].size;

      const timeElapsed =
        progress[i].timestamp - progress[i-1].timestamp;

      const bitrate =
        (bytesDownloaded * 8) / (timeElapsed / 1000);

      ewma1.addSample(timeElapsed / 1000, bitrate);
    }
    estimate = ewma1.getEstimate();
  }

  // if that fails / no progress event, take a guess
  if (!estimate) {
    const chunkSize = chunkDuration * bitrate;

    // take current duration of request as a base
    estimate = chunkSize / (requestTime * 5/4);
  }
  return estimate;
};

/**
 * Filter representations given through filters options.
 * @param {Array.<Representation>} representations
 * @param {Object} filters
 * @param {Number} [filters.bitrate] - max bitrate authorized (included).
 * @param {Number} [filters.width] - max width authorized (included).
 * @returns {Array.<Representation>}
 */
const getFilteredRepresentations = (representations, filters) => {
  let _representations = representations;

  if (filters.hasOwnProperty("bitrate")) {
    _representations = filterByBitrate(
      _representations, filters.bitrate);
  }

  if (filters.hasOwnProperty("width")) {
    _representations = filterByWidth(
      _representations, filters.width);
  }

  return _representations;
};

/**
* Get supposed decodable bitrate.
* The aim is to find last decodable representation bitrate.
*/
const getDecodableBitrate = function(representations, bitrate) {
  const representation = fromBitrateCeil(representations, bitrate);
  const index = representations.indexOf(representation);

  return (index <= 0) ?
    representation[0].bitrate :
    representations[index - 1].bitrate;
};

/**
 * Returns true if the request takes too much time relatively to how much we
 * should actually wait.
 * Depends on the chunk duration.
 * @param {Number} durationOfRequest - time, in s, since the request has been
 * performed.
 * @param {Number} chunkDuration - duration, in s, of a single chunk
 * @returns {Boolean}
 */
const requestTakesTime = (durationOfRequest, chunkDuration) => {
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
  /**
   * @param {Object} options
   * @param {Number} [options.manualBitrate=-1]
   * @param {Number} [options.maxAutoBitrate=Infinity]
   * @param {Number} [options.initialBitrate=0]
   * @param {Observable} [options.limitWidth$]
   * @param {Observable} [options.throttle$]
   */
  constructor(options = {}) {
    this._dispose$ = new Subject();

    this.manualBitrate$ = new BehaviorSubject(
      options.manualBitrate != null ?
        options.manualBitrate : -1
    ).takeUntil(this._dispose$);

    this.maxAutoBitrate$ = new BehaviorSubject(
      options.maxAutoBitrate != null ?
        options.maxAutoBitrate : Infinity
    ).takeUntil(this._dispose$);

    this.estimator = new BandwidthEstimator();
    this._currentRequests = {};

    this.initialBitrate = options.initialBitrate || 0;

    this._limitWidth$ = options.limitWidth$;
    this._throttle$ = options.throttle$;

    /**
     * Information about frames (total decoded and dropped)
     * Emitted at each clock event.
     */
    this._lastDroppedFrames = 0;
    this._lastTotalFrames = 0;
    this._currentDroppedFrames = 0;
    this._currentTotalFrames = 0;

    /**
     * Maximum bitrate for which stream can be easily decoded.
     * It is the last representation bitrate before the
     * representation that causes player to have decode issues.
     */
    this._decodableBitrate = Infinity;

    /**
     * We consider that decoding troubles can be temporary.
     * So, a timeout is set to define the moment where decodable
     * bitrate should return to Infinity.
     * The timeOut period increase each time the time is out.
     */
    this._timeOutId = null;
    this._timeOutDuration = 2;
  }

  get$(clock$, representations) {
    if (representations.length < 2) {
      return Observable.of({
        bitrate: undefined, // Bitrate estimation is deactivated here
        representation: representations.length ?
          representations[0] : null,
      }).concat(Observable.never())
      .takeUntil(this._dispose$);
    }

    const {
      manualBitrate$,
      maxAutoBitrate$,
      initialBitrate,
    }  = this;

    const _deviceEventsArray = [];

    if (this._limitWidth$) {
      _deviceEventsArray.push(this._limitWidth$
        .map(width => ({ width })));
    }

    if (this._throttle$) {
      _deviceEventsArray.push(this._throttle$
        .map(bitrate => ({ bitrate })));
    }

    const deviceEvents$ = _deviceEventsArray.length ?
      Observable.combineLatest(..._deviceEventsArray)
        .map((args) => objectAssign({}, ...args)) : Observable.of({});

    let lastEstimatedBitrate;
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

          this._currentTotalFrames =
            clock.framesInfo.totalVideoFrames - this._lastTotalFrames;
          this._lastTotalFrames = clock.framesInfo.totalVideoFrames;

          this._currentDroppedFrames =
            clock.framesInfo.droppedVideoFrames - this._lastDroppedFrames;
          this._lastDroppedFrames = clock.framesInfo.droppedVideoFrames;

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
              nextEstimate = initialBitrate;
            }
            nextBitrate = Math.min(nextEstimate, maxAutoBitrate);
          }

          if (clock.speed > 1) {
            nextBitrate /= clock.speed;
          }

          if ((this._currentDroppedFrames / this._currentTotalFrames) > 0.33) {
            if (clock.bitrate) {
              const decodableBitrate =
                getDecodableBitrate(representations, clock.bitrate);
              if (decodableBitrate < this._decodableBitrate) {
                this._decodableBitrate = decodableBitrate;
                if (this._timeOutId !== null) {
                  clearTimeout(this._timeOutId);
                }
                this._timeOutId = setTimeout(() => {
                  this._decodableBitrate = Infinity;
                  this._timeOutId = null;
                  this._timeOutDuration =
                    Math.min(Math.pow(this._timeOutDuration, 2), 32);
                }, this._timeOutDuration * 60 * 1000);
              }
            }
          }

          const filters = deviceEvents;

          if (deviceEvents.hasOwnProperty("bitrate")) {
            filters.bitrate =
              Math.min(this._decodableBitrate, deviceEvents.bitrate);
          } else if (this._decodableBitrate !== Infinity) {
            filters.bitrate = this._decodableBitrate;
          }

          const _representations =
            getFilteredRepresentations(
              representations,
              filters,
            );

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
   * @param {Number} duration
   * @param {Number} size
   */
  addEstimate(duration, size) {
    if (duration != null && size != null) {
      this.estimator.addSample(duration, size);
    }
  }

  /**
   * Reset all the estimates done until now.
   * Useful when the network situation changed completely.
   */
  resetEstimate() {
    this.estimator.reset();
  }

  /**
   * Add informations about a new pending request.
   * This can be useful if the network bandwidth drastically changes to infer
   * a new bandwidth through this single request.
   * @param {string|Number} id
   * @param {Segment} segment
   */
  addPendingRequest(id, segment) {
    if (__DEV__) {
      assert(!this._currentRequests[id], "request already added");
    }
    this._currentRequests[id] = segment;
    this._currentRequests[id].progress = [];
  }

  /**
   * Add progress informations to a pending request.
   * Progress objects are a key part to calculate the bandwidth from a single
   * request, in the case the user's bandwidth changes drastically while doing
   * it.
   * @param {string|Number} id
   * @param {Object} progress
   */
  addRequestProgress(id, progress) {
    if (__DEV__) {
      assert(this._currentRequests[id] &&
        this._currentRequests[id].progress, "not a valid request");
    }
    this._currentRequests[id].progress.push(progress);
  }

  /**
   * Remove a request previously set as pending through the addPendingRequest
   * method.
   * @param {string|Number} id
   */
  removePendingRequest(id) {
    if (__DEV__) {
      assert(this._currentRequests[id], "can't remove request: id not found");
    }
    delete this._currentRequests[id];
  }

  /**
   * Remove informations about all pending requests.
   */
  resetRequests() {
    this._currentRequests = {};
  }

  /**
   * TODO Not really needed for now
   */
  dispose() {
    if (this._timeOutId !== null) {
      clearTimeout(this._timeOutId);
    }
    this._dispose$.next();
  }
}
