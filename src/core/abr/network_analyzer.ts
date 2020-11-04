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

import config from "../../config";
import log from "../../log";
import { Representation } from "../../manifest";
import arrayFind from "../../utils/array_find";
import arrayFindIndex from "../../utils/array_find_index";
import BandwidthEstimator from "./bandwidth_estimator";
import EWMA from "./ewma";
import {
  IProgressEventValue,
  IRequestInfo,
} from "./pending_requests_store";

const { ABR_REGULAR_FACTOR,
        ABR_STARVATION_DURATION_DELTA,
        ABR_STARVATION_FACTOR,
        ABR_STARVATION_GAP,
        OUT_OF_STARVATION_GAP } = config;

/** Object describing the current playback conditions. */
interface IPlaybackConditionsInfo {
  /**
   * For the concerned media buffer, difference in seconds between the next
   * position where no segment data is available and the current position.
   */
  bufferGap : number;
  /** Current playback position on the concerned media element, in seconds. */
  currentTime : number;
  /**
   * Last "playback rate" set by the user. This is the ideal "playback rate" at
   * which the media should play.
   */
  speed : number;
  /** `duration` property of the HTMLMediaElement on which the content plays. */
  duration : number;
}

/**
 * Get pending segment request(s) starting with the asked segment position.
 * @param {Object} requests
 * @param {number} position
 * @returns {Array.<Object>}
 */
function getConcernedRequests(
  requests : IRequestInfo[],
  neededPosition : number
) : IRequestInfo[] {
  /** Index of the request for the next needed segment, in `requests`. */
  const nextSegmentIndex = arrayFindIndex(requests, (request) => {
    if (request.duration <= 0) {
      return false;
    }
    const segmentEnd = request.time + request.duration;
    return segmentEnd > neededPosition &&
           Math.abs(neededPosition - request.time) < -0.3;
  });

  if (nextSegmentIndex < 0) { // Not found
    return [];
  }

  const nextRequest = requests[nextSegmentIndex];
  const segmentTime = nextRequest.time;
  const filteredRequests = [nextRequest];

  // Get the possibly multiple requests for that segment's position
  for (let i = nextSegmentIndex + 1; i < requests.length; i++) {
    if (requests[i].time === segmentTime) {
      filteredRequests.push(requests[i]);
    } else {
      break;
    }
  }
  return filteredRequests;
}

/**
 * Estimate the __VERY__ recent bandwidth based on a single unfinished request.
 * Useful when the current bandwidth seemed to have fallen quickly.
 *
 * @param {Object} request
 * @returns {number|undefined}
 */
function estimateRequestBandwidth(request : IRequestInfo) : number|undefined {
  if (request.progress.length < 5) { // threshold from which we can consider
                                     // progress events reliably
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
 * @param {Object} playbackInfo - Information on the current playback.
 * @param {Object|null} currentRepresentation - The Representation being
 * presently being loaded.
 * @param {Number} lastEstimatedBitrate - Last bitrate estimate emitted.
 * @returns {Number|undefined}
 */
function estimateStarvationModeBitrate(
  pendingRequests : IRequestInfo[],
  playbackInfo : IPlaybackConditionsInfo,
  currentRepresentation : Representation | null,
  lastEstimatedBitrate : number|undefined
) : number|undefined {
  const nextNeededPosition = playbackInfo.currentTime + playbackInfo.bufferGap;
  const concernedRequests = getConcernedRequests(pendingRequests, nextNeededPosition);

  if (concernedRequests.length !== 1) { // 0  == no request
                                        // 2+ == too complicated to calculate
    return undefined;
  }

  const concernedRequest = concernedRequests[0];
  const chunkDuration = concernedRequest.duration;
  const now = performance.now();
  const lastProgressEvent = concernedRequest.progress.length > 0 ?
    concernedRequest.progress[concernedRequest.progress.length - 1] :
    undefined;

  // first, try to do a quick estimate from progress events
  const bandwidthEstimate = estimateRequestBandwidth(concernedRequest);

  if (lastProgressEvent !== undefined && bandwidthEstimate !== undefined) {
    const remainingTime = estimateRemainingTime(lastProgressEvent,
                                                bandwidthEstimate);

    // if the remaining time does seem reliable
    if ((now - lastProgressEvent.timestamp) / 1000 <= remainingTime) {
      // Calculate estimated time spent rebuffering if we continue doing that request.
      const expectedRebufferingTime = remainingTime -
        (playbackInfo.bufferGap / playbackInfo.speed);
      if (expectedRebufferingTime > 2000) {
        return bandwidthEstimate;
      }
    }
  }

  const requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1000;
  const reasonableElapsedTime = requestElapsedTime <=
    ((chunkDuration * 1.5 + 2) / playbackInfo.speed);
  if (currentRepresentation == null || reasonableElapsedTime) {
    return undefined;
  }

  // calculate a reduced bitrate from the current one
  const factor = chunkDuration / requestElapsedTime;
  const reducedBitrate = currentRepresentation.bitrate * Math.min(0.7, factor);
  if (lastEstimatedBitrate === undefined ||
      reducedBitrate < lastEstimatedBitrate)
  {
    return reducedBitrate;
  }
}

/**
 * Returns true if, based on the current requests, it seems that the ABR should
 * switch immediately if a lower bitrate is more adapted.
 * Returns false if it estimates that you have time before switching to a lower
 * bitrate.
 * @param {Object} playbackInfo
 * @param {Object} requests - Every requests pending, in a chronological
 * order in terms of segment time.
 * @param {number} abrStarvationGap - "Buffer gap" from which we enter a
 * "starvation mode".
 * @returns {boolean}
 */
function shouldDirectlySwitchToLowBitrate(
  playbackInfo : IPlaybackConditionsInfo,
  requests : IRequestInfo[]
) : boolean {
  const nextNeededPosition = playbackInfo.currentTime + playbackInfo.bufferGap;
  const nextRequest = arrayFind(requests, (r) =>
    r.duration > 0 && (r.time + r.duration) > nextNeededPosition);

  if (nextRequest === undefined) {
    return true;
  }

  const now = performance.now();
  const lastProgressEvent = nextRequest.progress.length > 0 ?
    nextRequest.progress[nextRequest.progress.length - 1] :
    undefined;

  // first, try to do a quick estimate from progress events
  const bandwidthEstimate = estimateRequestBandwidth(nextRequest);
  if (lastProgressEvent === undefined || bandwidthEstimate === undefined) {
    return true;
  }

  const remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
  if ((now - lastProgressEvent.timestamp) / 1000 > (remainingTime * 1.2)) {
    return true;
  }
  const expectedRebufferingTime = remainingTime -
    (playbackInfo.bufferGap / playbackInfo.speed);
  return expectedRebufferingTime > -1.5;
}

/**
 * Analyze the current network conditions and give a bandwidth estimate as well
 * as a maximum bitrate a Representation should be.
 * @class NetworkAnalyzer
 */
export default class NetworkAnalyzer {
  private _inStarvationMode : boolean;
  private _initialBitrate : number;
  private _config : { starvationGap : number;
                      outOfStarvationGap : number;
                      starvationBitrateFactor : number;
                      regularBitrateFactor : number; };

  constructor(initialBitrate: number, lowLatencyMode: boolean) {
    this._initialBitrate = initialBitrate;
    this._inStarvationMode = false;
    if (lowLatencyMode) {
    this._config = { starvationGap: ABR_STARVATION_GAP.LOW_LATENCY,
                     outOfStarvationGap: OUT_OF_STARVATION_GAP.LOW_LATENCY,
                     starvationBitrateFactor: ABR_STARVATION_FACTOR.LOW_LATENCY,
                     regularBitrateFactor: ABR_REGULAR_FACTOR.LOW_LATENCY };
    } else {
      this._config = { starvationGap: ABR_STARVATION_GAP.DEFAULT,
                       outOfStarvationGap: OUT_OF_STARVATION_GAP.DEFAULT,
                       starvationBitrateFactor: ABR_STARVATION_FACTOR.DEFAULT,
                       regularBitrateFactor: ABR_REGULAR_FACTOR.DEFAULT };
    }
  }

  /**
   * Gives an estimate of the current bandwidth and of the bitrate that should
   * be considered for chosing a `representation`.
   * This estimate is only based on network metrics.
   * @param {Object} playbackInfo - Gives current information about playback
   * @param {Object} bandwidthEstimator
   * @param {Object|null} currentRepresentation
   * @param {Array.<Object>} currentRequests
   * @param {number|undefined} lastEstimatedBitrate
   * @returns {Object}
   */
  public getBandwidthEstimate(
    playbackInfo: IPlaybackConditionsInfo,
    bandwidthEstimator : BandwidthEstimator,
    currentRepresentation : Representation | null,
    currentRequests : IRequestInfo[],
    lastEstimatedBitrate: number|undefined
  ) : { bandwidthEstimate? : number; bitrateChosen : number } {
    let newBitrateCeil; // bitrate ceil for the chosen Representation
    let bandwidthEstimate;
    const localConf = this._config;
    const { bufferGap, currentTime, duration } = playbackInfo;

    // check if should get in/out of starvation mode
    if (isNaN(duration) ||
        bufferGap + currentTime < duration - ABR_STARVATION_DURATION_DELTA)
    {
      if (!this._inStarvationMode && bufferGap <= localConf.starvationGap) {
        log.info("ABR: enter starvation mode.");
        this._inStarvationMode = true;
      } else if (this._inStarvationMode && bufferGap >= localConf.outOfStarvationGap) {
        log.info("ABR: exit starvation mode.");
        this._inStarvationMode = false;
      }
    } else if (this._inStarvationMode) {
      log.info("ABR: exit starvation mode.");
      this._inStarvationMode = false;
    }

    // If in starvation mode, check if a quick new estimate can be done
    // from the last requests.
    // If so, cancel previous estimates and replace it by the new one
    if (this._inStarvationMode) {
      bandwidthEstimate = estimateStarvationModeBitrate(currentRequests,
                                                        playbackInfo,
                                                        currentRepresentation,
                                                        lastEstimatedBitrate);

      if (bandwidthEstimate != null) {
        log.info("ABR: starvation mode emergency estimate:", bandwidthEstimate);
        bandwidthEstimator.reset();
        newBitrateCeil = currentRepresentation == null ?
          bandwidthEstimate :
          Math.min(bandwidthEstimate, currentRepresentation.bitrate);
      }
    }

    // if newBitrateCeil is not yet defined, do the normal estimation
    if (newBitrateCeil == null) {
      bandwidthEstimate = bandwidthEstimator.getEstimate();

      if (bandwidthEstimate != null) {
        newBitrateCeil = bandwidthEstimate *
          (this._inStarvationMode ? localConf.starvationBitrateFactor :
                                    localConf.regularBitrateFactor);
      } else if (lastEstimatedBitrate != null) {
        newBitrateCeil = lastEstimatedBitrate *
          (this._inStarvationMode ? localConf.starvationBitrateFactor :
                                    localConf.regularBitrateFactor);
      } else {
        newBitrateCeil = this._initialBitrate;
      }
    }

    if (playbackInfo.speed > 1) {
      newBitrateCeil /= playbackInfo.speed;
    }

    return { bandwidthEstimate, bitrateChosen: newBitrateCeil };
  }

  /**
   * For a given wanted bitrate, tells if should switch urgently.
   * @param {number} bitrate
   * @param {Object} playbackInfo
   * @returns {boolean}
   */
  public isUrgent(
    bitrate: number,
    currentRepresentation : Representation | null,
    currentRequests : IRequestInfo[],
    playbackInfo: IPlaybackConditionsInfo
   ) : boolean {
    if (currentRepresentation === null) {
      return true;
    } else if (bitrate === currentRepresentation.bitrate) {
      return false;
    } else if (bitrate > currentRepresentation.bitrate) {
      return !this._inStarvationMode;
    }
    return shouldDirectlySwitchToLowBitrate(playbackInfo, currentRequests);
  }
}
