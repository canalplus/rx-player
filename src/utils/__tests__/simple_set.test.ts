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

import SimpleSet from "../simple_set";

describe("utils - SimpleSet", () => {
  it("should allow to push string or number and to test them", () => {
    const simpleSet = new SimpleSet();
    expect(simpleSet.test("a")).toBe(false);
    expect(simpleSet.test("b")).toBe(false);
    expect(simpleSet.test("cde")).toBe(false);
    expect(simpleSet.test(1)).toBe(false);
    expect(simpleSet.test(54)).toBe(false);

    simpleSet.add("a");
    simpleSet.add("cde");
    simpleSet.add(54);
    expect(simpleSet.test("a")).toBe(true);
    expect(simpleSet.test("b")).toBe(false);
    expect(simpleSet.test("cde")).toBe(true);
    expect(simpleSet.test(1)).toBe(false);
    expect(simpleSet.test(54)).toBe(true);
  });

  it("should allow to remove pushed strings and numbers", () => {
    const simpleSet = new SimpleSet();
    expect(simpleSet.isEmpty()).toBe(true);
    simpleSet.add("a");
    expect(simpleSet.isEmpty()).toBe(false);
    simpleSet.add("cde");
    simpleSet.add(54);
    simpleSet.remove(54);
    simpleSet.remove("cde");
    expect(simpleSet.test("a")).toBe(true);
    expect(simpleSet.test("b")).toBe(false);
    expect(simpleSet.test("cde")).toBe(false);
    expect(simpleSet.test(1)).toBe(false);
    expect(simpleSet.test(54)).toBe(false);
    expect(simpleSet.isEmpty()).toBe(false);
    simpleSet.remove("a");
    expect(simpleSet.isEmpty()).toBe(true);
  });
});
