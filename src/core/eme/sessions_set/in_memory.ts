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

import { Observable } from "rxjs/Observable";
import { IMediaKeySession } from "../../../compat";
import castToObservable from "../../../utils/castToObservable";
import log from "../../../utils/log";
import SessionSet from "./abstract";
import hashInitData from "./hash_init_data";

// Cached data for a single MediaKeySession
interface ISessionData {
  initData : number;
  initDataType: string;
  session : IMediaKeySession|MediaKeySession;
}

/**
 * Set maintaining a representation of all currently loaded
 * MediaKeySessions.
 * This set allow to reuse sessions without re-negotiating a license exchange
 * if the key is already used in a loaded session.
 *
 * TODO Add Cache maximum size
 * @class InMemorySessionsSet
 * @extends SessionSet
 */
export default class InMemorySessionsSet extends SessionSet<ISessionData> {
  /**
   * Return oldest MediaKeySession stored in this cache.
   * undefined if no MediaKeySession has been stored.
   * @returns {MediaKeySession|undefined}
   */
  getOldestStoredSession() : IMediaKeySession|MediaKeySession|undefined {
    if (this._entries.length > 0) {
      return this._entries[0].session;
    }
  }

  /**
   * Returns an entry in this cache with the initData and initDataType given.
   * null if no such session is stored.
   * @param {number|Uint8Array} initData - Either the initDataHash representing the
   * initData or the initData itself.
   * @param {string} initDataType
   * @returns {MediaKeySession|null}
   */
  get(
    initData : number|Uint8Array,
    initDataType: string
  ) : IMediaKeySession|MediaKeySession|null {
    const initDataHash = hashInitData(initData);
    const foundEntry = this.find((entry) => (
      entry.initData === initDataHash &&
      entry.initDataType === initDataType
    ));

    return foundEntry ? foundEntry.session : null;
  }

  /**
   * Add a new entry to the cache.
   * @param {Uint8Array|Array.<number>|number} initData
   * @param {string} initDataType
   * @param {MediaKeySession} session
   */
  add(
    initData : Uint8Array|number[]|number,
    initDataType : string,
    session : IMediaKeySession|MediaKeySession
  ) : void {
    const initDataHash = hashInitData(initData);
    const currentSession = this.get(initDataHash, initDataType);
    if (currentSession) {
      log.warn("A MediaKeySession was already stored with that hash, removing it.");
      this.closeStoredSession(currentSession);
    }

    const entry = {
      session,
      initData: initDataHash,
      initDataType,
    };
    log.debug("eme-mem-store: add session", entry);
    this._entries.push(entry);
  }

  /**
   * Remove a MediaKeySession from the Cache, without closing it.
   * Returns the entry if found, null otherwise.
   * @param {MediaKeySession} session_
   * @returns {MediaKeySession|null}
   */
  delete(
    session_ : IMediaKeySession|MediaKeySession
  ) : IMediaKeySession|MediaKeySession|null {
    const entry = this.find((e) => e.session === session_);
    if (!entry) {
      return null;
    }

    const { session } = entry;
    log.debug("eme-mem-store: delete session", entry);
    const idx = this._entries.indexOf(entry);
    this._entries.splice(idx, 1);
    return session;
  }

  /**
   * Close a MediaKeySession stored in this cache and delete it from there.
   * @param {MediaKeySession} session_
   * @returns {Observable}
   */
  closeSession(
    session_ : IMediaKeySession|MediaKeySession
  ) : Observable<null> {
    const session = this.delete(session_);
    if (session == null) {
      return Observable.of(null);
    }

    log.debug("eme-mem-store: close session", session);

    // TODO This call will be active as soon as this line is read. We should
    // probably defer the call on subscription
    return castToObservable(session.close())
      .mapTo(null)
      .catch(() => Observable.of(null));
  }

  /**
   * @returns {Observable}
   */
  dispose() : Observable<void|null> {
    const disposed = this._entries.map((e) => this.closeSession(e.session));
    this._entries = [];
    return Observable.merge(...disposed);
  }
}
