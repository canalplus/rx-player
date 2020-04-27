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

import areArraysOfNumbersEqual from "./are_arrays_of_numbers_equal";

/**
 * Associative array implementation which will store an unique value per init
 * data encountered.
 *
 * This is a very simple tuple-based implementation. As such getting/setting
 * values becomes more and more expensive as more and more items are stored.
 *
 * An implementation based on a hash map could be done for more complex cases.
 * @class InitDataStorage
 */
export default class InitDataStorage<T> {
  public tuples : Array<[Uint8Array, T]>;
  constructor() {
    this.tuples = [];
  }

  /**
   * Returns index for a particular value in the `tuples` object.
   * Returns `-1` if not found.
   * @param {Uint8Array} key
   * @returns {number}
   */
  public getIndex(key : Uint8Array) : number {
    for (let i = 0; i < this.tuples.length; i++) {
      if (areArraysOfNumbersEqual(key, this.tuples[i][0])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Returns value associated to the given init data.
   * @param {Uint8Array} key
   * @returns {*}
   */
  public get(key : Uint8Array) : T | undefined {
    const index = this.getIndex(key);
    if (index === -1) {
      return undefined;
    }
    return this.tuples[index][1];
  }

  /**
   * Set a value associated to the given init data.
   * @param {Uint8Array} key
   * @param {*} value
   */
  public set(key : Uint8Array, value : T) : void {
    const index = this.getIndex(key);
    if (index === -1) {
      this.tuples.push([key, value]);
    } else {
      this.tuples[index] = [key, value];
    }
  }

  /**
   * Check if the init data given is already associated to a value.
   * If it is, don't update that value and returns `false`.
   * If it is not, update that value and returns `true`.
   * @param {Uint8Array} key
   * @param {*} value
   * @returns {boolean}
   */
  public setIfNone(key : Uint8Array, value : T) : boolean {
    const index = this.getIndex(key);
    if (index === -1) {
      this.tuples.push([key, value]);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Remove a value linked to the given init data and return it.
   * Returns `undefined` if nothing was stored with this init data.
   * @param {Uint8Array} key
   * @returns {*}
   */
  public remove(key : Uint8Array) : T | undefined {
    const index = this.getIndex(key);
    if (index === -1) {
      return undefined;
    } else {
      return this.tuples[index][1];
    }
  }

  /**
   * Returns `true` if no data is currently stored.
   * `false` otherwise.
   * @returns {boolean}
   */
  public isEmpty() : boolean {
    return this.tuples.length === 0;
  }
}
