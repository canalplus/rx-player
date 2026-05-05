import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import log from "../../../../../log.ts";
import getClockOffset from "../get_clock_offset.ts";

const logWarn = vi.spyOn(log, "warn").mockImplementation(() => {
  /* noop */
});

describe("DASH Parser - getClockOffset", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    logWarn.mockClear();
  });

  it("should calculate a millisecond offset relatively to the monotonically-raising timestamp", () => {
    const mockDate = vi
      .spyOn(performance, "now")
      .mockReturnValue(Date.parse("2019-03-24T13:00:00Z"));

    expect(getClockOffset("2019-03-25T12:00:00Z")).toEqual(82800000);
    expect(logWarn).not.toHaveBeenCalled();
    mockDate.mockRestore();
  });

  it("should return undefined and warn if an invalid date is given", () => {
    expect(getClockOffset("2018/412/13")).toEqual(undefined);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith("dash", "Invalid clock received", {
      clock: "2018/412/13",
    });
    logWarn.mockReset();

    expect(getClockOffset("foo")).toEqual(undefined);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith("dash", "Invalid clock received", {
      clock: "foo",
    });
    logWarn.mockReset();
  });
});
