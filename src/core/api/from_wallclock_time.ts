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
 * @param {number} timeInMs
 * @param {Object} manifest
 * @returns {number}
 */
export default function fromWallClockTime(
  timeInMs : number,
  manifest : Manifest
) : number {
  return normalizeWallClockTime(timeInMs, manifest) / 1000
    - (manifest.availabilityStartTime || 0);
}

/**
 * TODO This function should have more of a seekTo kind of name
 * @param {number|date}
 * @param {Object} manifest
 * @retunrs {number}
 */
function normalizeWallClockTime(
  _time : number|Date,
  manifest : Manifest
) : number {
  if (!manifest.isLive) {
    return +_time;
  }
  const spd = manifest.suggestedPresentationDelay || 0;
  const plg = manifest.presentationLiveGap || 0;
  const tsbd = manifest.timeShiftBufferDepth || 0;

  const timeInMs = typeof _time === "number" ?
    _time : +_time;

  const now = Date.now();
  const max = now - (plg + spd) * 1000;
  const min = now - (tsbd) * 1000;
  return Math.max(Math.min(timeInMs, max), min);
}
