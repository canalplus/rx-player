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
 * @class BufferBasedChooser
 */
export default class BufferBasedChooser {
  private _levelsMap : number[];
  private _bitrates : number[];

  /**
   * @param {Array.<number>} bitrates
   */
  constructor(bitrates : number[]) {
    this._levelsMap = getBufferLevels(bitrates);
    this._bitrates = bitrates;
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
    const currentBitrateIndex = arrayFindIndex(bitrates, b => b === currentBitrate);
    if (currentBitrateIndex < 0 || bitrates.length !== bufferLevels.length) {
      log.error("ABR: Current Bitrate not found in the calculated levels");
      return bitrates[0];
    }

    let scaledScore : number|undefined;
    if (currentScore != null) {
      scaledScore = speed === 0 ? currentScore : (currentScore / speed);
    }

    if (scaledScore != null && scaledScore > 1) {
      const currentBufferLevel = bufferLevels[currentBitrateIndex];
      const nextIndex = (() => {
        for (let i = currentBitrateIndex + 1; i < bufferLevels.length; i++) {
          if (bufferLevels[i] > currentBufferLevel) {
            return i;
          }
        }
      })();
      if (nextIndex != null) {
        const nextBufferLevel = bufferLevels[nextIndex];
        if (bufferGap >= nextBufferLevel) {
          return bitrates[nextIndex];
        }
      }
    }

    if (scaledScore == null || scaledScore < 1.15) {
      const currentBufferLevel = bufferLevels[currentBitrateIndex];
      if (bufferGap < currentBufferLevel) {
        for (let i = currentBitrateIndex - 1; i >= 0; i--) {
          if (bitrates[i] < currentBitrate) {
            return bitrates[i];
          }
        }
        return currentBitrate;
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
  currentScore? : number | undefined;
  /** Playback rate wanted (e.g. `1` is regular playback, `2` is double speed etc.). */
  speed : number;
}
