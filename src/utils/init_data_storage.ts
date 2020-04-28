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

export type IInitDataMap<T> = Partial<Record<string, Array<[Uint8Array, T]>>>;

/**
 * Associative array implementation which will store an unique value per init
 * data encountered.
 * @class InitDataStorage
 */
export default class InitDataStorage<T> {
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
  private _map : IInitDataMap<T>;

  /** Create a new InitDataStorage. */
  constructor(initialMap? : IInitDataMap<T>) {
    this._map = initialMap ?? {};
  }

  /**
   * Returns value associated to the given init data.
   * @param {Uint8Array} key
   * @returns {*}
   */
  public get(key : Uint8Array) : T | undefined {
    const hashed = hashBuffer(key);
    const mapped = this._map[hashed];
    if (mapped === undefined) {
      return undefined;
    }
    for (let i = 0; i < mapped.length; i++) {
      if (areArraysOfNumbersEqual(key, mapped[i][0])) {
        return mapped[i][1];
      }
    }
    return undefined;
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
          val[i][1] = value;
          return;
        }
      }
    }

    if (val !== undefined) {
      val.push([key, value]);
    } else {
      this._map[hashed] = [[key, value]];
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

    if (val !== undefined) {
      val.push([key, value]);
    } else {
      this._map[hashed] = [[key, value]];
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
        const val = mapped[i][1];
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
    return Object.keys(this._map).length === 0;
  }

  /**
   * Returns copy of underlying InitDataStorage HashMap.
   * It is possible to re-initialize a new InitDataStorage by constructing a
   * new one with this object in argument.
   * /!\ The underlying initData share the same reference for performance+memory
   * reasons. You should not update those Uint8Array.
   * @returns {Object}
   */
  public linearize() : IInitDataMap<T> {
    return Object.keys(this._map).reduce<IInitDataMap<T>>((acc, key) => {
      const oldVal = this._map[key];
      if (oldVal === undefined) {
        return acc;
      }
      acc[key] = oldVal.map((tuple : [Uint8Array, T]) : [Uint8Array, T] =>
        tuple.slice() as [Uint8Array, T]);
      return acc;
    }, {});
  }
}
