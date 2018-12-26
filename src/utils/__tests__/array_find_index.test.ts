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

import { expect } from "chai";
import * as sinon from "sinon";
import arrayFindIndex from "../array_find_index";

/* tslint:disable no-unbound-method */
const initialArrayFindIndex = (Array.prototype as any).findIndex;
/* tslint:enable no-unbound-method */

describe("utils - arrayFindIndex", () => {
  before(() => {
    (Array.prototype as any).findIndex = undefined;
  });

  after(() => {
    (Array.prototype as any).findIndex = initialArrayFindIndex;
  });

  it("should return -1 for an empty array", () => {
    expect(arrayFindIndex([], () => { return true; })).to.equal(-1);
  });

  it("should return the first corresponding index if found", () => {
    const obj1 = {};
    const obj2 = {};
    expect(arrayFindIndex([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj1;
    })).to.equal(1);
  });

  it("should return -1 if the element is not found", () => {
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};
    expect(arrayFindIndex([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj3;
    })).to.equal(-1);
  });

  it("should give an index as a second argument and the array as a third", () => {
    const obj1 = {};
    const obj2 = {};
    const arr = [obj2, obj1, obj2, obj1];
    let currentIndex = 0;
    expect(arrayFindIndex(arr, (obj, index, cArr) => {
      expect(index).to.equal(currentIndex++);
      expect(cArr).to.equal(arr);
      return obj === obj1;
    })).to.equal(1);

    expect(currentIndex).to.equal(2);
  });

  it("should give give a context if the third argument is provided", () => {
    const obj1 = {};
    const obj2 = {};
    const context = {};
    const arr = [obj2, obj1, obj2, obj1];
    arrayFindIndex(arr, function(this : {}) {
      expect(this).to.equal(context);
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
      const spy = sinon.spy(arr, "findIndex");

      let currentIndex = 0;
      const predicate = function(
        this : {},
        obj : {},
        index : number,
        cArr : Array<{}>
      ) : boolean {
        expect(this).to.equal(context);
        expect(index).to.equal(currentIndex++);
        expect(cArr).to.equal(arr);
        return obj === obj1;
      };
      expect(arrayFindIndex(arr, predicate, context)).to.equal(1);
      expect(currentIndex).to.equal(2);
      expect(spy.calledWith(predicate, context)).to.equal(true);
    });
  }
});
