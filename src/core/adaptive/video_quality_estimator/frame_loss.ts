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

import { getVideoPlaybackQuality } from "../../../compat/get_video_playback_quality";

/**
 * @param {HTMLVideoElement} mediaElement
 * @param {Object} lastFrameCounts
 * @returns {number}
 */
export default function getFrameLossFromLastPosition(
  mediaElement: HTMLVideoElement,
  lastFrameCounts: {
    lastTotalDecodedFrames: number;
    lastTotalDroppedFrames: number;
  }
): number | null {
  const { totalVideoFrames: totalDecodedFrames, droppedVideoFrames: totalDroppedFrames } =
    getVideoPlaybackQuality(mediaElement);
  const sampleDecodedFrames = totalDecodedFrames - lastFrameCounts.lastTotalDecodedFrames;
  const sampleDroppedFrames = totalDroppedFrames - lastFrameCounts.lastTotalDroppedFrames;

  lastFrameCounts.lastTotalDecodedFrames = totalDecodedFrames;
  lastFrameCounts.lastTotalDroppedFrames = totalDroppedFrames;

  const ratio = sampleDroppedFrames / (sampleDroppedFrames + sampleDecodedFrames);
  return !isNaN(ratio) ? ratio : null;
}
