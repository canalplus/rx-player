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

import log from "../../../log";
import arrayIncludes from "../../../utils/array_includes";
import type KeySessionRecord from "./key_session_record";
import type LoadedSessionsStore from "./loaded_sessions_store";

/**
 * Close sessions from the loadedSessionsStore to allow at maximum `limit`
 * stored MediaKeySessions in it.
 *
 * Emit event when a MediaKeySession begin to be closed and another when the
 * MediaKeySession is closed.
 * @param {Object} loadedSessionsStore
 * @returns {Promise}
 */
export default async function cleanOldLoadedSessions(
  loadedSessionsStore: LoadedSessionsStore,
  activeRecords: KeySessionRecord[],
  limit: number,
): Promise<void> {
  if (limit < 0 || limit >= loadedSessionsStore.getLength()) {
    return;
  }
  log.info("DRM: LSS cache limit exceeded", limit, loadedSessionsStore.getLength());
  const proms: Array<Promise<unknown>> = [];
  const sessionsMetadata = loadedSessionsStore.getAll().slice(); // clone
  let toDelete = sessionsMetadata.length - limit;
  for (let i = 0; toDelete > 0 || i >= sessionsMetadata.length; i++) {
    const metadata = sessionsMetadata[i];
    if (!arrayIncludes(activeRecords, metadata.keySessionRecord)) {
      proms.push(loadedSessionsStore.closeSession(metadata.mediaKeySession));
      toDelete--;
    }
  }
  if (toDelete > 0) {
    return Promise.all(proms).then(() => {
      return Promise.reject(
        new NoSessionSpaceError("Could not remove all sessions: some are still active"),
      );
    });
  }
  await Promise.all(proms);
}

/**
 * Error thrown when the MediaKeySession is blacklisted.
 * Such MediaKeySession should not be re-used but other MediaKeySession for the
 * same content can still be used.
 * @class NoSessionSpaceError
 * @extends Error
 */
export class NoSessionSpaceError extends Error {
  constructor(message: string) {
    super(message);
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, NoSessionSpaceError.prototype);
  }
}
