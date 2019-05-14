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
  defer as observableDefer,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
} from "rxjs/operators";
import { ICustomMediaKeySession } from "../../compat";
import log from "../../log";
import arrayIncludes from "../../utils/array_includes";
import castToObservable from "../../utils/cast_to_observable";
import { IMediaKeysInfos } from "./types";
// import isSessionUsable from "./utils/is_session_usable";

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
 * If session creating fails, retry once session creation/loading.
 * Emit true, if it has succeeded to load, false if there is no data for the
 * given sessionId.
 * @param {string} sessionId
 * @param {MediaKeySession} session
 * @returns {Observable}
 */
function loadPersistentSession(
  sessionId: string,
  session: MediaKeySession|ICustomMediaKeySession
) : Observable<boolean> {
  return observableDefer(() => {
    log.debug("EME: Load persisted session", sessionId);
    return castToObservable(session.load(sessionId));
  });
}

/**
 * Create a new Session on the given MediaKeys, corresponding to the given
 * initializationData.
 * If session creating fails, remove the oldest MediaKeySession loaded and
 * retry.
 *
 * /!\ This only creates new sessions.
 * It will fail if sessionsStore already has a MediaKeySession with
 * the given initializationData.
 * @param {Uint8Array} initData
 * @param {string|undefined} initDataType
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export default function createSession(
  initData: Uint8Array,
  initDataType: string|undefined,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<ICreateSessionEvent> {
  return observableDefer(() => {
    const { keySystemOptions,
            mediaKeySystemAccess,
            sessionsStore,
            sessionStorage } = mediaKeysInfos;

    const mksConfig = mediaKeySystemAccess.getConfiguration();
    const sessionTypes = mksConfig.sessionTypes;
    const hasPersistence = sessionTypes &&
                           arrayIncludes(sessionTypes, "persistent-license");

    const sessionType : MediaKeySessionType = hasPersistence &&
                                              sessionStorage &&
                                              keySystemOptions.persistentLicense ?
                                                "persistent-license" :
                                                "temporary";

    log.debug(`EME: Create a new ${sessionType} session`);

    const session = sessionsStore.createSession(initData, initDataType, sessionType);

    // Re-check for Dumb typescript. Equivalent to `sessionType === "temporary"`.
    if (!hasPersistence || !sessionStorage || !keySystemOptions.persistentLicense) {
      return observableOf({ type: "created-session" as "created-session",
                            value: { mediaKeySession: session, sessionType } });
    }

    const storedEntry = sessionStorage.get(initData, initDataType);
    if (!storedEntry) {
      return observableOf({ type: "created-session" as "created-session",
                            value: { mediaKeySession: session, sessionType } });
    }

    /**
     * Helper function to close and restart the current persistent session
     * considered, and re-create it from scratch.
     * @returns {Observable}
     */
    const recreatePersistentSession = () : Observable<INewSessionCreatedEvent> => {
      log.info("EME: Removing previous persistent session.");
      if (sessionStorage.get(initData, initDataType) !== null) {
        sessionStorage.delete(initData, initDataType);
      }
      return sessionsStore.deleteAndCloseSession(session)
        .pipe(map(() => {
          const newSession = sessionsStore.createSession(initData,
                                                         initDataType,
                                                         sessionType);
          return { type: "created-session" as "created-session",
                   value: { mediaKeySession: newSession, sessionType } };
        }));
    };

    return loadPersistentSession(storedEntry.sessionId, session).pipe(
      mergeMap((hasLoadedSession) : Observable<ICreateSessionEvent> => {
        if (!hasLoadedSession) {
          log.warn("EME: No data stored for the loaded session");
          sessionStorage.delete(initData, initDataType);
          return observableOf({ type: "created-session" as "created-session",
                                value: { mediaKeySession: session, sessionType } });
        }

        // TODO From our tests, we only get empty MediaKeyStatusesMap.
        // Find out if that's normal, and if we can bring back to life an
        // expired or internal-errored session.
        // If both are true, we can safely remove that part.
        // if (!isSessionUsable(session)) {
        //   // Unusable persistent session: recreate a new session from scratch.
        //   log.warn("EME: Previous persistent session not usable anymore.");
        //   return recreatePersistentSession();
        // }

        sessionStorage.add(initData, initDataType, session);
        log.info("EME: Succeeded to load persistent session.");
        return observableOf({ type: "loaded-persistent-session" as const,
                              value: { mediaKeySession: session, sessionType } });
      }),
      catchError(() : Observable<INewSessionCreatedEvent> => {
        log.warn("EME: Unable to load persistent session.");
        return recreatePersistentSession();
      })
    );
  });
}
