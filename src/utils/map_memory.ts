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
 * Memorize Function results linked to a string or number, through a Map.
 *
 * @example
 * ```js
 * // Initialize the MapMemory with its logic:
 * const memory = new MapMemory(arg => {
 *   console.log("side-effect");
 *   return [arg];
 * });
 *
 * const str = "hello";
 *
 * // first time str is given: call the function, save the result and return it:
 * const arr1 = memory.get(str);
 * // >  "side-effect"
 * // <- ["hello"]
 *
 * // nth time str is given, returns the saved result without calling the
 * // function:
 * const arr2 = memory.get(str);
 * // <- ["hello"]
 *
 *
 * With a different string or number:
 * const str2 = "goodbye";
 *
 * const arr3 = memory.get(str2);
 * // >  "side-effect"
 * // <- ["goodbye"]
 *
 * ```
 * @class MapMemory
 */
export default class MapMemory<T extends number|string, U> {
    private readonly _fn : (obj : T) => U;
  private _map : Map<T, U>;
  /**
   * @param {Function}
   */
  constructor(fn : (obj : T) => U) {
    this._map = new Map();
    this._fn = fn;
  }
  /**
   * @param {Object} obj
   * @returns {*}
   */
  public get(obj : T) : U {
    const fromMemory = this._map.get(obj);
    if (!fromMemory) {
      const newElement = this._fn(obj);
      this._map.set(obj, newElement);
      return newElement;
    } else {
      return fromMemory;
    }
  }

  /**
   * @param {Object} obj
   */
  public destroy(obj : T) {
    this._map.delete(obj);
  }
}
