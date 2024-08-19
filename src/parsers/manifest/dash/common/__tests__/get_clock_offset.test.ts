import { describe, beforeEach, it, expect, vi } from "vitest";
import type IGetClockOffset from "../get_clock_offset";

describe("DASH Parser - getClockOffset", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should calculate a millisecond offset relatively to the monotonically-raising timestamp", async () => {
    const mockWarn = vi.fn();
    vi.doMock("../../../../../log", () => ({
      default: { warn: mockWarn },
    }));

    const getClockOffset = (await vi.importActual("../get_clock_offset"))
      .default as typeof IGetClockOffset;
    const mockDate = vi
      .spyOn(performance, "now")
      .mockReturnValue(Date.parse("2019-03-24T13:00:00Z"));

    expect(getClockOffset("2019-03-25T12:00:00Z")).toEqual(82800000);
    expect(mockWarn).not.toHaveBeenCalled();
    mockDate.mockRestore();
  });

  it("should return undefined and warn if an invalid date is given", async () => {
    const mockWarn = vi.fn();
    vi.doMock("../../../../../log", () => ({
      default: { warn: mockWarn },
    }));
    const getClockOffset = (await vi.importActual("../get_clock_offset"))
      .default as typeof IGetClockOffset;

    expect(getClockOffset("2018/412/13")).toEqual(undefined);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(
      "DASH Parser: Invalid clock received: ",
      "2018/412/13",
    );
    mockWarn.mockReset();

    expect(getClockOffset("foo")).toEqual(undefined);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith("DASH Parser: Invalid clock received: ", "foo");
    mockWarn.mockReset();
  });
});
