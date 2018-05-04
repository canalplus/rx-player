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
import { EncryptedMediaError } from "../../errors";
import {
  $loadedSessions,
  IMediaKeysInfos,
} from "./constants";
import createSession from "./create_session";
import InitDataStore from "./utils/init_data_store";
import isSessionUsable from "./utils/is_session_usable";

export interface IHandledEncryptedEvent {
  type : "created-session" |
    "loaded-open-session" |
    "loaded-persistent-session";
  value : {
    mediaKeySession : MediaKeySession|IMediaKeySession;
    initData : Uint8Array; // assiociated initialization data
    initDataType : string; // type of the associated initialization data
  };
}

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
      return Observable.empty(); // Already handled, quit
    }
    handledInitData.add(initDataBytes, initDataType);

    const loadedSession = $loadedSessions.get(initDataBytes, initDataType);
    if (loadedSession != null) {
      if (isSessionUsable(loadedSession)) {
        return Observable.of({
          type: "loaded-open-session" as "loaded-open-session",
          value: {
            mediaKeySession: loadedSession,
            initData: initDataBytes,
            initDataType,
          },
        });
      } else { // this session is not usable anymore. Close it and open a new one.
        $loadedSessions.closeSession(loadedSession);
        if (mediaKeysInfos.sessionStorage) {
          mediaKeysInfos.sessionStorage.delete(new Uint8Array(initData));
        }
      }
    }

    return createSession(initDataBytes, initDataType, mediaKeysInfos)
      .map((evt) => ({
        type: evt.type,
        value: {
          mediaKeySession: evt.value.session,
          initData: initDataBytes,
          initDataType,
        },
      }));
  });
}
