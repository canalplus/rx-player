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

import isNonEmptyString from "../is_non_empty_string";

describe("utils - isNonEmptyString", () => {
  it("should return false for anything that is not a string", () => {
    expect(isNonEmptyString(4)).toBe(false);
    expect(isNonEmptyString(/a/)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
    expect(isNonEmptyString([])).toBe(false);
  });
  it("should return false for an empty string", () => {
    expect(isNonEmptyString("")).toBe(false);
  });
  it("should return true for a string with at least a single letter", () => {
    expect(isNonEmptyString("\0")).toBe(true);
    expect(isNonEmptyString("\n")).toBe(true);
    expect(isNonEmptyString("a")).toBe(true);
    expect(isNonEmptyString("I Am Damo Suzuki")).toBe(true);
    expect(isNonEmptyString("My new house\nYou should see my house")).toBe(true);
    expect(isNonEmptyString(`Became a recluse
                             And bought a computer
                             Set it up in the home`)).toBe(true);
  });
});
