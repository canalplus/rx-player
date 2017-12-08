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
 * Memoize Function results linked to an object, through a WeakMap.
 *
 * @example
 * ```js
 * const memory = new WeakMapMemory(arg => [arg.a, arg.b]);
 *
 * const obj = {
 *   a: 1,
 *   b: 2
 * };
 * const arr1 = memory.get(obj); // => [1, 2]
 * const arr2 = memory.get(obj); // => [1, 2]
 *
 * // both of these use the same object, so the result is also the exact same
 * // one
 * console.log(arr1 === arr2); // => true
 *
 * // /!\ with a new object however:
 *
 * const obj2 = {
 *   a: 1,
 *   b: 2
 * };
 * const arr3 = memory.get(obj2); // => [1, 2]
 * console.log(arr1 === arr3); // => false
 * ```
 * @class WeakMapMemory
 */
export default class WeakMapMemory<T extends object, U> {
  private _weakMap : WeakMap<T, U>;
  private _fn : (obj : T) => U;

  constructor(fn : (obj : T) => U) {
    this._weakMap = new WeakMap();
    this._fn = fn;
  }

  get(obj : T) {
    const fromMemory = this._weakMap.get(obj);
    if (!fromMemory) {
      const newElement = this._fn(obj);
      this._weakMap.set(obj, newElement);
      return newElement;
    } else {
      return fromMemory;
    }
  }

  destroy(obj : T) {
    this._weakMap.delete(obj);
  }
}
