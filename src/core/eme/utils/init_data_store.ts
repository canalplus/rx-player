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

import hashBuffer from "../../../utils/hash_buffer";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import SimpleSet from "../../../utils/simple_set";

/**
 * Memorize initialization data with straightforward methods.
 * @class InitDataStore
 */
export default class InitDataStore {
  private _namedTypeData : Record<string, SimpleSet>;
  private _unnamedTypeData : SimpleSet;

  constructor() {
    this._namedTypeData = {};
    this._unnamedTypeData = new SimpleSet();
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
    if (!isNonEmptyString(initDataType)) {
      return this._unnamedTypeData.test(hashBuffer(initData));
    }
    if (this._namedTypeData[initDataType] == null) {
      return false;
    }
    return this._namedTypeData[initDataType].test(hashBuffer(initData));
  }

  /**
   * Add initialization data to this memory.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   */
  public add(
    initData : Uint8Array,
    initDataType : string|undefined
  ) {
    if (this.has(initData, initDataType)) {
      return;
    }
    if (!isNonEmptyString(initDataType)) {
      this._unnamedTypeData.add(hashBuffer(initData));
      return;
    }

    if (this._namedTypeData[initDataType] == null) {
      this._namedTypeData[initDataType] = new SimpleSet();
    }
    this._namedTypeData[initDataType].add(hashBuffer(initData));
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
    if (!isNonEmptyString(initDataType)) {
      const hashed = hashBuffer(initData);
      if (this._unnamedTypeData.test(hashed)) {
        this._unnamedTypeData.remove(hashed);
        return true;
      }
      return false;
    } else {
      if (this._namedTypeData[initDataType] == null) {
        return false;
      }
      const hashed = hashBuffer(initData);
      const simpleSet = this._namedTypeData[initDataType];
      if (simpleSet.test(hashed)) {
        simpleSet.remove(hashed);
        return true;
      }
      return false;
    }
  }
}
