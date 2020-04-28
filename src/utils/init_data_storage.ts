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
import hashBuffer from "./hash_buffer";

/**
 * Associative array implementation which will store an unique value per init
 * data encountered.
 *
 * It is specifically written for typical initialization data storage where very
 * few (most of the time only one) initialization data will be stored at a time.
 * In this case, just using an array of tuple makes sense.
 * When more initialization data become involved, we switch to a sort of HashMap
 * implementation with separate chaining collision resolution (chosen because
 * really simple to implement in JavaScript).
 * This double implementation allows for faster checks when there is few / a lot
 * of data in this storage compared to choosing just one.
 *
 * This may seem overkill though, as initialization data stay fairly short.
 * @class InitDataStorage
 */
export default class InitDataStorage<T> {
  /** Every initialization data stored. */
  public keys : Uint8Array[];
  /**
   * Corresponding values for each initialization data stored. In the same order
   * than for the `keys` array.
   */
  public values : T[];
  /**
   * HashMap linking initialization data to the corresponding index in the
   * `values` (or `keys`) array.
   * This is kind of a frankenstein implementation where we rely on both the
   * browser's implementation of a JavaScript Object and add a supplementary
   * layer to handle hash collision created on the JS-side (because we use the
   * `hashBuffer` function to generate a hash from the init data, an
   * Uint8Array).
   * We used a separate chaining method for simplicity sake.
   */
  private _map : Partial<Record<string, Array<[Uint8Array, number]>>>;

  /** Create a new InitDataStorage. */
  constructor() {
    this.keys = [];
    this.values = [];
    this._map = {};
  }

  /**
   * Returns index for a particular key in the `keys` array - which is the same
   * index than its associated value in the `values array.
   * Returns `-1` if not found.
   * @param {Uint8Array} key
   * @returns {number}
   */
  public getIndex(key : Uint8Array) : number {
    // Perform linear search on the very frequent simpler cases
    if (this.keys.length <= 3) {
      for (let i = 0; i < this.keys.length; i++) {
        if (areArraysOfNumbersEqual(key, this.keys[i])) {
          return i;
        }
      }
      return -1;
    }

    // on more complex cases, reduce the number of checks by hashing and
    // checking `this._map`
    const hashed = hashBuffer(key);
    const mapped = this._map[hashed];
    if (mapped === undefined) {
      return -1;
    }
    for (let i = 0; i < mapped.length; i++) {
      if (areArraysOfNumbersEqual(key, mapped[i][0])) {
        return mapped[i][1];
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
    return this.values[index];
  }

  /**
   * Set a value associated to the given init data.
   * @param {Uint8Array} key
   * @param {*} value
   */
  public set(key : Uint8Array, value : T) : void {
    const hashed = hashBuffer(key);
    const val = this._map[hashed];
    if (val !== undefined) {
      for (let i = 0; i < val.length; i++) {
        if (areArraysOfNumbersEqual(key, val[i][0])) {
          const index = val[i][1];
          this.values[index] = value;
          return;
        }
      }
    }

    this.keys.push(key);
    this.values.push(value);
    if (val !== undefined) {
      val.push([key, this.keys.length - 1]);
    } else {
      this._map[hashed] = [[key, this.keys.length - 1]];
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
    const hashed = hashBuffer(key);
    const val = this._map[hashed];
    if (val !== undefined) {
      for (let i = 0; i < val.length; i++) {
        if (areArraysOfNumbersEqual(key, val[i][0])) {
          return false;
        }
      }
    }

    this.keys.push(key);
    this.values.push(value);
    if (val !== undefined) {
      val.push([key, this.keys.length - 1]);
    } else {
      this._map[hashed] = [[key, this.keys.length - 1]];
    }
    return true;
  }

  /**
   * Remove a value linked to the given init data and return it.
   * Returns `undefined` if nothing was stored with this init data.
   * @param {Uint8Array} key
   * @returns {*}
   */
  public remove(key : Uint8Array) : T | undefined {
    const hashed = hashBuffer(key);
    const mapped = this._map[hashed];
    if (mapped === undefined) {
      return undefined;
    }
    for (let i = 0; i < mapped.length; i++) {
      if (areArraysOfNumbersEqual(key, mapped[i][0])) {
        const idx = mapped[i][1];
        const val = this.values.splice(idx, 1)[0];
        this.keys.splice(idx, 1);
        mapped.splice(i, 1);
        if (mapped.length === 0) {
          delete this._map[hashed];
        }
        return val;
      }
    }
    return undefined;
  }

  /**
   * Returns `true` if no data is currently stored.
   * `false` otherwise.
   * @returns {boolean}
   */
  public isEmpty() : boolean {
    return this.keys.length === 0;
  }
}
