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

import { expect } from "chai";
import Representation from "../../../manifest/representation";
import _filterByBitrate from "../filterByBitrate.js";

describe("core - abr - filterByBitrate", () => {
  const fakeReps = [
    { bitrate : 100 },
    { bitrate : 1000 },
    { bitrate : 10000 },
    { bitrate : 100000 },
  ];

  const expectedFilteredReps = [
    { bitrate : 100 },
    { bitrate : 1000 },
  ];

  describe("filterByBitrate", () => {
    it("should return all representations when specified bitrate is infinite", () => {
      expect(_filterByBitrate(fakeReps as Representation[], Infinity))
      .to.deep.equal(fakeReps);
    });

    it("should return no representation when specified bitrate is 0", () => {
      expect(_filterByBitrate(fakeReps as Representation[], 0))
      .to.deep.equal([]);
    });

    it("should filter representation when specified bitrate is 999", () => {
      expect(_filterByBitrate(fakeReps as Representation[], 1010))
      .to.deep.equal(expectedFilteredReps);
    });
  });

});
