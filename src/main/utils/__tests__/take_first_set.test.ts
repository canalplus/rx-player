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

import takeFirstSet from "../take_first_set";

describe("utils - takeFirstSet", () => {
  it("should return undefined with no argument", () => {
    expect(takeFirstSet()).toEqual(undefined);
  });

  it("should return undefined with only undefined or null arguments", () => {
    expect(takeFirstSet(undefined, undefined, undefined)).toEqual(undefined);
    expect(takeFirstSet(null, null, null, null)).toEqual(undefined);
    expect(takeFirstSet(undefined, null, null, undefined)).toEqual(undefined);
    expect(takeFirstSet(null, null, null, undefined)).toEqual(undefined);
  });

  it("should return the first set argument", () => {
    const obj1 = { a: 4 };
    const obj2 = { b: 12 };

    expect(takeFirstSet<unknown>(undefined, null, obj1, obj2))
      .toEqual(obj1);
  });
});
