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
import { IInitializationDataInfo } from "../types";

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
   * Note: it is possible to move a value to the end of this array by calling
   * the `getAndReuse` method.
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
  public get(initializationData : IInitializationDataInfo) : T | undefined {
    const initDataHash = hashBuffer(initializationData.data);
    const index = this._findIndex(initializationData, initDataHash);
    return index >= 0 ? this._storage[index].value :
                        undefined;
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
    initializationData : IInitializationDataInfo
  ) : T | undefined {
    const initDataHash = hashBuffer(initializationData.data);
    const index = this._findIndex(initializationData, initDataHash);
    if (index === -1) {
      return undefined;
    }
    const item = this._storage.splice(index, 1)[0];
    this._storage.push(item);
    return item.value;
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
    initializationData : IInitializationDataInfo,
    value : T
  ) : void {
    const initDataHash = hashBuffer(initializationData.data);
    const indexOf = this._findIndex(initializationData, initDataHash);
    if (indexOf >= 0) {
      // this._storage contains the stored value in the same order they have
      // been put. So here we want to remove the previous element and re-push
      // it to the end.
      this._storage.splice(indexOf, 1);
    }
    this._storage.push({ initData: initializationData.data,
                         initDataType: initializationData.type,
                         initDataHash,
                         value });
  }

  /**
   * Add to the store a value linked to the corresponding initData and
   * initDataType.
   * If a value linked to those was already stored, do nothing and returns
   * `false`.
   * If not, add the value and return `true`.
   *
   * This can be used as a more performant version of doing both a `get` call -
   * to see if a value is stored linked to that data - and then if not doing a
   * store. `storeIfNone` is more performant as it will only perform hashing
   * and a look-up a single time.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {boolean}
   */
  public storeIfNone(
    initializationData : IInitializationDataInfo,
    value : T
  ) : boolean {
    const initDataHash = hashBuffer(initializationData.data);
    const indexOf = this._findIndex(initializationData, initDataHash);
    if (indexOf >= 0) {
      return false;
    }
    this._storage.push({ initData: initializationData.data,
                         initDataType: initializationData.type,
                         initDataHash,
                         value });
    return true;
  }

  /**
   * Remove an initDataType and initData combination from this store.
   * Returns the associated value if it has been found, `undefined` otherwise.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {*}
   */
  public remove(initializationData : IInitializationDataInfo) : T | undefined {
    const initDataHash = hashBuffer(initializationData.data);
    const indexOf = this._findIndex(initializationData, initDataHash);
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
    initializationData : IInitializationDataInfo,
    initDataHash : number
  ) : number {
    const { type: initDataType, data: initData } = initializationData;
    // Begin by the last element as we usually re-encounter the last stored
    // initData sooner than the first one.
    for (let i = this._storage.length - 1; i >= 0; i--) {
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
