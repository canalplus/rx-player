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
import { IMediaKeySession } from "../../../compat";
import assert, {
  assertInterface,
} from "../../../utils/assert";
import log from "../../../utils/log";
import {
  IPersistedSessionData,
  IPersistedSessionStorage,
} from "../types";
import hashBuffer from "./hash_buffer";

function checkStorage(storage : IPersistedSessionStorage) : void {
  assert(
    storage != null,
    "no licenseStorage given for keySystem with persistentLicense"
  );

  assertInterface(
    storage,
    { save: "function", load: "function" },
    "licenseStorage"
  );
}

/**
 * Set representing persisted licenses. Depends on a simple local-
 * storage implementation with a `save`/`load` synchronous interface
 * to persist informations on persisted sessions.
 *
 * This set is used only for a cdm/keysystem with license persistency
 * supported.
 * @class PersistedSessionsStore
 */
export default class PersistedSessionsStore {
  private readonly _storage : IPersistedSessionStorage;
  private _entries : IPersistedSessionData[];

  /**
   * @param {Object} storage
   */
  constructor(storage : IPersistedSessionStorage) {
    checkStorage(storage);
    this._entries = [];
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
   * @param {Uint8Array}  initData
   * @param {string} initDataType
   * @returns {Object|null}
   */
  public get(
    initData : Uint8Array,
    initDataType : string
  ) : IPersistedSessionData|null {
    const hash = hashBuffer(initData);
    const entry = arrayFind(this._entries, (e) =>
      e.initData === hash &&
      e.initDataType === initDataType
    );
    return entry || null;
  }

  /**
   * Add a new entry in the storage.
   * @param {Uint8Array}  initData
   * @param {string} initDataType
   * @param {MediaKeySession} session
   */
  public add(
    initData : Uint8Array,
    initDataType : string,
    session : IMediaKeySession|MediaKeySession
  ) : void {
    const sessionId = session && session.sessionId;
    if (!sessionId) {
      return;
    }

    const currentEntry = this.get(initData, initDataType);
    if (currentEntry && currentEntry.sessionId === sessionId) {
      return;
    } else if (currentEntry) { // currentEntry has a different sessionId
      this.delete(initData, initDataType);
    }

    log.info("eme-persitent-store: add new session", sessionId, session);
    this._entries.push({
      sessionId,
      initData: hashBuffer(initData),
      initDataType,
    });
    this._save();
  }

  /**
   * Delete entry (sessionId + initData) based on its initData.
   * @param {Uint8Array}  initData
   * @param {string} initDataType
   */
  delete(initData : Uint8Array, initDataType : string) : void {
    const hash = hashBuffer(initData);

    const entry = arrayFind(this._entries, (e) =>
      e.initData === hash &&
      e.initDataType === initDataType
    );
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
  public dispose() : void {
    this._entries = [];
    this._save();
  }

  /**
   * Use the given storage to store the current entries.
   */
  private _save() : void {
    try {
      this._storage.save(this._entries);
    } catch (e) {
      log.warn("eme-persitent-store: could not save licenses in localStorage");
    }
  }
}
