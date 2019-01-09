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

export interface IBufferBasedChooserClockTick {
  bufferGap : number;
  currentBitrate? : number;
  currentScore? : number;
  playbackRate : number;
}

/**
 * From the buffer gap, choose a representation.
 * @param {Object} clockTick
 * @param {Array.<Number>} bitrates
 * @param {Array.<Number>} levels
 * @returns {Object|undefined}
 */
export default function getEstimateFromBufferLevels(
  clockTick : IBufferBasedChooserClockTick,
  bitrates : number[],
  bufferLevels : number[]
) : number|undefined {
  const { bufferGap, currentBitrate, currentScore, playbackRate } = clockTick;
  if (currentBitrate == null) {
    return undefined;
  }
  const currentBitrateIndex = arrayFindIndex(bitrates, b => b === currentBitrate);
  if (currentBitrateIndex < 0 || bitrates.length !== bufferLevels.length) {
    log.error("ABR: Current Bitrate not found in the calculated levels");
    return bitrates[0];
  }

  let scaledScore : number|undefined;
  if (currentScore != null) {
    scaledScore = playbackRate === 0 ? currentScore : (currentScore / playbackRate);
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
