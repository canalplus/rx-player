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
import {
  IPersistentLicenseConfig,
  IPersistentSessionInfo,
} from "../../../public_types";
import areArraysOfNumbersEqual from "../../../utils/are_arrays_of_numbers_equal";
import { assertInterface } from "../../../utils/assert";
import { bytesToBase64 } from "../../../utils/base64";
import hashBuffer from "../../../utils/hash_buffer";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import { IProcessedProtectionData } from "../types";
import areInitializationValuesCompatible from "./are_init_values_compatible";
import { IFormattedInitDataValue } from "./init_data_values_container";
import { areKeyIdsEqual } from "./key_id_comparison";
import SerializableBytes from "./serializable_bytes";

/**
 * Throw if the given storage does not respect the right interface.
 * @param {Object} storage
 */
function checkStorage(storage : IPersistentLicenseConfig) : void {
  assertInterface(storage,
                  { save: "function", load: "function" },
                  "persistentLicenseConfig");
}

/**
 * Set representing persisted licenses. Depends on a simple
 * implementation with a `save`/`load` synchronous interface
 * to persist information on persisted sessions.
 *
 * This set is used only for a cdm/keysystem with license persistency
 * supported.
 * @class PersistentSessionsStore
 */
export default class PersistentSessionsStore {
  private readonly _storage : IPersistentLicenseConfig;
  private _entries : IPersistentSessionInfo[];

  /**
   * Create a new PersistentSessionsStore.
   * @param {Object} storage
   */
  constructor(storage : IPersistentLicenseConfig) {
    checkStorage(storage);
    this._entries = [];
    this._storage = storage;
    try {
      let entries = this._storage.load();
      if (!Array.isArray(entries)) {
        entries = [];
      }
      this._entries = entries;
    } catch (e) {
      log.warn("DRM-PSS: Could not get entries from license storage",
               e instanceof Error ? e : "");
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
   * @param {Object}  initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  public get(initData : IProcessedProtectionData) : IPersistentSessionInfo | null {
    const index = this._getIndex(initData);
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
    initData : IProcessedProtectionData
  ) : IPersistentSessionInfo | null {
    const index = this._getIndex(initData);
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
    initData : IProcessedProtectionData,
    keyIds : Uint8Array[] | undefined,
    session : MediaKeySession|ICustomMediaKeySession
  ) : void {
    if (isNullOrUndefined(session) || !isNonEmptyString(session.sessionId)) {
      log.warn("DRM-PSS: Invalid Persisten Session given.");
      return;
    }
    const { sessionId } = session;
    const currentIndex = this._getIndex(initData);
    if (currentIndex >= 0) {
      const currVersion = keyIds === undefined ? 3 :
                                                 4;
      const currentEntry = this._entries[currentIndex];
      const entryVersion = currentEntry.version ?? -1;
      if (entryVersion >= currVersion && sessionId === currentEntry.sessionId) {
        return;
      }
      log.info("DRM-PSS: Updating session info.", sessionId);
      this._entries.splice(currentIndex, 1);
    } else {
      log.info("DRM-PSS: Add new session", sessionId);
    }

    const storedValues = prepareValuesForStore(initData.values.getFormattedValues());
    if (keyIds === undefined) {
      this._entries.push({ version: 3,
                           sessionId,
                           values: storedValues,
                           initDataType: initData.type });
    } else {
      this._entries.push({ version: 4,
                           sessionId,
                           keyIds: keyIds.map((k) => new SerializableBytes(k)),
                           values: storedValues,
                           initDataType: initData.type });
    }
    this._save();
  }

  /**
   * Delete stored MediaKeySession information based on its session id.
   * @param {Uint8Array}  initData
   * @param {string|undefined} initDataType
   */
  public delete(sessionId : string) : void {
    let index = -1;
    for (let i = 0; i < this._entries.length; i++) {
      const entry = this._entries[i];
      if (entry.sessionId === sessionId) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      log.warn("DRM-PSS: initData to delete not found.");
      return;
    }
    const entry = this._entries[index];
    log.warn("DRM-PSS: Delete session from store", entry.sessionId);
    this._entries.splice(index, 1);
    this._save();
  }

  public deleteOldSessions(sessionsToDelete : number) : void {
    log.info(`DRM-PSS: Deleting last ${sessionsToDelete} sessions.`);
    if (sessionsToDelete <= 0) {
      return;
    }
    if (sessionsToDelete <= this._entries.length) {
      this._entries.splice(0, sessionsToDelete);
    } else {
      log.warn("DRM-PSS: Asked to remove more information that it contains",
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
   * @param {Object} initData
   * @returns {number}
   */
  private _getIndex(initData : IProcessedProtectionData) : number {
    // Older versions of the format include a concatenation of all
    // initialization data and its hash.
    // This is only computed lazily, the first time it is needed.
    let lazyConcatenatedData : null | { initData : Uint8Array;
                                        initDataHash : number; } = null;
    function getConcatenatedInitDataInfo() {
      if (lazyConcatenatedData === null) {
        const concatInitData = initData.values.constructRequestData();
        lazyConcatenatedData = { initData: concatInitData,
                                 initDataHash: hashBuffer(concatInitData) };
      }
      return lazyConcatenatedData;
    }

    for (let i = 0; i < this._entries.length; i++) {
      const entry = this._entries[i];
      if (entry.initDataType === initData.type) {
        switch (entry.version) {
          case 4:
            if (initData.keyIds !== undefined) {
              const foundCompatible = initData.keyIds.every(keyId => {
                const keyIdB64 = bytesToBase64(keyId);
                for (const entryKid of entry.keyIds) {
                  if (typeof entryKid === "string") {
                    if (keyIdB64 === entryKid) {
                      return true;
                    }
                  } else if (areKeyIdsEqual(entryKid.initData,
                                            keyId))
                  {
                    return true;
                  }
                }
                return false;
              });
              if (foundCompatible) {
                return i;
              }
            } else {
              const formatted = initData.values.getFormattedValues();
              if (areInitializationValuesCompatible(formatted, entry.values)) {
                return i;
              }
            }
            break;

          case 3:
            const formatted = initData.values.getFormattedValues();
            if (areInitializationValuesCompatible(formatted, entry.values)) {
              return i;
            }
            break;

          case 2: {
            const { initData: concatInitData,
                    initDataHash: concatHash } = getConcatenatedInitDataInfo();
            if (entry.initDataHash === concatHash) {
              try {
                const decodedInitData : Uint8Array = typeof entry.initData === "string" ?
                  SerializableBytes.decode(entry.initData) :
                  entry.initData.initData;
                if (areArraysOfNumbersEqual(decodedInitData, concatInitData)) {
                  return i;
                }
              } catch (e) {
                log.warn("DRM-PSS: Could not decode initialization data.",
                         e instanceof Error ? e : "");
              }
            }
            break;
          }

          case 1: {
            const { initData: concatInitData,
                    initDataHash: concatHash } = getConcatenatedInitDataInfo();
            if (entry.initDataHash === concatHash) {
              if (typeof entry.initData.length === "undefined") {
                // If length is undefined, it has been linearized. We could still
                // convert it back to an Uint8Array but this would necessitate some
                // ugly unreadable logic for a very very minor possibility.
                // Just consider that it is a match based on the hash.
                return i;
              } else if (areArraysOfNumbersEqual(entry.initData, concatInitData)) {
                return i;
              }
            }
            break;
          }

          default: {
            const { initDataHash: concatHash } = getConcatenatedInitDataInfo();
            if (entry.initData === concatHash) {
              return i;
            }
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
      const err = e instanceof Error ? e :
                                       undefined;
      log.warn("DRM-PSS: Could not save MediaKeySession information", err);
    }
  }
}

/**
 * Format given initializationData's values so they are ready to be stored:
 *   - sort them by systemId, so they are faster to compare
 *   - add hash for each initialization data encountered.
 * @param {Array.<Object>} initialValues
 * @returns {Array.<Object>}
 */
function prepareValuesForStore(
  initialValues : IFormattedInitDataValue[]
) : Array<{ systemId : string | undefined;
            hash : number;
            data : SerializableBytes; }> {
  return initialValues
    .map(({ systemId, data, hash }) => ({ systemId,
                                          hash,
                                          data : new SerializableBytes(data) }));
}
