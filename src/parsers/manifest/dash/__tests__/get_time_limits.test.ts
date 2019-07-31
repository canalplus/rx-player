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

  it("should call getMaximumTime and return its output", () => {
    const getMaximumTimeSpy = jest.fn().mockReturnValue(79);
    jest.mock("../get_maximum_time", () => ({ __esModule: true,
                                              default: getMaximumTimeSpy }));
    const performanceMock = jest.spyOn(performance, "now").mockReturnValue(14);
    const getTimeLimits = require("../get_time_limits").default;
    const parsedMPD1 = { availabilityStartTime: 5 };
    const parsedMPD2 = { availabilityStartTime: 6 };

    const timeLimits1 = getTimeLimits(parsedMPD1, false, 3, 4);

    const maximumTime = { isContinuous: true,
                          value: 79,
                          time: 14 };
    expect(timeLimits1[1]).toEqual(maximumTime);
    expect(performanceMock).toHaveBeenCalledTimes(1);

    expect(getMaximumTimeSpy).toHaveBeenCalledTimes(1);
    expect(getMaximumTimeSpy).toHaveBeenCalledWith(parsedMPD1, false, 4);

    getMaximumTimeSpy.mockClear();
    performanceMock.mockClear();

    const timeLimits2 = getTimeLimits(parsedMPD1, false);

    expect(timeLimits2[1]).toEqual(maximumTime);
    expect(performanceMock).toHaveBeenCalledTimes(1);

    expect(getMaximumTimeSpy).toHaveBeenCalledTimes(1);
    expect(getMaximumTimeSpy).toHaveBeenCalledWith(parsedMPD1, false, undefined);

    getMaximumTimeSpy.mockClear();
    performanceMock.mockClear();

    const timeLimits3 = getTimeLimits(parsedMPD2, false, 3, 4);

    expect(timeLimits3[1]).toEqual(maximumTime);
    expect(performanceMock).toHaveBeenCalledTimes(1);

    expect(getMaximumTimeSpy).toHaveBeenCalledTimes(1);
    expect(getMaximumTimeSpy).toHaveBeenCalledWith(parsedMPD2, false, 4);

    getMaximumTimeSpy.mockRestore();
    performanceMock.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should return the availabilityStartTime as a minimum time if no timeShiftBufferDepth is given", () => {
  /* tslint:enable max-line-length */
    const getMaximumTimeSpy = jest.fn().mockReturnValue(49);
    jest.mock("../get_maximum_time", () => ({ __esModule: true,
                                              default: getMaximumTimeSpy }));
    const performanceMock = jest.spyOn(performance, "now").mockReturnValue(34);
    const getTimeLimits = require("../get_time_limits").default;
    const parsedMPD = { availabilityStartTime: 4 };

    const maximumTime = { isContinuous: true,
                          value: 49,
                          time: 34 };
    const minimumTime = { isContinuous: false,
                          time: 34,
                          value: 4 };
    expect(getTimeLimits(parsedMPD, false, undefined, 5))
      .toEqual([minimumTime, maximumTime]);
    expect(getTimeLimits(parsedMPD, false, undefined, 5555))
      .toEqual([minimumTime, maximumTime]);
    expect(getTimeLimits(parsedMPD)).toEqual([minimumTime, maximumTime]);

    getMaximumTimeSpy.mockRestore();
    performanceMock.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should substract a little less than the timeShiftBufferDepth to the maximum time", () => {
  /* tslint:enable max-line-length */
    const getMaximumTimeSpy = jest.fn().mockReturnValue(100);
    jest.mock("../get_maximum_time", () => ({ __esModule: true,
                                              default: getMaximumTimeSpy }));
    const performanceMock = jest.spyOn(performance, "now").mockReturnValue(34);
    const getTimeLimits = require("../get_time_limits").default;
    const parsedMPD = { availabilityStartTime: 4 };

    const maximumTime = { isContinuous: true,
                          value: 100,
                          time: 34 };

    const minimumTime1 = { isContinuous: true,
                           time: 34,
                           value: 95 };
    expect(getTimeLimits(parsedMPD, false, 8, 5))
      .toEqual([minimumTime1, maximumTime]);

    const minimumTime2 = { isContinuous: true,
                           time: 34,
                           value: 25 };
    expect(getTimeLimits(parsedMPD, false, 78, 5555))
      .toEqual([minimumTime2, maximumTime]);

    const minimumTime3 = { isContinuous: true,
                           time: 34,
                           value: 69 };
    expect(getTimeLimits(parsedMPD, false, 34))
      .toEqual([minimumTime3, maximumTime]);

    getMaximumTimeSpy.mockRestore();
    performanceMock.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should return the maximum time if the timeShiftBufferDepth is less than 3", () => {
  /* tslint:enable max-line-length */
    const getMaximumTimeSpy = jest.fn().mockReturnValue(100);
    jest.mock("../get_maximum_time", () => ({ __esModule: true,
                                              default: getMaximumTimeSpy }));
    const performanceMock = jest.spyOn(performance, "now").mockReturnValue(34);
    const getTimeLimits = require("../get_time_limits").default;
    const parsedMPD = { availabilityStartTime: 4 };

    const maximumTime = { isContinuous: true,
                          value: 100,
                          time: 34 };

    const minimumTime = { isContinuous: true,
                          time: 34,
                          value: 100 };
    expect(getTimeLimits(parsedMPD, false, 3, 5))
      .toEqual([minimumTime, maximumTime]);
    expect(getTimeLimits(parsedMPD, false, 2, 5))
      .toEqual([minimumTime, maximumTime]);
    expect(getTimeLimits(parsedMPD, false, 1, 5))
      .toEqual([minimumTime, maximumTime]);
    expect(getTimeLimits(parsedMPD, false, 0, 5))
      .toEqual([minimumTime, maximumTime]);

    getMaximumTimeSpy.mockRestore();
    performanceMock.mockRestore();
  });
});
