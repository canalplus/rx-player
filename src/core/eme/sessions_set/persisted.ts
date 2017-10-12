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

import log from "../../../utils/log";
import assert from "../../../utils/assert";
import SessionSet from "./abstract";
import hashInitData from "./hash_init_data";

interface IPersistedSessionData {
  sessionId : string;
  initData : number;
}

export interface IPersistedSessionStorage {
  load() : IPersistedSessionData[];
  save(x : IPersistedSessionData[]) : void;
}

/**
 * Set representing persisted licenses. Depends on a simple local-
 * storage implementation with a `save`/`load` synchronous interface
 * to persist informations on persisted sessions.
 *
 * This set is used only for a cdm/keysystem with license persistency
 * supported.
 */
export default class PersistedSessionsSet
  extends SessionSet<IPersistedSessionData>
{
  private _storage : IPersistedSessionStorage;

  /*
   * @param {Object} storage
   * @param {Function} storage.load
   * @param {Function} storage.save
   */
  constructor(storage : IPersistedSessionStorage) {
    super();
    this.setStorage(storage);
  }

  /**
   * Set a new storage System.
   * storages are user-provided objects which allow to save and load given
   * informations.
   * @param {Object} storage
   * @param {Function} storage.load
   * @param {Function} storage.save
   */
  setStorage(storage : IPersistedSessionStorage) {
    if (this._storage === storage) {
      return;
    }

    assert(
      storage,
      "no licenseStorage given for keySystem with persistentLicense"
    );

    assert.iface(
      storage,
      "licenseStorage", { save: "function", load: "function" }
    );

    this._storage = storage;
    try {
      this._entries = this._storage.load();
      assert(Array.isArray(this._entries));
    } catch (e) {
      log.warn("eme-persitent-store: could not get entries from license storage", e);
      this.dispose();
    }
  }

  /**
   * Retrieve entry (sessionId + initData) based on its initData.
   * @param {Array|TypedArray|Number}  initData
   * @returns {Object|null}
   */
  get(initData : Uint8Array|number[]|number) : IPersistedSessionData|null {
    initData = hashInitData(initData);
    const entry = this.find((e) => e.initData === initData);
    return entry || null;
  }

  /**
   * Add a new entry in the storage.
   * @param {Array|TypedArray|Number}  initData
   * @param {MediaKeySession} session
   */
  add(initData : Uint8Array|number, session : MediaKeySession) : void {
    const sessionId = session && session.sessionId;
    if (!sessionId) {
      return;
    }

    initData = hashInitData(initData);
    const currentEntry = this.get(initData);
    if (currentEntry && currentEntry.sessionId === sessionId) {
      return;
    } else if (currentEntry) { // currentEntry has a different sessionId
      this.delete(initData);
    }

    log.info("eme-persitent-store: add new session", sessionId, session);
    this._entries.push({ sessionId, initData });
    this._save();
  }

  /**
   * Delete entry (sessionId + initData) based on its initData.
   * @param {Array|TypedArray|Number}  initData
   */
  delete(initData : Uint8Array|number) : void {
    initData = hashInitData(initData);

    const entry = this.find((e) => e.initData === initData);
    if (entry) {
      log.warn("eme-persitent-store: delete session from store", entry);

      const idx = this._entries.indexOf(entry);
      this._entries.splice(idx, 1);
      this._save();
    }
  }

  /**
   * Delete all saved entries.
   */
  dispose() : void {
    this._entries = [];
    this._save();
  }

  /**
   * Use the given storage to store the current entries.
   */
  _save() : void {
    try {
      this._storage.save(this._entries);
    } catch (e) {
      log.warn("eme-persitent-store: could not save licenses in localStorage");
    }
  }
}
