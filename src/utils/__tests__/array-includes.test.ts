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
import arrayIncludes from "../array-includes";

describe("utils - array-includes", () => {
  it("should be true if a number is included", () => {
    expect(arrayIncludes([1, 2, 3, 4, 5], 1)).to.equal(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 2)).to.equal(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 3)).to.equal(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 4)).to.equal(true);
    expect(arrayIncludes([1, 2, 3, 4, 5], 5)).to.equal(true);

    expect(arrayIncludes([1, "toto", /aa/, 4, []], 4)).to.equal(true);
  });

  it("should be false if a number is not included", () => {
    expect(arrayIncludes([1, 2, 3, 4, 5], 0)).to.equal(false);
    expect(arrayIncludes([1, 2, /aaaa/, 4, 5], 6)).to.equal(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], Infinity)).to.equal(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], NaN)).to.equal(false);
  });

  it("should be true for NaN values", () => {
    expect(arrayIncludes([1, NaN, 3, 4, 5], NaN)).to.equal(true);
  });

  it("should be true if a string is included", () => {
    expect(arrayIncludes(["abc", "", "toto", "bar", "baz"], ""))
      .to.equal(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "abc"))
      .to.equal(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "foo"))
      .to.equal(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "toto"))
      .to.equal(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "bar"))
      .to.equal(true);
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "baz"))
      .to.equal(true);

    expect(arrayIncludes(["abc", "toto", /aa/, 4, []], "toto")).to.equal(true);
  });

  it("should be false if a string is not included", () => {
    expect(arrayIncludes(["abc", "foo", "toto", "bar", "baz"], "titi"))
      .to.equal(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], "toto")).to.equal(false);
  });

  it("should be true if a boolean is included", () => {
    expect(arrayIncludes([true, false, true, "bar", "baz"], true))
      .to.equal(true);
    expect(arrayIncludes([true, false, true, "bar", "baz"], false))
      .to.equal(true);
    expect(arrayIncludes([true, false], true))
      .to.equal(true);
    expect(arrayIncludes([false, "toto", /aa/, 4, []], false)).to.equal(true);
  });

  it("should be false if a boolean is not included", () => {
    expect(arrayIncludes([true, true, true], false))
      .to.equal(false);
    expect(arrayIncludes([1, 2, 3, 4, 5], true)).to.equal(false);
  });

  it("should be true if an object is included", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2], obj1))
      .to.equal(true);
    expect(arrayIncludes([obj1, obj2], obj2))
      .to.equal(true);
    expect(arrayIncludes([1, obj1, 3, obj2, 5], obj2)).to.equal(true);
  });

  it("should be false if an object is not included", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj3 = { o: 4 };
    const obj4 = { z: obj1, t: { a: 4 } };
    expect(arrayIncludes([obj1, obj2, obj3], obj4))
      .to.equal(false);
    expect(arrayIncludes([1, obj4, 3, obj3, 5], obj2)).to.equal(false);
  });

  it("should not work for deep equality with objects", () => {
    const obj1 = { a: 4, b: 3 };
    const obj2 = { a: obj1, b: { a: 4 } };
    const obj2bis = { a: obj1, b: { a: 4 } };
    expect(arrayIncludes([obj1, obj2], obj2bis))
      .to.equal(false);
  });
});
