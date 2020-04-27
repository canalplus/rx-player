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

import InitDataStorage from "../../../utils/init_data_storage";
import isNonEmptyString from "../../../utils/is_non_empty_string";

type IDictionary<T> = Partial<Record<string, T>>;

/**
 * Map initialization data to a given value.
 * @class InitDataStore
 */
export default class InitDataStore<T> {
  private _namedTypeStorage : IDictionary<InitDataStorage<T>>;
  private _unnamedTypeStorage : InitDataStorage<T>;

  constructor() {
    this._namedTypeStorage = {};
    this._unnamedTypeStorage = new InitDataStorage<T>();
  }

  /**
   * Returns the value stored for a specific initData and a specific
   * initDataType.
   * Returns `undefined` if this combination of initData and initDataType is not
   * stored currently.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {*}
   */
  public get(
    initDataType : string|undefined,
    initData : Uint8Array
  ) : T | undefined {
    if (!isNonEmptyString(initDataType)) {
      return this._unnamedTypeStorage.get(initData);
    }

    const storage = this._namedTypeStorage[initDataType];
    if (storage == null) {
      return undefined;
    }
    return storage.get(initData);
  }

  /**
   * Store new data, linked to both an initDataType and an initData.
   * @param {string|undefined} initDataType
   * @param {Uint8Array} initData
   * @param {*} data
   */
  public set(
    initDataType : string|undefined,
    initData : Uint8Array,
    data : T
  ) {
    let storage : InitDataStorage<T>;
    if (!isNonEmptyString(initDataType)) {
      storage = this._unnamedTypeStorage;
      return;
    }

    const storageForInitDataType = this._namedTypeStorage[initDataType];
    if (storageForInitDataType == null) {
      storage = new InitDataStorage<T>();
      this._namedTypeStorage[initDataType] = storage;
    } else {
      storage = storageForInitDataType;
    }
    storage.set(initData, data);
  }

  /**
   * Remove data associated to an init data and an init data type from the
   * InitDataStore.
   * Returns `true` if a value associated to both has been found, false
   * otherwise.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {boolean}
   */
  public remove(
    initDataType : string|undefined,
    initData : Uint8Array
  ) : boolean {
    if (!isNonEmptyString(initDataType)) {
      return this._unnamedTypeStorage.remove(initData) !== undefined;
    } else {
      if (!this._namedTypeStorage.hasOwnProperty(initDataType)) {
        return false;
      }
      const storage = this._namedTypeStorage[initDataType] as InitDataStorage<T>;
      const removedVal = storage.remove(initData) !== undefined;
      if (storage.isEmpty()) {
        delete this._namedTypeStorage[initDataType];
      }
      return removedVal !== undefined;
    }
  }
}
