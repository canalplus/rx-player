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

import config from "../../config.js";
import assert from "../../utils/assert";
import {
  getBufferLimits,
  getMaximumBufferPosition,
  fromWallClockTime,
} from "../../manifest/timings.js";

const { DEFAULT_LIVE_GAP } = config;

/**
 * Returns the calculated initial time for the stream described by the given
 * manifest:
 *   - if a start time is defined by user, set it as start time
 *   - if video is live, use the live edge
 *   - else set the start time to 0
 *
 * @param {Manifest} manifest
 * @param {Object} startAt
 * @param {Object} timeFragment
 * @returns {Number}
 */
export default function getInitialTime(manifest, startAt, timeFragment) {
  // TODO @deprecated
  const duration = manifest.getDuration();
  let startTime = timeFragment.start;
  let endTime = timeFragment.end;
  const percentage = /^\d*(\.\d+)? ?%$/;

  if (startAt) {
    const [min, max] = getBufferLimits(manifest);
    if (startAt.position != null) {
      return Math.max(Math.min(startAt.position, max), min);
    }
    else if (startAt.wallClockTime != null) {
      const position = manifest.isLive ?
        startAt.wallClockTime - manifest.availabilityStartTime :
        startAt.wallClockTime;

      return Math.max(Math.min(position, max), min);
    }
    else if (startAt.fromFirstPosition != null) {
      const { fromFirstPosition } = startAt;
      return fromFirstPosition <= 0 ?
        min : Math.min(min + fromFirstPosition, max);
    }
    else if (startAt.fromLastPosition != null) {
      const { fromLastPosition } = startAt;
      return fromLastPosition >= 0 ?
        max : Math.max(min, max + fromLastPosition);
    }
  }

  else { // TODO @deprecated
    if (typeof startTime == "string" && percentage.test(startTime)) {
      startTime = (parseFloat(startTime) / 100) * duration;
    }

    if (typeof endTime == "string" && percentage.test(endTime)) {
      timeFragment.end = (parseFloat(endTime) / 100) * duration;
    }

    if (endTime === Infinity || endTime === "100%") {
      endTime = duration;
    }

    if (!manifest.isLive) {
      assert(startTime < duration && endTime <= duration, "stream: bad startTime and endTime");
      return startTime;
    }
    else if (startTime) {
      return fromWallClockTime(startTime, manifest);
    }
    else {
      const sgp = manifest.suggestedPresentationDelay;
      return getMaximumBufferPosition(manifest) -
        (sgp == null ? DEFAULT_LIVE_GAP : sgp);
    }
  }

  return 0;
}
