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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-restricted-properties */

import arrayIncludes from "../array_includes";

/* eslint-disable @typescript-eslint/unbound-method */
const initialArrayIncludes = Array.prototype.includes;
/* eslint-enable @typescript-eslint/unbound-method */
describe("utils - array-includes", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Array.prototype as any).includes = undefined;
  });

  afterEach(() => {
    Array.prototype.includes = initialArrayIncludes;
  });

  it("should be true if a number is included", () => {
    expect(arrayIncludes([1, 2, 3, 4, 5], 1)).toBe(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 2)).toBe(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 3)).toBe(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 4)).toBe(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 5)).toBe(true);

    expect(arrayIncludes([1, "toto", /aa/, 4, []], 4)).toBe(true);
  });

  it("should always be false if an empty array is given", () => {
    expect(arrayIncludes([], undefined)).toBe(false);
    expect(arrayIncludes([], null)).toBe(false);
    expect(arrayIncludes([], 0)).toBe(false);
    expect(arrayIncludes([], "")).toBe(false);
    expect(arrayIncludes([], [])).toBe(false);
  });

  it("should be false if a number is not included", () => {
    expect(arrayIncludes([1, 2, 3, 4, 5], 0)).toBe(false);
    expect(arrayIncludes([1, 2, /aaaa/, 4, 5], 6)).toBe(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], Infinity)).toBe(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], NaN)).toBe(false);
  });

  it("should be true for NaN values", () => {
    expect(arrayIncludes([1, NaN, 3, 4, 5], NaN)).toBe(true);
  });

  it("should be true if a string is included", () => {
    expect(arrayIncludes(["abc", "", "toto", "bar", "baz"], ""))
      .toBe(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "abc"))
      .toBe(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "foo"))
      .toBe(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "toto"))
      .toBe(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "bar"))
      .toBe(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "baz"))
      .toBe(true);

    expect(arrayIncludes(["abc", "toto", /aa/, 4, []], "toto")).toBe(true);
  });

  it("should be true if a boolean is included", () => {
    expect(arrayIncludes([true, false, true, "bar", "baz"], true))
      .toBe(true);
    expect(arrayIncludes([true, false, true, "bar", "baz"], false))
      .toBe(true);
    expect(arrayIncludes([true, false], true))
      .toBe(true);
    expect(arrayIncludes([false, "toto", /aa/, 4, []], false)).toBe(true);
  });

  it("should be true if an object is included", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2], obj1))
      .toBe(true);
    expect(arrayIncludes([obj1, obj2], obj2))
      .toBe(true);
    expect(arrayIncludes([1, obj1, 3, obj2, 5], obj2)).toBe(true);
  });

  it("should be false if an object is not included", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj3 = { o: 4 };
    const obj4 = { z: obj1, t: { a: 4 } };
    expect(arrayIncludes<unknown>([obj1, obj2, obj3], obj4))
      .toBe(false);
    expect(arrayIncludes<unknown>([1, obj4, 3, obj3, 5], obj2)).toBe(false);
  });

  it("should not work for deep equality with objects", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj2bis = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2], obj2bis))
      .toBe(false);
  });

  it("should take a starting index as first argument", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj3 = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2, obj3], obj2))
      .toBe(true);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 0))
      .toBe(true);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 1))
      .toBe(true);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 2))
      .toBe(false);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 3)) // out of bounds
      .toBe(false);
  });

  it("should go from the end if the given index is negative", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj3 = { a: obj1, b: { a: 4 } };
    const obj4 = {};
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3))
      .toBe(true);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -1))
      .toBe(false);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -2))
      .toBe(true);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -3))
      .toBe(true);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -12)) // out of bounds
      .toBe(true);
  });
});
