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

// XXX TODO
import { hashBuffer } from "./sessions_set/hash_init_data";

/**
 * Memorize initialization data with straightforward methods.
 * @class InitDataStore
 */
export default class InitDataStore {
  private _data : Record<string, number[]>;

  constructor() {
    this._data = {};
  }

  /**
   * Returns true if this instance has the given initData stored.
   * @param {Uint8Array} initData
   * @param {string} initDataType
   * @returns {boolean}
   */
  public has(initData : Uint8Array, initDataType : string) : boolean {
    if (!this._data[initDataType]) {
      return false;
    }

    const arr = this._data[initDataType];

    // XXX TODO
    return arr.indexOf(hashBuffer(initData)) >= 0;
  }

  /**
   * Add initialization data to this memory.
   * @param {Uint8Array} initData
   * @param {string} initDataType
   */
  public add(initData : Uint8Array, initDataType : string) {
    if (this.has(initData, initDataType)) {
      return;
    }
    if (!this._data[initDataType]) {
      this._data[initDataType] = [];
    }
    this._data[initDataType].push(hashBuffer(initData));
  }

  /**
   * Remove the initialization data from this memory.
   * Returns true if this instance had the given initData stored.
   * @param {Uint8Array} initData
   * @param {string} initDataType
   * @returns {boolean}
   */
  public remove(initData : Uint8Array, initDataType : string) : boolean {
    if (!this._data[initDataType]) {
      return false;
    }
    const arr = this._data[initDataType];
    const indexOf = arr.indexOf(hashBuffer(initData));
    if (indexOf >= 0) {
      arr.splice(indexOf, 1);
      return true;
    }
    return false;
  }
}
