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

import {
  closeSession,
  generateKeyRequest,
  ICustomMediaKeys,
  ICustomMediaKeySession,
  loadSession,
} from "../../../compat";
import log from "../../../../common/log";
import isNullOrUndefined from "../../../../common/utils/is_null_or_undefined";
import { IProcessedProtectionData } from "../types";
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
  private readonly _mediaKeys : MediaKeys|ICustomMediaKeys;

  /** Store unique MediaKeySession information per initialization data. */
  private _storage : IStoredSessionEntry[];

  /**
   * Create a new LoadedSessionsStore, which will store information about
   * loaded MediaKeySessions on the given MediaKeys instance.
   * @param {MediaKeys} mediaKeys
   */
  constructor(mediaKeys : MediaKeys|ICustomMediaKeys) {
    this._mediaKeys = mediaKeys;
    this._storage = [];
  }

  /**
   * Create a new MediaKeySession and store it in this store.
   * @param {Object} initData
   * @param {string} sessionType
   * @returns {Object}
   */
  public createSession(
    initData : IProcessedProtectionData,
    sessionType : MediaKeySessionType
  ) : IStoredSessionEntry {
    const keySessionRecord = new KeySessionRecord(initData);
    const mediaKeySession = this._mediaKeys.createSession(sessionType);
    const entry = { mediaKeySession,
                    sessionType,
                    keySessionRecord,
                    isGeneratingRequest: false,
                    isLoadingPersistentSession: false,
                    closingStatus: { type: "none" as const } };
    if (!isNullOrUndefined(mediaKeySession.closed)) {
      mediaKeySession.closed
        .then(() => {
          const index = this.getIndex(keySessionRecord);
          if (index >= 0 &&
              this._storage[index].mediaKeySession === mediaKeySession)
          {
            this._storage.splice(index, 1);
          }
        })
        .catch((e : unknown) => {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          log.warn(`DRM-LSS: MediaKeySession.closed rejected: ${e}`);
        });
    }

    log.debug("DRM-LSS: Add MediaKeySession", entry.sessionType);
    this._storage.push({ ...entry });
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
  public reuse(
    initializationData : IProcessedProtectionData
  ) : IStoredSessionEntry | null {
    for (let i = this._storage.length - 1; i >= 0; i--) {
      const stored = this._storage[i];
      if (stored.keySessionRecord.isCompatibleWith(initializationData)) {
        this._storage.splice(i, 1);
        this._storage.push(stored);
        return { ...stored };
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
  public getEntryForSession(
    mediaKeySession : MediaKeySession | ICustomMediaKeySession
  ) : IStoredSessionEntry | null {
    for (let i = this._storage.length - 1; i >= 0; i--) {
      const stored = this._storage[i];
      if (stored.mediaKeySession === mediaKeySession) {
        return { ...stored };
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
  public async generateLicenseRequest(
    mediaKeySession : MediaKeySession | ICustomMediaKeySession,
    initializationDataType : string | undefined,
    initializationData : Uint8Array
  ) : Promise<unknown> {
    let entry : IStoredSessionEntry | undefined;
    for (const stored of this._storage) {
      if (stored.mediaKeySession === mediaKeySession) {
        entry = stored;
        break;
      }
    }
    if (entry === undefined) {
      log.error("DRM-LSS: generateRequest error. No MediaKeySession found with " +
                "the given initData and initDataType");
      return generateKeyRequest(mediaKeySession,
                                initializationDataType,
                                initializationData);
    }

    entry.isGeneratingRequest = true;

    // Note the `as string` is needed due to TypeScript not understanding that
    // the `closingStatus` might change in the next checks
    if (entry.closingStatus.type as string !== "none") {
      throw new Error("The `MediaKeySession` is being closed.");
    }
    try {
      await generateKeyRequest(mediaKeySession,
                               initializationDataType,
                               initializationData);
    } catch (err) {
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
  public async loadPersistentSession(
    mediaKeySession : MediaKeySession | ICustomMediaKeySession,
    sessionId : string
  ) : Promise<boolean> {
    let entry : IStoredSessionEntry | undefined;
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
    if (entry.closingStatus.type as string !== "none") {
      throw new Error("The `MediaKeySession` is being closed.");
    }
    let ret : boolean;
    try {
      ret = await loadSession(mediaKeySession, sessionId);
    } catch (err) {
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
  public async closeSession(
    mediaKeySession : MediaKeySession | ICustomMediaKeySession
  ) : Promise<boolean> {
    let entry : IStoredSessionEntry | undefined;
    for (const stored of this._storage) {
      if (stored.mediaKeySession === mediaKeySession) {
        entry = stored;
        break;
      }
    }
    if (entry === undefined) {
      log.warn("DRM-LSS: No MediaKeySession found with " +
               "the given initData and initDataType");
      return Promise.resolve(false);
    }
    return this._closeEntry(entry);
  }

  /**
   * Returns the number of stored MediaKeySessions in this LoadedSessionsStore.
   * @returns {number}
   */
  public getLength() : number {
    return this._storage.length;
  }

  /**
   * Returns information about all stored MediaKeySession, in the order in which
   * the MediaKeySession have been created.
   * @returns {Array.<Object>}
   */
  public getAll() : IStoredSessionEntry[] {
    return this._storage;
  }

  /**
   * Close all sessions in this store.
   * Emit `null` when done.
   * @returns {Promise}
   */
  public async closeAllSessions() : Promise<void> {
    const allEntries = this._storage;
    log.debug("DRM-LSS: Closing all current MediaKeySessions", allEntries.length);

    // re-initialize the storage, so that new interactions with the
    // `LoadedSessionsStore` do not rely on MediaKeySessions we're in the
    // process of removing
    this._storage = [];

    const closingProms = allEntries
      .map((entry) => this._closeEntry(entry));
    await Promise.all(closingProms);
  }

  /**
   * Get the index of a stored MediaKeySession entry based on its
   * `KeySessionRecord`.
   * Returns -1 if not found.
   * @param {Object} record
   * @returns {number}
   */
  private getIndex(record : KeySessionRecord) : number {
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
  private async _closeEntry(
    entry : IStoredSessionEntry
  ) : Promise<boolean> {
    const { mediaKeySession } = entry;
    return new Promise((resolve, reject) => {
      if (entry !== undefined &&
          (
            entry.isLoadingPersistentSession || entry.isGeneratingRequest
          ))
      {
        entry.closingStatus = { type: "awaiting",
                                start: tryClosingEntryAndResolve };
      } else {
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
  keySessionRecord : KeySessionRecord;

  /** The MediaKeySession created. */
  mediaKeySession : MediaKeySession |
                    ICustomMediaKeySession;

  /**
   * The MediaKeySessionType (e.g. "temporary" or "persistent-license") with
   * which the MediaKeySession was created.
   */
  sessionType : MediaKeySessionType;

  /**
   * Set to `true` while a `generateRequest` call is pending.
   * This information might be useful as it is one of the operation we have to
   * wait for before closing a MediaKeySession.
   */
  isGeneratingRequest : boolean;

  /**
   * Set to `true` while a `load` call is pending.
   * This information might be useful as it is one of the operation we have to
   * wait for before closing a MediaKeySession.
   */
  isLoadingPersistentSession : boolean;

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
  closingStatus :
    /** Status when the MediaKeySession is currently being closed. */
    { type : "pending" } |
    /** Status when the MediaKeySession has been closed. */
    { type : "done" } |
    /** Status when the MediaKeySession failed to close. */
    { type : "failed" } |
    /**
     * Status when a close order has been received for this MediaKeySession
     * while some sensitive operation (examples are `generateRequest` and `load`
     * calls).
     * The `LoadedSessionsStore` should call `start` once it has finished those
     * operations.
     */
    {
      type : "awaiting";
      start : () => void;
    } |
    /** Status when the MediaKeySession failed to close. */
    { type : "none" };
}

/**
 * Close a MediaKeySession and just log an error if it fails (while resolving).
 * Emits then complete when done.
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
async function safelyCloseMediaKeySession(
  mediaKeySession : MediaKeySession | ICustomMediaKeySession
) : Promise<void> {
  log.debug("DRM: Trying to close a MediaKeySession", mediaKeySession.sessionId);
  try {
    await closeSession(mediaKeySession);
    log.debug("DRM: Succeeded to close MediaKeySession");
    return ;
  } catch (err : unknown) {
    log.error("DRM: Could not close MediaKeySession: " +
              (err instanceof Error ? err.toString() :
                                      "Unknown error"));
    return ;
  }
}
