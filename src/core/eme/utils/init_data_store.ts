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

import arrayIncludes from "../../../utils/array-includes";
import hashBuffer from "../../../utils/hash_buffer";

/**
 * Memorize initialization data with straightforward methods.
 * @class InitDataStore
 */
export default class InitDataStore {
  private _namedTypeData : Record<string, number[]>;
  private _undefinedTypeData : number[];

  constructor() {
    this._namedTypeData = {};
    this._undefinedTypeData = [];
  }

  /**
   * Returns true if this instance has the given initData stored.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {boolean}
   */
  public has(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : boolean {
    if (!initDataType) {
      return arrayIncludes(this._undefinedTypeData, hashBuffer(initData));
    }
    if (!this._namedTypeData[initDataType]) {
      return false;
    }
    return arrayIncludes(this._namedTypeData[initDataType], hashBuffer(initData));
  }

  /**
   * Add initialization data to this memory.
   * @param {Uint8Array} initData
   * @param {string|_undefinedTypeData} initDataType
   */
  public add(
    initData : Uint8Array,
    initDataType : string|undefined
  ) {
    if (this.has(initData, initDataType)) {
      return;
    }
    if (!initDataType) {
      this._undefinedTypeData.push(hashBuffer(initData));
      return;
    }

    if (!this._namedTypeData[initDataType]) {
      this._namedTypeData[initDataType] = [];
    }
    this._namedTypeData[initDataType].push(hashBuffer(initData));
  }

  /**
   * Remove the initialization data from this memory.
   * Returns true if this instance had the given initData stored.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {boolean}
   */
  public remove(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : boolean {
    if (!initDataType) {
      const indexOf = this._undefinedTypeData.indexOf(hashBuffer(initData));
      if (indexOf >= 0) {
        this._undefinedTypeData.splice(indexOf, 1);
        return true;
      }
      return false;
    } else {
      if (!this._namedTypeData[initDataType]) {
        return false;
      }
      const arr = this._namedTypeData[initDataType];
      const indexOf = arr.indexOf(hashBuffer(initData));
      if (indexOf >= 0) {
        arr.splice(indexOf, 1);
        return true;
      }
      return false;
    }
  }
}
