import { afterEach, describe, expect, it, vi } from "vitest";
import TimelineRepresentationIndex, {
  getLastRequestableSegmentInfo,
} from "../../../../../../../../../src/parsers/manifest/dash/common/indexes/timeline/timeline_representation_index.ts";
import ManifestBoundsCalculator from "../../../../../../../../../src/parsers/manifest/dash/common/manifest_bounds_calculator.ts";

describe("TimelineRepresentationIndex - availability bounds", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each([
    { timescale: 1, indexTimeOffset: 0 },
    { timescale: 90000, indexTimeOffset: 123456789 },
  ])("timescale=$timescale, indexTimeOffset=$indexTimeOffset", (timeMapping) => {
    it.each([
      { availabilityTimeOffset: -39, expected: null },
      {
        availabilityTimeOffset: -38,
        expected: { timelineIdx: 0, newRepeatCount: 0, end: 62 },
      },
      {
        availabilityTimeOffset: -15.559,
        expected: { timelineIdx: 0, newRepeatCount: 4, end: 70 },
      },
      {
        availabilityTimeOffset: -5.559,
        expected: { timelineIdx: 1, newRepeatCount: 1, end: 94 },
      },
      {
        availabilityTimeOffset: 0,
        expected: { timelineIdx: 1, newRepeatCount: 4, end: 100 },
      },
      {
        availabilityTimeOffset: 5,
        expected: { timelineIdx: 1, newRepeatCount: 4, end: 100 },
      },
    ])("finds the available tip with ATO=$availabilityTimeOffset", (testCase) => {
      vi.spyOn(performance, "now").mockReturnValue(0);
      const bounds = new ManifestBoundsCalculator({
        availabilityStartTime: 0,
        isDynamic: true,
        timeShiftBufferDepth: undefined,
        serverTimestampOffset: 100000,
      });
      const { timescale, indexTimeOffset } = timeMapping;
      const index = {
        ...timeMapping,
        availabilityTimeOffset: testCase.availabilityTimeOffset,
        timeline: [60, 90].map((start) => ({
          start: start * timescale + indexTimeOffset,
          duration: 2 * timescale,
          repeatCount: 4,
        })),
      };

      const result = getLastRequestableSegmentInfo(index, bounds, undefined);

      if (testCase.expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result).toEqual({
          ...testCase.expected,
          end: testCase.expected.end * timescale + indexTimeOffset,
          isLastOfTimeline: testCase.expected.end === 100,
        });
      }
    });
  });
});

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
