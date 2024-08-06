import { describe, it, expect, vi } from "vitest";
import log from "../../../../../log";
import flattenOverlappingPeriods from "../flatten_overlapping_periods";

describe("flattenOverlappingPeriods", function () {
  it("should do nothing when no period is given", () => {
    const mockLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());

    expect(flattenOverlappingPeriods([])).toEqual([]);
    expect(mockLog).not.toHaveBeenCalled();
    mockLog.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][ Period 3 ]
  //             [ Period 3 ]
  it("should replace a period with an other if same start and duration", function () {
    const mockLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());

    const periods = [
      { id: "1", start: 0, duration: 60, thumbnailTracks: [], adaptations: {} },
      { id: "2", start: 60, duration: 60, thumbnailTracks: [], adaptations: {} },
      { id: "3", start: 60, duration: 60, thumbnailTracks: [], adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(2);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(60);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(60);
    expect(flattenPeriods[1].duration).toBe(60);
    expect(flattenPeriods[1].id).toBe("3");

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("DASH: Updating overlapping Periods.", 60, 60);
    mockLog.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][  2  ][ Period 3 ]
  //                  [ Period 3 ]
  it("should replace part of period if part of next one is overlapping it", function () {
    const mockLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());

    const periods = [
      { id: "1", start: 0, duration: 60, thumbnailTracks: [], adaptations: {} },
      { id: "2", start: 60, duration: 60, thumbnailTracks: [], adaptations: {} },
      { id: "3", start: 90, duration: 60, thumbnailTracks: [], adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(3);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(60);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(60);
    expect(flattenPeriods[1].duration).toBe(30);
    expect(flattenPeriods[1].id).toBe("2");
    expect(flattenPeriods[2].start).toBe(90);
    expect(flattenPeriods[2].duration).toBe(60);
    expect(flattenPeriods[2].id).toBe("3");

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("DASH: Updating overlapping Periods.", 60, 90);
    mockLog.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [  1  ][      Period 3     ]
  //        [      Period 3     ]
  it("should erase period if a next period starts before and ends after it", function () {
    const mockLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());

    const periods = [
      { id: "1", start: 0, duration: 60, thumbnailTracks: [], adaptations: {} },
      { id: "2", start: 60, duration: 60, thumbnailTracks: [], adaptations: {} },
      { id: "3", start: 50, duration: 120, thumbnailTracks: [], adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(2);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(50);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(50);
    expect(flattenPeriods[1].duration).toBe(120);
    expect(flattenPeriods[1].id).toBe("3");

    expect(mockLog).toHaveBeenCalledTimes(2);
    expect(mockLog).toHaveBeenCalledWith("DASH: Updating overlapping Periods.", 60, 50);
    expect(mockLog).toHaveBeenCalledWith("DASH: Updating overlapping Periods.", 0, 50);
    mockLog.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [  1  ][  100   ]
  //             [ Period 3 ]
  //                  ...
  //             [   100    ]
  it("should keep last announced period from multiple periods with same start and end", function () {
    const mockLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());

    const periods = [
      { id: "1", start: 0, duration: 60, thumbnailTracks: [], adaptations: {} },
    ];

    for (let i = 1; i <= 100; i++) {
      periods.push({
        id: i.toString(),
        start: 60,
        duration: 60,
        thumbnailTracks: [],
        adaptations: {},
      });
    }

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(2);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(60);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(60);
    expect(flattenPeriods[1].duration).toBe(60);
    expect(flattenPeriods[1].id).toBe("100");

    expect(mockLog).toHaveBeenCalledTimes(99);
    mockLog.mockRestore();
  });

  //      [ Period 1 ][ Period 2 ]       ------>  [  Period 3  ]
  //  [            Period 3           ]
  it("should handle when a Period overlaps all previous periods", () => {
    const mockLog = vi.spyOn(log, "warn").mockImplementation(vi.fn());

    const periods = [
      { id: "1", start: 40, duration: 20, thumbnailTracks: [], adaptations: {} },
      { id: "2", start: 60, duration: 20, thumbnailTracks: [], adaptations: {} },
      { id: "3", start: 20, duration: 100, thumbnailTracks: [], adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(1);
    expect(flattenPeriods[0].start).toBe(20);
    expect(flattenPeriods[0].duration).toBe(100);
    expect(flattenPeriods[0].id).toBe("3");
    expect(mockLog).toHaveBeenCalledTimes(2);
    mockLog.mockRestore();
  });
});
