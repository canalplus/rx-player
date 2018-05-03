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
import arrayIncludes from "../../utils/array-includes";
import log from "../../utils/log";
import {
  $loadedSessions,
  $storedSessions,
  IMediaKeySessionInfos,
  IMediaKeysInfos,
} from "./constants";
import createSession from "./create_session";
import InitDataStore from "./init_data_store";

/**
 * If all key statuses attached to session are valid (either not
 * "expired" or "internal-error"), return true.
 * If not, return false.
 * @param {Uint8Array} initData
 * @param {MediaKeySession} loadedSession
 * @returns {MediaKeySession}
 */
export function isLoadedSessionUsable(
  loadedSession : MediaKeySession|IMediaKeySession
) : boolean {
  const keyStatusesMap = loadedSession.keyStatuses;
  const keyStatuses: string[] = [];
  keyStatusesMap.forEach((keyStatus: string) => {
    keyStatuses.push(keyStatus);
  });

  if (
    keyStatuses.length > 0 &&
    (
      !arrayIncludes(keyStatuses, "expired") &&
      !arrayIncludes(keyStatuses, "internal-error")
    )
  ) {
    log.debug("eme: reuse loaded session", loadedSession.sessionId);
    return true;
  }
  return false;
}

export interface IHandledEncryptedEvent {
  type : "created-session" |
    "loaded-open-session" |
    "loaded-persistent-session";
  value : IMediaKeySessionInfos;
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
      if (isLoadedSessionUsable(loadedSession)) {
        return Observable.of({
          type: "loaded-open-session" as "loaded-open-session",
          value: {
            keySystemAccess: mediaKeysInfos.keySystemAccess,
            keySystemOptions: mediaKeysInfos.keySystemOptions,
            mediaKeys: mediaKeysInfos.mediaKeys,
            mediaKeySession: loadedSession,
            initData: initDataBytes,
            initDataType,
          },
        });
      } else { // this session is not usable anymore. Close it and open a new one.
        $loadedSessions.closeSession(loadedSession);
        $storedSessions.delete(new Uint8Array(initData));
      }
    }

    return createSession(initDataBytes, initDataType, mediaKeysInfos)
      .map((evt) => ({
        type: evt.type,
        value: {
          keySystemAccess: mediaKeysInfos.keySystemAccess,
          keySystemOptions: mediaKeysInfos.keySystemOptions,
          mediaKeys: mediaKeysInfos.mediaKeys,
          mediaKeySession: evt.value.session,
          initData: initDataBytes,
          initDataType,
        },
      }));
  });
}
