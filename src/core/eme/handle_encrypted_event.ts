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
import config from "../../config";
import { EncryptedMediaError } from "../../errors";
import log from "../../utils/log";
import createSession from "./create_session";
import { IMediaKeysInfos } from "./types";
import InitDataStore from "./utils/init_data_store";
import isSessionUsable from "./utils/is_session_usable";

export interface IHandledEncryptedEvent {
  type : "created-session" |
    "loaded-open-session" |
    "loaded-persistent-session";
  value : {
    mediaKeySession : MediaKeySession|IMediaKeySession;
    sessionType : MediaKeySessionType;
    initData : Uint8Array; // assiociated initialization data
    initDataType : string; // type of the associated initialization data
  };
}

const {
  EME_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS: MAX_SESSIONS,
} = config;

/**
 * Handle MediaEncryptedEvents sent by a HTMLMediaElement:
 * Either create a session, skip the event if it is already handled or
 * recuperate a previous session and returns it.
 * @param {Event} encryptedEvent
 * @param {Object} handledInitData
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export default function handleEncryptedEvent(
  encryptedEvent : MediaEncryptedEvent,
  handledInitData : InitDataStore,
  mediaKeysInfos : IMediaKeysInfos
) : Observable<IHandledEncryptedEvent> {
  return Observable.defer(() => {
    const {
      initDataType,
      initData,
    } = encryptedEvent;
    if (initData == null) {
      const error = new Error("no init data found on media encrypted event.");
      throw new EncryptedMediaError("INVALID_ENCRYPTED_EVENT", error, true);
    }

    const initDataBytes = new Uint8Array(initData);
    if (handledInitData.has(initDataBytes, initDataType)) {
      log.debug("init data already received. Skipping it.");
      return Observable.empty(); // Already handled, quit
    }
    handledInitData.add(initDataBytes, initDataType);

    const { sessionsStore } = mediaKeysInfos;
    const entry = sessionsStore.get(initDataBytes, initDataType);
    if (entry != null) {
      const { session: loadedSession } = entry;
      if (isSessionUsable(loadedSession)) {
        log.debug("eme: reuse loaded session", loadedSession.sessionId);
        return Observable.of({
          type: "loaded-open-session" as "loaded-open-session",
          value: {
            mediaKeySession: loadedSession,
            sessionType: entry.sessionType,
            initData: initDataBytes,
            initDataType,
          },
        });
      } else { // this session is not usable anymore. Close it and open a new one.
        sessionsStore.closeSession(loadedSession);
        if (mediaKeysInfos.sessionStorage) {
          mediaKeysInfos.sessionStorage.delete(new Uint8Array(initData), initDataType);
        }
      }
    }

    const entries = sessionsStore.getAll().slice();
    if (MAX_SESSIONS > 0 && MAX_SESSIONS <= entries.length) {
      for (let i = 0; i < (MAX_SESSIONS - entries.length + 1); i++) {
        sessionsStore.closeSession(entries[i].session);
      }
    }

    return createSession(initDataBytes, initDataType, mediaKeysInfos)
      .map((evt) => ({
        type: evt.type,
        value: {
          mediaKeySession: evt.value.mediaKeySession,
          sessionType: evt.value.sessionType,
          initData: initDataBytes,
          initDataType,
        },
      }));
  });
}
