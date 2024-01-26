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

import log from "../../log";
import sleep from "../../utils/sleep";
import MediaKeysInfosStore from "./utils/media_keys_infos_store";

/**
 * Free up all ressources taken by the content decryption logic.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Promise}
 */
export default async function disposeDecryptionResources(
  mediaElement: HTMLMediaElement,
): Promise<unknown> {
  const currentState = MediaKeysInfosStore.getState(mediaElement);
  if (currentState === null) {
    return undefined;
  }

  log.info("DRM: Disposing of the current MediaKeys");
  const { loadedSessionsStore } = currentState;
  MediaKeysInfosStore.clearState(mediaElement);
  await loadedSessionsStore.closeAllSessions();

  return Promise.race([
    currentState.emeImplementation.setMediaKeys(mediaElement, null).catch((err) => {
      log.error(
        "DRM: Could not reset MediaKeys",
        err instanceof Error ? err : "Unknown Error",
      );
    }),

    // Because we know how much EME has implementation issues, let's not block
    // everything because that API hangs
    sleep(1000),
  ]);
}
