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
import {
  IMediaKeySession,
  IMockMediaKeys,
} from "../../compat";
import { ErrorCodes } from "../../errors";
import arrayIncludes from "../../utils/array-includes";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import { IKeySystemAccessInfos } from "./find_key_system";
import {
  $loadedSessions,
  $storedSessions,
} from "./globals";

export interface IMediaKeysInfos extends IKeySystemAccessInfos {
  mediaKeys : MediaKeys|IMockMediaKeys;
}

export interface ICreatedSessionEvent {
  type : "created-session";
  value : {
    session : MediaKeySession|IMediaKeySession;
  };
}

export interface ILoadedSessionRecoveryEvent {
  type : "reuse-loaded-session";
  value : {
    session : MediaKeySession|IMediaKeySession;
  };
}

export interface IPersistentSessionRecoveryEvent {
  type : "loaded-persistent-session";
  value : {
    session : MediaKeySession|IMediaKeySession;
  };
}

export type IGetSessionEvent =
  ICreatedSessionEvent |
  ILoadedSessionRecoveryEvent |
  IPersistentSessionRecoveryEvent;

/**
 * Create MediaKeySession and cache loaded session.
 * @param {MediaKeys} mediaKeys
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {UInt8Array} initData
 * @returns {Observable}
 */
function createSession(
  mediaKeys: IMockMediaKeys|MediaKeys,
  sessionType: MediaKeySessionType,
  initData: Uint8Array,
  initDataType: string
) : Observable<IMediaKeySession|MediaKeySession> {
  log.debug(`eme: create a new ${sessionType} session`);
  if (mediaKeys.createSession == null) {
    throw new Error("Invalid MediaKeys implementation: Missing createSession");
  }

  // TODO TS bug? I don't get the problem here.
  const session : IMediaKeySession|MediaKeySession =
    (mediaKeys as any).createSession(sessionType);

  $loadedSessions.add(initData, initDataType, session);
  return Observable.of(session);
}

/**
 * Load persistent session from stored session id.
 * If loading fails, delete persistent session from cache.
 * If loading succeed, update cache with new session.
 * @param {string} storedSessionId
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {MediaKeySession} session
 */
function loadPersistentSession(
  storedSessionId: string,
  initData: Uint8Array,
  initDataType: string,
  session: MediaKeySession|IMediaKeySession
) : Observable<IGetSessionEvent> {
  log.debug("eme: load persisted session", storedSessionId);

  return castToObservable(session.load(storedSessionId))
    .catch((error) => {
      log.warn("eme: no data stored for the loaded session.",
        storedSessionId);

      const loadedSession = $loadedSessions.get(initData, initDataType);
      if (loadedSession != null) {
        $loadedSessions.closeSession(loadedSession);
      }
      $storedSessions.delete(initData);

      throw error;
    })
    .map((success) => {
      if (success) {
        $loadedSessions.add(initData, initDataType, session);
        return {
          type: "loaded-persistent-session" as "loaded-persistent-session",
          value: { session },
        };
      } else {
        return {
          type: "created-session" as "created-session",
          value: { session },
        };
      }
    }).do(() => $storedSessions.add(initData, session));
}

/**
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
function createOrReuseSession(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<IGetSessionEvent> {
  const loadedSession = $loadedSessions.get(initData, initDataType);

  if (loadedSession) {
    const keyStatusesMap = loadedSession.keyStatuses;
    const keyStatuses: string[] = [];
    keyStatusesMap.forEach((keyStatus: string) => {
      keyStatuses.push(keyStatus);
    });

    // XXX TODO Should probably do that not here, as we could close a session
    // which is currently being dealt with, in which case we do not want to
    // close it.
    if (
      keyStatuses.length > 0 &&
      (
        !arrayIncludes(keyStatuses, "expired") &&
        !arrayIncludes(keyStatuses, "internal-error")
      )
    ) {
      log.debug("eme: reuse loaded session", loadedSession.sessionId);
      return Observable.of({
        type: "reuse-loaded-session" as "reuse-loaded-session",
        value: { session: loadedSession },
      });
    }

    // else, trash this session
    $loadedSessions.closeSession(loadedSession);
    $storedSessions.delete(initData);
  }

  const {
    keySystem,
    keySystemAccess,
    mediaKeys,
  } = mediaKeysInfos;
  const mksConfig = keySystemAccess.getConfiguration();
  const sessionTypes = mksConfig.sessionTypes;
  const hasPersistence = (
    sessionTypes && arrayIncludes(sessionTypes, "persistent-license")
  );

  const sessionType = hasPersistence && keySystem.persistentLicense ?
    "persistent-license" : "temporary";

  return createSession(mediaKeys, sessionType, initData, initDataType)
    .mergeMap((session) => {
      if (hasPersistence && keySystem.persistentLicense) {
        // if a persisted session exists in the store associated to this initData,
        // we reuse it without a new license request through the `load` method.
        const storedEntry = $storedSessions.get(initData);
        if (storedEntry) {
          return loadPersistentSession(
            storedEntry.sessionId, initData, initDataType, session
          );
        }
      }
      return Observable.of({
        type: "created-session" as "created-session",
        value: { session },
      });
    });
}

/**
 * If session creating fails, retry once session creation/reuse.
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export default function createOrReuseSessionWithRetry(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<IGetSessionEvent> {
  return createOrReuseSession(initData, initDataType, mediaKeysInfos)
    .catch((error) => {
      if (error.code !== ErrorCodes.KEY_GENERATE_REQUEST_ERROR) {
        throw error;
      }

      const loadedSessions = $loadedSessions.getSessions();
      if (!loadedSessions.length) {
        throw error;
      }

      log.warn("eme: could not create a new session, " +
        "retry after closing a currently loaded session", error);

      return $loadedSessions.closeSession(loadedSessions[0])
        .mergeMap(() => {
          return createOrReuseSession(initData, initDataType, mediaKeysInfos);
        });
    });
}
