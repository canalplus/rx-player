import { afterEach, describe, expect, it, vi } from "vitest";
import TimelineRepresentationIndex from "../../../../../../../../../src/parsers/manifest/dash/common/indexes/timeline/timeline_representation_index.ts";
import ManifestBoundsCalculator from "../../../../../../../../../src/parsers/manifest/dash/common/manifest_bounds_calculator.ts";

describe("TimelineRepresentationIndex - negative repeats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { timescale: 1, presentationTimeOffset: 100, periodStart: 0 },
    { timescale: 10, presentationTimeOffset: 1000, periodStart: 0 },
    { timescale: 10, presentationTimeOffset: 1000, periodStart: 20 },
    { timescale: 10, presentationTimeOffset: 0, periodStart: 20 },
    { timescale: 1, presentationTimeOffset: 0, periodStart: 0 },
  ])(
    "repeats until the period end with timescale=$timescale, PTO=$presentationTimeOffset and periodStart=$periodStart",
    ({ timescale, presentationTimeOffset, periodStart }) => {
      const periodEnd = periodStart + 30;
      const bounds = new ManifestBoundsCalculator({
        availabilityStartTime: 0,
        isDynamic: false,
        timeShiftBufferDepth: undefined,
        serverTimestampOffset: undefined,
      });
      bounds.setLastPosition(periodEnd);
      const index = createIndex(bounds, {
        timescale,
        presentationTimeOffset,
        periodStart,
        periodEnd,
      });

      expect(index.getFirstAvailablePosition()).toBe(periodStart);
      expect(index.getLastAvailablePosition()).toBe(periodEnd);
      expect(index.getSegments(periodStart, 60)).toMatchObject(
        [0, 10, 20].map((time) => ({
          time: periodStart + time,
          end: periodStart + time + 10,
          duration: 10,
          url: `${presentationTimeOffset + time * timescale}.m4s`,
        })),
      );
      expect(index.getSegments(periodEnd, 10)).toEqual([]);
    },
  );

  it("uses the period end when the manifest's maximum position is unknown", () => {
    const bounds = new ManifestBoundsCalculator({
      availabilityStartTime: 0,
      isDynamic: false,
      timeShiftBufferDepth: undefined,
      serverTimestampOffset: undefined,
    });
    const index = createIndex(bounds, { periodEnd: 30 });

    expect(index.getSegments(0, 60).map((segment) => segment.time)).toEqual([0, 10, 20]);
  });

  it("stops at the live boundary after converting it to index time", () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    const bounds = new ManifestBoundsCalculator({
      availabilityStartTime: 0,
      isDynamic: true,
      timeShiftBufferDepth: undefined,
      serverTimestampOffset: 20000,
    });
    const index = createIndex(bounds, { isDynamic: true });

    expect(index.getSegments(0, 60).map((segment) => segment.time)).toEqual([0, 10]);
  });

  it("still stops at the period end when the live boundary is later", () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    const bounds = new ManifestBoundsCalculator({
      availabilityStartTime: 0,
      isDynamic: true,
      timeShiftBufferDepth: undefined,
      serverTimestampOffset: 60000,
    });
    const index = createIndex(bounds, { isDynamic: true, periodEnd: 30 });

    expect(index.getSegments(0, 60).map((segment) => segment.time)).toEqual([0, 10, 20]);
  });
});

function createIndex(
  manifestBoundsCalculator: ManifestBoundsCalculator,
  {
    timescale = 1,
    presentationTimeOffset = 100,
    periodStart = 0,
    periodEnd,
    isDynamic = false,
  }: {
    timescale?: number;
    presentationTimeOffset?: number;
    periodStart?: number;
    periodEnd?: number;
    isDynamic?: boolean;
  },
): TimelineRepresentationIndex {
  return new TimelineRepresentationIndex(
    {
      timescale,
      presentationTimeOffset,
      media: "$Time$.m4s",
      timeline: [
        { start: presentationTimeOffset, duration: 10 * timescale, repeatCount: -1 },
      ],
    },
    {
      manifestBoundsCalculator,
      availabilityTimeComplete: undefined,
      availabilityTimeOffset: isDynamic ? 0 : undefined,
      isDynamic,
      isLastPeriod: true,
      periodStart,
      periodEnd,
      unsafelyBaseOnPreviousRepresentation: null,
      isEMSGWhitelisted: () => false,
    },
  );
}
