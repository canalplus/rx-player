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

/**
 * TODO methods of manifest class?
 */
import Manifest from "./index";

function toWallClockTime(position : number, manifest : Manifest) : Date {
  return new Date((position + manifest.availabilityStartTime) * 1000);
}

/**
 * TODO This function should have more of a seekTo kind of name
 * ``fromWallClockTime`` should probably just do:
 * ```js
 * (timeInSeconds, manifest) => {
 *   return timeInSeconds - manifest.availabilityStartTime;
 * };
 * ```
 * It should be the exact opposite of ``toWallClockTime``
 */
function fromWallClockTime(timeInMs : number, manifest : Manifest) : number {
  return normalizeWallClockTime(timeInMs, manifest) / 1000
    - manifest.availabilityStartTime;
}

/**
 * TODO This function should have more of a seekTo kind of name
 */
function normalizeWallClockTime(
  timeInMs : number|Date,
  manifest : Manifest
) : number {
  if (!manifest.isLive) {
    return +timeInMs;
  }
  const spd = manifest.suggestedPresentationDelay || 0;
  const plg = manifest.presentationLiveGap || 0;
  const tsbd = manifest.timeShiftBufferDepth || 0;

  if (typeof timeInMs !== "number") {
    timeInMs = timeInMs.getTime();
  }

  const now = Date.now();
  const max = now - (plg + spd) * 1000;
  const min = now - (tsbd) * 1000;
  return Math.max(Math.min(timeInMs, max), min);
}

function getMinimumBufferPosition(manifest : Manifest) : number {
  // we have to know both the min and the max to be sure
  const [min] = getBufferLimits(manifest);
  return min;
}

/**
 * Get maximum position to which we should be able to construct a buffer.
 * @param {Manifest} manifest
 * @returns {Number}
 */
function getMaximumBufferPosition(manifest : Manifest) : number {
  if (!manifest.isLive) {
    return manifest.getDuration();
  }
  const ast = manifest.availabilityStartTime || 0;
  const plg = manifest.presentationLiveGap || 0;
  const now = Date.now() / 1000;
  return now - ast - plg;
}

function getBufferLimits(manifest : Manifest) : [number, number] {
  // TODO use RTT for the manifest request + 3 or something
  const BUFFER_DEPTH_SECURITY = 5;

  if (!manifest.isLive) {
    return [0, manifest.getDuration()];
  }

  const ast = manifest.availabilityStartTime || 0;
  const plg = manifest.presentationLiveGap || 0;
  const tsbd = manifest.timeShiftBufferDepth || 0;

  const now = Date.now() / 1000;
  const max = now - ast - plg;
  return [
    Math.min(max, max - tsbd + BUFFER_DEPTH_SECURITY),
    max,
  ];
}

export {
  toWallClockTime,
  fromWallClockTime,
  getMinimumBufferPosition,
  getMaximumBufferPosition,
  getBufferLimits,
};
