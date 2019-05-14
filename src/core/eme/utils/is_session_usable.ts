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

import { ICustomMediaKeySession } from "../../../compat";
import log from "../../../log";
import arrayIncludes from "../../../utils/array_includes";

/**
 * If all key statuses attached to session are valid (either not
 * "expired" or "internal-error"), return true.
 * If not, return false.
 * @param {Uint8Array} initData
 * @param {MediaKeySession} loadedSession
 * @returns {MediaKeySession}
 */
export default function isSessionUsable(
  loadedSession : MediaKeySession | ICustomMediaKeySession
) : boolean {
  if (loadedSession.sessionId === "") {
    return false;
  }

  const keyStatusesMap = loadedSession.keyStatuses;
  const keyStatuses: string[] = [];
  keyStatusesMap.forEach((keyStatus) => {
    keyStatuses.push(keyStatus);
  });

  if (keyStatuses.length > 0 &&
      (
        !arrayIncludes(keyStatuses, "expired") &&
        !arrayIncludes(keyStatuses, "internal-error")
      )
  ) {
    log.debug("EME: Reuse loaded session", loadedSession.sessionId);
    return true;
  }
  return false;
}
