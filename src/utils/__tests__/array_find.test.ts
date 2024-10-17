import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import arrayFind from "../array_find";

// eslint-disable-next-line no-restricted-properties, @typescript-eslint/unbound-method
const initialArrayFind = Array.prototype.find;

describe("utils - arrayFind", () => {
  beforeEach(() => {
    // @ts-expect-error: Remove temporarily default `find` implementation
    // to rely on our own instead.
    // eslint-disable-next-line no-restricted-properties
    Array.prototype.find = undefined;
  });

  afterEach(() => {
    // eslint-disable-next-line no-restricted-properties
    Array.prototype.find = initialArrayFind;
  });

  it("should return undefined for an empty array", () => {
    expect(
      arrayFind([], () => {
        return true;
      }),
    ).toBe(undefined);
  });

  it("should return the corresponding element", () => {
    const obj1 = {};
    const obj2 = {};
    expect(
      arrayFind([obj2, obj1, obj2, obj1], (obj) => {
        return obj === obj1;
      }),
    ).toBe(obj1);
  });

  it("should return undefined if the element is not found", () => {
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};
    expect(
      arrayFind([obj2, obj1, obj2, obj1], (obj) => {
        return obj === obj3;
      }),
    ).toBe(undefined);
  });

  it("should give an index as a second argument and the array as a third", () => {
    const obj1 = {};
    const obj2 = {};
    const arr = [obj2, obj1, obj2, obj1];
    let currentIndex = 0;
    expect(
      arrayFind(arr, (obj, index, cArr) => {
        expect(index).toBe(currentIndex++);
        expect(cArr).toBe(arr);
        return obj === obj1;
      }),
    ).toBe(obj1);

    expect(currentIndex).toBe(2);
  });

  it("should give give a context if the third argument is provided", () => {
    const obj1 = {};
    const obj2 = {};
    const context = {};
    const arr = [obj2, obj1, obj2, obj1];
    arrayFind(
      arr,
      function (this: unknown) {
        // eslint-disable-next-line no-invalid-this
        expect(this).toBe(context);
        return false;
      },
      context,
    );
  });

  if (typeof initialArrayFind === "function") {
    it("should call the original array.find function if it exists", () => {
      // eslint-disable-next-line no-restricted-properties
      Array.prototype.find = initialArrayFind;
      const obj1 = {};
      const obj2 = {};
      const context = {};
      const arr = [obj2, obj1, obj2, obj1];
      const spy = vi.spyOn(arr as unknown as { find: () => unknown }, "find");

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
      expect(arrayFind(arr, predicate, context)).toBe(obj1);

      expect(currentIndex).toBe(2);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(predicate, context);
    });
  }
});
