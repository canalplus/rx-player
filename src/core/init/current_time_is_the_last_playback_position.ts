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

import assertUnreachable from "../../utils/assert_unreachable";
import { IPlayerState } from "../api/get_player_state";

/**
 * When the player is stopped, or in a ended state, the media element current time
 * may not reflect the playback position before entering that state.
 * @param state
 * @returns {boolean}
 */
export default function currentTimeIsTheLastPlaybackPosition(
  state: IPlayerState
): boolean {
  switch (state) {
    case "PLAYING":
    case "PAUSED":
    case "SEEKING":
    case "LOADED":
    case "LOADING":
    case "RELOADING":
    case "BUFFERING":
      return true;
    case "STOPPED":
    case "ENDED":
      return false;
    default:
      assertUnreachable(state);
  }
}
