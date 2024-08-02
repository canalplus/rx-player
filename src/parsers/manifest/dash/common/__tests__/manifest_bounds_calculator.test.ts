import { describe, it, expect, vi } from "vitest";
import ManifestBoundsCalculator from "../manifest_bounds_calculator";

describe("DASH parsers - ManifestBoundsCalculator", () => {
  it("should return undefined through `getEstimatedMinimumSegmentTime` if the live edge was never set for a dynamic content with a timeShiftBufferDepth", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(undefined);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(3)).toEqual(undefined);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(5)).toEqual(undefined);
  });

  it("should return 0 through `getEstimatedMinimumSegmentTime` for a static content", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: 555555,
    });
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(0);
    manifestBoundsCalculator.setLastPosition(5555, 2135);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(4)).toEqual(0);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(5)).toEqual(0);
  });

  it("should return 0 through `getEstimatedMinimumSegmentTime` if the `serverTimestampOffset` was never set nor the last position for a dynamic content with no timeShiftBufferDepth", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: undefined,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(0);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(5)).toEqual(0);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(28)).toEqual(0);
  });

  it("should return `false` through `lastPositionIsKnown` if `setLastPositionOffset` was never called", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(false);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(undefined);
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(false);
  });

  it("should return `true` through `lastPositionIsKnown` if `setLastPositionOffset` was called for a dynamic content", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(true);
  });

  it("should return `true` through `lastPositionIsKnown` if `setLastPositionOffset` was called for a non dynamic content", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    expect(manifestBoundsCalculator.lastPositionIsKnown()).toEqual(true);
  });

  it("should return how much time has elapsed through `getEstimatedMinimumSegmentTime` since the last position was set for a dynamic content", () => {
    let performanceNow = 5000;
    const mockPerformanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(vi.fn(() => performanceNow));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    manifestBoundsCalculator.setLastPosition(1000, 10);
    performanceNow = 25000;
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(1010);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(50)).toEqual(960);
    performanceNow = 35000;
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(1020);
    mockPerformanceNow.mockRestore();
  });

  it("should prefer relying on the live edge for `getEstimatedMinimumSegmentTime` if it was set", () => {
    let performanceNow = 5000;
    const mockPerformanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(vi.fn(() => performanceNow));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 3,
      availabilityStartTime: 4,
      serverTimestampOffset: 7000,
    });
    manifestBoundsCalculator.setLastPosition(3000, 10);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(
      7 + 5 - 4 - 3,
    );
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(4)).toEqual(
      7 + 5 - 4 - 3 - 4,
    );
    performanceNow = 25000;
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(
      7 + 25 - 4 - 3,
    );
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(10)).toEqual(
      7 + 25 - 4 - 3 - 10,
    );
    performanceNow = 35000;
    manifestBoundsCalculator.setLastPosition(84546464, 5642);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(
      7 + 35 - 4 - 3,
    );
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(5)).toEqual(
      7 + 35 - 4 - 3 - 5,
    );
    mockPerformanceNow.mockRestore();
  });

  it("should authorize and handle multiple `setLastPositionOffset` calls for dynamic contents", () => {
    let performanceNow = 5000;
    const mockPerformanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(vi.fn(() => performanceNow));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    performanceNow = 50000;
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(1045);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(40)).toEqual(1005);
    manifestBoundsCalculator.setLastPosition(0, 0);
    performanceNow = 55000;
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(0)).toEqual(50);
    expect(manifestBoundsCalculator.getEstimatedMinimumSegmentTime(40)).toEqual(10);
    mockPerformanceNow.mockRestore();
  });

  it("`getEstimatedMaximumPosition` should be based on the last position on on-dynamic manifest", () => {
    let performanceNow = 5000;
    const mockPerformanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(vi.fn(() => performanceNow));
    const manifestBoundsCalculator1 = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    const manifestBoundsCalculator2 = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: 10,
    });
    manifestBoundsCalculator1.setLastPosition(1000, 0);
    manifestBoundsCalculator2.setLastPosition(1000, 0);
    performanceNow = 50000;
    expect(manifestBoundsCalculator1.getEstimatedMaximumPosition(10)).toEqual(1000);
    expect(manifestBoundsCalculator2.getEstimatedMaximumPosition(19)).toEqual(1000);
    performanceNow = 55000;
    expect(manifestBoundsCalculator1.getEstimatedMaximumPosition(98)).toEqual(1000);
    expect(manifestBoundsCalculator2.getEstimatedMaximumPosition(93)).toEqual(1000);
    manifestBoundsCalculator1.setLastPosition(0, 0);
    manifestBoundsCalculator2.setLastPosition(0, 0);
    expect(manifestBoundsCalculator1.getEstimatedMaximumPosition(43)).toEqual(0);
    expect(manifestBoundsCalculator2.getEstimatedMaximumPosition(421)).toEqual(0);
    mockPerformanceNow.mockRestore();
  });

  it("`getEstimatedMaximumPosition` should evolve based on the last position on dynamic manifest without `serverTimestampOffset`", () => {
    let performanceNow = 5000;
    const mockPerformanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(vi.fn(() => performanceNow));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 7,
      serverTimestampOffset: undefined,
    });
    manifestBoundsCalculator.setLastPosition(1050, 0);
    performanceNow = 50000;
    expect(manifestBoundsCalculator.getEstimatedMaximumPosition(10)).toEqual(1050 + 50);
    performanceNow = 55000;
    expect(manifestBoundsCalculator.getEstimatedMaximumPosition(98)).toEqual(1050 + 55);
    manifestBoundsCalculator.setLastPosition(0, 10);
    expect(manifestBoundsCalculator.getEstimatedMaximumPosition(43)).toEqual(0 + 55 - 10);
    mockPerformanceNow.mockRestore();
  });

  it("should not return a live edge if `serverTimestampOffset` isn't set", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: undefined,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    expect(manifestBoundsCalculator.getEstimatedLiveEdge()).toEqual(undefined);
  });

  it("should not return a live edge if the manifest is not dynamic", () => {
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: false,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 0,
      serverTimestampOffset: 100,
    });
    manifestBoundsCalculator.setLastPosition(1000, 0);
    expect(manifestBoundsCalculator.getEstimatedLiveEdge()).toEqual(undefined);
  });

  it("should rely on `serverTimestampOffset` to produce live edge if set", () => {
    let performanceNow = 3000;
    const mockPerformanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(vi.fn(() => performanceNow));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 5,
      availabilityStartTime: 2,
      serverTimestampOffset: 5000,
    });
    expect(manifestBoundsCalculator.getEstimatedLiveEdge()).toEqual(3 + 5 - 2);
    manifestBoundsCalculator.setLastPosition(1000, 0);
    expect(manifestBoundsCalculator.getEstimatedLiveEdge()).toEqual(3 + 5 - 2);
    performanceNow = 9000;
    expect(manifestBoundsCalculator.getEstimatedLiveEdge()).toEqual(9 + 5 - 2);
    mockPerformanceNow.mockRestore();
  });

  it("`getEstimatedMaximumPosition` should evolve based on the live edge position on dynamic manifest with `serverTimestampOffset`", () => {
    let performanceNow = 5000;
    const mockPerformanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(vi.fn(() => performanceNow));
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic: true,
      timeShiftBufferDepth: 3,
      availabilityStartTime: 7,
      serverTimestampOffset: 1000,
    });
    expect(manifestBoundsCalculator.getEstimatedMaximumPosition(4)).toEqual(
      5 + 1 - 7 + 4,
    );
    manifestBoundsCalculator.setLastPosition(1050, 0);
    performanceNow = 70000;
    expect(manifestBoundsCalculator.getEstimatedMaximumPosition(11)).toEqual(
      5 + 1 - 7 + 11 + 70 - 5,
    );
    performanceNow = 85000;
    expect(manifestBoundsCalculator.getEstimatedMaximumPosition(98)).toEqual(
      5 + 1 - 7 + 98 + 85 - 5,
    );
    manifestBoundsCalculator.setLastPosition(0, 10);
    expect(manifestBoundsCalculator.getEstimatedMaximumPosition(43)).toEqual(
      5 + 1 - 7 + 43 + 85 - 5,
    );
    mockPerformanceNow.mockRestore();
  });
});
