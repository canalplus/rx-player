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

import PPromise from "pinkie";
import { Subscription } from "rxjs";
import {
  closeSession,
  ICustomMediaKeys,
  ICustomMediaKeySession,
} from "../../../compat";
import {
  onKeyMessage$,
  onKeyStatusesChange$,
} from "../../../compat/event_listeners";
import config from "../../../config";
import log from "../../../log";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import { IProcessedProtectionData } from "../types";
import KeySessionRecord from "./key_session_record";

const { EME_SESSION_CLOSING_MAX_RETRY,
        EME_SESSION_CLOSING_INITIAL_DELAY,
        EME_SESSION_CLOSING_MAX_DELAY } = config;

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
   * @param {Object} initializationData
   * @param {string} sessionType
   * @returns {Object}
   */
  public createSession(
    initData : IProcessedProtectionData,
    sessionType : MediaKeySessionType
  ) : IStoredSessionEntry {
    const keySessionRecord = new KeySessionRecord(initData);
    const mediaKeySession = this._mediaKeys.createSession(sessionType);
    const entry = { mediaKeySession, sessionType, keySessionRecord };
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
    this._storage.push({ keySessionRecord, mediaKeySession, sessionType });
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
        return { keySessionRecord: stored.keySessionRecord,
                 mediaKeySession: stored.mediaKeySession,
                 sessionType: stored.sessionType };
      }
    }
    return null;
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
    let entry;
    for (const stored of this._storage) {
      if (stored.mediaKeySession === mediaKeySession) {
        entry = stored;
        break;
      }
    }
    if (entry === undefined) {
      log.warn("DRM-LSS: No MediaKeySession found with " +
               "the given initData and initDataType");
      return PPromise.resolve(false);
    }
    await safelyCloseMediaKeySession(entry.mediaKeySession);
    return PPromise.resolve(true);
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
      .map((entry) => safelyCloseMediaKeySession(entry.mediaKeySession));
    await PPromise.all(closingProms);
  }

  private getIndex(record : KeySessionRecord) : number {
    for (let i = 0; i < this._storage.length; i++) {
      const stored = this._storage[i];
      if (stored.keySessionRecord === record) {
        return i;
      }
    }
    return -1;
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
}

/**
 * Close a MediaKeySession with multiple attempts if needed and do not throw if
 * this action throws an error.
 * Emits then complete when done.
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
function safelyCloseMediaKeySession(
  mediaKeySession : MediaKeySession | ICustomMediaKeySession
) : Promise<unknown> {
  return recursivelyTryToCloseMediaKeySession(0);

  /**
   * Perform a new attempt at closing the MediaKeySession.
   * If this operation fails due to a not-"callable" (an EME term)
   * MediaKeySession, retry based on either a timer or on MediaKeySession
   * events, whichever comes first.
   * Emits then complete when done.
   * @param {number} retryNb - The attempt number starting at 0.
   * @returns {Observable}
   */
  async function recursivelyTryToCloseMediaKeySession(
    retryNb : number
  ) : Promise<unknown> {
    log.debug("DRM: Trying to close a MediaKeySession",
              mediaKeySession.sessionId,
              retryNb);
    try {
      await closeSession(mediaKeySession);
      log.debug("DRM: Succeeded to close MediaKeySession");
      return undefined;
    } catch (err : unknown) {
      // Unitialized MediaKeySession may not close properly until their
      // corresponding `generateRequest` or `load` call are handled by the
      // browser.
      // In that case the EME specification tells us that the browser is
      // supposed to reject the `close` call with an InvalidStateError.
      if (!(err instanceof Error) || err.name !== "InvalidStateError" ||
          mediaKeySession.sessionId !== "")
      {
        return failToCloseSession(err);
      }

      // We will retry either:
      //   - when an event indicates that the MediaKeySession is
      //     initialized (`callable` is the proper EME term here)
      //   - after a delay, raising exponentially
      const nextRetryNb = retryNb + 1;
      if (nextRetryNb > EME_SESSION_CLOSING_MAX_RETRY) {
        return failToCloseSession(err);
      }
      const delay = Math.min(Math.pow(2, retryNb) * EME_SESSION_CLOSING_INITIAL_DELAY,
                             EME_SESSION_CLOSING_MAX_DELAY);
      log.warn("DRM: attempt to close a mediaKeySession failed, " +
               "scheduling retry...", delay);

      let ksChangeSub : undefined | Subscription;
      const ksChangeProm = new Promise((res) => {
        ksChangeSub = onKeyStatusesChange$(mediaKeySession).subscribe(res);
      });

      let ksMsgSub : undefined | Subscription;
      const ksMsgProm = new Promise((res) => {
        ksMsgSub = onKeyMessage$(mediaKeySession).subscribe(res);
      });

      let sleepTimer : undefined | number;
      const sleepProm = new Promise((res) => {
        sleepTimer = window.setTimeout(res, delay);
      });

      await PPromise.race([ksChangeProm, ksMsgProm, sleepProm]);
      ksChangeSub?.unsubscribe();
      ksMsgSub?.unsubscribe();
      clearTimeout(sleepTimer);

      return recursivelyTryToCloseMediaKeySession(nextRetryNb);
    }
  }

  /**
   * Log error anouncing that we could not close the MediaKeySession and emits
   * then complete through Observable.
   * TODO Emit warning?
   * @returns {Observable}
   */
  function failToCloseSession(err : unknown) : Promise<null> {
    log.error("DRM: Could not close MediaKeySession: " +
              (err instanceof Error ? err.toString() :
                                      "Unknown error"));
    return PPromise.resolve(null);
  }
}
