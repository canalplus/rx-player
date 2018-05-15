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

import arrayFind = require("array-find");
import { Observable } from "rxjs/Observable";
import {
  IMediaKeySession,
  IMockMediaKeys,
} from "../../../compat";
import { EncryptedMediaError } from "../../../errors";
import castToObservable from "../../../utils/castToObservable";
import log from "../../../utils/log";
import hashBuffer from "./hash_buffer";

// Cached data for a single MediaKeySession
interface IStoreSessionEntry {
  initData : number;
  initDataType: string;
  session : IMediaKeySession|MediaKeySession;
  sessionType : MediaKeySessionType;
}

// What is returned by the cache
export interface IStoreSessionData {
  session : IMediaKeySession|MediaKeySession;
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
  private readonly _mediaKeys : MediaKeys|IMockMediaKeys;
  private _entries : IStoreSessionEntry[];

  constructor(mediaKeys : MediaKeys|IMockMediaKeys) {
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
   * @param {string} initDataType
   * @returns {Object|null}
   */
  public get(
    initData : Uint8Array,
    initDataType: string
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
   * @param {string} initDataType
   * @param {string} sessionType
   * @returns {MediaKeySession}
   * @throws {EncryptedMediaError}
   */
  public createSession(
    initData : Uint8Array,
    initDataType : string,
    sessionType : MediaKeySessionType
  ) : MediaKeySession|IMediaKeySession {
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
          log.warn(`session.closed rejected: ${e}`);
        });
    }
    log.debug("eme-mem-store: add session", entry);
    this._entries.push(entry);
    return session;
  }

  /**
   * Close a MediaKeySession stored here and remove its entry in the store.
   * @param {MediaKeySession} session_
   * @returns {Observable}
   */
  public closeSession(
    session_ : IMediaKeySession|MediaKeySession
  ) : Observable<null> {
    return Observable.defer(() => {
      const session = this._delete(session_);
      if (session == null) {
        return Observable.of(null);
      }

      log.debug("eme-mem-store: close session", session);

      return castToObservable(session.close())
        .mapTo(null)
        .catch(() => {
          return Observable.of(null);
        });
    });
  }

  /**
   * Close all sessions in this store.
   * Emit null when done
   * @returns {Observable}
   */
  public closeAllSessions() : Observable<null> {
    return Observable.defer(() => {
      const disposed = this._entries.map((e) => this.closeSession(e.session));
      this._entries = [];
      return Observable.merge(...disposed)
        .ignoreElements()
        .concat(Observable.of(null));
    });
  }

  /**
   * Remove a MediaKeySession from the Cache, without closing it.
   * Returns the entry if found, null otherwise.
   * @param {MediaKeySession} session_
   * @returns {MediaKeySession|null}
   */
  private _delete(
    session_ : IMediaKeySession|MediaKeySession
  ) : IMediaKeySession|MediaKeySession|null {
    const entry = arrayFind(this._entries, (e) => e.session === session_);
    if (!entry) {
      return null;
    }

    const { session } = entry;
    log.debug("eme-mem-store: delete session", entry);
    const idx = this._entries.indexOf(entry);
    this._entries.splice(idx, 1);
    return session;
  }
}
