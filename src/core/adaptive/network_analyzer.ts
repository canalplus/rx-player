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
import BandwidthEstimator from "./utils/bandwidth_estimator";
import EWMA from "./utils/ewma";
import {
  IPendingRequestStoreProgress,
  IRequestInfo,
} from "./utils/pending_requests_store";


/** Object describing the current playback conditions. */
interface IPlaybackConditionsInfo {
  /**
   * For the concerned media buffer, difference in seconds between the next
   * position where no segment data is available and the current position.
   */
  bufferGap : number;
  /** Current playback position on the concerned media element, in seconds. */
  position : number;
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
 * @param {Object} requests - Every requests pending, in a chronological
 * order in terms of segment time.
 * @param {number} position
 * @returns {Array.<Object>}
 */
function getConcernedRequests(
  requests : IRequestInfo[],
  neededPosition : number
) : IRequestInfo[] {
  /** Index of the request for the next needed segment, in `requests`. */
  let nextSegmentIndex = -1;
  for (let i = 0; i < requests.length; i++) {
    const { segment } = requests[i].content;
    if (segment.duration <= 0) {
      continue;
    }
    const segmentEnd = segment.time + segment.duration;
    if (!segment.complete) {
      if (i === requests.length - 1 && neededPosition - segment.time > -1.2) {
        nextSegmentIndex = i;
        break;
      }
    }
    if (segmentEnd > neededPosition && neededPosition - segment.time > -1.2) {
      nextSegmentIndex = i;
      break;
    }
  }

  if (nextSegmentIndex < 0) { // Not found
    return [];
  }

  const nextRequest = requests[nextSegmentIndex];
  const segmentTime = nextRequest.content.segment.time;
  const filteredRequests = [nextRequest];

  // Get the possibly multiple requests for that segment's position
  for (let i = nextSegmentIndex + 1; i < requests.length; i++) {
    if (requests[i].content.segment.time === segmentTime) {
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
export function estimateRequestBandwidth(request : IRequestInfo) : number|undefined {
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
  lastProgressEvent: IPendingRequestStoreProgress,
  bandwidthEstimate : number
) : number {
  const remainingData = (lastProgressEvent.totalSize - lastProgressEvent.size) * 8;
  return Math.max(remainingData / bandwidthEstimate, 0);
}

/**
 * Check if the request for the most needed segment is too slow.
 * If that's the case, re-calculate the bandwidth urgently based on
 * this single request.
 * @param {Object} pendingRequests - Every requests pending, in a chronological
 * order in terms of segment time.
 * @param {Object} playbackInfo - Information on the current playback.
 * @param {Object|null} currentRepresentation - The Representation being
 * presently being loaded.
 * @param {boolean} lowLatencyMode - If `true`, we're playing the content as a
 * low latency content - where requests might be pending when the segment is
 * still encoded.
 * @param {Number} lastEstimatedBitrate - Last bitrate estimate emitted.
 * @returns {Number|undefined}
 */
function estimateStarvationModeBitrate(
  pendingRequests : IRequestInfo[],
  playbackInfo : IPlaybackConditionsInfo,
  currentRepresentation : Representation | null,
  lowLatencyMode : boolean,
  lastEstimatedBitrate : number|undefined
) : number|undefined {
  if (lowLatencyMode) {
    // TODO Skip only for newer segments?
    return undefined;
  }
  const { bufferGap, speed, position } = playbackInfo;
  const realBufferGap = isFinite(bufferGap) ? bufferGap :
                                              0;
  const nextNeededPosition = position + realBufferGap;
  const concernedRequests = getConcernedRequests(pendingRequests, nextNeededPosition);

  if (concernedRequests.length !== 1) { // 0  == no request
                                        // 2+ == too complicated to calculate
    return undefined;
  }

  const concernedRequest = concernedRequests[0];
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
        (realBufferGap / speed);
      if (expectedRebufferingTime > 2000) {
        return bandwidthEstimate;
      }
    }
  }

  if (!concernedRequest.content.segment.complete) {
    return undefined;
  }

  const chunkDuration = concernedRequest.content.segment.duration;
  const requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1000;
  const reasonableElapsedTime = requestElapsedTime <=
    ((chunkDuration * 1.5 + 2) / speed);
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
 * @param {Object} playbackInfo - Information on the current playback.
 * @param {Object} requests - Every requests pending, in a chronological
 * order in terms of segment time.
 * @param {boolean} lowLatencyMode - If `true`, we're playing the content as a
 * low latency content, as close to the live edge as possible.
 * @returns {boolean}
 */
function shouldDirectlySwitchToLowBitrate(
  playbackInfo : IPlaybackConditionsInfo,
  requests : IRequestInfo[],
  lowLatencyMode : boolean
) : boolean {
  if (lowLatencyMode) {
    // TODO only when playing close to the live edge?
    return true;
  }
  const realBufferGap = isFinite(playbackInfo.bufferGap) ? playbackInfo.bufferGap :
                                                           0;
  const nextNeededPosition = playbackInfo.position + realBufferGap;
  const nextRequest = arrayFind(requests, ({ content }) =>
    content.segment.duration > 0 &&
    (content.segment.time + content.segment.duration) > nextNeededPosition);

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
    (realBufferGap / playbackInfo.speed);
  return expectedRebufferingTime > -1.5;
}

/**
 * Analyze the current network conditions and give a bandwidth estimate as well
 * as a maximum bitrate a Representation should be.
 * @class NetworkAnalyzer
 */
export default class NetworkAnalyzer {
  private _lowLatencyMode : boolean;
  private _inStarvationMode : boolean;
  private _initialBitrate : number;
  private _config : { starvationGap : number;
                      outOfStarvationGap : number;
                      starvationBitrateFactor : number;
                      regularBitrateFactor : number; };

  constructor(initialBitrate: number, lowLatencyMode: boolean) {
    const { ABR_STARVATION_GAP,
            OUT_OF_STARVATION_GAP,
            ABR_STARVATION_FACTOR,
            ABR_REGULAR_FACTOR } = config.getCurrent();
    this._initialBitrate = initialBitrate;
    this._inStarvationMode = false;
    this._lowLatencyMode = lowLatencyMode;
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
   * @param {Object} playbackInfo - Gives current information about playback.
   * @param {Object} bandwidthEstimator - `BandwidthEstimator` allowing to
   * produce network bandwidth estimates.
   * @param {Object|null} currentRepresentation - The Representation currently
   * chosen.
   * `null` if no Representation has been chosen yet.
   * @param {Array.<Object>} currentRequests - All segment requests by segment's
   * start chronological order
   * @param {number|undefined} lastEstimatedBitrate - Bitrate emitted during the
   * last estimate.
   * @returns {Object}
   */
  public getBandwidthEstimate(
    playbackInfo: IPlaybackConditionsInfo,
    bandwidthEstimator : BandwidthEstimator,
    currentRepresentation : Representation | null,
    currentRequests : IRequestInfo[],
    lastEstimatedBitrate: number|undefined
  ) : { bandwidthEstimate? : number | undefined; bitrateChosen : number } {
    let newBitrateCeil : number | undefined; // bitrate ceil for the chosen Representation
    let bandwidthEstimate;
    const localConf = this._config;
    const { bufferGap, position, duration } = playbackInfo;
    const realBufferGap = isFinite(bufferGap) ? bufferGap :
                                                0;
    const { ABR_STARVATION_DURATION_DELTA } = config.getCurrent();
    // check if should get in/out of starvation mode
    if (isNaN(duration) ||
        realBufferGap + position < duration - ABR_STARVATION_DURATION_DELTA)
    {
      if (!this._inStarvationMode && realBufferGap <= localConf.starvationGap) {
        log.info("ABR: enter starvation mode.");
        this._inStarvationMode = true;
      } else if (this._inStarvationMode &&
                 realBufferGap >= localConf.outOfStarvationGap)
      {
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
                                                        this._lowLatencyMode,
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
   * @param {number} bitrate - The new estimated bitrate.
   * @param {Object|null} currentRepresentation - The Representation being
   * presently being loaded.
   * @param {Array.<Object>} currentRequests - All segment requests by segment's
   * start chronological order
   * @param {Object} playbackInfo - Information on the current playback.
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
    return shouldDirectlySwitchToLowBitrate(playbackInfo,
                                            currentRequests,
                                            this._lowLatencyMode);
  }
}
