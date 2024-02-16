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
import type { ICustomMediaKeySession } from "../../../compat/eme";
import type { IPersistentLicenseConfig, IPersistentSessionInfo } from "../../../public_types";
import type { IProcessedProtectionData } from "../types";
/**
 * Set representing persisted licenses. Depends on a simple
 * implementation with a `save`/`load` synchronous interface
 * to persist information on persisted sessions.
 *
 * This set is used only for a cdm/keysystem with license persistency
 * supported.
 * @class PersistentSessionsStore
 */
export default class PersistentSessionsStore {
    private readonly _storage;
    private _entries;
    /**
     * Create a new PersistentSessionsStore.
     * @param {Object} storage
     */
    constructor(storage: IPersistentLicenseConfig);
    /**
     * Returns the number of stored values.
     * @returns {number}
     */
    getLength(): number;
    /**
     * Returns information about all stored MediaKeySession, in the order in which
     * the MediaKeySession have been created.
     * @returns {Array.<Object>}
     */
    getAll(): IPersistentSessionInfo[];
    /**
     * Retrieve an entry based on its initialization data.
     * @param {Object}  initData
     * @param {string|undefined} initDataType
     * @returns {Object|null}
     */
    get(initData: IProcessedProtectionData): IPersistentSessionInfo | null;
    /**
     * Like `get`, but also move the corresponding value at the end of the store
     * (as returned by `getAll`) if found.
     * This can be used for example to tell when a previously-stored value is
     * re-used to then be able to implement a caching replacement algorithm based
     * on the least-recently-used values by just evicting the first values
     * returned by `getAll`.
     * @param {Uint8Array} initData
     * @param {string|undefined} initDataType
     * @returns {*}
     */
    getAndReuse(initData: IProcessedProtectionData): IPersistentSessionInfo | null;
    /**
     * Add a new entry in the PersistentSessionsStore.
     * @param {Uint8Array}  initData
     * @param {string|undefined} initDataType
     * @param {MediaKeySession} session
     */
    add(initData: IProcessedProtectionData, keyIds: Uint8Array[] | undefined, session: MediaKeySession | ICustomMediaKeySession): void;
    /**
     * Delete stored MediaKeySession information based on its session id.
     * @param {string} sessionId
     */
    delete(sessionId: string): void;
    deleteOldSessions(sessionsToDelete: number): void;
    /**
     * Delete all saved entries.
     */
    dispose(): void;
    /**
     * Retrieve index of an entry.
     * Returns `-1` if not found.
     * @param {Object} initData
     * @returns {number}
     */
    private _getIndex;
    /**
     * Use the given storage to store the current entries.
     */
    private _save;
}
