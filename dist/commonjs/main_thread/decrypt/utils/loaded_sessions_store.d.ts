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
import type { ICustomMediaKeys, ICustomMediaKeySession } from "../../../compat/eme";
import type { IProcessedProtectionData } from "../types";
import KeySessionRecord from "./key_session_record";
/**
 * Create and store MediaKeySessions linked to a single MediaKeys
 * instance.
 *
 * Keep track of sessionTypes and of the initialization data each
 * MediaKeySession is created for.
 * @class LoadedSessionsStore
 */
export default class LoadedSessionsStore {
    /** MediaKeys instance on which the MediaKeySessions are created. */
    private readonly _mediaKeys;
    /** Store unique MediaKeySession information per initialization data. */
    private _storage;
    /**
     * Create a new LoadedSessionsStore, which will store information about
     * loaded MediaKeySessions on the given MediaKeys instance.
     * @param {MediaKeys} mediaKeys
     */
    constructor(mediaKeys: MediaKeys | ICustomMediaKeys);
    /**
     * Create a new MediaKeySession and store it in this store.
     * @param {Object} initData
     * @param {string} sessionType
     * @returns {Object}
     */
    createSession(initData: IProcessedProtectionData, sessionType: MediaKeySessionType): IStoredSessionEntry;
    /**
     * Find a stored entry compatible with the initialization data given and moves
     * this entry at the end of the `LoadedSessionsStore`''s storage, returned by
     * its `getAll` method.
     *
     * This can be used for example to tell when a previously-stored
     * entry is re-used to then be able to implement a caching replacement
     * algorithm based on the least-recently-used values by just evicting the first
     * values returned by `getAll`.
     * @param {Object} initializationData
     * @returns {Object|null}
     */
    reuse(initializationData: IProcessedProtectionData): IStoredSessionEntry | null;
    /**
     * Get `LoadedSessionsStore`'s entry for a given MediaKeySession.
     * Returns `null` if the given MediaKeySession is not stored in the
     * `LoadedSessionsStore`.
     * @param {MediaKeySession} mediaKeySession
     * @returns {Object|null}
     */
    getEntryForSession(mediaKeySession: MediaKeySession | ICustomMediaKeySession): IStoredSessionEntry | null;
    /**
     * Generate a license request on the given MediaKeySession, while indicating
     * to the LoadedSessionsStore that a license-request is pending so
     * session-closing orders are properly scheduled after it is done.
     * @param {Object} mediaKeySession
     * @param {string} initializationDataType - Initialization data type given
     * e.g. by the "encrypted" event for the corresponding request.
     * @param {Uint8Array} initializationData - Initialization data given e.g. by
     * the "encrypted" event for the corresponding request.
     * @returns {Promise}
     */
    generateLicenseRequest(mediaKeySession: MediaKeySession | ICustomMediaKeySession, initializationDataType: string | undefined, initializationData: Uint8Array): Promise<unknown>;
    /**
     * @param {Object} mediaKeySession
     * @param {string} sessionId
     * @returns {Promise}
     */
    loadPersistentSession(mediaKeySession: MediaKeySession | ICustomMediaKeySession, sessionId: string): Promise<boolean>;
    /**
     * Close a MediaKeySession and remove its related stored information from the
     * `LoadedSessionsStore`.
     * Emit when done.
     * @param {Object} mediaKeySession
     * @returns {Promise}
     */
    closeSession(mediaKeySession: MediaKeySession | ICustomMediaKeySession): Promise<boolean>;
    /**
     * Returns the number of stored MediaKeySessions in this LoadedSessionsStore.
     * @returns {number}
     */
    getLength(): number;
    /**
     * Returns information about all stored MediaKeySession, in the order in which
     * the MediaKeySession have been created.
     * @returns {Array.<Object>}
     */
    getAll(): IStoredSessionEntry[];
    /**
     * Close all sessions in this store.
     * Emit `null` when done.
     * @returns {Promise}
     */
    closeAllSessions(): Promise<void>;
    /**
     * Find the given `MediaKeySession` in the `LoadedSessionsStore` and removes
     * any reference to it without actually closing it.
     *
     * Returns `true` if the given `mediaKeySession` has been found and removed,
     * `false` otherwise.
     *
     * Note that this may create a `MediaKeySession` leakage in the wrong
     * conditions, cases where this method should be called should be very
     * carefully evaluated.
     * @param {MediaKeySession} mediaKeySession
     * @returns {boolean}
     */
    removeSessionWithoutClosingIt(mediaKeySession: MediaKeySession | ICustomMediaKeySession): boolean;
    /**
     * Get the index of a stored MediaKeySession entry based on its
     * `KeySessionRecord`.
     * Returns -1 if not found.
     * @param {Object} record
     * @returns {number}
     */
    private getIndex;
    /**
     * Prepare the closure of a `MediaKeySession` stored as an entry of the
     * `LoadedSessionsStore`.
     * Allows to postpone the closure action if another MediaKeySession action
     * is already pending.
     * @param {Object} entry
     * @returns {Promise.<boolean>}
     */
    private _closeEntry;
}
/** Information linked to a `MediaKeySession` created by the `LoadedSessionsStore`. */
export interface IStoredSessionEntry {
    /**
     * The `KeySessionRecord` linked to the MediaKeySession.
     * It keeps track of all key ids that are currently known to be associated to
     * the MediaKeySession.
     *
     * Initially only assiociated with the initialization data given, you may want
     * to add to it other key ids if you find out that there are also linked to
     * that session.
     *
     * Regrouping all those key ids into the `KeySessionRecord` in that way allows
     * the `LoadedSessionsStore` to perform compatibility checks when future
     * initialization data is encountered.
     */
    keySessionRecord: KeySessionRecord;
    /** The MediaKeySession created. */
    mediaKeySession: MediaKeySession | ICustomMediaKeySession;
    /**
     * The MediaKeySessionType (e.g. "temporary" or "persistent-license") with
     * which the MediaKeySession was created.
     */
    sessionType: MediaKeySessionType;
    /**
     * Set to `true` while a `generateRequest` call is pending.
     * This information might be useful as it is one of the operation we have to
     * wait for before closing a MediaKeySession.
     */
    isGeneratingRequest: boolean;
    /**
     * Set to `true` while a `load` call is pending.
     * This information might be useful as it is one of the operation we have to
     * wait for before closing a MediaKeySession.
     */
    isLoadingPersistentSession: boolean;
    /**
     * The status of a potential `MediaKeySession`'s close request.
     * Closing a MediaKeySession could be made complex as it normally cannot
     * happen until `generateRequest` or `load` has been called.
     *
     * To avoid problems while still staying compatible to the most devices
     * possible - which may have strange implementation of the specification -
     * we're adding the `closingStatus` property allowing to perform multiple
     * type of interaction while a close operation is either pending or is
     * awaited.
     */
    closingStatus: {
        type: "pending";
    }
    /** Status when the MediaKeySession has been closed. */
     | {
        type: "done";
    }
    /** Status when the MediaKeySession failed to close. */
     | {
        type: "failed";
    }
    /**
     * Status when a close order has been received for this MediaKeySession
     * while some sensitive operation (examples are `generateRequest` and `load`
     * calls).
     * The `LoadedSessionsStore` should call `start` once it has finished those
     * operations.
     */
     | {
        type: "awaiting";
        start: () => void;
    }
    /** Status when the MediaKeySession failed to close. */
     | {
        type: "none";
    };
}
//# sourceMappingURL=loaded_sessions_store.d.ts.map