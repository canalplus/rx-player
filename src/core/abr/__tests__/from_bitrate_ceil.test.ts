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

import { Representation } from "../../../manifest";
import fromBitrateCeil from "../from_bitrate_ceil";

describe("ABR - fromBitrateCeil", () => {
  const fakeReps = [
    { bitrate : 100 },
    { bitrate : 1000 },
    { bitrate : 10000 },
    { bitrate : 100000 },
  ];

  describe("filterByBitrate", () => {
    it("should return the best representation when the bitrate given is Infinity", () => {
      expect(fromBitrateCeil(fakeReps as Representation[], Infinity))
        .toBe(fakeReps[fakeReps.length - 1]);
    });

    /* eslint-disable max-len */
    it("should return the best representation when the bitrate given is superior to the maximum", () => {
    /* eslint-enable max-len */
      expect(fromBitrateCeil(
        fakeReps as Representation[],
        fakeReps[fakeReps.length - 1].bitrate + 1)
      ).toBe(fakeReps[fakeReps.length - 1]);
    });

    /* eslint-disable max-len */
    it("should return the best representation when the bitrate given is equal to the maximum", () => {
    /* eslint-enable max-len */
      expect(fromBitrateCeil(
        fakeReps as Representation[],
        fakeReps[fakeReps.length - 1].bitrate)
      ).toBe(fakeReps[fakeReps.length - 1]);
    });

    it("should undefined if the bitrate given is inferior to the minimum", () => {
      expect(fromBitrateCeil(fakeReps as Representation[], fakeReps[0].bitrate - 1))
        .toBe(undefined);
    });

    it("should choose the closest lower representation for a given bitrate", () => {
      const bitrate = (fakeReps[2].bitrate - fakeReps[1].bitrate) / 2 +
        fakeReps[1].bitrate;
      expect(fromBitrateCeil(fakeReps as Representation[], bitrate))
        .toBe(fakeReps[1]);
    });
  });

});
