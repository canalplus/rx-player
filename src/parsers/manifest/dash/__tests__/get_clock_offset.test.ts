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

/* tslint:disable no-unsafe-any */
describe("DASH Parser - getClockOffset", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should calculate a millisecond offset relatively to performance.now", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true as const,
      default: { warn: warnSpy },
    }));

    const getClockOffset = require("../get_clock_offset").default;
    const dateSpy = jest.spyOn(performance, "now")
      .mockReturnValue(Date.parse("2019-03-24T13:00:00Z"));

    expect(getClockOffset("2019-03-25T12:00:00Z")).toEqual(82800000);
    expect(warnSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  it("should return undefined and warn if an invalid date is given", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true as const,
      default: { warn: warnSpy },
    }));
    const getClockOffset = require("../get_clock_offset").default;

    expect(getClockOffset("2018/412/13")).toEqual(undefined);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy)
      .toHaveBeenCalledWith("DASH Parser: Invalid clock received: ", "2018/412/13");
    warnSpy.mockReset();

    expect(getClockOffset("foo")).toEqual(undefined);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy)
      .toHaveBeenCalledWith("DASH Parser: Invalid clock received: ", "foo");
    warnSpy.mockReset();
  });
});
/* tslint:enable no-unsafe-any */
