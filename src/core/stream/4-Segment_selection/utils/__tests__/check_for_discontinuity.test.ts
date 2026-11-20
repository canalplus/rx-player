import { describe, it, expect, vi } from "vitest";
import type { IBufferedChunk } from "../../../../segment_sinks";
import checkForDiscontinuity from "../check_for_discontinuity";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Minimal type setup for tests
interface TestContent {
  adaptation: { type: string };
  manifest: any;
  period: { end?: number };
  representation: {
    index: {
      checkDiscontinuity: (time: number) => number | null;
      awaitSegmentBetween: (start: number, end: number) => boolean | undefined;
    };
  };
}

describe("checkForDiscontinuity", () => {
  const createMockContent = (overrides?: Partial<TestContent>): any => ({
    adaptation: { type: "video" },
    manifest: {},
    period: {},
    representation: {
      index: {
        checkDiscontinuity: vi.fn(() => null),
        awaitSegmentBetween: vi.fn(() => undefined),
      },
    },
    ...overrides,
  });

  const createBufferedChunk = (
    start: number,
    end: number,
    segmentTime: number,
    segmentEnd: number,
  ): IBufferedChunk =>
    ({
      bufferedStart: start,
      bufferedEnd: end,
      infos: {
        segment: {
          time: segmentTime,
          end: segmentEnd,
        },
      },
    }) as IBufferedChunk;

  describe("when no segments are buffered in range", () => {
    it("should return null when nextSegmentStart is provided", () => {
      const content = createMockContent();
      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 20 },
        15, // nextSegmentStart
        false,
        [],
      );

      expect(result).toBeNull();
    });

    it("should return discontinuity to period end when finished loading and at period end", () => {
      const content = createMockContent({
        period: { end: 100 },
      });
      const result = checkForDiscontinuity(
        content,
        { start: 90, end: 105 },
        null, // no next segment
        true, // hasFinishedLoading
        [],
      );

      expect(result).toEqual({ start: undefined, end: null });
    });

    it("should return manifest discontinuity when no next segment", () => {
      const content = createMockContent({
        representation: {
          index: {
            checkDiscontinuity: vi.fn(() => 25),
            awaitSegmentBetween: vi.fn(() => false),
          },
        },
      });

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        false,
        [],
      );

      expect(result).toEqual({ start: undefined, end: 25 });
      expect(content.representation.index.checkDiscontinuity).toHaveBeenCalledWith(10);
    });

    it("should return discontinuity to Period's end when has finished loading without segment and range after Period's end", () => {
      const content = createMockContent({
        period: { end: 29 },
        representation: {
          index: {
            checkDiscontinuity: vi.fn(() => null),
            awaitSegmentBetween: vi.fn(() => false),
          },
        },
      });

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        true, // hasFinishedLoading
        [],
      );

      expect(result).toEqual({ start: undefined, end: null });
    });

    it("should return discontinuity to Period's end when has finished loading without segment and range equal to Period's end", () => {
      const content = createMockContent({
        period: { end: 30 },
        representation: {
          index: {
            checkDiscontinuity: vi.fn(() => null),
            awaitSegmentBetween: vi.fn(() => false),
          },
        },
      });

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        true, // hasFinishedLoading
        [],
      );

      expect(result).toEqual({ start: undefined, end: null });
    });

    it("should not return discontinuity when has finished loading without segment and range before Period's end", () => {
      const content = createMockContent({
        period: { end: 31 },
        representation: {
          index: {
            checkDiscontinuity: vi.fn(() => null),
            awaitSegmentBetween: vi.fn(() => false),
          },
        },
      });

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        true, // hasFinishedLoading
        [],
      );

      expect(result).toEqual(null);
    });
  });

  describe("when there's a hole before the first buffered segment", () => {
    it("should detect discontinuity when hole won't be filled", () => {
      const content = createMockContent();
      const bufferedSegments = [createBufferedChunk(15, 20, 15, 20)];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 25 },
        null, // no next segment to fill the hole
        true,
        bufferedSegments,
      );

      expect(result).toEqual({ start: undefined, end: 15 });
    });

    it("should detect discontinuity when next segment won't fill the hole", () => {
      const content = createMockContent();
      const bufferedSegments = [createBufferedChunk(15, 20, 15, 20)];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 25 },
        20, // nextSegmentStart is after the hole
        true,
        bufferedSegments,
      );

      expect(result).toEqual({ start: undefined, end: 15 });
    });

    it("should return null when a segment is expected to fill the hole", () => {
      const content = createMockContent();
      const bufferedSegments = [createBufferedChunk(15, 20, 15, 20)];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 25 },
        10, // nextSegmentStart will fill the hole
        false,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });

    it("should return null when awaiting segment between start and hole", () => {
      const content = createMockContent({
        representation: {
          index: {
            checkDiscontinuity: vi.fn(() => null),
            awaitSegmentBetween: vi.fn(() => true),
          },
        },
      });
      const bufferedSegments = [createBufferedChunk(15, 20, 15, 20)];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 25 },
        null,
        false, // not finished loading
        bufferedSegments,
      );

      expect(result).toBeNull();
      expect(content.representation.index.awaitSegmentBetween).toHaveBeenCalledWith(
        10,
        15,
      );
    });
  });

  describe("when there's a hole between buffered segments", () => {
    it("should detect discontinuity between consecutive segments", () => {
      const content = createMockContent();
      const bufferedSegments = [
        createBufferedChunk(10, 15, 10, 15),
        createBufferedChunk(20, 25, 20, 25), // hole from 15 to 20
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null, // no segment to fill the hole
        true,
        bufferedSegments,
      );

      expect(result).toEqual({ start: 15, end: 20 });
    });

    it("should detect discontinuity when next segment comes after the hole", () => {
      const content = createMockContent();
      const bufferedSegments = [
        createBufferedChunk(10, 15, 10, 15),
        createBufferedChunk(20, 25, 20, 25),
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        25, // nextSegmentStart is after the hole
        true,
        bufferedSegments,
      );

      expect(result).toEqual({ start: 15, end: 20 });
    });

    it("should return null when next segment will fill the hole", () => {
      const content = createMockContent();
      const bufferedSegments = [
        createBufferedChunk(10, 15, 10, 15),
        createBufferedChunk(20, 25, 20, 25),
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        15, // nextSegmentStart will fill the hole
        false,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });

    it("should return null when awaiting segment between holes", () => {
      const content = createMockContent({
        representation: {
          index: {
            checkDiscontinuity: vi.fn(() => null),
            awaitSegmentBetween: vi.fn(() => true),
          },
        },
      });
      const bufferedSegments = [
        createBufferedChunk(10, 15, 10, 15),
        createBufferedChunk(20, 25, 20, 25),
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        false, // not finished loading
        bufferedSegments,
      );

      expect(result).toBeNull();
      expect(content.representation.index.awaitSegmentBetween).toHaveBeenCalledWith(
        15,
        20,
      );
    });
  });

  describe("when checking for discontinuity at period end", () => {
    it("should detect discontinuity when last segment ends before period end", () => {
      const content = createMockContent({
        period: { end: 100 },
      });
      const bufferedSegments = [
        createBufferedChunk(80, 90, 80, 90), // ends before period end
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 80, end: 105 },
        null,
        true, // hasFinishedLoading
        bufferedSegments,
      );

      expect(result).toEqual({ start: 90, end: null });
    });

    it("should return null when checked range doesn't reach period end", () => {
      const content = createMockContent({
        period: { end: 100 },
      });
      const bufferedSegments = [createBufferedChunk(80, 90, 80, 90)];

      const result = checkForDiscontinuity(
        content,
        { start: 80, end: 95 }, // doesn't reach period end
        null,
        true,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });

    it("should return null when last segment reaches period end", () => {
      const content = createMockContent({
        period: { end: 100 },
      });
      const bufferedSegments = [createBufferedChunk(80, 100, 80, 100)];

      const result = checkForDiscontinuity(
        content,
        { start: 80, end: 105 },
        null,
        true,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });
  });

  describe("when checking for manifest discontinuity at range end", () => {
    it("should detect manifest discontinuity at end of range", () => {
      const content = createMockContent({
        representation: {
          index: {
            checkDiscontinuity: vi.fn((time) => (time === 50 ? 60 : null)),
            awaitSegmentBetween: vi.fn(() => undefined),
          },
        },
      });
      const bufferedSegments = [createBufferedChunk(30, 40, 30, 40)];

      const result = checkForDiscontinuity(
        content,
        { start: 30, end: 50 },
        null,
        false,
        bufferedSegments,
      );

      expect(result).toEqual({ start: 40, end: 60 });
      expect(content.representation.index.checkDiscontinuity).toHaveBeenCalledWith(50);
    });

    it("should return null when no manifest discontinuity at range end", () => {
      const content = createMockContent({
        representation: {
          index: {
            checkDiscontinuity: vi.fn(() => null),
            awaitSegmentBetween: vi.fn(() => false),
          },
        },
      });
      const bufferedSegments = [createBufferedChunk(30, 40, 30, 40)];

      const result = checkForDiscontinuity(
        content,
        { start: 30, end: 50 },
        null,
        false,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle segments with undefined bufferedStart", () => {
      const content = createMockContent();
      const bufferedSegments = [
        {
          bufferedStart: undefined,
          bufferedEnd: 15,
          infos: { segment: { time: 10, end: 15 } },
        } as IBufferedChunk,
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 20 },
        null,
        false,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });

    it("should handle segments with undefined bufferedEnd", () => {
      const content = createMockContent();
      const bufferedSegments = [
        {
          bufferedStart: 10,
          bufferedEnd: undefined,
          infos: { segment: { time: 10, end: 15 } },
        } as IBufferedChunk,
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 20 },
        null,
        false,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });

    it("should handle multiple segments where only some overlap with range", () => {
      const content = createMockContent();
      const bufferedSegments = [
        createBufferedChunk(5, 8, 5, 8), // before range
        createBufferedChunk(10, 15, 10, 15), // in range
        createBufferedChunk(20, 25, 20, 25), // in range
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        true,
        bufferedSegments,
      );

      expect(result).toEqual({ start: 15, end: 20 });
    });

    it("should handle consecutive segments without gaps", () => {
      const content = createMockContent();
      const bufferedSegments = [
        createBufferedChunk(10, 15, 10, 15),
        createBufferedChunk(15, 20, 15, 20),
        createBufferedChunk(20, 25, 20, 25),
      ];

      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        false,
        bufferedSegments,
      );

      expect(result).toBeNull();
    });
  });
});
