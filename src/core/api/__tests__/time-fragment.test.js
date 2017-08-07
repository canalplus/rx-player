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
import { parseTimeFragment } from "../time-fragment.js";

describe("Time fragment", function() {

  describe("parser", function() {

    it("parses Date Objects into Date Objects", function() {
      const now = Date.now();
      expect(parseTimeFragment({
        start: new Date(now),
        end: new Date(now + 1000),
      })).to.eql({
        start: new Date(now),
        end: new Date(now + 1000),
      });
    });

    it("fails with wrong { start, end } interface", function() {
      expect(() => parseTimeFragment({
        start: "foo",
      })).to.throw();
      expect(() => parseTimeFragment({
        end: "foo",
      })).to.throw();
      expect(() => parseTimeFragment({
        start: {},
      })).to.throw();
    });

    xit("defaults to a value if none given", function() {
      expect(parseTimeFragment({
        start: 10,
      })).to.eql({ start: 10, end: Infinity });

      expect(parseTimeFragment({
        end: 10,
      })).to.eql({ start: 0, end: 10 });

      expect(parseTimeFragment({
        start: "0%",
      })).to.eql({
        start: "0%",
        end: "100%",
      });

      expect(parseTimeFragment({
        start: "0%",
      })).to.eql({
        start: "0%",
        end: "100%",
      });
    });

    it("fails if start >= end", function() {
      expect(() => parseTimeFragment({ start: 10, end: 10 })).to.throw();
      expect(() => parseTimeFragment({ start: 10, end: 5 })).to.throw();
    });

    it("fails if start < 0", function() {
      expect(() => parseTimeFragment({ start: -10 })).to.throw();
    });

    xit("parses basic MediaFragments time", function() {
      expect(parseTimeFragment(",10")).to.eql({ start: 0, end: 10 });
      expect(parseTimeFragment("1,10")).to.eql({ start: 1, end: 10 });
      expect(parseTimeFragment("1")).to.eql({ start: 1, end: Infinity });
    });

  });

});
