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

import { ICustomMediaKeySession } from "../../../compat";
import log from "../../../log";
import areArraysOfNumbersEqual from "../../../utils/are_arrays_of_numbers_equal";
import { assertInterface } from "../../../utils/assert";
import hashBuffer from "../../../utils/hash_buffer";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import {
  IPersistedSessionInfo,
  IPersistedSessionStorage,
} from "../types";

function checkStorage(storage : IPersistedSessionStorage) : void {
  assertInterface(storage,
                  { save: "function", load: "function" },
                  "licenseStorage");
}

/**
 * Set representing persisted licenses. Depends on a simple local-
 * storage implementation with a `save`/`load` synchronous interface
 * to persist information on persisted sessions.
 *
 * This set is used only for a cdm/keysystem with license persistency
 * supported.
 * @class PersistedSessionsStore
 */
export default class PersistedSessionsStore {
  private readonly _storage : IPersistedSessionStorage;
  private _entries : IPersistedSessionInfo[];

  /**
   * @param {Object} storage
   */
  constructor(storage : IPersistedSessionStorage) {
    checkStorage(storage);
    this._entries = [];
    this._storage = storage;
    try {
      this._entries = this._storage.load();
      if (!Array.isArray(this._entries)) {
        this._entries = [];
      }
    } catch (e) {
      log.warn("EME-PSS: Could not get entries from license storage", e);
      this.dispose();
    }
  }

  /**
   * Retrieve entry (sessionId + initData) based on its initData.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  public get(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : IPersistedSessionInfo | null {
    const index = this.getIndex(initData, initDataType);
    return index === -1 ? null :
                          this._entries[index];
  }

  /**
   * Add a new entry in the storage.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   * @param {MediaKeySession} session
   */
  public add(
    initData : Uint8Array,
    initDataType : string|undefined,
    session : MediaKeySession|ICustomMediaKeySession
  ) : void {
    if (session == null || !isNonEmptyString(session.sessionId)) {
      return;
    }
    const sessionId = session.sessionId;
    const currentEntry = this.get(initData, initDataType);
    if (currentEntry !== null && currentEntry.sessionId === sessionId) {
      return;
    } else if (currentEntry !== null) { // currentEntry has a different sessionId
      this.delete(initData, initDataType);
    }

    const hash = hashBuffer(initData);
    log.info("EME-PSS: Add new session", sessionId, session);
    this._entries.push({ version: 1,
                         sessionId,
                         initData,
                         initDataHash: hash,
                         initDataType });
    this._save();
  }

  /**
   * Delete entry (sessionId + initData) based on its initData.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   */
  delete(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : void {
    const index = this.getIndex(initData, initDataType);
    if (index !== -1) {
      log.warn("EME-PSS: initData to delete not found.");
    }
    const entry = this._entries[index];
    log.warn("EME-PSS: Delete session from store", entry);
    this._entries.splice(index, 1);
    this._save();
  }

  /**
   * Delete all saved entries.
   */
  public dispose() : void {
    this._entries = [];
    this._save();
  }

  /**
   * Retrieve index of an entry.
   * Returns `-1` if not found.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   * @returns {number}
   */
  private getIndex(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : number {
    const hash = hashBuffer(initData);
    for (let i = 0; i < this._entries.length; i++) {
      const entry = this._entries[i];
      if (entry.initDataType === initDataType) {
        if (entry.version === 1) {
          if (entry.initDataHash === hash) {
            if (areArraysOfNumbersEqual(entry.initData, initData)) {
              return i;
            }
          }
        } else {
          if (entry.initData === hash) {
            return i;
          }
        }
      }
    }
    return -1;
  }

  /**
   * Use the given storage to store the current entries.
   */
  private _save() : void {
    try {
      this._storage.save(this._entries);
    } catch (e) {
      log.warn("EME-PSS: Could not save licenses in localStorage");
    }
  }
}
