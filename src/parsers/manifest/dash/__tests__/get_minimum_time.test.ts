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

describe("DASH Parser - getMinimumTime", () => {
  it("should return the maximum time if no timeShiftBufferDepth is given", () => {
    const getMinimumTime = require("../get_minimum_time").default;
    expect(getMinimumTime(8)).toEqual(8);
    expect(getMinimumTime(5)).toEqual(5);
    expect(getMinimumTime(5, undefined)).toEqual(5);
  });

  /* tslint:disable max-line-length */
  it("should substract a little less than the timeShiftBufferDepth to the maximum time", () => {
  /* tslint:enable max-line-length */
    const getMinimumTime = require("../get_minimum_time").default;
    expect(getMinimumTime(87, 8)).toEqual(87 - (8 - 5));
    expect(getMinimumTime(87, 20)).toEqual(87 - (20 - 5));
  });

  /* tslint:disable max-line-length */
  it("should return the maximum time if the timeShiftBufferDepth is less than 5", () => {
  /* tslint:enable max-line-length */
    const getMinimumTime = require("../get_minimum_time").default;
    expect(getMinimumTime(87, 4)).toEqual(87);
    expect(getMinimumTime(88, 1)).toEqual(88);
    expect(getMinimumTime(89, 0)).toEqual(89);
  });
});
