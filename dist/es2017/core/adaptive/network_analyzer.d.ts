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
import type { IRepresentation } from "../../manifest";
import type { IRepresentationEstimatorPlaybackObservation } from "./adaptive_representation_selector";
import type BandwidthEstimator from "./utils/bandwidth_estimator";
import type { IRequestInfo } from "./utils/pending_requests_store";
/** Object describing the current playback conditions. */
type IPlaybackConditionsInfo = Pick<IRepresentationEstimatorPlaybackObservation, "bufferGap" | "position" | "speed" | "duration">;
/**
 * Estimate the __VERY__ recent bandwidth based on a single unfinished request.
 * Useful when the current bandwidth seemed to have fallen quickly.
 *
 * @param {Object} request
 * @returns {number|undefined}
 */
export declare function estimateRequestBandwidth(request: IRequestInfo): number | undefined;
/**
 * Analyze the current network conditions and give a bandwidth estimate as well
 * as a maximum bitrate a Representation should be.
 * @class NetworkAnalyzer
 */
export default class NetworkAnalyzer {
    private _lowLatencyMode;
    private _inStarvationMode;
    private _initialBitrate;
    private _config;
    constructor(initialBitrate: number, lowLatencyMode: boolean);
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
    getBandwidthEstimate(playbackInfo: IPlaybackConditionsInfo, bandwidthEstimator: BandwidthEstimator, currentRepresentation: IRepresentation | null, currentRequests: IRequestInfo[], lastEstimatedBitrate: number | undefined): {
        bandwidthEstimate?: number | undefined;
        bitrateChosen: number;
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
    isUrgent(bitrate: number, currentRepresentation: IRepresentation | null, currentRequests: IRequestInfo[], playbackInfo: IPlaybackConditionsInfo): boolean;
}
export {};
//# sourceMappingURL=network_analyzer.d.ts.map