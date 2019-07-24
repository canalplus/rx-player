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
  concat as observableConcat,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  ignoreElements,
  map,
  mergeMap,
} from "rxjs/operators";
import { ICustomMediaKeySession } from "../../compat";
import config from "../../config";
import log from "../../log";
import createSession from "./create_session";
import { IMediaKeysInfos } from "./types";
import isSessionUsable from "./utils/is_session_usable";

export interface IEncryptedEvent {
  type : string | undefined; // initialization data type
  data : Uint8Array; // initialization data
}

export interface ISessionData {
  mediaKeySession : MediaKeySession |
                    ICustomMediaKeySession;
  sessionType : MediaKeySessionType;
  initData : Uint8Array; // assiociated initialization data
  initDataType : string | // type of the associated initialization data
                 undefined;
}

// Event sent when a new session has been created
export interface ICreatedSession {
  type : "created-session";
  value : ISessionData;
}

// Event sent when an already open session is returned
export interface ILoadedOpenSession {
  type : "loaded-open-session";
  value : ISessionData;
}

// Event sent when a persistent session has been loaded
export interface ILoadedPersistentSessionEvent {
  type : "loaded-persistent-session";
  value : ISessionData;
}

export type IHandledEncryptedEvent = ICreatedSession |
                                     ILoadedOpenSession |
                                     ILoadedPersistentSessionEvent;

const { EME_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS: MAX_SESSIONS } = config;

/**
 * Handle MediaEncryptedEvents sent by a HTMLMediaElement:
 * Either create a session, recuperate a previous session and returns it or load
 * a persistent session.
 * @param {Event} encryptedEvent
 * @param {Object} handledInitData
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export default function getSession(
  encryptedEvent : IEncryptedEvent,
  mediaKeysInfos : IMediaKeysInfos
) : Observable<IHandledEncryptedEvent> {
  return observableDefer(() : Observable<IHandledEncryptedEvent> => {
    const { type: initDataType, data: initData } = encryptedEvent;

    // possible previous loaded session with the same initialization data
    let previousLoadedSession : MediaKeySession|ICustomMediaKeySession|null = null;
    const { sessionsStore } = mediaKeysInfos;
    const entry = sessionsStore.get(initData, initDataType);
    if (entry != null) {
      previousLoadedSession = entry.session;
      if (isSessionUsable(previousLoadedSession)) {
        log.debug("EME: Reuse loaded session", previousLoadedSession.sessionId);
        return observableOf({ type: "loaded-open-session" as const,
                              value: { mediaKeySession: previousLoadedSession,
                                       sessionType: entry.sessionType,
                                       initData,
                                       initDataType } });
      } else if (mediaKeysInfos.sessionStorage) {
        mediaKeysInfos.sessionStorage.delete(new Uint8Array(initData), initDataType);
      }
    }

    return (previousLoadedSession ?
      sessionsStore.deleteAndCloseSession(previousLoadedSession) :
      observableOf(null)
    ).pipe(mergeMap(() => {
      const cleaningOldSessions$ : Array<Observable<unknown>> = [];
      const entries = sessionsStore.getAll().slice();
      if (MAX_SESSIONS > 0 && MAX_SESSIONS <= entries.length) {
        for (let i = 0; i < (MAX_SESSIONS - entries.length + 1); i++) {
          cleaningOldSessions$.push(
            sessionsStore.deleteAndCloseSession(entries[i].session)
          );
        }
      }

      return observableConcat(
        observableMerge(...cleaningOldSessions$).pipe(ignoreElements()),
        createSession(initData, initDataType, mediaKeysInfos)
          .pipe(map((evt) => ({ type: evt.type,
                                value: {
                                  mediaKeySession: evt.value.mediaKeySession,
                                  sessionType: evt.value.sessionType,
                                  initData,
                                  initDataType, } })))
      );
    }));
  });
}
