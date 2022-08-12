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

import log from "../../../common/log";
import { CancellationSignal } from "../../../common/utils/task_canceller";
import { ICustomMediaKeySession } from "../../compat";
import {
  IProcessedProtectionData,
  IMediaKeySessionStores,
  MediaKeySessionLoadingType,
} from "./types";
import isSessionUsable from "./utils/is_session_usable";
import KeySessionRecord from "./utils/key_session_record";
import LoadedSessionsStore from "./utils/loaded_sessions_store";
import PersistentSessionsStore from "./utils/persistent_sessions_store";

/**
 * Create a new Session or load a persistent one on the given MediaKeys,
 * according to wanted settings and what is currently stored.
 *
 * If session creating fails, remove the oldest MediaKeySession loaded and
 * retry.
 *
 * /!\ This only creates new sessions.
 * It will fail if loadedSessionsStore already has a MediaKeySession with
 * the given initialization data.
 * @param {Object} stores
 * @param {Object} initData
 * @param {string} wantedSessionType
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default function createSession(
  stores : IMediaKeySessionStores,
  initData : IProcessedProtectionData,
  wantedSessionType : MediaKeySessionType,
  cancelSignal : CancellationSignal
) : Promise<ICreateSessionEvent> {
  const { loadedSessionsStore,
          persistentSessionsStore } = stores;

  if (wantedSessionType === "temporary") {
    return createTemporarySession(loadedSessionsStore, initData);
  } else if (persistentSessionsStore === null) {
    log.warn("DRM: Cannot create persistent MediaKeySession, " +
             "PersistentSessionsStore not created.");
    return createTemporarySession(loadedSessionsStore, initData);
  }
  return createAndTryToRetrievePersistentSession(loadedSessionsStore,
                                                 persistentSessionsStore,
                                                 initData,
                                                 cancelSignal);
}

/**
 * Create a new temporary MediaKeySession linked to the given initData and
 * initDataType.
 * @param {Object} loadedSessionsStore
 * @param {Object} initData
 * @returns {Promise}
 */
function createTemporarySession(
  loadedSessionsStore : LoadedSessionsStore,
  initData : IProcessedProtectionData
) : Promise<INewSessionCreatedEvent> {
  log.info("DRM: Creating a new temporary session");
  const entry = loadedSessionsStore.createSession(initData, "temporary");
  return Promise.resolve({ type: MediaKeySessionLoadingType.Created,
                           value: entry });
}

/**
 * Create a persistent MediaKeySession and try to load on it a previous
 * MediaKeySession linked to the same initialization data.
 * @param {Object} loadedSessionsStore
 * @param {Object} persistentSessionsStore
 * @param {Object} initData
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
async function createAndTryToRetrievePersistentSession(
  loadedSessionsStore : LoadedSessionsStore,
  persistentSessionsStore : PersistentSessionsStore,
  initData : IProcessedProtectionData,
  cancelSignal : CancellationSignal
) : Promise<INewSessionCreatedEvent | IPersistentSessionRecoveryEvent> {
  if (cancelSignal.cancellationError !== null) {
    throw cancelSignal.cancellationError;
  }
  log.info("DRM: Creating persistent MediaKeySession");

  const entry = loadedSessionsStore.createSession(initData, "persistent-license");
  const storedEntry = persistentSessionsStore.getAndReuse(initData);
  if (storedEntry === null) {
    return { type: MediaKeySessionLoadingType.Created,
             value: entry };
  }

  try {
    const hasLoadedSession = await loadedSessionsStore.loadPersistentSession(
      entry.mediaKeySession,
      storedEntry.sessionId
    );
    if (!hasLoadedSession) {
      log.warn("DRM: No data stored for the loaded session");
      persistentSessionsStore.delete(storedEntry.sessionId);
      return { type: MediaKeySessionLoadingType.Created,
               value: entry };
    }

    if (hasLoadedSession && isSessionUsable(entry.mediaKeySession)) {
      persistentSessionsStore.add(initData, initData.keyIds, entry.mediaKeySession);
      log.info("DRM: Succeeded to load persistent session.");
      return { type: MediaKeySessionLoadingType.LoadedPersistentSession,
               value: entry };
    }

    // Unusable persistent session: recreate a new session from scratch.
    log.warn("DRM: Previous persistent session not usable anymore.");
    return recreatePersistentSession();
  } catch (err) {
    log.warn("DRM: Unable to load persistent session: " +
             (err instanceof Error ? err.toString() :
                                     "Unknown Error"));
    return recreatePersistentSession();
  }

  /**
   * Helper function to close and restart the current persistent session
   * considered, and re-create it from scratch.
   * @returns {Observable}
   */
  async function recreatePersistentSession() : Promise<INewSessionCreatedEvent> {
    if (cancelSignal.cancellationError !== null) {
      throw cancelSignal.cancellationError;
    }
    log.info("DRM: Removing previous persistent session.");
    const persistentEntry = persistentSessionsStore.get(initData);
    if (persistentEntry !== null) {
      persistentSessionsStore.delete(persistentEntry.sessionId);
    }

    await loadedSessionsStore.closeSession(entry.mediaKeySession);
    if (cancelSignal.cancellationError !== null) {
      throw cancelSignal.cancellationError;
    }
    const newEntry = loadedSessionsStore.createSession(initData,
                                                       "persistent-license");
    return { type: MediaKeySessionLoadingType.Created,
             value: newEntry };
  }
}

export interface INewSessionCreatedEvent {
  type : MediaKeySessionLoadingType.Created;
  value : {
    mediaKeySession : MediaKeySession |
                      ICustomMediaKeySession;
    sessionType : MediaKeySessionType;
    keySessionRecord : KeySessionRecord;
  };
}

export interface IPersistentSessionRecoveryEvent {
  type : MediaKeySessionLoadingType.LoadedPersistentSession;
  value : {
    mediaKeySession : MediaKeySession |
                      ICustomMediaKeySession;
    sessionType : MediaKeySessionType;
    keySessionRecord : KeySessionRecord;
  };
}

export type ICreateSessionEvent = INewSessionCreatedEvent |
                                  IPersistentSessionRecoveryEvent;
