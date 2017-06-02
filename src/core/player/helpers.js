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

import assert from "../../utils/assert";
import { PLAYER_STATES } from "./constants.js";

/**
 * Returns current playback state for the current content.
 * /!\ Only pertinent for a content that is currently loaded and playing
 * (i.e. not loading, ended or stopped).
 * @param {Boolean} isPlaying - Whether the player is currently playing
 * (not paused).
 * @param {Boolean} stalled - Whether the player is currently "stalled".
 *
 * @returns {string}
 */
function inferPlayerState(isPlaying, stalled) {
  if (stalled) {
    return (stalled.name == "seeking")
      ? PLAYER_STATES.SEEKING
      : PLAYER_STATES.BUFFERING;
  }

  if (isPlaying) {
    return PLAYER_STATES.PLAYING;
  }

  return PLAYER_STATES.PAUSED;
}

/**
 * Assert that a manifest has been loaded (throws otherwise).
 * @param {Player} player
 * @throws Error - Throws if the given player has no manifest loaded.
 */
function assertManifest(player) {
  assert(player._priv.manifest, "player: no manifest loaded");
}

/**
 * @param {Observable} stream
 * @param {string} type
 * @returns {Observable}
 */
function filterStreamByType(stream, type) {
  return stream
    .filter((o) => o.type == type)
    .map((o) => o.value);
}

export {
  inferPlayerState,
  assertManifest,
  filterStreamByType,
};
