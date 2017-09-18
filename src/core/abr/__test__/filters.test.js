/**
 * Copyright 2017 CANAL+ Group
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

import  { expect } from "chai";
import * as _filterByWidth from "../filterByWidth.js";
import * as _filterByBitrate from "../filterByBitrate.js";

describe("core - abr - filters", () => {

  const fakeReps = [
    { width : 100, bitrate : 100 },
    { width : 1000, bitrate : 1000 },
    { width : 10000, bitrate : 10000 },
    { width : 100000, bitrate : 100000 },
  ];

  const expectedWidthReps = [
    { width : 100,  bitrate : 100 },
    { width : 1000,  bitrate : 1000 },
  ];

  describe("filterByWith", () => {
    it("should properly filter representations whose width is < 900", () => {
      expect(_filterByWidth.default(fakeReps, 999))
        .to.deep.equal(expectedWidthReps);
    });

    it("should properly filter representations when specified width is over maxWidth", () => {
      expect(_filterByWidth.default(fakeReps, 1000000))
        .to.deep.equal(fakeReps);
    });
  });

  describe("filterByBitrate", () => {
    it("should return all representations when specified bitrate is infinite", () => {
      expect(_filterByBitrate.default(fakeReps, Infinity))
      .to.deep.equal(fakeReps);
    });

    it("should return no representation when specified bitrate is 0", () => {
      expect(_filterByBitrate.default(fakeReps, 0))
      .to.deep.equal([]);
    });
  });

});
