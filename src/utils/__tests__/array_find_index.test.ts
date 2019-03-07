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

import arrayFindIndex from "../array_find_index";

/* tslint:disable no-unbound-method */
const initialArrayFindIndex = (Array.prototype as any).findIndex;
/* tslint:enable no-unbound-method */

describe("utils - arrayFindIndex", () => {
  beforeEach(() => {
    (Array.prototype as any).findIndex = undefined;
  });

  afterEach(() => {
    (Array.prototype as any).findIndex = initialArrayFindIndex;
  });

  it("should return -1 for an empty array", () => {
    expect(arrayFindIndex([], () => { return true; })).toBe(-1);
  });

  it("should return the first corresponding index if found", () => {
    const obj1 = {};
    const obj2 = {};
    expect(arrayFindIndex([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj1;
    })).toBe(1);
  });

  it("should return -1 if the element is not found", () => {
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};
    expect(arrayFindIndex([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj3;
    })).toBe(-1);
  });

  it("should give an index as a second argument and the array as a third", () => {
    const obj1 = {};
    const obj2 = {};
    const arr = [obj2, obj1, obj2, obj1];
    let currentIndex = 0;
    expect(arrayFindIndex(arr, (obj, index, cArr) => {
      expect(index).toBe(currentIndex++);
      expect(cArr).toBe(arr);
      return obj === obj1;
    })).toBe(1);

    expect(currentIndex).toBe(2);
  });

  it("should give give a context if the third argument is provided", () => {
    const obj1 = {};
    const obj2 = {};
    const context = {};
    const arr = [obj2, obj1, obj2, obj1];
    arrayFindIndex(arr, function(this : unknown) {
      expect(this).toBe(context);
      return false;
    }, context);
  });

  if (typeof initialArrayFindIndex === "function") {
    it("should call the original array.findIndex function if it exists", () => {
      (Array.prototype as any).findIndex = initialArrayFindIndex;
      const obj1 = {};
      const obj2 = {};
      const context = {};
      const arr = [obj2, obj1, obj2, obj1];
      const spy = jest.spyOn(arr as any, "findIndex");

      let currentIndex = 0;
      const predicate = function(
        this : unknown,
        obj : {},
        index : number,
        cArr : Array<{}>
      ) : boolean {
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
