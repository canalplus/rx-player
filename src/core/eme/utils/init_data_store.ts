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

import areArraysOfNumbersEqual from "../../../utils/are_arrays_of_numbers_equal";
import hashBuffer from "../../../utils/hash_buffer";

/**
 * Store a unique value associated to an initData and initDataType.
 * @class InitDataStore
 */
export default class InitDataStore<T> {
  /**
   * Contains every stored elements alongside the corresponding initialization
   * data, in storage chronological order (from first stored to last stored).
   */
  private _storage : Array<{ initDataType : string | undefined;
                             initDataHash : number;
                             initData: Uint8Array;
                             value : T; }>;

  /** Construct a new InitDataStore.  */
  constructor() {
    this._storage = [];
  }

  /**
   * Returns all stored value, in the order in which they have been stored.
   * @returns {Array}
   */
  public getAll() : T[] {
    return this._storage.map(item => item.value);
  }

  /**
   * Returns the number of stored values.
   * @returns {number}
   */
  public getLength() : number {
    return this._storage.length;
  }

  /**
   * Returns the element associated with the given initData and initDataType.
   * Returns `undefined` if not found.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {*}
   */
  public get(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : T|undefined {
    const initDataHash = hashBuffer(initData);
    const index = this._findIndex(initData, initDataType, initDataHash);
    return index >= 0 ? this._storage[index].value :
                        undefined;
  }

  /**
   * Add to the store a value linked to the corresponding initData and
   * initDataType.
   * If a value was already stored linked to those, replace it.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {boolean}
   */
  public store(
    initData : Uint8Array,
    initDataType : string | undefined,
    value : T
  ) : void {
    const initDataHash = hashBuffer(initData);
    const indexOf = this._findIndex(initData, initDataType, initDataHash);
    if (indexOf >= 0) {
      // this._storage contains the stored value in the same order they have
      // been put. So here we want to remove the previous element and re-push
      // it to the end.
      this._storage.splice(indexOf, 1);
    }
    this._storage.push({ initData, initDataType, initDataHash, value });
  }

  /**
   * Add to the store a value linked to the corresponding initData and
   * initDataType.
   * If a value linked to those was already stored, do nothing and returns
   * `false`.
   * If not, add the value and return `true`.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {boolean}
   */
  public storeIfNone(
    initData : Uint8Array,
    initDataType : string | undefined,
    value : T
  ) : boolean {
    const initDataHash = hashBuffer(initData);
    const indexOf = this._findIndex(initData, initDataType, initDataHash);
    if (indexOf >= 0) {
      return false;
    }
    this._storage.push({ initData, initDataType, initDataHash, value });
    return true;
  }

  /**
   * Remove an initDataType and initData combination from this store.
   * Returns the associated value if it has been found, `undefined` otherwise.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {*}
   */
  public remove(
    initData : Uint8Array,
    initDataType : string | undefined
  ) : T | undefined {
    const initDataHash = hashBuffer(initData);
    const indexOf = this._findIndex(initData, initDataType, initDataHash);
    if (indexOf === -1) {
      return undefined;
    }
    return this._storage.splice(indexOf, 1)[0].value;
  }

  /**
   * Find the index of the corresponding initData and initDataType in
   * `this._storage`. Returns `-1` if not found.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @param {number} initDataHash
   * @returns {boolean}
   */
  private _findIndex(
    initData : Uint8Array,
    initDataType : string|undefined,
    initDataHash : number
  ) : number {
    for (let i = 0; i < this._storage.length; i++) {
      const stored = this._storage[i];
      if (initDataHash === stored.initDataHash && initDataType === stored.initDataType) {
        if (areArraysOfNumbersEqual(initData, stored.initData)) {
          return i;
        }
      }
    }
    return -1;
  }
}
