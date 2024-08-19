import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import arrayFindIndex from "../array_find_index";

// eslint-disable-next-line @typescript-eslint/unbound-method
// eslint-disable-next-line no-restricted-properties
const initialArrayFindIndex = Array.prototype.findIndex;

describe("utils - arrayFindIndex", () => {
  beforeEach(() => {
    // @ts-expect-error: Remove temporarily default `findIndex` implementation
    // to rely on our own instead.
    // eslint-disable-next-line no-restricted-properties
    Array.prototype.findIndex = undefined;
  });

  afterEach(() => {
    // eslint-disable-next-line no-restricted-properties
    Array.prototype.findIndex = initialArrayFindIndex;
  });

  it("should return -1 for an empty array", () => {
    expect(
      arrayFindIndex([], () => {
        return true;
      }),
    ).toBe(-1);
  });

  it("should return the first corresponding index if found", () => {
    const obj1 = {};
    const obj2 = {};
    expect(
      arrayFindIndex([obj2, obj1, obj2, obj1], (obj) => {
        return obj === obj1;
      }),
    ).toBe(1);
  });

  it("should return -1 if the element is not found", () => {
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};
    expect(
      arrayFindIndex([obj2, obj1, obj2, obj1], (obj) => {
        return obj === obj3;
      }),
    ).toBe(-1);
  });

  it("should give an index as a second argument and the array as a third", () => {
    const obj1 = {};
    const obj2 = {};
    const arr = [obj2, obj1, obj2, obj1];
    let currentIndex = 0;
    expect(
      arrayFindIndex(arr, (obj, index, cArr) => {
        expect(index).toBe(currentIndex++);
        expect(cArr).toBe(arr);
        return obj === obj1;
      }),
    ).toBe(1);

    expect(currentIndex).toBe(2);
  });

  it("should give give a context if the third argument is provided", () => {
    const obj1 = {};
    const obj2 = {};
    const context = {};
    const arr = [obj2, obj1, obj2, obj1];
    arrayFindIndex(
      arr,
      function (this: unknown) {
        // eslint-disable-next-line no-invalid-this
        expect(this).toBe(context);
        return false;
      },
      context,
    );
  });

  if (typeof initialArrayFindIndex === "function") {
    it("should call the original array.findIndex function if it exists", () => {
      // eslint-disable-next-line no-restricted-properties
      Array.prototype.findIndex = initialArrayFindIndex;
      const obj1 = {};
      const obj2 = {};
      const context = {};
      const arr = [obj2, obj1, obj2, obj1];
      const spy = vi.spyOn(arr as unknown as { findIndex: () => unknown }, "findIndex");

      let currentIndex = 0;
      const predicate = function (
        this: unknown,
        obj: unknown,
        index: number,
        cArr: unknown[],
      ): boolean {
        // eslint-disable-next-line no-invalid-this
        expect(this).toBe(context);
        expect(index).toBe(currentIndex++);
        expect(cArr).toBe(arr);
        return obj === obj1;
      };
      expect(arrayFindIndex(arr, predicate, context)).toBe(1);
      expect(currentIndex).toBe(2);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(predicate, context);
    });
  }
});
