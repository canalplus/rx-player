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
export default class SortedList<T> {
    private readonly _sortingFn;
    private _array;
    /**
     * @param {Function} sortingFunction
     */
    constructor(sortingFunction: (a: T, b: T) => number);
    /**
     * Add a new element to the List at the right place for the List to stay
     * sorted.
     *
     * /!\ The added Element will share the same reference than the given
     * argument, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @param {...*} elements
     */
    add(...elements: T[]): void;
    /**
     * Returns the current length of the list.
     * @returns {number}
     */
    length(): number;
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
    get(index: number): T;
    toArray(): T[];
    /**
     * Find the first element corresponding to the given predicate.
     *
     * /!\ The returned element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @param {Function} fn
     * @returns {*}
     */
    findFirst(fn: (element: T) => boolean): T | undefined;
    /**
     * Returns true if the List contains the given element.
     * @param {*} element
     * @returns {Boolean}
     */
    has(element: T): boolean;
    /**
     * Remove the first occurence of the given element.
     * Returns the index of the removed element. Undefined if not found.
     * @returns {number|undefined}
     */
    removeElement(element: T): number | undefined;
    /**
     * Returns the first element.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @returns {*}
     */
    head(): T | undefined;
    /**
     * Returns the last element.
     *
     * /!\ The returned Element shares the same reference with what is used
     * internally, any mutation on your part can lead to an un-sorted SortedList.
     * You can still re-force the sorting to happen by calling forceSort.
     * @returns {*}
     */
    last(): T | undefined;
    /**
     * Remove the first element.
     * Returns the element removed or undefined if no element were removed.
     * @returns {*}
     */
    shift(): T | undefined;
    /**
     * Remove the last element.
     * Returns the element removed or undefined if no element were removed.
     * @returns {*}
     */
    pop(): T | undefined;
}
