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
import { IMediaKeySession } from "../../compat";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import hashBuffer from "./hash_buffer";

// Cached data for a single MediaKeySession
interface ISessionData {
  initData : number;
  initDataType: string;
  session : IMediaKeySession|MediaKeySession;
}

/**
 * Store open MediaKeySessions.
 * @class OpenSessionsStore
 * @extends SessionSet
 */
export default class OpenSessionsStore {
  private _entries : ISessionData[];

  constructor() {
    this._entries = [];
  }

  /**
   * Returns every MediaKeySession stored here from oldest to newest.
   * @returns {Array.<MediaKeySession>}
   */
  getSessions() : Array<IMediaKeySession|MediaKeySession> {
    return this._entries.map(e => e.session);
  }

  /**
   * Returns an entry in this cache with the initData and initDataType given.
   * null if no such session is stored.
   *
   * @param {Uint8Array} initData
   * @param {string} initDataType
   * @returns {MediaKeySession|null}
   */
  get(
    initData : Uint8Array,
    initDataType: string
  ) : IMediaKeySession|MediaKeySession|null {
    const initDataHash = hashBuffer(initData);
    const foundEntry = arrayFind(this._entries, (entry) => (
      entry.initData === initDataHash &&
      entry.initDataType === initDataType
    ));

    return foundEntry ? foundEntry.session : null;
  }

  /**
   * Add a new entry to the store.
   * Throw if this init data + init data type was already added
   * @param {Uint8Array} initData
   * @param {string} initDataType
   * @param {MediaKeySession} session
   */
  add(
    initData : Uint8Array,
    initDataType : string,
    session : IMediaKeySession|MediaKeySession
  ) : void {
    if (this.get(initData, initDataType)) {
      throw new Error("This initialization data was already stored.");
    }

    const entry = {
      session,
      initData: hashBuffer(initData),
      initDataType,
    };
    if (session.closed !== null) {
      session.closed
        .then(() => {
          this._delete(session);
        })
        .catch((e) => {
          log.warn(`session.closed rejected: ${e}`);
        });
    }
    log.debug("eme-mem-store: add session", entry);
    this._entries.push(entry);
  }

  /**
   * Close a MediaKeySession stored here and remove its entry in the store.
   * @param {MediaKeySession} session_
   * @returns {Observable}
   */
  closeSession(
    session_ : IMediaKeySession|MediaKeySession
  ) : Observable<null> {
    const session = this._delete(session_);
    if (session == null) {
      return Observable.of(null);
    }

    log.debug("eme-mem-store: close session", session);

    // XXX TODO This call will be active as soon as this line is read.
    // We should probably defer the call on subscription
    return castToObservable(session.close())
      .mapTo(null)
      .catch(() => Observable.of(null));
  }

  /**
   * Close all sessions in this store.
   * Emit null when done
   * @returns {Observable}
   */
  closeAllSessions() : Observable<null> {
    const disposed = this._entries.map((e) => this.closeSession(e.session));
    this._entries = [];
    return Observable.merge(...disposed)
      .ignoreElements()
      .concat(Observable.of(null));
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
