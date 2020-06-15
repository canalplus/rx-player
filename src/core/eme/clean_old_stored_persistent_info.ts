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
import PersistentSessionsStore from "./utils/persistent_sessions_store";

/**
 * Remove old information from a PersistentSessionsStore so that it respects the
 * given `limit` as a maximum size. This can be used to prevent its size from
 * growing indefinitely.
 *
 * This is needed because our persistent session information storage is
 * un-bounded in size, adding more data will just add more data without removing
 * the old one - which can be valid or invalid.
 *
 * This is problematic for at least two reasons:
 *   - This data is loaded into JS memory which is finite (and which maximum
 *     bounds depends on the user environment).
 *   - The final storage used (as chosen by the application using the RxPlayer)
 *     will in most cases have a maximum storage size.
 */
export default function cleanOldStoredPersistentInfo(
  persistentSessionsStore : PersistentSessionsStore,
  limit : number
) : void {
  if (isNaN(limit) || limit < 0 || limit >= persistentSessionsStore.getLength()) {
    return;
  }
  const numberOfPersistentSessions = persistentSessionsStore.getLength();
  const toDelete = numberOfPersistentSessions - limit;
  log.info("EME: Too many stored persistent sessions, removing some.",
           numberOfPersistentSessions,
           toDelete);
  persistentSessionsStore.deleteOldSessions(toDelete);
}
