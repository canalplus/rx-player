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

export interface IBufferBasedChooserPlaybackObservation {
  bufferGap : number; // Difference in seconds between the current position and
                      // the next non-buffered position
  currentBitrate? : number; // The bitrate of the currently downloaded segments, in bps
  currentScore? : number; // The "maintainability score" of the currently
                          // downloaded segments
  speed : number; // Playback rate wanted
}

/**
 * From the buffer gap, choose a representation.
 * @param {Object} playbackObservation
 * @param {Array.<Number>} bitrates
 * @param {Array.<Number>} bufferLevels
 * @returns {Object|undefined}
 */
export default function getEstimateFromBufferLevels(
  playbackObservation : IBufferBasedChooserPlaybackObservation,
  bitrates : number[],
  bufferLevels : number[]
) : number|undefined {
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
