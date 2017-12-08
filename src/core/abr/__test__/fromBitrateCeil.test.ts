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
import { Representation } from "../../../manifest";
import _fromBitrateCeil from "../fromBitrateCeil";

describe("core - abr - fromBitrateCeil", () => {
  const fakeReps = [
    { bitrate : 100 },
    { bitrate : 1000 },
    { bitrate : 10000 },
    { bitrate : 100000 },
  ];

  describe("filterByBitrate", () => {
    it("should return the best representation when the bitrate given is Infinity", () => {
      expect(_fromBitrateCeil(fakeReps as Representation[], Infinity))
        .to.equal(fakeReps[fakeReps.length - 1]);
    });

    /* tslint:disable max-line-length */
    it("should return the best representation when the bitrate given is superior to the maximum", () => {
    /* tslint:enable max-line-length */
      expect(_fromBitrateCeil(
        fakeReps as Representation[],
        fakeReps[fakeReps.length - 1].bitrate + 1)
      ).to.equal(fakeReps[fakeReps.length - 1]);
    });

    /* tslint:disable max-line-length */
    it("should return the best representation when the bitrate given is equal to the maximum", () => {
    /* tslint:enable max-line-length */
      expect(_fromBitrateCeil(
        fakeReps as Representation[],
        fakeReps[fakeReps.length - 1].bitrate)
      ).to.equal(fakeReps[fakeReps.length - 1]);
    });

    it("should undefined if the bitrate given is inferior to the minimum", () => {
      expect(_fromBitrateCeil(fakeReps as Representation[], fakeReps[0].bitrate - 1))
        .to.equal(undefined);
    });

    it("should choose the closest lower representation for a given bitrate", () => {
      const bitrate = (fakeReps[2].bitrate - fakeReps[1].bitrate) / 2 +
        fakeReps[1].bitrate;
      expect(_fromBitrateCeil(fakeReps as Representation[], bitrate))
        .to.equal(fakeReps[1]);
    });
  });

});
