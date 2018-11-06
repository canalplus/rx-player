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
import EWMA from "./ewma";

const {
  ABR_MINIMUM_CHUNK_SIZE,
  ABR_FAST_EMA,
  ABR_SLOW_EMA,
} = config;

export interface IBandwidthEstimatorEstimate {
  bitrate : number|undefined; // The calculated bitrate
  bytesSampled : number; // the number of bytes at the basis of this estimate
}

/**
 * Calculate a mean bandwidth based on the bytes downloaded and the amount
 * of time needed to do so.
 *
 * Heavily "inspired" from the Shaka-Player's "ewma bandwidth estimator".
 * @class BandwidthEstimator
 */
export default class BandwidthEstimator {
  private _fastEWMA : EWMA;
  private _slowEWMA : EWMA;
  private _bytesSampled : number;

  constructor() {
    /**
     * A fast-moving average.
     * @private
     */
    this._fastEWMA = new EWMA(ABR_FAST_EMA);

    /**
     * A slow-moving average.
     * @private
     */
    this._slowEWMA = new EWMA(ABR_SLOW_EMA);

    /**
     * Number of bytes sampled.
     * @private
     */
    this._bytesSampled = 0;

  }

  /**
   * Takes a bandwidth sample.
   * @param {number} durationMs - The amount of time, in milliseconds, for a
   *   particular request.
   * @param {number} numBytes - The total number of bytes transferred in that
   *   request.
   */
  public addSample(durationInMs : number, numberOfBytes : number) : void {
    if (numberOfBytes < ABR_MINIMUM_CHUNK_SIZE) {
      return;
    }

    const bandwidth = numberOfBytes * 8000 / durationInMs;
    const weight = durationInMs / 1000;
    this._bytesSampled += numberOfBytes;

    this._fastEWMA.addSample(weight, bandwidth);
    this._slowEWMA.addSample(weight, bandwidth);
  }

  /**
   * Get estimate of the bandwidth, in bits per seconds.
   * @returns {Number|undefined}
   */
  public getEstimate() : IBandwidthEstimatorEstimate {
    const fastEstimate = this._fastEWMA.getEstimate();
    if (fastEstimate == null) {
      return { bitrate: undefined, bytesSampled: this._bytesSampled };
    }

    const slowEstimate = this._slowEWMA.getEstimate();
    if (slowEstimate == null) {
      return { bitrate: undefined, bytesSampled: this._bytesSampled };
    }

    // Take the minimum of these two estimates.  This should have the effect of
    // adapting down quickly, but up more slowly.
    const bitrate = Math.min(fastEstimate, slowEstimate);
    return { bitrate, bytesSampled: this._bytesSampled };
  }

  /**
   * Reset the bandwidth estimation.
   */
  public reset() : void {
    this._fastEWMA = new EWMA(ABR_FAST_EMA);
    this._slowEWMA = new EWMA(ABR_SLOW_EMA);
    this._bytesSampled = 0;
  }
}
