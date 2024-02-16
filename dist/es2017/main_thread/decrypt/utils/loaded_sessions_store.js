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
import { closeSession, generateKeyRequest, loadSession } from "../../../compat/eme";
import log from "../../../log";
import assert from "../../../utils/assert";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
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
    /**
     * Create a new LoadedSessionsStore, which will store information about
     * loaded MediaKeySessions on the given MediaKeys instance.
     * @param {MediaKeys} mediaKeys
     */
    constructor(mediaKeys) {
        this._mediaKeys = mediaKeys;
        this._storage = [];
    }
    /**
     * Create a new MediaKeySession and store it in this store.
     * @param {Object} initData
     * @param {string} sessionType
     * @returns {Object}
     */
    createSession(initData, sessionType) {
        const keySessionRecord = new KeySessionRecord(initData);
        log.debug("DRM-LSS: calling `createSession`", sessionType);
        const mediaKeySession = this._mediaKeys.createSession(sessionType);
        const entry = {
            mediaKeySession,
            sessionType,
            keySessionRecord,
            isGeneratingRequest: false,
            isLoadingPersistentSession: false,
            closingStatus: { type: "none" },
        };
        if (!isNullOrUndefined(mediaKeySession.closed)) {
            mediaKeySession.closed
                .then(() => {
                log.info("DRM-LSS: session was closed, removing it.", mediaKeySession.sessionId);
                const index = this.getIndex(keySessionRecord);
                if (index >= 0 && this._storage[index].mediaKeySession === mediaKeySession) {
                    this._storage.splice(index, 1);
                }
            })
                .catch((e) => {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                log.warn(`DRM-LSS: MediaKeySession.closed rejected: ${e}`);
            });
        }
        this._storage.push(Object.assign({}, entry));
        log.debug("DRM-LSS: MediaKeySession added", entry.sessionType, this._storage.length);
        return entry;
    }
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
    reuse(initializationData) {
        for (let i = this._storage.length - 1; i >= 0; i--) {
            const stored = this._storage[i];
            if (stored.keySessionRecord.isCompatibleWith(initializationData)) {
                this._storage.splice(i, 1);
                this._storage.push(stored);
                log.debug("DRM-LSS: Reusing session:", stored.mediaKeySession.sessionId, stored.sessionType);
                return Object.assign({}, stored);
            }
        }
        return null;
    }
    /**
     * Get `LoadedSessionsStore`'s entry for a given MediaKeySession.
     * Returns `null` if the given MediaKeySession is not stored in the
     * `LoadedSessionsStore`.
     * @param {MediaKeySession} mediaKeySession
     * @returns {Object|null}
     */
    getEntryForSession(mediaKeySession) {
        for (let i = this._storage.length - 1; i >= 0; i--) {
            const stored = this._storage[i];
            if (stored.mediaKeySession === mediaKeySession) {
                return Object.assign({}, stored);
            }
        }
        return null;
    }
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
    async generateLicenseRequest(mediaKeySession, initializationDataType, initializationData) {
        let entry;
        for (const stored of this._storage) {
            if (stored.mediaKeySession === mediaKeySession) {
                entry = stored;
                break;
            }
        }
        if (entry === undefined) {
            log.error("DRM-LSS: generateRequest error. No MediaKeySession found with " +
                "the given initData and initDataType");
            return generateKeyRequest(mediaKeySession, initializationDataType, initializationData);
        }
        entry.isGeneratingRequest = true;
        // Note the `as string` is needed due to TypeScript not understanding that
        // the `closingStatus` might change in the next checks
        if (entry.closingStatus.type !== "none") {
            throw new Error("The `MediaKeySession` is being closed.");
        }
        try {
            await generateKeyRequest(mediaKeySession, initializationDataType, initializationData);
        }
        catch (err) {
            if (entry === undefined) {
                throw err;
            }
            entry.isGeneratingRequest = false;
            if (entry.closingStatus.type === "awaiting") {
                entry.closingStatus.start();
            }
            throw err;
        }
        if (entry === undefined) {
            return undefined;
        }
        entry.isGeneratingRequest = false;
        if (entry.closingStatus.type === "awaiting") {
            entry.closingStatus.start();
        }
    }
    /**
     * @param {Object} mediaKeySession
     * @param {string} sessionId
     * @returns {Promise}
     */
    async loadPersistentSession(mediaKeySession, sessionId) {
        let entry;
        for (const stored of this._storage) {
            if (stored.mediaKeySession === mediaKeySession) {
                entry = stored;
                break;
            }
        }
        if (entry === undefined) {
            log.error("DRM-LSS: loadPersistentSession error. No MediaKeySession found with " +
                "the given initData and initDataType");
            return loadSession(mediaKeySession, sessionId);
        }
        entry.isLoadingPersistentSession = true;
        // Note the `as string` is needed due to TypeScript not understanding that
        // the `closingStatus` might change in the next checks
        if (entry.closingStatus.type !== "none") {
            throw new Error("The `MediaKeySession` is being closed.");
        }
        let ret;
        try {
            ret = await loadSession(mediaKeySession, sessionId);
        }
        catch (err) {
            if (entry === undefined) {
                throw err;
            }
            entry.isLoadingPersistentSession = false;
            if (entry.closingStatus.type === "awaiting") {
                entry.closingStatus.start();
            }
            throw err;
        }
        if (entry === undefined) {
            return ret;
        }
        entry.isLoadingPersistentSession = false;
        if (entry.closingStatus.type === "awaiting") {
            entry.closingStatus.start();
        }
        return ret;
    }
    /**
     * Close a MediaKeySession and remove its related stored information from the
     * `LoadedSessionsStore`.
     * Emit when done.
     * @param {Object} mediaKeySession
     * @returns {Promise}
     */
    async closeSession(mediaKeySession) {
        let entry;
        for (const stored of this._storage) {
            if (stored.mediaKeySession === mediaKeySession) {
                entry = stored;
                break;
            }
        }
        if (entry === undefined) {
            log.warn("DRM-LSS: No MediaKeySession found with " + "the given initData and initDataType");
            return Promise.resolve(false);
        }
        return this._closeEntry(entry);
    }
    /**
     * Returns the number of stored MediaKeySessions in this LoadedSessionsStore.
     * @returns {number}
     */
    getLength() {
        return this._storage.length;
    }
    /**
     * Returns information about all stored MediaKeySession, in the order in which
     * the MediaKeySession have been created.
     * @returns {Array.<Object>}
     */
    getAll() {
        return this._storage;
    }
    /**
     * Close all sessions in this store.
     * Emit `null` when done.
     * @returns {Promise}
     */
    async closeAllSessions() {
        const allEntries = this._storage;
        log.debug("DRM-LSS: Closing all current MediaKeySessions", allEntries.length);
        // re-initialize the storage, so that new interactions with the
        // `LoadedSessionsStore` do not rely on MediaKeySessions we're in the
        // process of removing
        this._storage = [];
        const closingProms = allEntries.map((entry) => this._closeEntry(entry));
        await Promise.all(closingProms);
    }
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
    removeSessionWithoutClosingIt(mediaKeySession) {
        assert(mediaKeySession.sessionId === "", "Initialized `MediaKeySession`s should always be properly closed");
        for (let i = this._storage.length - 1; i >= 0; i--) {
            const stored = this._storage[i];
            if (stored.mediaKeySession === mediaKeySession) {
                log.debug("DRM-LSS: Removing session without closing it", mediaKeySession.sessionId);
                this._storage.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    /**
     * Get the index of a stored MediaKeySession entry based on its
     * `KeySessionRecord`.
     * Returns -1 if not found.
     * @param {Object} record
     * @returns {number}
     */
    getIndex(record) {
        for (let i = 0; i < this._storage.length; i++) {
            const stored = this._storage[i];
            if (stored.keySessionRecord === record) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Prepare the closure of a `MediaKeySession` stored as an entry of the
     * `LoadedSessionsStore`.
     * Allows to postpone the closure action if another MediaKeySession action
     * is already pending.
     * @param {Object} entry
     * @returns {Promise.<boolean>}
     */
    async _closeEntry(entry) {
        const { mediaKeySession } = entry;
        return new Promise((resolve, reject) => {
            if (entry !== undefined &&
                (entry.isLoadingPersistentSession || entry.isGeneratingRequest)) {
                entry.closingStatus = {
                    type: "awaiting",
                    start: tryClosingEntryAndResolve,
                };
            }
            else {
                tryClosingEntryAndResolve();
            }
            function tryClosingEntryAndResolve() {
                if (entry !== undefined) {
                    entry.closingStatus = { type: "pending" };
                }
                safelyCloseMediaKeySession(mediaKeySession)
                    .then(() => {
                    if (entry !== undefined) {
                        entry.closingStatus = { type: "done" };
                    }
                    resolve(true);
                })
                    .catch((err) => {
                    if (entry !== undefined) {
                        entry.closingStatus = { type: "failed" };
                    }
                    reject(err);
                });
            }
        });
    }
}
/**
 * Close a MediaKeySession and just log an error if it fails (while resolving).
 * Emits then complete when done.
 * @param {MediaKeySession} mediaKeySession
 * @returns {Promise}
 */
async function safelyCloseMediaKeySession(mediaKeySession) {
    log.debug("DRM: Trying to close a MediaKeySession", mediaKeySession.sessionId);
    try {
        await closeSession(mediaKeySession);
        log.debug("DRM: Succeeded to close MediaKeySession");
        return;
    }
    catch (err) {
        log.error("DRM: Could not close MediaKeySession: " +
            (err instanceof Error ? err.toString() : "Unknown error"));
        return;
    }
}
