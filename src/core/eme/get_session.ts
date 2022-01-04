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

import { ICustomMediaKeySession } from "../../compat";
import log from "../../log";
import { CancellationSignal } from "../../utils/task_canceller";
import cleanOldLoadedSessions, {
  ICleaningOldSessionDataPayload,
} from "./clean_old_loaded_sessions";
import createSession from "./create_session";
import {
  IInitializationDataInfo,
  IMediaKeySessionStores,
} from "./types";
import isSessionUsable from "./utils/is_session_usable";

/** Information concerning a MediaKeySession. */
export interface IMediaKeySessionContext {
  /** The MediaKeySession itself. */
  mediaKeySession : MediaKeySession |
                    ICustomMediaKeySession;
  /** The type of MediaKeySession (e.g. "temporary"). */
  sessionType : MediaKeySessionType;
  /** Initialization data assiociated to this MediaKeySession. */
  initializationData : IInitializationDataInfo;
}

/** Event emitted when a new MediaKeySession has been created. */
export interface ICreatedSession {
  type : "created-session";
  value : IMediaKeySessionContext;
}

/** Event emitted when an already-loaded MediaKeySession is used. */
export interface ILoadedOpenSession {
  type : "loaded-open-session";
  value : IMediaKeySessionContext;
}

/** Event emitted when a persistent MediaKeySession has been loaded. */
export interface ILoadedPersistentSessionEvent {
  type : "loaded-persistent-session";
  value : IMediaKeySessionContext;
}

/** Every possible result returned by `getSession`. */
export type IGetSessionResult = ICreatedSession |
                                ILoadedOpenSession |
                                ILoadedPersistentSessionEvent;

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
 * @param {Function} onCleaningSession
 * @param {Object} cancelSignal
 * @returns {Observable}
 */
export default async function getSession(
  initializationData : IInitializationDataInfo,
  stores : IMediaKeySessionStores,
  wantedSessionType : MediaKeySessionType,
  maxSessionCacheSize : number,
  onCleaningSession : (arg : ICleaningOldSessionDataPayload) => void,
  cancelSignal : CancellationSignal
) : Promise<IGetSessionResult> {
  /**
   * Store previously-loaded MediaKeySession with the same initialization data, if one.
   */
  let previousLoadedSession : MediaKeySession |
                              ICustomMediaKeySession |
                              null = null;

  const { loadedSessionsStore, persistentSessionsStore } = stores;
  const entry = loadedSessionsStore.getAndReuse(initializationData);
  if (entry !== null) {
    previousLoadedSession = entry.mediaKeySession;
    if (isSessionUsable(previousLoadedSession)) {
      log.info("EME: Reuse loaded session", previousLoadedSession.sessionId);
      return { type: "loaded-open-session" as const,
               value: { mediaKeySession: previousLoadedSession,
                        sessionType: entry.sessionType,
                        initializationData } };
    } else if (persistentSessionsStore !== null) {
      // If the session is not usable anymore, we can also remove it from the
      // PersistentSessionsStore.
      // TODO Are we sure this is always what we want?
      persistentSessionsStore.delete(initializationData);
    }
  }

  if (previousLoadedSession) {
    await loadedSessionsStore.closeSession(initializationData);
    if (cancelSignal.cancellationError !== null) {
      throw cancelSignal.cancellationError; // stop here if cancelled since
    }
  }

  await cleanOldLoadedSessions(loadedSessionsStore,
                               maxSessionCacheSize,
                               onCleaningSession);
  if (cancelSignal.cancellationError !== null) {
    throw cancelSignal.cancellationError; // stop here if cancelled since
  }

  const evt = await createSession(stores, initializationData, wantedSessionType);
  return { type: evt.type,
           value: { mediaKeySession: evt.value.mediaKeySession,
                    sessionType: evt.value.sessionType,
                    initializationData } };
}
