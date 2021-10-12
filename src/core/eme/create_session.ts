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
  catchError,
  defer as observableDefer,
  map,
  mergeMap,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  ICustomMediaKeySession,
  loadSession,
} from "../../compat";
import log from "../../log";
import {
  IInitializationDataInfo,
  IMediaKeySessionStores,
} from "./types";
import isSessionUsable from "./utils/is_session_usable";
import LoadedSessionsStore from "./utils/loaded_sessions_store";
import PersistentSessionsStore from "./utils/persistent_sessions_store";

export interface INewSessionCreatedEvent {
  type : "created-session";
  value : { mediaKeySession : MediaKeySession |
                              ICustomMediaKeySession;
            sessionType : MediaKeySessionType; };
}

export interface IPersistentSessionRecoveryEvent {
  type : "loaded-persistent-session";
  value : { mediaKeySession : MediaKeySession |
                              ICustomMediaKeySession;
            sessionType : MediaKeySessionType; };
}

export type ICreateSessionEvent = INewSessionCreatedEvent |
                                  IPersistentSessionRecoveryEvent;

/**
 * Create a new Session on the given MediaKeys, corresponding to the given
 * initializationData.
 * If session creating fails, remove the oldest MediaKeySession loaded and
 * retry.
 *
 * /!\ This only creates new sessions.
 * It will fail if loadedSessionsStore already has a MediaKeySession with
 * the given initializationData.
 * @param {Uint8Array} initData
 * @param {string|undefined} initDataType
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export default function createSession(
  stores : IMediaKeySessionStores,
  initializationData : IInitializationDataInfo,
  wantedSessionType : MediaKeySessionType
) : Observable<ICreateSessionEvent> {
  return observableDefer(() => {
    const { loadedSessionsStore,
            persistentSessionsStore } = stores;

    if (wantedSessionType === "temporary") {
      return createTemporarySession(loadedSessionsStore, initializationData);
    } else if (persistentSessionsStore === null) {
      log.warn("EME: Cannot create persistent MediaKeySession, " +
               "PersistentSessionsStore not created.");
      return createTemporarySession(loadedSessionsStore, initializationData);
    }
    return createAndTryToRetrievePersistentSession(loadedSessionsStore,
                                                   persistentSessionsStore,
                                                   initializationData);
  });
}

/**
 * Create a new temporary MediaKeySession linked to the given initData and
 * initDataType.
 * @param {Object} loadedSessionsStore
 * @param {Object} initData
 * @returns {Observable}
 */
function createTemporarySession(
  loadedSessionsStore : LoadedSessionsStore,
  initData : IInitializationDataInfo
) : Observable<INewSessionCreatedEvent> {
  return observableDefer(() => {
    log.info("EME: Creating a new temporary session");
    const session = loadedSessionsStore.createSession(initData, "temporary");
    return observableOf({ type: "created-session" as const,
                          value: { mediaKeySession: session,
                                   sessionType: "temporary" as const } });
  });
}

/**
 * Create a persistent MediaKeySession and try to load on it a previous
 * MediaKeySession linked to the same initData and initDataType.
 * @param {Object} loadedSessionsStore
 * @param {Object} persistentSessionsStore
 * @param {Object} initData
 * @returns {Observable}
 */
function createAndTryToRetrievePersistentSession(
  loadedSessionsStore : LoadedSessionsStore,
  persistentSessionsStore : PersistentSessionsStore,
  initData : IInitializationDataInfo
) : Observable<INewSessionCreatedEvent | IPersistentSessionRecoveryEvent> {
  return observableDefer(() => {
    log.info("EME: Creating persistent MediaKeySession");

    const session = loadedSessionsStore
      .createSession(initData, "persistent-license");
    const storedEntry = persistentSessionsStore.getAndReuse(initData);

    if (storedEntry === null) {
      return observableOf({ type: "created-session" as const,
                            value: { mediaKeySession: session,
                                     sessionType: "persistent-license" as const } });
    }

    /**
     * Helper function to close and restart the current persistent session
     * considered, and re-create it from scratch.
     * @returns {Observable}
     */
    const recreatePersistentSession = () : Observable<INewSessionCreatedEvent> => {
      log.info("EME: Removing previous persistent session.");
      if (persistentSessionsStore.get(initData) !== null) {
        persistentSessionsStore.delete(initData);
      }
      return loadedSessionsStore.closeSession(initData)
        .pipe(map(() => {
          const newSession = loadedSessionsStore.createSession(initData,
                                                               "persistent-license");
          return { type: "created-session" as const,
                   value: { mediaKeySession: newSession,
                            sessionType: "persistent-license" } };
        }));
    };

    return loadSession(session, storedEntry.sessionId).pipe(
      mergeMap((hasLoadedSession) : Observable<ICreateSessionEvent> => {
        if (!hasLoadedSession) {
          log.warn("EME: No data stored for the loaded session");
          persistentSessionsStore.delete(initData);
          return observableOf({ type: "created-session" as const,
                                value: { mediaKeySession: session,
                                         sessionType: "persistent-license" } });
        }

        if (hasLoadedSession && isSessionUsable(session)) {
          persistentSessionsStore.add(initData, session);
          log.info("EME: Succeeded to load persistent session.");
          return observableOf({ type: "loaded-persistent-session" as const,
                                value: { mediaKeySession: session,
                                         sessionType: "persistent-license" } });
        }

        // Unusable persistent session: recreate a new session from scratch.
        log.warn("EME: Previous persistent session not usable anymore.");
        return recreatePersistentSession();
      }),
      catchError((err : unknown) : Observable<INewSessionCreatedEvent> => {
        log.warn("EME: Unable to load persistent session: " +
                 (err instanceof Error ? err.toString() :
                                         "Unknown Error"));
        return recreatePersistentSession();
      })
    );
  });
}
