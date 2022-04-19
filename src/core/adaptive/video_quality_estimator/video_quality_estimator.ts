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
import EWMA from "../utils/ewma";

/**
 * Calculate a mean quality based on the samples frame drop ratios and the sample
 * duration.
 *
 * Playback informations are decomposed through samples:
 * At each clock tick, if only one representation [1] has been
 * played since last clock tick :
 * - Get dropped frames and decoded frames on that period.
 * - Calculate quality from dropped/decoded ratio.
 *
 * Playback condition may evolve through time depending on CPU / GPU
 * loads and device energy conditions.
 * We calculate two quality means for each stream :
 * - The "fast", suplied when playing, relies on few lasts samples :
 * It notifies about estimated current frame loss.
 * - The "slow" relies on samples from a larger period.
 *
 * The effective stream quality is the minimum value between both of them, so
 * that stream quality doesn't grow up too fast.
 *
 * [1] It is useless to make this operation if more than one representation has been
 * played, as we can't associate frames to a specific stream.
 * Multi-representation samples represents 5% of all recorded samples.
 *
 * Heavily "inspired" from the Shaka-Player's "ewma bandwidth estimator".
 * @class VideoQualityEstimator
 */
export default class VideoQualityEstimator {
  private _fast: EWMA;
  private _slow: EWMA;

  constructor() {
    const { ABR_QUALITY_MANAGER_FAST_EWMA, ABR_QUALITY_MANAGER_SLOW_EWMA } =
      config.getCurrent();

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
   * Takes a quality sample.
   * @param {number} sampleDuration - The amount of time, in milliseconds, for a
   *   particular sample.
   * @param {number} currentQuality - The quality of that sample
   */
  public addSample(sampleDuration: number, currentQuality: number): void {
    this._fast.addSample(sampleDuration, currentQuality);
    this._slow.addSample(sampleDuration, currentQuality);
  }

  /**
   * Get estimate of the quality.
   * @returns {Number|undefined}
   */
  public getEstimate(): number | undefined {
    // Take the minimum of these two estimates.
    return Math.min(this._fast.getEstimate(), this._slow.getEstimate());
  }

  /**
   * Reset the bandwidth estimation.
   */
  public reset(): void {
    const { ABR_QUALITY_MANAGER_FAST_EWMA, ABR_QUALITY_MANAGER_SLOW_EWMA } =
      config.getCurrent();
    this._fast = new EWMA(ABR_QUALITY_MANAGER_FAST_EWMA);
    this._slow = new EWMA(ABR_QUALITY_MANAGER_SLOW_EWMA);
  }
}
