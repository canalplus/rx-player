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
import SimpleSet from "../simple_set";

describe("utils - collections", () => {
  it("should allow to push string or number and to test them", () => {
    const simpleSet = new SimpleSet();
    expect(simpleSet.test("a")).to.equal(false);
    expect(simpleSet.test("b")).to.equal(false);
    expect(simpleSet.test("cde")).to.equal(false);
    expect(simpleSet.test(1)).to.equal(false);
    expect(simpleSet.test(54)).to.equal(false);

    simpleSet.add("a");
    simpleSet.add("cde");
    simpleSet.add(54);
    expect(simpleSet.test("a")).to.equal(true);
    expect(simpleSet.test("b")).to.equal(false);
    expect(simpleSet.test("cde")).to.equal(true);
    expect(simpleSet.test(1)).to.equal(false);
    expect(simpleSet.test(54)).to.equal(true);
  });

  it("should allow to remove pushed strings and numbers", () => {
    const simpleSet = new SimpleSet();
    simpleSet.add("a");
    simpleSet.add("cde");
    simpleSet.add(54);
    simpleSet.remove(54);
    simpleSet.remove("cde");
    expect(simpleSet.test("a")).to.equal(true);
    expect(simpleSet.test("b")).to.equal(false);
    expect(simpleSet.test("cde")).to.equal(false);
    expect(simpleSet.test(1)).to.equal(false);
    expect(simpleSet.test(54)).to.equal(false);
  });
});
