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

/**
 * Simple hash-based set.
 * @class SimpleSet
 */
export default class SimpleSet {
  /**
   * Hashes currently stored
   * @type {Object}
   * @private
   */
  private _hashes : Partial<Record<string, true>>;

  constructor() {
    this._hashes = {};
  }

  /**
   * Add a new hash entry in the set.
   * Do not have any effect on already-added hashes
   * @param {string|number} x
   */
  public add(x : string|number) : void {
    this._hashes[x] = true;
  }

  /**
   * Remove an hash entry from the set.
   * Do not have any effect on already-removed or inexistent hashes
   * @param {string|number} x
   */
  public remove(x : string|number) : void {
    delete this._hashes[x];
  }

  /**
   * Test if the given hash has an entry in the set.
   * @param {string|number} x
   * @returns {boolean}
   */
  public test(x : string|number) : boolean {
    return this._hashes.hasOwnProperty(x);
  }

  /**
   * Returns true if there's currently no hash in this set.
   * @returns {boolean}
   */
  public isEmpty() : boolean {
    return Object.keys(this._hashes).length === 0;
  }
}
