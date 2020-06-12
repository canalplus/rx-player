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
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  ignoreElements,
} from "rxjs/operators";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
} from "../../../compat";
import closeSession$ from "../../../compat/eme/close_session";
import { EncryptedMediaError } from "../../../errors";
import log from "../../../log";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import InitDataStore from "./init_data_store";

/** Stored MediaKeySession data assiociated to an initialization data. */
interface IStoredSessionEntry {
  /** The initialization data linked to the MediaKeySession. */
  initData : Uint8Array;
  /**
   * The type of the initialization data, bringing more information about the
   * initialization data's format.
   */
  initDataType: string | undefined;
  /** The MediaKeySession created. */
  mediaKeySession : MediaKeySession |
                    ICustomMediaKeySession;
  /** The MediaKeySessionType (e.g. "temporary" or "persistent-license"). */
  sessionType : MediaKeySessionType;
}

/** MediaKeySession information. */
export interface IStoredSessionData {
  /** The MediaKeySession created. */
  mediaKeySession : MediaKeySession |
                    ICustomMediaKeySession;
  /** The MediaKeySessionType (e.g. "temporary" or "persistent-license"). */
  sessionType : MediaKeySessionType;
}

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
  private _storage : InitDataStore<IStoredSessionEntry>;

  /**
   * Create a new LoadedSessionsStore, which will store information about
   * loaded MediaKeySessions on the given MediaKeys instance.
   * @param {MediaKeys} mediaKeys
   */
  constructor(mediaKeys : MediaKeys|ICustomMediaKeys) {
    this._mediaKeys = mediaKeys;
    this._storage = new InitDataStore<IStoredSessionEntry>();
  }

  /**
   * Returns the stored MediaKeySession information related to the
   * given initDataType and initData if found.
   * Returns `null` if no such MediaKeySession is stored.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  public get(
    initData : Uint8Array,
    initDataType: string|undefined
  ) : IStoredSessionData | null {
    const entry = this._storage.get(initData, initDataType);
    return entry === undefined ? null :
                                 { mediaKeySession: entry.mediaKeySession,
                                   sessionType: entry.sessionType };
  }

  /**
   * Like `get` but also moves the corresponding MediaKeySession to the end of
   * its internal storage, as returned by the `getAll` method.
   *
   * This can be used for example to tell when a previously-stored
   * MediaKeySession is re-used to then be able to implement a caching
   * replacement algorithm based on the least-recently-used values by just
   * evicting the first values returned by `getAll`.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  public getAndReuse(
    initData : Uint8Array,
    initDataType: string|undefined
  ) : IStoredSessionData | null {
    const entry = this._storage.getAndReuse(initData, initDataType);
    return entry === undefined ? null :
                                 { mediaKeySession: entry.mediaKeySession,
                                   sessionType: entry.sessionType };
  }

  /**
   * Create a new MediaKeySession and store it in this store.
   * @throws {EncryptedMediaError}
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @param {string} sessionType
   * @returns {MediaKeySession}
   */
  public createSession(
    initData : Uint8Array,
    initDataType : string|undefined,
    sessionType : MediaKeySessionType
  ) : MediaKeySession|ICustomMediaKeySession {
    if (this._storage.get(initData, initDataType) !== undefined) {
      throw new EncryptedMediaError("MULTIPLE_SESSIONS_SAME_INIT_DATA",
                                    "This initialization data was already stored.");
    }

    const mediaKeySession = this._mediaKeys.createSession(sessionType);
    const entry = { mediaKeySession,
                    sessionType,
                    initData,
                    initDataType };
    if (!isNullOrUndefined(mediaKeySession.closed)) {
      mediaKeySession.closed
        .then(() => {
          const currentEntry = this._storage.get(initData, initDataType);
          if (currentEntry !== undefined &&
              currentEntry.mediaKeySession === mediaKeySession)
          {
            this._storage.remove(initData, initDataType);
          }
        })
        .catch((e : unknown) => {
          log.warn(`EME-LSS: MediaKeySession.closed rejected: ${e}`);
        });
    }

    log.debug("EME-LSS: Add MediaKeySession", entry);
    this._storage.store(initData, initDataType, entry);
    return mediaKeySession;
  }

  /**
   * Close a MediaKeySession corresponding to an initialization data and remove
   * its related stored information from the LoadedSessionsStore.
   * Emit when done.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {Observable}
   */
  public closeSession(
    initData : Uint8Array,
    initDataType : string | undefined
  ) : Observable<unknown> {
    return observableDefer(() => {
      const entry = this._storage.remove(initData, initDataType);
      if (entry === undefined) {
        log.warn("EME-LSS: No MediaKeySession found with " +
                 "the given initData and initDataType");
        return EMPTY;
      }
      const { mediaKeySession } = entry;
      log.debug("EME-LSS: Close MediaKeySession", mediaKeySession);
      return closeSession$(mediaKeySession)
        .pipe(catchError((err : unknown) => {
          log.error("EME-LSS: Could not close MediaKeySession: " +
                    (err instanceof Error ? err.toString() :
                                            "Unknown error"));
          return observableOf(null);
        }));
    });
  }

  /**
   * Returns the number of stored MediaKeySessions in this LoadedSessionsStore.
   * @returns {number}
   */
  public getLength() : number {
    return this._storage.getLength();
  }

  /**
   * Returns information about all stored MediaKeySession, in the order in which
   * the MediaKeySession have been created.
   * @returns {Array.<Object>}
   */
  public getAll() : IStoredSessionEntry[] {
    return this._storage.getAll();
  }

  /**
   * Close all sessions in this store.
   * Emit `null` when done.
   * @returns {Observable}
   */
  public closeAllSessions() : Observable<null> {
    return observableDefer(() => {
      const closing$ = this._storage.getAll()
        .map((entry) => this.closeSession(entry.initData, entry.initDataType));
      log.debug("EME-LSS: Closing all current MediaKeySessions", closing$.length);

      // re-initialize the storage
      this._storage = new InitDataStore<IStoredSessionEntry>();

      return observableConcat(observableMerge(...closing$).pipe(ignoreElements()),
                              observableOf(null));
    });
  }
}
