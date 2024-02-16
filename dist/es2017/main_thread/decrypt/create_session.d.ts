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
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IProcessedProtectionData, IMediaKeySessionStores } from "./types";
import { MediaKeySessionLoadingType } from "./types";
import type KeySessionRecord from "./utils/key_session_record";
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
export default function createSession(stores: IMediaKeySessionStores, initData: IProcessedProtectionData, wantedSessionType: MediaKeySessionType, cancelSignal: CancellationSignal): Promise<ICreateSessionEvent>;
export interface INewSessionCreatedEvent {
    type: MediaKeySessionLoadingType.Created;
    value: {
        mediaKeySession: MediaKeySession | ICustomMediaKeySession;
        sessionType: MediaKeySessionType;
        keySessionRecord: KeySessionRecord;
    };
}
export interface IPersistentSessionRecoveryEvent {
    type: MediaKeySessionLoadingType.LoadedPersistentSession;
    value: {
        mediaKeySession: MediaKeySession | ICustomMediaKeySession;
        sessionType: MediaKeySessionType;
        keySessionRecord: KeySessionRecord;
    };
}
export type ICreateSessionEvent = INewSessionCreatedEvent | IPersistentSessionRecoveryEvent;
