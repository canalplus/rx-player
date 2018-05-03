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
} from "../../compat";
import { ErrorCodes } from "../../errors";
import arrayIncludes from "../../utils/array-includes";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import {
  $loadedSessions,
  $storedSessions,
  IMediaKeysInfos,
} from "./constants";

export interface ICreatedSessionEvent {
  type : "created-session";
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
  IPersistentSessionRecoveryEvent;

/**
 * If session creating fails, retry once session creation/loading.
 * @param initData
 * @param initDataType
 * @param mediaKeysInfos
 * @returns {Observable}
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
 */
function createSession(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<IGetSessionEvent> {

  const {
    keySystemOptions,
    keySystemAccess,
    mediaKeys,
  } = mediaKeysInfos;
  if (mediaKeys.createSession == null) {
    throw new Error("Invalid MediaKeys implementation: Missing createSession");
  }

  const mksConfig = keySystemAccess.getConfiguration();
  const sessionTypes = mksConfig.sessionTypes;
  const hasPersistence = (
    sessionTypes && arrayIncludes(sessionTypes, "persistent-license")
  );
  const sessionType = hasPersistence && keySystemOptions.persistentLicense ?
    "persistent-license" : "temporary";

  log.debug(`eme: create a new ${sessionType} session`);

  // TODO TS bug? I don't get the problem here.
  const session : IMediaKeySession|MediaKeySession =
    (mediaKeys as any).createSession(sessionType);

  $loadedSessions.add(initData, initDataType, session);

  if (hasPersistence && keySystemOptions.persistentLicense) {
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
export default function createSessionWithRetry(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<IGetSessionEvent> {
  return createSession(initData, initDataType, mediaKeysInfos)
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
          return createSession(initData, initDataType, mediaKeysInfos);
        });
    });
}
