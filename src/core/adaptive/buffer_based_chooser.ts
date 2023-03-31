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

import log from "../../log";
import arrayFindIndex from "../../utils/array_find_index";
import getBufferLevels from "./utils/get_buffer_levels";
import {
  IRepresentationMaintainabilityScore,
  ScoreConfidenceLevel,
} from "./utils/representation_score_calculator";

/**
 * Minimum amount of time, in milliseconds, during which we are blocked from
 * raising in quality after it had been considered as too high.
 */
const MINIMUM_BLOCK_RAISE_DELAY = 6000;

/**
 * Maximum amount of time, in milliseconds, during which we are blocked from
 * raising in quality after it had been considered as too high.
 */
const MAXIMUM_BLOCK_RAISE_DELAY = 15000;

/**
 * Amount of time, in milliseconds, with which the blocking time in raising
 * the quality will be incremented if the current quality estimate is seen
 * as too unstable.
 */
const RAISE_BLOCKING_DELAY_INCREMENT = 3000;

/**
 * Amount of time, in milliseconds, with which the blocking time in raising
 * the quality will be dcremented if the current quality estimate is seen
 * as relatively stable, until `MINIMUM_BLOCK_RAISE_DELAY` is reached.
 */
const RAISE_BLOCKING_DELAY_DECREMENT = 1000;

/**
 * Amount of time, in milliseconds, after the "raise blocking delay" currently
 * in place (during which it is forbidden to raise up in quality), during which
 * we might want to raise the "raise blocking delay" if the last chosen quality
 * seems unsuitable.
 *
 * For example, let's consider that the current raise blocking delay is at
 * `4000`, or 4 seconds, and that this `STABILITY_CHECK_DELAY` is at `5000`, or
 * 5 seconds.
 * Here it means that if the estimated quality is found to be unsuitable less
 * than 4+5 = 9 seconds after it last was, we will increment the raise blocking
 * delay by `RAISE_BLOCKING_DELAY_INCREMENT` (unless `MAXIMUM_BLOCK_RAISE_DELAY`
 * is reached).
 * Else, if takes more than 9 seconds, the raise blocking delay might be
 * decremented.
 */
const STABILITY_CHECK_DELAY = 9000;

/**
 * Choose a bitrate based on the currently available buffer.
 *
 * This algorithm is based on a deviation of the BOLA algorithm.
 * It is a hybrid solution that also relies on a given bitrate's
 * "maintainability".
 * Each time a chunk is downloaded, from the ratio between the chunk duration
 * and chunk's request time, we can assume that the representation is
 * "maintanable" or not.
 * If so, we may switch to a better quality, or conversely to a worse quality.
 *
 * It also rely on mechanisms to avoid fluctuating too much between qualities.
 *
 * @class BufferBasedChooser
 */
export default class BufferBasedChooser {
  private _levelsMap : number[];
  private _bitrates : number[];

  /**
   * Laast timestamp, in terms of `performance.now`, at which the current
   * quality was seen as too high by this algorithm.
   * Begins at `undefined`.
   */
  private _lastUnsuitableQualityTimestamp: number | undefined;

  /**
   * After lowering in quality, we forbid raising during a set amount of time.
   * This amount is adaptive may continue to raise if it seems that quality
   * is switching too much between low and high qualities.
   *
   * `_blockRaiseDelay` represents this time in milliseconds.
   */
  private _blockRaiseDelay: number;

  /**
   * @param {Array.<number>} bitrates
   */
  constructor(bitrates : number[]) {
    this._levelsMap = getBufferLevels(bitrates).map(bl => {
      return bl + 4; // Add some buffer security as it will be used conjointly with
                     // other algorithms anyway
    });
    this._bitrates = bitrates;
    this._lastUnsuitableQualityTimestamp = undefined;
    this._blockRaiseDelay = MINIMUM_BLOCK_RAISE_DELAY;
    log.debug("ABR: Steps for buffer based chooser.",
              this._levelsMap.map((l, i) => `bufferLevel: ${l}, bitrate: ${bitrates[i]}`)
                .join(" ,"));
  }

  /**
   * @param {Object} playbackObservation
   * @returns {number|undefined}
   */
  public getEstimate(
    playbackObservation : IBufferBasedChooserPlaybackObservation
  ) : number | undefined {
    const bufferLevels = this._levelsMap;
    const bitrates = this._bitrates;
    const { bufferGap, currentBitrate, currentScore, speed } = playbackObservation;
    if (currentBitrate == null) {
      return bitrates[0];
    }

    let currentBitrateIndex = -1;
    for (let i = 0; i < bitrates.length; i++) {
      // There could be bitrate duplicates. Only take the last one to simplify
      const bitrate = bitrates[i];
      if (bitrate === currentBitrate) {
        currentBitrateIndex = i;
      } else if (bitrate > currentBitrate) {
        break;
      }
    }

    if (currentBitrateIndex < 0 || bitrates.length !== bufferLevels.length) {
      log.error("ABR: Current Bitrate not found in the calculated levels");
      return bitrates[0];
    }

    let scaledScore : number|undefined;
    if (currentScore !== undefined) {
      scaledScore = speed === 0 ? currentScore.score : (currentScore.score / speed);
    }

    const actualBufferGap = isFinite(bufferGap) ?
      bufferGap :
      0;

    const now = performance.now();

    if (
      actualBufferGap < bufferLevels[currentBitrateIndex] ||
      (
        scaledScore !== undefined && scaledScore < 1 &&
        currentScore?.confidenceLevel === ScoreConfidenceLevel.HIGH
      )
    ) {
      const timeSincePrev = this._lastUnsuitableQualityTimestamp === undefined ?
        -1 :
        now - this._lastUnsuitableQualityTimestamp;
      if (timeSincePrev < this._blockRaiseDelay + STABILITY_CHECK_DELAY) {
        const newDelay = this._blockRaiseDelay + RAISE_BLOCKING_DELAY_INCREMENT;
        this._blockRaiseDelay = Math.min(newDelay, MAXIMUM_BLOCK_RAISE_DELAY);
        log.debug("ABR: Incrementing blocking raise in BufferBasedChooser due " +
                    "to unstable quality",
                  this._blockRaiseDelay);
      } else {
        const newDelay = this._blockRaiseDelay - RAISE_BLOCKING_DELAY_DECREMENT;
        this._blockRaiseDelay = Math.max(MINIMUM_BLOCK_RAISE_DELAY, newDelay);
        log.debug("ABR: Lowering quality in BufferBasedChooser", this._blockRaiseDelay);
      }
      this._lastUnsuitableQualityTimestamp = now;
      // Security if multiple bitrates are equal, we now take the first one
      const baseIndex = arrayFindIndex(bitrates, (b) => b === currentBitrate);
      for (let i = baseIndex - 1; i >= 0; i--) {
        if (actualBufferGap >= bufferLevels[i]) {
          return bitrates[i];
        }
      }
      return bitrates[0];
    }

    if (
      (
        this._lastUnsuitableQualityTimestamp !== undefined &&
        now - this._lastUnsuitableQualityTimestamp < this._blockRaiseDelay
      ) ||
      scaledScore === undefined || scaledScore < 1.15 ||
      currentScore?.confidenceLevel !== ScoreConfidenceLevel.HIGH
    ) {
      return currentBitrate;
    }

    const currentBufferLevel = bufferLevels[currentBitrateIndex];
    const nextIndex = (() => {
      for (let i = currentBitrateIndex + 1; i < bufferLevels.length; i++) {
        if (bufferLevels[i] > currentBufferLevel) {
          return i;
        }
      }
    })();
    if (nextIndex !== undefined) {
      const nextBufferLevel = bufferLevels[nextIndex];
      if (bufferGap >= nextBufferLevel) {
        log.debug("ABR: Raising quality in BufferBasedChooser", bitrates[nextIndex]);
        return bitrates[nextIndex];
      }
    }
    return currentBitrate;
  }
}

/** Playback observation needed by the `BufferBasedChooser`. */
export interface IBufferBasedChooserPlaybackObservation {
  /**
   * Difference in seconds between the current position and the next
   * non-buffered position in the buffer for the currently-considered
   * media type.
   */
  bufferGap : number;
  /** The bitrate of the currently downloaded segments, in bps. */
  currentBitrate? : number | undefined;
  /** The "maintainability score" of the currently downloaded segments. */
  currentScore? : IRepresentationMaintainabilityScore | undefined;
  /** Playback rate wanted (e.g. `1` is regular playback, `2` is double speed etc.). */
  speed : number;
}
