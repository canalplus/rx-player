"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Memoize Function results linked to an object, through a WeakMap.
 *
 * @example
 * ```js
 * // Initialize the WeakMapMemory with its logic:
 * const memory = new WeakMapMemory(arg => {
 *   console.log("side-effect");
 *   return [arg.a, arg.b];
 * });
 *
 * const obj = { a: 1, b: 2 };
 *
 * // first time obj is given: call the function, save the result and return it:
 * const arr1 = memory.get(obj);
 * // >  "side-effect"
 * // <- [1, 2]
 *
 * // nth time obj is given, returns the saved result without calling the
 * // function:
 * const arr2 = memory.get(obj);
 * // <- [1, 2]
 *
 * // both of these use the same object, so the result is also the exact same
 * // one
 * console.log(arr1 === arr2); // => true
 *
 * // /!\ with a new object however:
 * const obj2 = { a: 1, b: 2 };
 *
 * const arr3 = memory.get(obj2);
 * // >  "side-effect"
 * // <- [1, 2]
 *
 * console.log(arr1 === arr3); // => false
 * ```
 * @class WeakMapMemory
 */
// eslint-disable-next-line @typescript-eslint/ban-types
var WeakMapMemory = /** @class */ (function () {
    /**
     * @param {Function}
     */
    function WeakMapMemory(fn) {
        this._weakMap = new WeakMap();
        this._fn = fn;
    }
    /**
     * @param {Object} obj
     * @returns {*}
     */
    WeakMapMemory.prototype.get = function (obj) {
        var fromMemory = this._weakMap.get(obj);
        if (fromMemory === undefined) {
            var newElement = this._fn(obj);
            this._weakMap.set(obj, newElement);
            return newElement;
        }
        else {
            return fromMemory;
        }
    };
    /**
     * @param {Object} obj
     */
    WeakMapMemory.prototype.destroy = function (obj) {
        this._weakMap.delete(obj);
    };
    return WeakMapMemory;
}());
exports.default = WeakMapMemory;
