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

import arrayFind = require("array-find");
import arrayIncludes from "./array-includes";

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
 * sortedList.removeFirst(element2);
 * // -> [{ start: 10 }, { start: 15 }]
 * ```
 * @class SortedList
 */
export default class SortedList<T> {
  private _sortingFn : (a : T, b : T) => number;
  private _array : T[];

  /**
   * @param {Function} sortingFunction
   */
  constructor(sortingFunction : (a : T, b : T) => number) {
    this._array = [];
    this._sortingFn = sortingFunction;
  }

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
  get(index : number) : T {
    if (index < 0 || index >= this._array.length) {
      throw new Error("Invalid index.");
    }
    return this._array[index];
  }

  /**
   * Returns this list as a JS array.
   *
   * /!\ The returned Array shares the same reference with what is used
   * internally, any mutation on your part can lead to an un-sorted SortedList.
   * You can still re-force the sorting to happen by calling forceSort.
   * @returns {Array.<*>}
   */
  unwrap() : T[] {
    return this._array;
  }

  /**
   * Find the first element corresponding to the given predicate.
   *
   * /!\ The returned element shares the same reference with what is used
   * internally, any mutation on your part can lead to an un-sorted SortedList.
   * You can still re-force the sorting to happen by calling forceSort.
   * @param {Function} fn
   * @returns {*}
   */
  find(fn : (element : T) => boolean) : T | undefined {
    return arrayFind(this._array, fn);
  }

  /**
   * Returns the index of the given element in the list.
   * -1 if not found.
   * @param {*} element
   * @returns {number}
   */
  indexOf(element : T) : number {
    return this._array.indexOf(element);
  }

  /**
   * Returns true if the List contains the given element.
   * @param {*} element
   * @returns {Boolean}
   */
  has(element : T) : boolean {
    return arrayIncludes(this._array, element);
  }

  /**
   * Returns the current length of the list.
   * @returns {number}
   */
  length() : number {
    return this._array.length;
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
  add(...elements : T[]) {
    elements.sort(this._sortingFn);

    let j = 0;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      let inserted = false;
      while (!inserted && j < this._array.length) {
        if (this._sortingFn(element, this._array[j]) < 0) {
          this._array.splice(j, 0, element);
          inserted = true;
        } else {
          j++;
        }
      }
      if (!inserted) {
        this._array.push(element);
      }
    }
  }

  /**
   * Remove the first occurence of the given element.
   * Returns the index of the removed element. Undefined if not found.
   * @returns {number|undefined}
   */
  removeFirst(element : T) : number|undefined {
    const indexOf = this._array.indexOf(element);
    if (indexOf >= 0) {
      this._array.splice(indexOf, 1);
      return indexOf;
    }
  }

  /**
   * Returns the first element.
   *
   * /!\ The returned Element shares the same reference with what is used
   * internally, any mutation on your part can lead to an un-sorted SortedList.
   * You can still re-force the sorting to happen by calling forceSort.
   * @returns {*}
   */
  head() : T|undefined {
    return this._array[0];
  }

  /**
   * Returns the last element.
   *
   * /!\ The returned Element shares the same reference with what is used
   * internally, any mutation on your part can lead to an un-sorted SortedList.
   * You can still re-force the sorting to happen by calling forceSort.
   * @returns {*}
   */
  last() : T|undefined {
    return this._array[this._array.length - 1];
  }

  /**
   * Remove the first element.
   * Returns the element removed or undefined if no element were removed.
   * @returns {*}
   */
  shift() : T|undefined {
    return this._array.shift();
  }

  /**
   * Remove the last element.
   * Returns the element removed or undefined if no element were removed.
   * @returns {*}
   */
  pop() : T|undefined {
    return this._array.pop();
  }

  /**
   * Returns true if the given element is before the whole list when sorted.
   * As in, it would be the first element is pushed to the sortedList.
   * @param {*} element
   * @returns {boolean}
   */
  isBefore(element : T) : boolean {
    if (!this._array.length) {
      return true;
    }
    return this._sortingFn(element, this._array[0]) < 0;
  }

  /**
   * Returns true if the given element is after the whole list when sorted.
   * As in, it would be the last element is pushed to the sortedList.
   * @param {*} element
   * @returns {boolean}
   */
  isAfter(element : T) : boolean {
    if (!this._array.length) {
      return true;
    }
    return this._sortingFn(element, this._array[this._array.length - 1]) >= 0;
  }

  /**
   * Returns true if the wrapped Array is well-sorted.
   *
   * You might want to call this function to know if a mutation you've done
   * yourself impacted the order of elements.
   * You can then call the forceSort function to sort the list manually.
   *
   * @example
   * ```js
   * const sortedList = new SortedList((a, b) => a.start - b.start);
   * const element1 = { start: 20 };
   * const element2 = { start: 10 };
   *
   * sortedList.add(element1, element2);
   * console.log(sortedList.unwrap()); // -> [{ start: 10 }, { start : 20 }]
   * console.log(sortedList.checkSort()); // -> true
   *
   * element2.start = 5; // Mutation impacting the order of elements
   * console.log(sortedList.unwrap()); // -> [{ start: 10 }, { start : 5 }]
   * console.log(sortedList.checkSort()); // -> false
   *
   * sortedList.forceSort();
   * console.log(sortedList.unwrap()); // -> [{ start: 5 }, { start : 10 }]
   * console.log(sortedList.checkSort()); // -> true
   * ```
   * @returns {Boolean}
   */
  checkSort() : boolean {
    for (let i = 0; i < this._array.length - 1; i++) {
      if (this._sortingFn(this._array[i], this._array[i + 1]) > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Force the array to be sorted.
   *
   * You might want to call this function when you're unsure that a mutation
   * you've done yourself impacted the order of the elements in the list.
   */
  forceSort() {
    this._array.sort(this._sortingFn);
  }
}
