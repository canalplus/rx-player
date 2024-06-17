import { describe, beforeEach, afterEach, it, expect } from "vitest";
import arrayIncludes from "../array_includes";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-restricted-properties */

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
    expect(arrayIncludes([1, 2, 3, 4, 5], 1)).toEqual(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 2)).toEqual(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 3)).toEqual(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 4)).toEqual(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 5)).toEqual(true);

    expect(arrayIncludes([1, "toto", /aa/, 4, []], 4)).toEqual(true);
  });

  it("should always be false if an empty array is given", () => {
    expect(arrayIncludes([], undefined)).toEqual(false);
    expect(arrayIncludes([], null)).toEqual(false);
    expect(arrayIncludes([], 0)).toEqual(false);
    expect(arrayIncludes([], "")).toEqual(false);
    expect(arrayIncludes([], [])).toEqual(false);
  });

  it("should be false if a number is not included", () => {
    expect(arrayIncludes([1, 2, 3, 4, 5], 0)).toEqual(false);
    expect(arrayIncludes([1, 2, /aaaa/, 4, 5], 6)).toEqual(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], Infinity)).toEqual(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], NaN)).toEqual(false);
  });

  it("should be true for NaN values", () => {
    expect(arrayIncludes([1, NaN, 3, 4, 5], NaN)).toEqual(true);
  });

  it("should be true if a string is included", () => {
    expect(arrayIncludes(["abc", "", "toto", "bar", "baz"], "")).toEqual(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "abc")).toEqual(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "foo")).toEqual(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "toto")).toEqual(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "bar")).toEqual(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "baz")).toEqual(true);

    expect(arrayIncludes(["abc", "toto", /aa/, 4, []], "toto")).toEqual(true);
  });

  it("should be true if a boolean is included", () => {
    expect(arrayIncludes([true, false, true, "bar", "baz"], true)).toEqual(true);
    expect(arrayIncludes([true, false, true, "bar", "baz"], false)).toEqual(true);
    expect(arrayIncludes([true, false], true)).toEqual(true);
    expect(arrayIncludes([false, "toto", /aa/, 4, []], false)).toEqual(true);
  });

  it("should be true if an object is included", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2], obj1)).toEqual(true);
    expect(arrayIncludes([obj1, obj2], obj2)).toEqual(true);
    expect(arrayIncludes([1, obj1, 3, obj2, 5], obj2)).toEqual(true);
  });

  it("should be false if an object is not included", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj3 = { o: 4 };
    const obj4 = { z: obj1, t: { a: 4 } };
    expect(arrayIncludes<unknown>([obj1, obj2, obj3], obj4)).toEqual(false);
    expect(arrayIncludes<unknown>([1, obj4, 3, obj3, 5], obj2)).toEqual(false);
  });

  it("should not work for deep equality with objects", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj2bis = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2], obj2bis)).toEqual(false);
  });

  it("should take a starting index as first argument", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj3 = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2, obj3], obj2)).toEqual(true);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 0)).toEqual(true);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 1)).toEqual(true);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 2)).toEqual(false);
    expect(arrayIncludes([obj1, obj2, obj3], obj2, 3)) // out of bounds
      .toEqual(false);
  });

  it("should go from the end if the given index is negative", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj3 = { a: obj1, b: { a: 4 } };
    const obj4 = {};
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3)).toEqual(true);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -1)).toEqual(false);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -2)).toEqual(true);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -3)).toEqual(true);
    expect(arrayIncludes([obj1, obj2, obj3, obj4], obj3, -12)) // out of bounds
      .toEqual(true);
  });
});
