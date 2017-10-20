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
import _filterByWidth from "../filterByWidth.js";

describe("core - abr - filterByWidth", () => {

  const fakeReps = [
    { width : 100 },
    { width : 1000 },
    { width : 10000 },
    { width : 100000 },
  ];

  const expectedWidthReps = [
    { width : 100 },
    { width : 1000 },
  ];

  describe("filterByWidth", () => {
    it("should properly filter representations whose width is < 900", () => {
      expect(_filterByWidth(fakeReps, 999))
        .to.deep.equal(expectedWidthReps);
    });

    it("should return all representations when specified width is over maxWidth", () => {
      expect(_filterByWidth(fakeReps, 1000000))
        .to.deep.equal(fakeReps);
    });

    it("should return all representations when specified width is infinite", () => {
      expect(_filterByWidth(fakeReps, Infinity))
        .to.deep.equal(fakeReps);
    });

    it("should return first representation when specified width is 0", () => {
      expect(_filterByWidth(fakeReps, 0))
        .to.deep.equal([{ width: 100 }]);
    });

    it("should return all representation when specified width is undefined", () => {
      expect(_filterByWidth(fakeReps, undefined))
      .to.deep.equal(fakeReps);
    });

    it("should return no representation when specified array is empty", () => {
      expect(_filterByWidth([], 0))
      .to.deep.equal([]);
    });
  });

});
