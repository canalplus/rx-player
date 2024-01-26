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

import type { MainSourceBufferInterface } from "../../../mse/main_media_source_interface";

/**
 * Remove buffer around wanted time, considering a margin around
 * it that defines what must be kept :
 * If time is 10 and margin is 2, cleaned ranges will be :
 * [0, 8] and [12, videoElement.duration]
 * @param {HTMLMediaElement} videoElement
 * @param {Object} sourceBufferInterface
 * @param {Number} time
 * @param {Number|undefined} margin
 * @returns {Promise}
 */
export default function removeBufferAroundTime(
  videoElement: HTMLMediaElement,
  sourceBufferInterface: MainSourceBufferInterface,
  time: number,
  margin: number | undefined,
): Promise<unknown> {
  const removalMargin = margin ?? 10 * 60;
  if (videoElement.buffered.length === 0) {
    return Promise.resolve();
  }
  const bufferRemovals = [];
  if (time - removalMargin > 0) {
    bufferRemovals.push(sourceBufferInterface.remove(0, time - removalMargin));
  }
  if (time + removalMargin < videoElement.duration) {
    bufferRemovals.push(
      sourceBufferInterface.remove(time + removalMargin, videoElement.duration),
    );
  }
  return Promise.all(bufferRemovals);
}
