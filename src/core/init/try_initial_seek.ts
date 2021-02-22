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

import { shouldWaitForSeekValidation } from "../../compat";
import log from "../../log";
import { IInitClockTick } from "./types";

/**
 * Only if it's possible currently on the HTMLMediaElement, try to seek at the
 * position indicated by `startTime`.
 *
 * Returns a boolean set to `true` if we're sure the seek has been taken into
 * account, `false` if either we didn't seek or if we did but we are not yet
 * sure it has been taken into account.
 * @param {Object} tick - The currently Observed clock tick.
 * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement we want to seek
 * on.
 * @param {Number} startTime - The wanted starting position.
 * @returns {boolean}
 */
export default function tryInitialSeek(
  tick : IInitClockTick,
  mediaElement : HTMLMediaElement,
  startTime : number | (() => number)
) : boolean {
  const initialTime = typeof startTime === "function" ? startTime() :
                                                        startTime;
  const hasAlreadySeeked = mediaElement.currentTime > 0 || initialTime === 0;
  if (tick.readyState >= 3 && hasAlreadySeeked) {
    return true;
  } else if (tick.event === "seeking" || tick.event === "seeked") {
    return true;
  } else if (tick.readyState === 0 && tick.event !== "loadedmetadata") {
    return false;
  } else {
    if (mediaElement.currentTime === 0 && initialTime !== 0) {
      // Perform initial seek if necessary
      log.info("Init: Set initial time", initialTime);
      mediaElement.currentTime = initialTime;
    }
    return !shouldWaitForSeekValidation() ||
           (tick.readyState >= 3 &&
            (initialTime === 0 || mediaElement.currentTime !== 0));
  }
}
