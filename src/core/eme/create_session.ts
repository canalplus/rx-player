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

import { Observable } from "rxjs/Observable";
import { IMediaKeySession } from "../../compat";
import arrayIncludes from "../../utils/array-includes";
import assert from "../../utils/assert";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import {
  $loadedSessions,
  IMediaKeysInfos,
} from "./constants";
import isSessionUsable from "./utils/is_session_usable";

export interface ICreatedSessionEvent {
  type : "created-session";
  value : {
    mediaKeySession : MediaKeySession|IMediaKeySession;
    sessionType : MediaKeySessionType;
  };
}

export interface IPersistentSessionRecoveryEvent {
  type : "loaded-persistent-session";
  value : {
    mediaKeySession : MediaKeySession|IMediaKeySession;
    sessionType : MediaKeySessionType;
  };
}

export type IGetSessionEvent =
  ICreatedSessionEvent |
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
  session: MediaKeySession|IMediaKeySession
) : Observable<boolean> {
  return Observable.defer(() => {
    log.debug("eme: load persisted session", sessionId);
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
 * It will fail if $loadedSessions already has a MediaKeySession with
 * the given initializationData.
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export default function createSession(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<IGetSessionEvent> {
  const {
    keySystemOptions,
    keySystemAccess,
    mediaKeys,
    sessionStorage,
  } = mediaKeysInfos;

  if (mediaKeys.createSession == null) {
    throw new Error("Invalid MediaKeys implementation: Missing createSession");
  }

  const mksConfig = keySystemAccess.getConfiguration();
  const sessionTypes = mksConfig.sessionTypes;
  const hasPersistence = (
    sessionTypes && arrayIncludes(sessionTypes, "persistent-license")
  );

  // XXX TODO Should we create a "persistent-license" session if we have no
  // sessionStorage as we have no means to load the session in that case?
  const sessionType : MediaKeySessionType =
    hasPersistence &&
    sessionStorage &&
    keySystemOptions.persistentLicense ?
    "persistent-license" : "temporary";

  log.debug(`eme: create a new ${sessionType} session`);

  const session = (mediaKeys as any /* TS bug */).createSession(sessionType);
  $loadedSessions.add(initData, initDataType, session, sessionType);

  // Re-check for Dumb typescript
  if (!hasPersistence || !sessionStorage || !keySystemOptions.persistentLicense) {
    if (__DEV__) {
      assert(sessionType === "temporary");
    }
    return Observable.of({
      type: "created-session" as "created-session",
      value: { mediaKeySession: session, sessionType },
    });
  }
  if (__DEV__) {
    assert(sessionType === "persistent-license");
  }

  const storedEntry = sessionStorage.get(initData, initDataType);
  if (!storedEntry) {
    return Observable.of({
      type: "created-session" as "created-session",
      value: { mediaKeySession: session, sessionType },
    });
  }

  return loadPersistentSession(storedEntry.sessionId, session)
    .map((hasLoadedSession) => {
      if (!hasLoadedSession) {
        log.warn("eme: no data stored for the loaded session");
        sessionStorage.delete(initData, initDataType);
        return {
          type: "created-session" as "created-session",
          value: { mediaKeySession: session, sessionType },
        };
      }

      if (hasLoadedSession && isSessionUsable(session)) {
        sessionStorage.add(initData, initDataType, session);
        return {
          type: "loaded-persistent-session" as "loaded-persistent-session",
          value: { mediaKeySession: session, sessionType },
        };
      }

      // Unusable persistent session: recreate a new session from scratch.
      $loadedSessions.closeSession(session);
      sessionStorage.delete(initData, initDataType);

      const newSession =
        (mediaKeys as any /* TS bug */).createSession("persistent-license");
      $loadedSessions.add(initData, initDataType, newSession, sessionType);

      return {
        type: "created-session" as "created-session",
        value: { mediaKeySession: newSession, sessionType },
      };
    })
    .catch(() => {
      // Failure to load persistent session: recreate a new session from scratch.
      $loadedSessions.closeSession(session);
      sessionStorage.delete(initData, initDataType);

      const newSession =
        (mediaKeys as any /* TS bug */).createSession("persistent-license");
      $loadedSessions.add(initData, initDataType, newSession, sessionType);

      return Observable.of({
        type: "created-session" as "created-session",
        value: { mediaKeySession: newSession, sessionType },
      });
    });
}
