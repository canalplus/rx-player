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
import idGenerator from "../id_generator";

describe("utils - idGenerator", () => {
  it("should increment an ID", () => {
    const generateNewID = idGenerator();
    expect(generateNewID()).to.equal("0");
    expect(generateNewID()).to.equal("1");
    expect(generateNewID()).to.equal("2");
    expect(generateNewID()).to.equal("3");
    expect(generateNewID()).to.equal("4");
    expect(generateNewID()).to.equal("5");
  });
  it("should allow multiple incremental ID at the same time", () => {
    const generateNewID1 = idGenerator();
    const generateNewID2 = idGenerator();
    const generateNewID3 = idGenerator();
    expect(generateNewID1()).to.equal("0");
    expect(generateNewID1()).to.equal("1");
    expect(generateNewID2()).to.equal("0");
    expect(generateNewID1()).to.equal("2");
    expect(generateNewID1()).to.equal("3");
    expect(generateNewID2()).to.equal("1");
    expect(generateNewID2()).to.equal("2");
    expect(generateNewID1()).to.equal("4");
    expect(generateNewID1()).to.equal("5");
    expect(generateNewID2()).to.equal("3");
    expect(generateNewID2()).to.equal("4");
    expect(generateNewID3()).to.equal("0");
  });
});
