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

import {
  EMPTY,
  mapTo,
  merge as observableMerge,
  Observable,
  startWith,
} from "rxjs";
import { ICustomMediaKeySession } from "../../compat";
import { IInitializationDataInfo } from "./types";
import LoadedSessionsStore from "./utils/loaded_sessions_store";

/**
 * Event emitted when an old MediaKeySession has been closed to respect the
 * maximum limit of concurrent MediaKeySession active.
 */
export interface ICleanedOldSessionEvent {
  type : "cleaned-old-session";
  value : {
    /** The MediaKeySession cleaned. */
    mediaKeySession : MediaKeySession |
                      ICustomMediaKeySession;
    /** The type of MediaKeySession (e.g. "temporary"). */
    sessionType : MediaKeySessionType;
    /** Initialization data assiociated to this MediaKeySession. */
    initializationData : IInitializationDataInfo;
  };
}

/**
 * Event emitted when we are beginning to close an old MediaKeySession to
 * respect the maximum limit of concurrent MediaKeySession active.
 */
export interface ICleaningOldSessionEvent {
  type : "cleaning-old-session";
  value : {
    /** The MediaKeySession that we are currently cleaning. */
    mediaKeySession : MediaKeySession |
                      ICustomMediaKeySession;
    /** The type of MediaKeySession (e.g. "temporary"). */
    sessionType : MediaKeySessionType;
    /** Initialization data assiociated to this MediaKeySession. */
    initializationData : IInitializationDataInfo;
  };
}

/**
 * Close sessions from the loadedSessionsStore to allow at maximum `limit`
 * stored MediaKeySessions in it.
 *
 * Emit event when a MediaKeySession begin to be closed and another when the
 * MediaKeySession is closed.
 * @param {Object} loadedSessionsStore
 * @returns {Observable}
 */
export default function cleanOldLoadedSessions(
  loadedSessionsStore : LoadedSessionsStore,
  limit : number
) : Observable<ICleaningOldSessionEvent | ICleanedOldSessionEvent> {
  if (limit < 0 || limit >= loadedSessionsStore.getLength()) {
    return EMPTY;
  }

  const cleaningOldSessions$ : Array<Observable<ICleanedOldSessionEvent |
                                                 ICleaningOldSessionEvent>> = [];
  const entries = loadedSessionsStore
    .getAll()
    .slice(); // clone
  const toDelete = entries.length - limit;
  for (let i = 0; i < toDelete; i++) {
    const entry = entries[i];
    const cleaning$ = loadedSessionsStore
      .closeSession(entry.initializationData)
      .pipe(mapTo({ type: "cleaned-old-session" as const,
                    value: entry }),
            startWith({ type: "cleaning-old-session" as const,
                        value: entry }));
    cleaningOldSessions$.push(cleaning$);
  }
  return observableMerge(...cleaningOldSessions$);
}
