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

describe("DASH Parser - getTimeLimits", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should call getMaximumTime and getMinimumTime and return their output", () => {
    const getMaximumTimeSpy = jest.fn().mockReturnValue(79);
    const getMinimumTimeSpy = jest.fn().mockReturnValue(65);
    jest.mock("../get_maximum_time", () => ({
      __esModule: true,
      default: getMaximumTimeSpy,
    }));
    jest.mock("../get_minimum_time", () => ({
      __esModule: true,
      default: getMinimumTimeSpy,
    }));
    const performanceMock = jest.spyOn(performance, "now").mockReturnValue(14);
    const getTimeLimits = require("../get_time_limits").default;
    const parsedMPD = {};

    const timeLimits1 = getTimeLimits(parsedMPD, 4, 3);

    const minimumTime = {
      isContinuous: true,
      value: 65,
      time: 14,
    };
    const maximumTime = {
      isContinuous: true,
      value: 79,
      time: 14,
    };
    expect(timeLimits1).toEqual([minimumTime, maximumTime]);
    expect(performanceMock).toHaveBeenCalledTimes(1);

    expect(getMaximumTimeSpy).toHaveBeenCalledTimes(1);
    expect(getMaximumTimeSpy).toHaveBeenCalledWith(parsedMPD, 4);

    expect(getMinimumTimeSpy).toHaveBeenCalledTimes(1);
    expect(getMinimumTimeSpy).toHaveBeenCalledWith(79, 3);

    getMinimumTimeSpy.mockClear();
    getMaximumTimeSpy.mockClear();
    performanceMock.mockClear();

    const timeLimits2 = getTimeLimits(parsedMPD);

    expect(timeLimits2).toEqual([minimumTime, maximumTime]);
    expect(performanceMock).toHaveBeenCalledTimes(1);

    expect(getMaximumTimeSpy).toHaveBeenCalledTimes(1);
    expect(getMaximumTimeSpy).toHaveBeenCalledWith(parsedMPD, undefined);

    expect(getMinimumTimeSpy).toHaveBeenCalledTimes(1);
    expect(getMinimumTimeSpy).toHaveBeenCalledWith(79, undefined);

    getMinimumTimeSpy.mockRestore();
    getMaximumTimeSpy.mockRestore();
    performanceMock.mockRestore();
  });
});
