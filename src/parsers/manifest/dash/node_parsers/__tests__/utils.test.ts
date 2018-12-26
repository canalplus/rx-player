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
import {
  parseByteRange,
  parseDuration,
} from "../utils";

describe("dash parser helpers", function() {
  describe("parseDuration", () => {
    it("should correctly parse duration in ISO8061 format", function() {
      expect(parseDuration("P18Y9M4DT11H9M8S")).to.equal(591361748);
    });
    it("should throw if duration not in ISO8061 format", function() {
      expect(() => parseDuration("1000")).to.throw();
    });
  });

  describe("parseByteRange", () => {
    it("should correctly parse byte range", function() {
      const parsedByteRange = parseByteRange("1-1000");
      expect(parsedByteRange).not.to.equal(null);
      expect((parsedByteRange as [number, number]).length).to.equal(2);
      expect((parsedByteRange as [number, number])[0]).to.equal(1);
      expect((parsedByteRange as [number, number])[1]).to.equal(1000);
    });
    it("should return null if can't parse given byte range", function() {
      expect(parseByteRange("main")).to.equal(null);
    });
  });
});
