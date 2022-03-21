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

import { Representation } from "../../../../manifest";
import filterByBitrate from "../filter_by_bitrate";

describe("ABR - filterByBitrate", () => {
  const fakeReps = [
    { bitrate : 100 },
    { bitrate : 100 },
    { bitrate : 1000 },
    { bitrate : 10000 },
    { bitrate : 100000 },
  ];

  describe("filterByBitrate", () => {
    it("should return no Representation if no Representation was specified", () => {
      expect(filterByBitrate([], Infinity))
        .toEqual([]);
    });

    it("should return all representations when specified bitrate is infinite", () => {
      expect(filterByBitrate(fakeReps as Representation[], Infinity))
        .toEqual(fakeReps);
    });

    it("should return the lowest representation when specified bitrate is 0", () => {
      const expectedFilteredReps = [ { bitrate : 100 },
                                     { bitrate : 100 } ];
      expect(filterByBitrate(fakeReps as Representation[], 0))
        .toEqual(expectedFilteredReps);
    });

    it("should filter representation when specified bitrate is 999", () => {
      const expectedFilteredReps = [ { bitrate : 100 },
                                     { bitrate : 100 },
                                     { bitrate : 1000 } ];
      expect(filterByBitrate(fakeReps as Representation[], 1010))
        .toEqual(expectedFilteredReps);
    });
  });

});
