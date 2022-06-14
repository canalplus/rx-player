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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("DASH Parser - getClockOffset", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should calculate a millisecond offset relatively to performance.now", () => {
    const mockWarn = jest.fn();
    jest.mock("../../../../../log", () => ({
      __esModule: true,
      default: { warn: mockWarn },
    }));

    const getClockOffset = jest.requireActual("../get_clock_offset").default;
    const mockDate = jest.spyOn(performance, "now")
      .mockReturnValue(Date.parse("2019-03-24T13:00:00Z"));

    expect(getClockOffset("2019-03-25T12:00:00Z")).toEqual(82800000);
    expect(mockWarn).not.toHaveBeenCalled();
    mockDate.mockRestore();
  });

  it("should return undefined and warn if an invalid date is given", () => {
    const mockWarn = jest.fn();
    jest.mock("../../../../../log", () => ({
      __esModule: true,
      default: { warn: mockWarn },
    }));
    const getClockOffset = jest.requireActual("../get_clock_offset").default;

    expect(getClockOffset("2018/412/13")).toEqual(undefined);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn)
      .toHaveBeenCalledWith("DASH Parser: Invalid clock received: ", "2018/412/13");
    mockWarn.mockReset();

    expect(getClockOffset("foo")).toEqual(undefined);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn)
      .toHaveBeenCalledWith("DASH Parser: Invalid clock received: ", "foo");
    mockWarn.mockReset();
  });
});
