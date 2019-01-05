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
import startsWith from "../starts_with";

/* tslint:disable no-unbound-method */
const initialStartsWith = String.prototype.startsWith;
/* tslint:enable no-unbound-method */

describe("utils - starts-with", () => {
  beforeEach(() => {
    (String.prototype as any).startsWith = undefined;
  });

  afterEach(() => {
    String.prototype.startsWith = initialStartsWith;
  });

  it("should mirror String.prototype.startsWith behavior", () => {
    expect(startsWith("Kindred", "Kin")).to.eql(true);
    expect(startsWith("Loner", "one", 1)).to.eql(true);
    expect(startsWith("Ashtray Wasp", " ", 7)).to.eql(true);

    expect(startsWith("Rival Dealer", "riv")).to.eql(false);
    expect(startsWith("Hiders", "Hid", 1)).to.eql(false);

    expect(startsWith("Come Down To Us", "")).to.eql(true);
    expect(startsWith("Rough Sleeper", "Ro", -5)).to.eql(true);
    expect(startsWith("", "")).to.eql(true);
  });

  if (typeof initialStartsWith === "function") {
    it("should call the original startsWith function if available", () => {
      String.prototype.startsWith = initialStartsWith;
      const startsWithSpy = sinon.spy(String.prototype, "startsWith");
      const str = "Street Halo";
      expect(startsWith(str, "Stree")).to.equal(true);
      expect(startsWith(str, "Halo")).to.equal(false);
      expect(startsWith(str, "Stree", 1)).to.equal(false);

      expect(startsWithSpy.callCount).to.equal(3);
      expect(startsWithSpy.calledWith("Stree")).to.equal(true);
      expect(startsWithSpy.calledWith("Halo")).to.equal(true);
      expect(startsWithSpy.calledWith("Stree", 1)).to.equal(true);
      startsWithSpy.restore();
    });
  }
});
