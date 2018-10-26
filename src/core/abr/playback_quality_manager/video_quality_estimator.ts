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

import config from "../../../config";
import EWMA from "../ewma";

const {
  ABR_QUALITY_MANAGER_FAST_EWMA,
  ABR_QUALITY_MANAGER_SLOW_EWMA,
} = config;

/**
 * Calculate a mean quality based on the samples frame drop ratios and the sample
 * duration.
 *
 * Heavily "inspired" from the Shaka-Player's "ewma bandwidth estimator".
 * @class VideoQualityEstimator
 */
export default class VideoQualityEstimator {
  private _fast : EWMA;
  private _slow : EWMA;

  constructor() {
    /**
     * A fast-moving average.
     * @private
     */
    this._fast = new EWMA(ABR_QUALITY_MANAGER_FAST_EWMA);

    /**
     * A slow-moving average.
     * @private
     */
    this._slow = new EWMA(ABR_QUALITY_MANAGER_SLOW_EWMA);
  }

  /**
   * Takes a bandwidth sample.
   * @param {number} durationMs - The amount of time, in milliseconds, for a
   *   particular request.
   * @param {number} numBytes - The total number of bytes transferred in that
   *   request.
   */
  public addSample(sampleDuration : number, currentQuality : number) : void {
    this._fast.addSample(sampleDuration, currentQuality);
    this._slow.addSample(sampleDuration, currentQuality);
  }

  /**
   * Get estimate of the bandwidth, in bits per seconds.
   * @returns {Number|undefined}
   */
  public getEstimate() : number|undefined {
    // Take the minimum of these two estimates.  This should have the effect of
    // adapting down quickly, but up more slowly.
    return Math.min(this._fast.getEstimate(), this._slow.getEstimate());
  }

  /**
   * Reset the bandwidth estimation.
   */
  public reset() : void {
    this._fast = new EWMA(ABR_QUALITY_MANAGER_FAST_EWMA);
    this._slow = new EWMA(ABR_QUALITY_MANAGER_SLOW_EWMA);
  }
}
