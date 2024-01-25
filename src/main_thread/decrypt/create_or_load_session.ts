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

import type { ICustomMediaKeySession } from "../../compat/eme";
import log from "../../log";
import type { CancellationSignal } from "../../utils/task_canceller";
import createSession from "./create_session";
import type {
  IProcessedProtectionData,
  IMediaKeySessionStores } from "./types";
import {
  MediaKeySessionLoadingType,
} from "./types";
import cleanOldLoadedSessions from "./utils/clean_old_loaded_sessions";
import isSessionUsable from "./utils/is_session_usable";
import type KeySessionRecord from "./utils/key_session_record";

/**
 * Handle MediaEncryptedEvents sent by a HTMLMediaElement:
 * Either create a MediaKeySession, recuperate a previous MediaKeySession or
 * load a persistent session.
 *
 * Some previously created MediaKeySession can be closed in this process to
 * respect the maximum limit of concurrent MediaKeySession, as defined by the
 * `EME_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS` config property.
 *
 * You can refer to the events emitted to know about the current situation.
 * @param {Object} initializationData
 * @param {Object} stores
 * @param {string} wantedSessionType
 * @param {number} maxSessionCacheSize
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default async function createOrLoadSession(
  initializationData : IProcessedProtectionData,
  stores : IMediaKeySessionStores,
  wantedSessionType : MediaKeySessionType,
  maxSessionCacheSize : number,
  cancelSignal : CancellationSignal
) : Promise<ICreateOrLoadSessionResult> {
  /** Store previously-loaded compatible MediaKeySession, if one. */
  let previousLoadedSession : MediaKeySession |
                              ICustomMediaKeySession |
                              null = null;

  const { loadedSessionsStore, persistentSessionsStore } = stores;
  const entry = loadedSessionsStore.reuse(initializationData);
  if (entry !== null) {
    previousLoadedSession = entry.mediaKeySession;
    if (isSessionUsable(previousLoadedSession)) {
      log.info("DRM: Reuse loaded session", previousLoadedSession.sessionId);
      return { type: MediaKeySessionLoadingType.LoadedOpenSession,
               value: { mediaKeySession: previousLoadedSession,
                        sessionType: entry.sessionType,
                        keySessionRecord: entry.keySessionRecord } };
    } else if (persistentSessionsStore !== null) {
      // If the session is not usable anymore, we can also remove it from the
      // PersistentSessionsStore.
      // TODO Are we sure this is always what we want?
      if (entry.mediaKeySession.sessionId !== "") {
        persistentSessionsStore.delete(entry.mediaKeySession.sessionId);
      }
    }
  }

  if (previousLoadedSession !== null) {
    await loadedSessionsStore.closeSession(previousLoadedSession);
    if (cancelSignal.cancellationError !== null) {
      throw cancelSignal.cancellationError; // stop here if cancelled since
    }
  }

  await cleanOldLoadedSessions(loadedSessionsStore, maxSessionCacheSize);
  if (cancelSignal.cancellationError !== null) {
    throw cancelSignal.cancellationError; // stop here if cancelled since
  }

  const evt = await createSession(stores,
                                  initializationData,
                                  wantedSessionType,
                                  cancelSignal);
  return { type: evt.type,
           value: { mediaKeySession: evt.value.mediaKeySession,
                    sessionType: evt.value.sessionType,
                    keySessionRecord: evt.value.keySessionRecord } };
}

/** Information concerning a MediaKeySession. */
export interface IMediaKeySessionContext {
  /** The MediaKeySession itself. */
  mediaKeySession : MediaKeySession |
                    ICustomMediaKeySession;
  /** The type of MediaKeySession (e.g. "temporary"). */
  sessionType : MediaKeySessionType;
  /** `KeySessionRecord` assiociated to this MediaKeySession. */
  keySessionRecord : KeySessionRecord;
}

/** Event emitted when a new MediaKeySession has been created. */
export interface ICreatedSession {
  type : MediaKeySessionLoadingType.Created;
  value : IMediaKeySessionContext;
}

/** Event emitted when an already-loaded MediaKeySession is used. */
export interface ILoadedOpenSession {
  type : MediaKeySessionLoadingType.LoadedOpenSession;
  value : IMediaKeySessionContext;
}

/** Event emitted when a persistent MediaKeySession has been loaded. */
export interface ILoadedPersistentSessionEvent {
  type : MediaKeySessionLoadingType.LoadedPersistentSession;
  value : IMediaKeySessionContext;
}

/** Every possible result returned by `createOrLoadSession`. */
export type ICreateOrLoadSessionResult = ICreatedSession |
                                         ILoadedOpenSession |
                                         ILoadedPersistentSessionEvent;
