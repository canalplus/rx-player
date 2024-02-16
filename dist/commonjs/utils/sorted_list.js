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
var array_find_1 = require("./array_find");
var array_includes_1 = require("./array_includes");
/**
 * Creates an Array automatically sorted with the sorting function given to the
 * constructor when the add method is called.
 *
 * @example
 * ```js
 * const sortedList = new SortedList((a, b) => a.start - b.start);
 * const element1 = { start: 20 };
 * const element2 = { start: 10 };
 * const element3 = { start: 15 };
 *
 * sortedList.add(element1, element2);
 * console.log(sortedList.unwrap());
 * // -> [{ start: 10 }, { start : 20 }]
 *
 * sortedList.add(element3);
 * console.log(sortedList.unwrap());
 * // -> [{ start: 10 }, { start : 15 }, { start: 20 }]
 *
 * sortedList.removeElement(element2);
 * // -> [{ start: 10 }, { start: 15 }]
 * ```
 * @class SortedList
 */
var SortedList = /** @class */ (function () {
    /**
     * @param {Function} sortingFunction
     */
    function SortedList(sortingFunction) {
        this._array = [];
        this._sortingFn = sortingFunction;
    }
    /**
     * Add a new element to the List at the right place for the List to stay
     * sorted.
     *
     * /!\ The added Element will share the same reference than the given
     * argument, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @param {...*} elements
     */
    SortedList.prototype.add = function () {
        var elements = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            elements[_i] = arguments[_i];
        }
        elements.sort(this._sortingFn);
        var j = 0;
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var inserted = false;
            while (!inserted && j < this._array.length) {
                if (this._sortingFn(element, this._array[j]) < 0) {
                    this._array.splice(j, 0, element);
                    inserted = true;
                }
                else {
                    j++;
                }
            }
            if (!inserted) {
                this._array.push(element);
            }
        }
    };
    /**
     * Returns the current length of the list.
     * @returns {number}
     */
    SortedList.prototype.length = function () {
        return this._array.length;
    };
    /**
     * Returns the nth element. Throws if the index does not exist.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @throws Error - Throws if the given index is negative or superior to the
     * array's length.
     * @param {number} index
     * @returns {*}
     */
    SortedList.prototype.get = function (index) {
        if (index < 0 || index >= this._array.length) {
            throw new Error("Invalid index.");
        }
        return this._array[index];
    };
    SortedList.prototype.toArray = function () {
        return this._array.slice();
    };
    /**
     * Find the first element corresponding to the given predicate.
     *
     * /!\ The returned element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @param {Function} fn
     * @returns {*}
     */
    SortedList.prototype.findFirst = function (fn) {
        return (0, array_find_1.default)(this._array, fn);
    };
    /**
     * Returns true if the List contains the given element.
     * @param {*} element
     * @returns {Boolean}
     */
    SortedList.prototype.has = function (element) {
        return (0, array_includes_1.default)(this._array, element);
    };
    /**
     * Remove the first occurence of the given element.
     * Returns the index of the removed element. Undefined if not found.
     * @returns {number|undefined}
     */
    SortedList.prototype.removeElement = function (element) {
        var indexOf = this._array.indexOf(element);
        if (indexOf >= 0) {
            this._array.splice(indexOf, 1);
            return indexOf;
        }
        return undefined;
    };
    /**
     * Returns the first element.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @returns {*}
     */
    SortedList.prototype.head = function () {
        return this._array[0];
    };
    /**
     * Returns the last element.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @returns {*}
     */
    SortedList.prototype.last = function () {
        return this._array[this._array.length - 1];
    };
    /**
     * Remove the first element.
     * Returns the element removed or undefined if no element were removed.
     * @returns {*}
     */
    SortedList.prototype.shift = function () {
        return this._array.shift();
    };
    /**
     * Remove the last element.
     * Returns the element removed or undefined if no element were removed.
     * @returns {*}
     */
    SortedList.prototype.pop = function () {
        return this._array.pop();
    };
    return SortedList;
}());
exports.default = SortedList;
