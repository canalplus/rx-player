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
import arrayFind from "../array_find";

/* tslint:disable no-unbound-method */
const initialArrayFind = (Array.prototype as any).find;
/* tslint:enable no-unbound-method */

describe("utils - arrayFind", () => {
  before(() => {
    (Array.prototype as any).find = undefined;
  });

  after(() => {
    (Array.prototype as any).find = initialArrayFind;
  });

  it("should return undefined for an empty array", () => {
    expect(arrayFind([], () => { return true; })).to.equal(undefined);
  });

  it("should return the corresponding element", () => {
    const obj1 = {};
    const obj2 = {};
    expect(arrayFind([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj1;
    })).to.equal(obj1);
  });

  it("should return undefined if the element is not found", () => {
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};
    expect(arrayFind([obj2, obj1, obj2, obj1], (obj) => {
      return obj === obj3;
    })).to.equal(undefined);
  });

  it("should give an index as a second argument and the array as a third", () => {
    const obj1 = {};
    const obj2 = {};
    const arr = [obj2, obj1, obj2, obj1];
    let currentIndex = 0;
    expect(arrayFind(arr, (obj, index, cArr) => {
      expect(index).to.equal(currentIndex++);
      expect(cArr).to.equal(arr);
      return obj === obj1;
    })).to.equal(obj1);

    expect(currentIndex).to.equal(2);
  });

  it("should give give a context if the third argument is provided", () => {
    const obj1 = {};
    const obj2 = {};
    const context = {};
    const arr = [obj2, obj1, obj2, obj1];
    arrayFind(arr, function(this : {}) {
      expect(this).to.equal(context);
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
      const spy = sinon.spy(arr, "find");

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
      expect(arrayFind(arr, predicate, context)).to.equal(obj1);

      expect(currentIndex).to.equal(2);

      expect(spy.calledWith(predicate, context)).to.equal(true);
    });
  }
});
