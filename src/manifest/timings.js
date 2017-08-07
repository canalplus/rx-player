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

/**
 * Amount of time substracted from the live edge to prevent buffering ahead
 * of it.
 *
 * TODO This property should be removed in a next version (after multiple
 * tests).
 * We should be the closest to the live edge when it comes to buffering.
 */
const LIVE_BUFFER_PROTECTION = 10;

function toWallClockTime(position, manifest) {
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
function fromWallClockTime(timeInMs, manifest) {
  return normalizeWallClockTime(timeInMs, manifest) / 1000
    - manifest.availabilityStartTime;
}

/**
 * TODO This function should have more of a seekTo kind of name
 */
function normalizeWallClockTime(timeInMs, manifest) {
  const {
    suggestedPresentationDelay,
    presentationLiveGap,
    timeShiftBufferDepth,
  } = manifest;

  if (typeof timeInMs != "number") {
    timeInMs = timeInMs.getTime();
  }

  const now = Date.now();
  const max = now - (presentationLiveGap + suggestedPresentationDelay) * 1000;
  const min = now - (timeShiftBufferDepth) * 1000;
  return Math.max(Math.min(timeInMs, max), min);
}

function getMinimumBufferPosition(manifest) {
  // we have to know both the min and the max to be sure
  const [min] = getBufferLimits(manifest);
  return min;
}

/**
 * Get maximum position to which we should be able to construct a buffer.
 * @param {Manifest} manifest
 * @returns {Number}
 */
function getMaximumBufferPosition(manifest) {
  if (!manifest.isLive) {
    return manifest.getDuration();
  }

  const {
    availabilityStartTime,
    presentationLiveGap,
  } = manifest;
  const now = Date.now() / 1000;
  return now - availabilityStartTime - presentationLiveGap;
}

/**
 * Get maximum buffer position with, for live contents, an added security to
 * prevent buffering ahead of the live edge.
 *
 * TODO This method should be removed in a next version (after multiple tests).
 * We should be the closest to the live edge when it comes to buffering.
 *
 * @param {Manifest} manifest
 * @returns {Number}
 */
function getMaximumSecureBufferPosition(manifest) {
  const maximumBufferPosition = getMaximumBufferPosition(manifest);
  return manifest.isLive ?
    maximumBufferPosition - LIVE_BUFFER_PROTECTION : maximumBufferPosition;
}

function getBufferLimits(manifest) {
  // TODO use RTT for the manifest request + 3 or something
  const BUFFER_DEPTH_SECURITY = 5;

  if (!manifest.isLive) {
    return [0, manifest.getDuration()];
  }

  const {
    availabilityStartTime,
    presentationLiveGap,
    timeShiftBufferDepth,
  } = manifest;

  const now = Date.now() / 1000;
  const max = now - availabilityStartTime - presentationLiveGap;
  return [
    Math.min(max, max - timeShiftBufferDepth + BUFFER_DEPTH_SECURITY),
    max,
  ];
}

export {
  toWallClockTime,
  fromWallClockTime,
  getMinimumBufferPosition,
  getMaximumBufferPosition,
  getMaximumSecureBufferPosition,
  getBufferLimits,
};
