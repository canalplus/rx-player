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

import Manifest from "../../manifest";

/**
 * Translate "wall-clock time" in ms (time since unix epoch without counting
 * leap seconds a.k.a. unix time a.k.a. Date.now()), into the real media time of
 * the content.
 * @param {number} timeInMs - Wall-clock time in milliseconds
 * @param {Object} manifest - Manifest describing the current content
 * @returns {number} - Real media time you can seek to to be at that wall-clock
 * time.
 */
export default function fromWallClockTime(
  timeInMs : number,
  manifest : Manifest
) : number {
  return normalizeWallClockTime(timeInMs, manifest) / 1000
    - (manifest.availabilityStartTime || 0);
}

/**
 * Bound the given "wall-clock time" in ms (unix time) to the time limits of the
 * content as described by the Manifest.
 * @param {number}
 * @param {Object} manifest - Manifest describing the current content
 * @returns {number}
 */
function normalizeWallClockTime(
  timeInMs : number,
  manifest : Manifest
) : number {
  if (!manifest.isLive) {
    return +timeInMs;
  }
  const spd = manifest.suggestedPresentationDelay || 0;
  const plg = manifest.presentationLiveGap || 0;
  const tsbd = manifest.timeShiftBufferDepth;

  const now = Date.now();
  const max = now - (plg + spd) * 1000;
  const min = tsbd == null ?
    (manifest.minimumTime || manifest.availabilityStartTime || 0) :
    now - (tsbd) * 1000;
  return Math.max(Math.min(timeInMs, max), min);
}
