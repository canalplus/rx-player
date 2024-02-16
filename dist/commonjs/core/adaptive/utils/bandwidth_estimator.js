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
var config_1 = require("../../../config");
var ewma_1 = require("./ewma");
/**
 * Calculate a mean bandwidth based on the bytes downloaded and the amount
 * of time needed to do so.
 * @class BandwidthEstimator
 */
var BandwidthEstimator = /** @class */ (function () {
    function BandwidthEstimator() {
        var _a = config_1.default.getCurrent(), ABR_FAST_EMA = _a.ABR_FAST_EMA, ABR_SLOW_EMA = _a.ABR_SLOW_EMA;
        this._fastEWMA = new ewma_1.default(ABR_FAST_EMA);
        this._slowEWMA = new ewma_1.default(ABR_SLOW_EMA);
        this._bytesSampled = 0;
    }
    /**
     * Takes a bandwidth sample.
     * @param {number} durationInMs - The amount of time, in milliseconds, for a
     * particular request.
     * @param {number} numberOfBytes - The total number of bytes transferred in
     * that request.
     */
    BandwidthEstimator.prototype.addSample = function (durationInMs, numberOfBytes) {
        var ABR_MINIMUM_CHUNK_SIZE = config_1.default.getCurrent().ABR_MINIMUM_CHUNK_SIZE;
        if (numberOfBytes < ABR_MINIMUM_CHUNK_SIZE) {
            return;
        }
        var bandwidth = (numberOfBytes * 8000) / durationInMs;
        var weight = durationInMs / 1000;
        this._bytesSampled += numberOfBytes;
        this._fastEWMA.addSample(weight, bandwidth);
        this._slowEWMA.addSample(weight, bandwidth);
    };
    /**
     * Get estimate of the bandwidth, in bits per seconds.
     * @returns {Number|undefined}
     */
    BandwidthEstimator.prototype.getEstimate = function () {
        var ABR_MINIMUM_TOTAL_BYTES = config_1.default.getCurrent().ABR_MINIMUM_TOTAL_BYTES;
        if (this._bytesSampled < ABR_MINIMUM_TOTAL_BYTES) {
            return undefined;
        }
        // Take the minimum of these two estimates.
        // This should have the effect of adapting down quickly, but up more slowly.
        return Math.min(this._fastEWMA.getEstimate(), this._slowEWMA.getEstimate());
    };
    /** Reset the bandwidth estimation. */
    BandwidthEstimator.prototype.reset = function () {
        var _a = config_1.default.getCurrent(), ABR_FAST_EMA = _a.ABR_FAST_EMA, ABR_SLOW_EMA = _a.ABR_SLOW_EMA;
        this._fastEWMA = new ewma_1.default(ABR_FAST_EMA);
        this._slowEWMA = new ewma_1.default(ABR_SLOW_EMA);
        this._bytesSampled = 0;
    };
    return BandwidthEstimator;
}());
exports.default = BandwidthEstimator;
