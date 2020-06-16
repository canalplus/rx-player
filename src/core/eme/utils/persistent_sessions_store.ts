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
import {
  base64ToBytes,
  bytesToBase64,
} from "../../../utils/base64";
import hashBuffer from "../../../utils/hash_buffer";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import {
  IPersistentSessionInfo,
  IPersistentSessionStorage,
} from "../types";

/**
 * Throw if the given storage does not respect the right interface.
 * @param {Object} storage
 */
function checkStorage(storage : IPersistentSessionStorage) : void {
  assertInterface(storage,
                  { save: "function", load: "function" },
                  "licenseStorage");
}

/** Wrap initialization data and allow linearization of it into base64. */
class InitDataContainer {
  /** The initData itself. */
  public initData : Uint8Array;

  /**
   * Create a new container, wrapping the initialization data given and allowing
   * linearization into base64.
   * @param {Uint8Array}
   */
  constructor(initData : Uint8Array) {
    this.initData = initData;
  }

  /**
   * Convert it to base64.
   * `toJSON` is specially interpreted by JavaScript engines to be able to rely
   * on it when calling `JSON.stringify` on it or any of its parent objects:
   * https://tc39.es/ecma262/#sec-serializejsonproperty
   * @returns {string}
   */
  toJSON() : string {
    return bytesToBase64(this.initData);
  }

  /**
   * Decode a base64 sequence representing an initialization data back to an
   * Uint8Array.
   * @param {string}
   * @returns {Uint8Array}
   */
  static decode(base64 : string) : Uint8Array {
    return base64ToBytes(base64);
  }
}

/**
 * Set representing persisted licenses. Depends on a simple local-
 * storage implementation with a `save`/`load` synchronous interface
 * to persist information on persisted sessions.
 *
 * This set is used only for a cdm/keysystem with license persistency
 * supported.
 * @class PersistentSessionsStore
 */
export default class PersistentSessionsStore {
  private readonly _storage : IPersistentSessionStorage;
  private _entries : IPersistentSessionInfo[];

  /**
   * Create a new PersistentSessionsStore.
   * @param {Object} storage
   */
  constructor(storage : IPersistentSessionStorage) {
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
   * Returns the number of stored values.
   * @returns {number}
   */
  public getLength() : number {
    return this._entries.length;
  }

  /**
   * Returns information about all stored MediaKeySession, in the order in which
   * the MediaKeySession have been created.
   * @returns {Array.<Object>}
   */
  public getAll() : IPersistentSessionInfo[] {
    return this._entries;
  }

  /**
   * Retrieve an entry based on its initialization data.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  public get(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : IPersistentSessionInfo | null {
    const index = this.getIndex(initData, initDataType);
    return index === -1 ? null :
                          this._entries[index];
  }

  /**
   * Like `get`, but also move the corresponding value at the end of the store
   * (as returned by `getAll`) if found.
   * This can be used for example to tell when a previously-stored value is
   * re-used to then be able to implement a caching replacement algorithm based
   * on the least-recently-used values by just evicting the first values
   * returned by `getAll`.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {*}
   */
  public getAndReuse(
    initData : Uint8Array,
    initDataType : string | undefined
  ) : IPersistentSessionInfo | null {
    const index = this.getIndex(initData, initDataType);
    if (index === -1) {
      return null;
    }
    const item = this._entries.splice(index, 1)[0];
    this._entries.push(item);
    return item;
  }

  /**
   * Add a new entry in the PersistentSessionsStore.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   * @param {MediaKeySession} session
   */
  public add(
    initData : Uint8Array,
    initDataType : string|undefined,
    session : MediaKeySession|ICustomMediaKeySession
  ) : void {
    if (isNullOrUndefined(session) || !isNonEmptyString(session.sessionId)) {
      log.warn("EME-PSS: Invalid Persisten Session given.");
      return;
    }
    const { sessionId } = session;
    const currentEntry = this.get(initData, initDataType);
    if (currentEntry !== null && currentEntry.sessionId === sessionId) {
      return;
    } else if (currentEntry !== null) { // currentEntry has a different sessionId
      this.delete(initData, initDataType);
    }

    const hash = hashBuffer(initData);
    log.info("EME-PSS: Add new session", sessionId, session);

    this._entries.push({ version: 2,
                         sessionId,
                         initData: new InitDataContainer(initData),
                         initDataHash: hash,
                         initDataType });
    this._save();
  }

  /**
   * Delete stored MediaKeySession information based on its initialization
   * data.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   */
  delete(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : void {
    const index = this.getIndex(initData, initDataType);
    if (index === -1) {
      log.warn("EME-PSS: initData to delete not found.");
      return;
    }
    const entry = this._entries[index];
    log.warn("EME-PSS: Delete session from store", entry);
    this._entries.splice(index, 1);
    this._save();
  }

  deleteOldSessions(sessionsToDelete : number) : void {
    log.debug(`EME-PSS: Deleting last ${sessionsToDelete} sessions.`);
    if (sessionsToDelete <= 0) {
      return;
    }
    if (sessionsToDelete <= this._entries.length) {
      this._entries.splice(0, sessionsToDelete);
    } else {
      log.warn("EME-PSS: Asked to remove more information that it contains",
               sessionsToDelete,
               this._entries.length);
      this._entries = [];
    }
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
        if (entry.version === 2) {
          if (entry.initDataHash === hash) {
            try {
              const decodedInitData : Uint8Array = typeof entry.initData === "string" ?
                InitDataContainer.decode(entry.initData) :
                entry.initData.initData;
              if (areArraysOfNumbersEqual(decodedInitData, initData)) {
                return i;
              }
            } catch (e) {
              log.warn("EME-PSS: Could not decode initialization data.", e);
            }
          }
        } else if (entry.version === 1) {
          if (entry.initDataHash === hash) {
            if (typeof entry.initData.length === "undefined") {
              // If length is undefined, it has been linearized. We could still
              // convert it back to an Uint8Array but this would necessitate some
              // ugly unreadable logic for a very very minor possibility.
              // Just consider that it is a match based on the hash.
              return i;
            } else if (areArraysOfNumbersEqual(entry.initData, initData)) {
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
