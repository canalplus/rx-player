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

import isNullOrUndefined from "../is_null_or_undefined";

describe("utils - isNullOrUndefined", () => {
  it("should return true when the value given is `null` or `undefined`", () => {
    expect(isNullOrUndefined(null)).toEqual(true);
    expect(isNullOrUndefined(undefined)).toEqual(true);
  });
  it("should return false when given a value different from null or undefined", () => {
    expect(isNullOrUndefined(0)).toEqual(false);
    expect(isNullOrUndefined(1047)).toEqual(false);
    expect(isNullOrUndefined("")).toEqual(false);
    expect(isNullOrUndefined("toto")).toEqual(false);
    expect(isNullOrUndefined({})).toEqual(false);
    expect(isNullOrUndefined([])).toEqual(false);
    expect(isNullOrUndefined(/a/)).toEqual(false);
  });
});
