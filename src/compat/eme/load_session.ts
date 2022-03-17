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

import PPromise from "pinkie";
import log from "../../log";
import { ICustomMediaKeySession } from "./custom_media_keys";

const EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES = 100;

/**
 * Load a persistent session, based on its `sessionId`, on the given
 * MediaKeySession.
 *
 * Returns an Observable which emits:
 *   - true if the persistent MediaKeySession was found and loaded
 *   - false if no persistent MediaKeySession was found with that `sessionId`.
 * Then completes.
 *
 * The Observable throws if anything goes wrong in the process.
 * @param {MediaKeySession} session
 * @param {string} sessionId
 * @returns {Observable}
 */
export default async function loadSession(
  session : MediaKeySession | ICustomMediaKeySession,
  sessionId : string
) : Promise<boolean> {
  log.info("Compat/DRM: Load persisted session", sessionId);
  const isLoaded = await session.load(sessionId);

  if (!isLoaded || session.keyStatuses.size > 0) {
    return isLoaded;
  }

  // A browser race condition can exist, seen for example in some
  // Chromium/Chrome versions where the `keyStatuses` property from a loaded
  // MediaKeySession would not be populated directly as the load answer but
  // asynchronously after.
  return new PPromise((resolve) => {
    (session as MediaKeySession).addEventListener("keystatuseschange",
                                                  resolveWithLoadedStatus);
    const timeout = setTimeout(resolveWithLoadedStatus,
                               EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES);

    function resolveWithLoadedStatus() {
      cleanUp();
      resolve(isLoaded);
    }

    function cleanUp() {
      clearTimeout(timeout);
      (session as MediaKeySession).removeEventListener("keystatuseschange",
                                                       resolveWithLoadedStatus);
    }
  });
}
