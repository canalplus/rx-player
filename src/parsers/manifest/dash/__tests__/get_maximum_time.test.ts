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

describe("DASH Parser - getMaximumTime", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return the last time reference if set", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({ __esModule: true,
                                          default: { warn: warnSpy } }));
    const getMaximumTime = require("../get_maximum_time").default;

    expect(getMaximumTime({ availabilityStartTime: undefined,
                            clockOffset: undefined },
                          false,
                          5))
          .toEqual(5);
    expect(getMaximumTime({ availabilityStartTime: 4,
                            clockOffset: 12 },
                          false,
                          5))
          .toEqual(5);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should return `now - clockOffset` if clockOffset is set without a lastTimeReference nor an availabilityStartTime", () => {
  /* tslint:enable max-line-length */
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({ __esModule: true,
                                          default: { warn: warnSpy } }));
    const performanceSpy = jest.spyOn(performance, "now").mockReturnValue(30000); // 30s

    const getMaximumTime = require("../get_maximum_time").default;

    expect(getMaximumTime({ clockOffset: 5000 }, false)).toEqual(30 + 5);

    expect(performanceSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    performanceSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should deduct availabilityStartTime if clockOffset is set without a lastTimeReference but with an availabilityStartTime", () => {
  /* tslint:enable max-line-length */
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({ __esModule: true,
                                          default: { warn: warnSpy } }));
    const performanceSpy = jest.spyOn(performance, "now").mockReturnValue(30000); // 30s

    const getMaximumTime = require("../get_maximum_time").default;

    expect(getMaximumTime({ clockOffset: 5000,
                            availabilityStartTime: 10 },
                          false))
          .toEqual(30 + 5 - 10);

    expect(performanceSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    performanceSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should return `now - 10s` and warn without a clockOffset, a lastTimeReference nor an availabilityStartTime", () => {
  /* tslint:enable max-line-length */
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({ __esModule: true,
                                          default: { warn: warnSpy } }));
    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(30000); // 30s

    const getMaximumTime = require("../get_maximum_time").default;

    expect(getMaximumTime({}, false)).toEqual(30 - 10);

    expect(dateSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("DASH Parser: no clock synchronization " +
                                         "mechanism found. Setting a live gap of " +
                                         "10 seconds as a security.");
    warnSpy.mockRestore();
    dateSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should deduct availabilityStartTime and warn without a clockOffset, a lastTimeReference but with an availabilityStartTime", () => {
  /* tslint:enable max-line-length */
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({ __esModule: true,
                                          default: { warn: warnSpy } }));
    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(30000); // 30s

    const getMaximumTime = require("../get_maximum_time").default;

    expect(getMaximumTime({ availabilityStartTime: 10 }, false)).toEqual(30 - 10 - 10);

    expect(dateSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("DASH Parser: no clock synchronization " +
                                         "mechanism found. Setting a live gap of " +
                                         "10 seconds as a security.");
    warnSpy.mockRestore();
    dateSpy.mockRestore();
  });
});
