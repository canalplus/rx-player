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

import arrayFind from "array-find";
import {
  concat as observableConcat,
  defer as observableDefer,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  ignoreElements,
  mapTo,
} from "rxjs/operators";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
} from "../../../compat";
import { EncryptedMediaError } from "../../../errors";
import log from "../../../log";
import castToObservable from "../../../utils/castToObservable";
import hashBuffer from "../../../utils/hash_buffer";

// Cached data for a single MediaKeySession
interface IStoreSessionEntry {
  initData : number;
  initDataType: string|undefined;
  session : MediaKeySession|ICustomMediaKeySession;
  sessionType : MediaKeySessionType;
}

// What is returned by the cache
export interface IStoreSessionData {
  session : MediaKeySession|ICustomMediaKeySession;
  sessionType : MediaKeySessionType;
}

/**
 * Create and store MediaKeySessions linked to a single MediaKeys
 * instance.
 *
 * Keep track of sessionTypes and of the initialization data each
 * MediaKeySession is created for.
 * @class MediaKeySessionsStore
 */
export default class MediaKeySessionsStore {
  private readonly _mediaKeys : MediaKeys|ICustomMediaKeys;
  private _entries : IStoreSessionEntry[];

  constructor(mediaKeys : MediaKeys|ICustomMediaKeys) {
    this._mediaKeys = mediaKeys;
    this._entries = [];
  }

  /**
   * @returns {Array.<Object>}
   */
  public getAll() : IStoreSessionData[] {
    return this._entries.map(entry => ({
      session: entry.session,
      sessionType: entry.sessionType,
    }));
  }

  /**
   * Returns an entry in this cache with the initData and initDataType given.
   * null if no such session is stored.
   *
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  public get(
    initData : Uint8Array,
    initDataType: string|undefined
  ) : IStoreSessionData|null {
    const initDataHash = hashBuffer(initData);
    const foundEntry = arrayFind(this._entries, (entry) => (
      entry.initData === initDataHash &&
      entry.initDataType === initDataType
    ));

    if (foundEntry) {
      const { session, sessionType } = foundEntry;
      return { session, sessionType };
    }
    return null;
  }

  /**
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @param {string} sessionType
   * @returns {MediaKeySession}
   * @throws {EncryptedMediaError}
   */
  public createSession(
    initData : Uint8Array,
    initDataType : string|undefined,
    sessionType : MediaKeySessionType
  ) : MediaKeySession|ICustomMediaKeySession {
    if (this.get(initData, initDataType)) {
      const error = new Error("This initialization data was already stored.");
      throw new EncryptedMediaError("MULTIPLE_SESSIONS_SAME_INIT_DATA", error, true);
    }

    const session = (this._mediaKeys as any /* TS bug */).createSession(sessionType);
    const entry = {
      session,
      sessionType,
      initData: hashBuffer(initData),
      initDataType,
    };
    if (session.closed !== null) {
      session.closed
        .then(() => {
          this._delete(session);
        })
        .catch((e : Error) => {
          log.warn(`EME-MKSS: session.closed rejected: ${e}`);
        });
    }
    log.debug("EME-MKSS: Add session", entry);
    this._entries.push(entry);
    return session;
  }

  /**
   * Close a MediaKeySession and remove its entry if it's found in the store.
   * @param {MediaKeySession} session
   * @returns {Observable}
   */
  public deleteAndCloseSession(
    session : MediaKeySession|ICustomMediaKeySession
  ) : Observable<null> {
    return observableDefer(() => {
      this._delete(session);
      log.debug("EME-MKSS: Close session", session);
      return castToObservable(session.close()).pipe(
        mapTo(null),
        catchError(() => {
          return observableOf(null);
        })
      );
    });
  }

  /**
   * Close all sessions in this store.
   * Emit null when done
   * @returns {Observable}
   */
  public closeAllSessions() : Observable<null> {
    return observableDefer(() => {
      const previousEntries = this._entries;
      this._entries = []; // clean completely the cache first
      const disposed = previousEntries
        .map((entry) => this.deleteAndCloseSession(entry.session));
      return observableConcat(
        observableMerge(...disposed).pipe(ignoreElements()),
        observableOf(null)
      );
    });
  }

  /**
   * Remove a MediaKeySession from the Cache, without closing it.
   * Returns the entry if found, null otherwise.
   * @param {MediaKeySession} session
   * @returns {number} - index of the session in the cache. -1 of not found.
   */
  private _delete(
    session : MediaKeySession|ICustomMediaKeySession
  ) : number {
    const entry = arrayFind(this._entries, (e) => e.session === session);
    if (!entry) {
      return -1;
    }

    log.debug("EME-MKSS: delete session", entry);
    const idx = this._entries.indexOf(entry);
    this._entries.splice(idx, 1);
    return idx;
  }
}
