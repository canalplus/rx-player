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
 * Wait for the "LOADED" state just after ``loadVideo`` is called.
 * Reject if the state is neither "LOADING" nor "LOADED".
 * @param {RxPlayer} player
 * @returns {Promise}
 */
function waitForLoadedStateAfterLoadVideo(player) {
  return waitForState(player, "LOADED", ["LOADING"]);
}

/**
 * Wait for the given state on the player.
 *
 * If a whitelist is set, reject if the state is not in it. You do not have to
 * put the wanted state in that list.
 * @param {RxPlayer} player
 * @param {string} state
 * @param {Array.<string>} [whitelist]
 * @returns {Promise}
 */
export default function waitForState(player, wantedState, whitelist) {
  return new Promise((resolve, reject) => {
    function onPlayerStateChange(state) {
      if (wantedState === state) {
        player.removeEventListener("playerStateChange", onPlayerStateChange);
        resolve();
      } else if (whitelist && !whitelist.includes(state)) {
        if (state === "STOPPED" && player.getError() !== null) {
          console.error("!!!!!!!!!", player.getError().toString());
        }
        reject(new Error("invalid state: " + state));
      }
    }
    player.addEventListener("playerStateChange", onPlayerStateChange);
  });
}

export {
  waitForLoadedStateAfterLoadVideo,
};
