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

import arrayFind from "../array_find";

/* tslint:disable no-unbound-method */
const initialArrayFind = (Array.prototype as any).find;
/* tslint:enable no-unbound-method */

describe("utils - arrayFind", () => {
  beforeEach(() => {
    (Array.prototype as any).find = undefined;
  });

  afterEach(() => {
    (Array.prototype as any).find = initialArrayFind;
  });

  it("should return undefined for an empty array", () => {
    expect(arrayFind([], () => { return true; })).toBe(undefined);
  });

  it("should return the corresponding element", () => {
    const obj1 = {};
    const obj2 = {};
    expect(arrayFind([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj1;
    })).toBe(obj1);
  });

  it("should return undefined if the element is not found", () => {
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};
    expect(arrayFind([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj3;
    })).toBe(undefined);
  });

  it("should give an index as a second argument and the array as a third", () => {
    const obj1 = {};
    const obj2 = {};
    const arr = [obj2, obj1, obj2, obj1];
    let currentIndex = 0;
    expect(arrayFind(arr, (obj, index, cArr) => {
      expect(index).toBe(currentIndex++);
      expect(cArr).toBe(arr);
      return obj === obj1;
    })).toBe(obj1);

    expect(currentIndex).toBe(2);
  });

  it("should give give a context if the third argument is provided", () => {
    const obj1 = {};
    const obj2 = {};
    const context = {};
    const arr = [obj2, obj1, obj2, obj1];
    arrayFind(arr, function(this : unknown) {
      expect(this).toBe(context);
      return false;
    }, context);
  });

  if (typeof initialArrayFind === "function") {
    it("should call the original array.find function if it exists", () => {
      (Array.prototype as any).find = initialArrayFind;
      const obj1 = {};
      const obj2 = {};
      const context = {};
      const arr = [obj2, obj1, obj2, obj1];
      const spy = jest.spyOn(arr as any, "find");

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
      expect(arrayFind(arr, predicate, context)).toBe(obj1);

      expect(currentIndex).toBe(2);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(predicate, context);
    });
  }
});
