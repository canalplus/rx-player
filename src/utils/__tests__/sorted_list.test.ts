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

import SortedList from "../sorted_list";

describe("utils - SortedList", () => {
  it("should authorize adding multiple times the same item", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item = { start: 12 };
    sortedList.add(item);
    sortedList.add(item);
    sortedList.add(item);
  });

  it("should return then number of items when calling `length`", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    expect(sortedList.length()).toBe(0);
    const item = { start: 12 };
    const item2 = { start: 13 };
    sortedList.add(item);
    expect(sortedList.length()).toBe(1);
    sortedList.add(item2);
    expect(sortedList.length()).toBe(2);
    sortedList.add(item);
    expect(sortedList.length()).toBe(3);
  });

  it("should sort when adding and get the corresponding index when calling `get`", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: -5 };
    const item2 = { start: 10 };
    const item3 = { start: 30 };
    const item4 = { start: 42 };
    const item5 = { start: 99 };
    sortedList.add(item3);
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item4);
    sortedList.add(item5);
    sortedList.add(item1); // same than the first on purpose
    expect(sortedList.get(0)).toBe(item1);
    expect(sortedList.get(1)).toBe(item1);
    expect(sortedList.get(2)).toBe(item2);
    expect(sortedList.get(3)).toBe(item3);
    expect(sortedList.get(4)).toBe(item4);
    expect(sortedList.get(5)).toBe(item5);
  });

  it("should throw when `getting` on an empty SortedList", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    expect(() => {
      sortedList.get(0);
    }).toThrow();
  });

  it("should throw when getting outside the bounds of the SortedList", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    const item3 = { start: 13 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item3);
    sortedList.add(item1);
    expect(() => {
      sortedList.get(4);
    }).toThrow();
  });

  it("should throw when getting with a negative index", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    const item3 = { start: 13 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item3);
    sortedList.add(item1);
    expect(() => {
      sortedList.get(-1);
    }).toThrow();
  });

  /* eslint-disable max-len */
  it("should return the first added item which answer the predicate when calling `findFirst`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    const item3 = { start: 13 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item3);

    expect(sortedList.findFirst((i) => i.start === 12)).toBe(item1);
    expect(sortedList.findFirst((i) => i.start === 13)).toBe(item2);
  });

  /* eslint-disable max-len */
  it("should return undefined if no item answers the predicate when calling `findFirst`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    const item3 = { start: 13 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item3);

    expect(sortedList.findFirst((i) => i.start === 15)).toBe(undefined);
  });

  /* eslint-disable max-len */
  it("should return true when calling `has` if it has at least one time that item", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    const item3 = { start: 13 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item1);
    sortedList.add(item3);

    expect(sortedList.has(item1)).toBe(true);
    expect(sortedList.has(item2)).toBe(true);
    expect(sortedList.has(item3)).toBe(true);
  });

  it("should return false when calling `has` if it doesn't have that item", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    const item3 = { start: 13 };
    const item4 = { start: 12 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item1);
    sortedList.add(item3);

    expect(sortedList.has(item4)).toBe(false);
  });

  /* eslint-disable max-len */
  it("should remove first item corresponding to the element given to `removeElement` and return its index", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item1);

    expect(sortedList.removeElement(item1)).toBe(0);
    expect(sortedList.length()).toBe(2);
    expect(sortedList.has(item1)).toBe(true);

    expect(sortedList.removeElement(item1)).toBe(0);
    expect(sortedList.length()).toBe(1);
    expect(sortedList.has(item1)).toBe(false);
  });

  /* eslint-disable max-len */
  it("should return undefined and do nothing if the element given to `removeElement` does not exist in the SortedList", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: 12 };
    const item2 = { start: 13 };
    const item3 = { start: 13 };
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item1);

    expect(sortedList.length()).toBe(3);
    expect(sortedList.removeElement(item3)).toBe(undefined);
    expect(sortedList.length()).toBe(3);
  });

  it("should return undefined when calling `head` on an empty `SortedList`", () => {
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    expect(sortedList.head()).toBe(undefined);
  });

  /* eslint-disable max-len */
  it("should return the first element when calling `head` on an non-empty `SortedList`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: -5 };
    const item2 = { start: 10 };
    const item3 = { start: 30 };
    const item4 = { start: 42 };
    const item5 = { start: 99 };
    sortedList.add(item3);
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item4);
    sortedList.add(item5);
    sortedList.add(item1); // same than the first on purpose
    expect(sortedList.head()).toBe(item1);
  });

  /* eslint-disable max-len */
  it("should return undefined when calling `last` on an empty `SortedList`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    expect(sortedList.last()).toBe(undefined);
  });

  /* eslint-disable max-len */
  it("should return the last element when calling `last` on an non-empty `SortedList`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: -5 };
    const item2 = { start: 10 };
    const item3 = { start: 30 };
    const item4 = { start: 42 };
    const item5 = { start: 99 };
    sortedList.add(item3);
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item4);
    sortedList.add(item5);
    sortedList.add(item1); // same than the first on purpose
    expect(sortedList.last()).toBe(item5);
  });

  /* eslint-disable max-len */
  it("should return undefined and do nothing when calling `shift` on an empty `SortedList`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    expect(sortedList.length()).toBe(0);
    expect(sortedList.shift()).toBe(undefined);
    expect(sortedList.length()).toBe(0);
  });

  /* eslint-disable max-len */
  it("should return the first element and remove it when calling `shift` on an non-empty `SortedList`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: -5 };
    const item2 = { start: 10 };
    const item3 = { start: 30 };
    const item4 = { start: 42 };
    const item5 = { start: 99 };
    sortedList.add(item3);
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item4);
    sortedList.add(item5);

    expect(sortedList.length()).toBe(5);

    expect(sortedList.shift()).toBe(item1);
    expect(sortedList.length()).toBe(4);
    expect(sortedList.head()).toBe(item2);

    expect(sortedList.shift()).toBe(item2);
    expect(sortedList.length()).toBe(3);
    expect(sortedList.head()).toBe(item3);

    expect(sortedList.shift()).toBe(item3);
    expect(sortedList.length()).toBe(2);
    expect(sortedList.head()).toBe(item4);

    expect(sortedList.shift()).toBe(item4);
    expect(sortedList.length()).toBe(1);
    expect(sortedList.head()).toBe(item5);

    expect(sortedList.shift()).toBe(item5);
    expect(sortedList.length()).toBe(0);
    expect(sortedList.head()).toBe(undefined);

    expect(sortedList.shift()).toBe(undefined);
    expect(sortedList.length()).toBe(0);
    expect(sortedList.head()).toBe(undefined);
  });

  /* eslint-disable max-len */
  it("should return undefined and do nothing when calling `pop` on an empty `SortedList`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    expect(sortedList.length()).toBe(0);
    expect(sortedList.pop()).toBe(undefined);
    expect(sortedList.length()).toBe(0);
  });

  /* eslint-disable max-len */
  it("should return the last element and remove it when calling `pop` on an non-empty `SortedList`", () => {
    /* eslint-enable max-len */
    const sortedList = new SortedList<{ start: number }>((a, b) => a.start - b.start);
    const item1 = { start: -5 };
    const item2 = { start: 10 };
    const item3 = { start: 30 };
    const item4 = { start: 42 };
    const item5 = { start: 99 };
    sortedList.add(item3);
    sortedList.add(item1);
    sortedList.add(item2);
    sortedList.add(item4);
    sortedList.add(item5);

    expect(sortedList.length()).toBe(5);

    expect(sortedList.pop()).toBe(item5);
    expect(sortedList.length()).toBe(4);
    expect(sortedList.last()).toBe(item4);

    expect(sortedList.pop()).toBe(item4);
    expect(sortedList.length()).toBe(3);
    expect(sortedList.last()).toBe(item3);

    expect(sortedList.pop()).toBe(item3);
    expect(sortedList.length()).toBe(2);
    expect(sortedList.last()).toBe(item2);

    expect(sortedList.pop()).toBe(item2);
    expect(sortedList.length()).toBe(1);
    expect(sortedList.last()).toBe(item1);

    expect(sortedList.pop()).toBe(item1);
    expect(sortedList.length()).toBe(0);
    expect(sortedList.last()).toBe(undefined);

    expect(sortedList.pop()).toBe(undefined);
    expect(sortedList.length()).toBe(0);
    expect(sortedList.last()).toBe(undefined);
  });
});
