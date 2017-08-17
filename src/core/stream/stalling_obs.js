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

import log from "../../utils/log";
import { getNextRangeGap } from "../../utils/ranges.js";

import { isPlaybackStuck } from "../../compat";
import { getBufferLimits } from "../../manifest/timings.js";

const { DISCONTINUITY_THRESHOLD } = config;

/**
 * Receive "stalling" events from the clock, try to get out of it, and re-emit
 * them for the player if the stalling status changed.
 * @param {HTMLMediaElement} videoElement
 * @param {Manifest} manifest
 * @param {Observable} timings$
 * @returns {Observable}
 */
function StallingManager(
  videoElement,
  manifest,
  timings$,
) {
  return timings$
    .do((timing) => {
      if (!timing.stalled) {
        return;
      }

      // Perform various checks to try to get out of the stalled state:
      //   1. is it a browser bug? -> force seek at the same current time
      //   2. is it a short discontinuity? -> Seek at the beginning of the
      //                                      next range
      //   3. are we before the buffer depth? -> Seek a little after it
      const { buffered, currentTime } = timing;
      const nextRangeGap = getNextRangeGap(buffered, currentTime);

      // Discontinuity check in case we are close a buffer but still
      // calculate a stalled state. This is useful for some
      // implementation that might drop an injected segment, or in
      // case of small discontinuity in the stream.
      if (isPlaybackStuck(timing)) {
        log.warn("after freeze seek", currentTime, timing.range);
        videoElement.currentTime = currentTime;
      } else if (nextRangeGap < DISCONTINUITY_THRESHOLD) {
        const seekTo = (currentTime + nextRangeGap + 1/60);
        log.warn("discontinuity seek", currentTime, nextRangeGap, seekTo);
        videoElement.currentTime = seekTo;
      } else {
        const [
          minBufferPosition,
          maxBufferPosition,
        ] = getBufferLimits(manifest);
        const bufferDepth = maxBufferPosition - minBufferPosition;

        if (bufferDepth && bufferDepth > 5) {
          const minimumPosition = Math.min(
            minBufferPosition + 3,
            minBufferPosition + (bufferDepth / 10),
            maxBufferPosition - 5
          );

          if (currentTime < minimumPosition) {
            const newPosition = minimumPosition + 5;
            const diff = newPosition - currentTime;
            log.warn("buffer depth seek", currentTime, diff, newPosition);
            videoElement.currentTime = newPosition;
          }
        } else if (bufferDepth && currentTime < minBufferPosition) {
          const diff = maxBufferPosition - currentTime;
          log.warn("buffer depth seek", currentTime, diff, maxBufferPosition);
          videoElement.currentTime = maxBufferPosition;
        }
      }
    })
    .share()
    .map(timing => timing.stalled)
    .distinctUntilChanged((wasStalled, isStalled) => {
      return !wasStalled && !isStalled ||
        (wasStalled && isStalled && wasStalled.state === isStalled.state);
    }).do(t => console.log("!!!!", t));
}

export default StallingManager;
