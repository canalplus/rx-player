"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateRequestBandwidth = void 0;
var config_1 = require("../../config");
var log_1 = require("../../log");
var array_find_1 = require("../../utils/array_find");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../utils/monotonic_timestamp");
var ewma_1 = require("./utils/ewma");
/**
 * Get pending segment request(s) starting with the asked segment position.
 * @param {Object} requests - Every requests pending, in a chronological
 * order in terms of segment time.
 * @param {number} neededPosition
 * @returns {Array.<Object>}
 */
function getConcernedRequests(requests, neededPosition) {
    /** Index of the request for the next needed segment, in `requests`. */
    var nextSegmentIndex = -1;
    for (var i = 0; i < requests.length; i++) {
        var segment = requests[i].content.segment;
        if (segment.duration <= 0) {
            continue;
        }
        var segmentEnd = segment.time + segment.duration;
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
    if (nextSegmentIndex < 0) {
        // Not found
        return [];
    }
    var nextRequest = requests[nextSegmentIndex];
    var segmentTime = nextRequest.content.segment.time;
    var filteredRequests = [nextRequest];
    // Get the possibly multiple requests for that segment's position
    for (var i = nextSegmentIndex + 1; i < requests.length; i++) {
        if (requests[i].content.segment.time === segmentTime) {
            filteredRequests.push(requests[i]);
        }
        else {
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
function estimateRequestBandwidth(request) {
    if (request.progress.length < 5) {
        // threshold from which we can consider
        // progress events reliably
        return undefined;
    }
    // try to infer quickly the current bitrate based on the
    // progress events
    var ewma1 = new ewma_1.default(2);
    var progress = request.progress;
    for (var i = 1; i < progress.length; i++) {
        var bytesDownloaded = progress[i].size - progress[i - 1].size;
        var timeElapsed = progress[i].timestamp - progress[i - 1].timestamp;
        var reqBitrate = (bytesDownloaded * 8) / (timeElapsed / 1000);
        ewma1.addSample(timeElapsed / 1000, reqBitrate);
    }
    return ewma1.getEstimate();
}
exports.estimateRequestBandwidth = estimateRequestBandwidth;
/**
 * Estimate remaining time for a pending request from a progress event.
 * @param {Object} lastProgressEvent
 * @param {number} bandwidthEstimate
 * @returns {number}
 */
function estimateRemainingTime(lastProgressEvent, bandwidthEstimate) {
    var remainingData = (lastProgressEvent.totalSize - lastProgressEvent.size) * 8;
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
function estimateStarvationModeBitrate(pendingRequests, playbackInfo, currentRepresentation, lowLatencyMode, lastEstimatedBitrate) {
    if (lowLatencyMode) {
        // TODO Skip only for newer segments?
        return undefined;
    }
    var bufferGap = playbackInfo.bufferGap, speed = playbackInfo.speed, position = playbackInfo.position;
    var realBufferGap = isFinite(bufferGap) ? bufferGap : 0;
    var nextNeededPosition = position.getWanted() + realBufferGap;
    var concernedRequests = getConcernedRequests(pendingRequests, nextNeededPosition);
    if (concernedRequests.length !== 1) {
        // 0  == no request
        // 2+ == too complicated to calculate
        return undefined;
    }
    var concernedRequest = concernedRequests[0];
    var now = (0, monotonic_timestamp_1.default)();
    var minimumRequestTime = concernedRequest.content.segment.duration * 1.5;
    minimumRequestTime = Math.min(minimumRequestTime, 3000);
    minimumRequestTime = Math.max(minimumRequestTime, 12000);
    if (now - concernedRequest.requestTimestamp < minimumRequestTime) {
        return undefined;
    }
    var lastProgressEvent = concernedRequest.progress.length > 0
        ? concernedRequest.progress[concernedRequest.progress.length - 1]
        : undefined;
    // first, try to do a quick estimate from progress events
    var bandwidthEstimate = estimateRequestBandwidth(concernedRequest);
    if (lastProgressEvent !== undefined && bandwidthEstimate !== undefined) {
        var remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
        // if the remaining time does seem reliable
        if ((now - lastProgressEvent.timestamp) / 1000 <= remainingTime) {
            // Calculate estimated time spent rebuffering if we continue doing that request.
            var expectedRebufferingTime = remainingTime - realBufferGap / speed;
            if (expectedRebufferingTime > 2500) {
                return bandwidthEstimate;
            }
        }
    }
    if (!concernedRequest.content.segment.complete) {
        return undefined;
    }
    var chunkDuration = concernedRequest.content.segment.duration;
    var requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1000;
    var reasonableElapsedTime = requestElapsedTime <= (chunkDuration * 1.5 + 2) / speed;
    if ((0, is_null_or_undefined_1.default)(currentRepresentation) || reasonableElapsedTime) {
        return undefined;
    }
    // calculate a reduced bitrate from the current one
    var factor = chunkDuration / requestElapsedTime;
    var reducedBitrate = currentRepresentation.bitrate * Math.min(0.7, factor);
    if (lastEstimatedBitrate === undefined || reducedBitrate < lastEstimatedBitrate) {
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
function shouldDirectlySwitchToLowBitrate(playbackInfo, requests, lowLatencyMode) {
    if (lowLatencyMode) {
        // TODO only when playing close to the live edge?
        return true;
    }
    var realBufferGap = isFinite(playbackInfo.bufferGap) ? playbackInfo.bufferGap : 0;
    var nextNeededPosition = playbackInfo.position.getWanted() + realBufferGap;
    var nextRequest = (0, array_find_1.default)(requests, function (_a) {
        var content = _a.content;
        return content.segment.duration > 0 &&
            content.segment.time + content.segment.duration > nextNeededPosition;
    });
    if (nextRequest === undefined) {
        return true;
    }
    var now = (0, monotonic_timestamp_1.default)();
    var lastProgressEvent = nextRequest.progress.length > 0
        ? nextRequest.progress[nextRequest.progress.length - 1]
        : undefined;
    // first, try to do a quick estimate from progress events
    var bandwidthEstimate = estimateRequestBandwidth(nextRequest);
    if (lastProgressEvent === undefined || bandwidthEstimate === undefined) {
        return true;
    }
    var remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
    if ((now - lastProgressEvent.timestamp) / 1000 > remainingTime * 1.2) {
        return true;
    }
    var expectedRebufferingTime = remainingTime - realBufferGap / playbackInfo.speed;
    return expectedRebufferingTime > -1.5;
}
/**
 * Analyze the current network conditions and give a bandwidth estimate as well
 * as a maximum bitrate a Representation should be.
 * @class NetworkAnalyzer
 */
var NetworkAnalyzer = /** @class */ (function () {
    function NetworkAnalyzer(initialBitrate, lowLatencyMode) {
        var _a = config_1.default.getCurrent(), ABR_STARVATION_GAP = _a.ABR_STARVATION_GAP, OUT_OF_STARVATION_GAP = _a.OUT_OF_STARVATION_GAP, ABR_STARVATION_FACTOR = _a.ABR_STARVATION_FACTOR, ABR_REGULAR_FACTOR = _a.ABR_REGULAR_FACTOR;
        this._initialBitrate = initialBitrate;
        this._inStarvationMode = false;
        this._lowLatencyMode = lowLatencyMode;
        if (lowLatencyMode) {
            this._config = {
                starvationGap: ABR_STARVATION_GAP.LOW_LATENCY,
                outOfStarvationGap: OUT_OF_STARVATION_GAP.LOW_LATENCY,
                starvationBitrateFactor: ABR_STARVATION_FACTOR.LOW_LATENCY,
                regularBitrateFactor: ABR_REGULAR_FACTOR.LOW_LATENCY,
            };
        }
        else {
            this._config = {
                starvationGap: ABR_STARVATION_GAP.DEFAULT,
                outOfStarvationGap: OUT_OF_STARVATION_GAP.DEFAULT,
                starvationBitrateFactor: ABR_STARVATION_FACTOR.DEFAULT,
                regularBitrateFactor: ABR_REGULAR_FACTOR.DEFAULT,
            };
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
    NetworkAnalyzer.prototype.getBandwidthEstimate = function (playbackInfo, bandwidthEstimator, currentRepresentation, currentRequests, lastEstimatedBitrate) {
        var newBitrateCeil; // bitrate ceil for the chosen Representation
        var bandwidthEstimate;
        var localConf = this._config;
        var bufferGap = playbackInfo.bufferGap, position = playbackInfo.position, duration = playbackInfo.duration;
        var realBufferGap = isFinite(bufferGap) ? bufferGap : 0;
        var ABR_STARVATION_DURATION_DELTA = config_1.default.getCurrent().ABR_STARVATION_DURATION_DELTA;
        // check if should get in/out of starvation mode
        if (isNaN(duration) ||
            realBufferGap + position.getWanted() < duration - ABR_STARVATION_DURATION_DELTA) {
            if (!this._inStarvationMode && realBufferGap <= localConf.starvationGap) {
                log_1.default.info("ABR: enter starvation mode.");
                this._inStarvationMode = true;
            }
            else if (this._inStarvationMode &&
                realBufferGap >= localConf.outOfStarvationGap) {
                log_1.default.info("ABR: exit starvation mode.");
                this._inStarvationMode = false;
            }
        }
        else if (this._inStarvationMode) {
            log_1.default.info("ABR: exit starvation mode.");
            this._inStarvationMode = false;
        }
        // If in starvation mode, check if a quick new estimate can be done
        // from the last requests.
        // If so, cancel previous estimates and replace it by the new one
        if (this._inStarvationMode) {
            bandwidthEstimate = estimateStarvationModeBitrate(currentRequests, playbackInfo, currentRepresentation, this._lowLatencyMode, lastEstimatedBitrate);
            if (bandwidthEstimate !== undefined) {
                log_1.default.info("ABR: starvation mode emergency estimate:", bandwidthEstimate);
                bandwidthEstimator.reset();
                newBitrateCeil = (0, is_null_or_undefined_1.default)(currentRepresentation)
                    ? bandwidthEstimate
                    : Math.min(bandwidthEstimate, currentRepresentation.bitrate);
            }
        }
        // if newBitrateCeil is not yet defined, do the normal estimation
        if ((0, is_null_or_undefined_1.default)(newBitrateCeil)) {
            bandwidthEstimate = bandwidthEstimator.getEstimate();
            if (bandwidthEstimate !== undefined) {
                newBitrateCeil =
                    bandwidthEstimate *
                        (this._inStarvationMode
                            ? localConf.starvationBitrateFactor
                            : localConf.regularBitrateFactor);
            }
            else if (lastEstimatedBitrate !== undefined) {
                newBitrateCeil =
                    lastEstimatedBitrate *
                        (this._inStarvationMode
                            ? localConf.starvationBitrateFactor
                            : localConf.regularBitrateFactor);
            }
            else {
                newBitrateCeil = this._initialBitrate;
            }
        }
        if (playbackInfo.speed > 1) {
            newBitrateCeil /= playbackInfo.speed;
        }
        return { bandwidthEstimate: bandwidthEstimate, bitrateChosen: newBitrateCeil };
    };
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
    NetworkAnalyzer.prototype.isUrgent = function (bitrate, currentRepresentation, currentRequests, playbackInfo) {
        if (currentRepresentation === null) {
            return true;
        }
        else if (bitrate >= currentRepresentation.bitrate) {
            return false;
        }
        return shouldDirectlySwitchToLowBitrate(playbackInfo, currentRequests, this._lowLatencyMode);
    };
    return NetworkAnalyzer;
}());
exports.default = NetworkAnalyzer;
