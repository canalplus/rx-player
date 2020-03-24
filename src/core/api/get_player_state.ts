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

import config from "../../config";

const { FORCED_ENDED_THRESHOLD } = config;

/** Player state dictionnary. */
export const PLAYER_STATES = { STOPPED: "STOPPED",
                               LOADED: "LOADED",
                               LOADING: "LOADING",
                               PLAYING: "PLAYING",
                               PAUSED: "PAUSED",
                               ENDED: "ENDED",
                               BUFFERING: "BUFFERING",
                               SEEKING: "SEEKING",
                               RELOADING: "RELOADING" };

/**
 * Get state string for a _loaded_ content.
 * @param {HTMLMediaElement} mediaElement
 * @param {boolean} isPlaying - false when the player is paused. true otherwise.
 * @param {Object} stalledStatus - Current stalled state:
 *   - null when not stalled
 *   - an object with a description of the situation if stalled.
 * @returns {string}
 */
export default function getLoadedContentState(
  mediaElement : HTMLMediaElement,
  isPlaying : boolean,
  stalledStatus : { reason : "seeking" |
                             "not-ready" |
                             "buffering"; } |
                  null
) : string {
  if (mediaElement.ended) {
    return PLAYER_STATES.ENDED;
  }

  if (stalledStatus !== null) {
    // On some old browsers (e.g. Chrome 54), the browser does not
    // emit an 'ended' event in some conditions. Detect if we
    // reached the end by comparing the current position and the
    // duration instead.
    const gapBetweenDurationAndCurrentTime = Math.abs(mediaElement.duration -
                                                      mediaElement.currentTime);
    if (FORCED_ENDED_THRESHOLD != null &&
        gapBetweenDurationAndCurrentTime < FORCED_ENDED_THRESHOLD
    ) {
      return PLAYER_STATES.ENDED;
    }

    return stalledStatus.reason === "seeking" ? PLAYER_STATES.SEEKING :
                                                PLAYER_STATES.BUFFERING;
  }
  return isPlaying ? PLAYER_STATES.PLAYING :
                     PLAYER_STATES.PAUSED;
}
