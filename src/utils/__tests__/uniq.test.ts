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

import uniq, {
  uniqFromFilter,
  uniqFromSet,
} from "../uniq";

describe("utils - uniq", () => {
  it("should remove the duplicates from an array", () => {
    const obj1 = {};
    const obj2 = {};
    const regexpA1 = /a/;
    const regexpA2 = /a/;
    expect(uniq([
      obj1,
      1,
      2,
      1,
      undefined,
      null,
      obj1,
      obj2,
      obj2,
      regexpA1,
      regexpA2,
      "a",
      "b",
      "a",
      null,
      undefined,
    ])).toEqual([
      obj1,
      1,
      2,
      undefined,
      null,
      obj2,
      regexpA1,
      regexpA2,
      "a",
      "b",
    ]);
  });
});

describe("utils - uniqFromSet", () => {
  it("should remove the duplicates from an array", () => {
    const obj1 = {};
    const obj2 = {};
    const regexpA1 = /a/;
    const regexpA2 = /a/;
    expect(uniqFromSet([
      obj1,
      1,
      2,
      1,
      undefined,
      null,
      obj1,
      obj2,
      obj2,
      regexpA1,
      regexpA2,
      "a",
      "b",
      "a",
      null,
      undefined,
    ])).toEqual([
      obj1,
      1,
      2,
      undefined,
      null,
      obj2,
      regexpA1,
      regexpA2,
      "a",
      "b",
    ]);
  });
});

describe("utils - uniqFromFilter", () => {
  it("should remove the duplicates from an array", () => {
    const obj1 = {};
    const obj2 = {};
    const regexpA1 = /a/;
    const regexpA2 = /a/;
    expect(uniqFromFilter([
      obj1,
      1,
      2,
      1,
      undefined,
      null,
      obj1,
      obj2,
      obj2,
      regexpA1,
      regexpA2,
      "a",
      "b",
      "a",
      null,
      undefined,
    ])).toEqual([
      obj1,
      1,
      2,
      undefined,
      null,
      obj2,
      regexpA1,
      regexpA2,
      "a",
      "b",
    ]);
  });
});
