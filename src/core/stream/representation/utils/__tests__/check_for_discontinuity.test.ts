import { describe, it, expect, vi } from "vitest";
import {
  __MANIFEST_CLASSES_MOCKS,
  type Adaptation,
  type Period,
  type Representation,
} from "../../../../../manifest/classes";
import type Manifest from "../../../../../manifest/classes";
import { ChunkStatus, type IBufferedChunk } from "../../../../segment_sinks";
import checkForDiscontinuity from "../check_for_discontinuity";

describe("checkForDiscontinuity", () => {
  const createMockContent = (): {
    adaptation: Adaptation;
    manifest: Manifest;
    period: Period;
    representation: Representation;
  } => ({
    adaptation: new __MANIFEST_CLASSES_MOCKS.DummyAdaptation({ type: "video" }),
    manifest: new __MANIFEST_CLASSES_MOCKS.DummyManifest(),
    period: new __MANIFEST_CLASSES_MOCKS.DummyPeriod(),
    representation: new __MANIFEST_CLASSES_MOCKS.DummyRepresentation(),
  });

  function makeBufferedChunk({
    start,
    end,
    bufferedStart = start,
    bufferedEnd = end,
    segmentTime,
    segmentEnd,
  }: {
    start: number;
    end: number;
    bufferedStart?: number | undefined;
    bufferedEnd?: number | undefined;
    segmentTime: number;
    segmentEnd: number;
  }): IBufferedChunk {
    return {
      infos: {
        period: new __MANIFEST_CLASSES_MOCKS.DummyPeriod(),
        adaptation: new __MANIFEST_CLASSES_MOCKS.DummyAdaptation(),
        representation: new __MANIFEST_CLASSES_MOCKS.DummyRepresentation(),
        segment: __MANIFEST_CLASSES_MOCKS.createSegment({
          time: segmentTime,
          end: segmentEnd,
        }),
      },
      bufferedStart,
      bufferedEnd,
      start,
      end,
      insertionTs: 0,
      chunkSize: 1024,
      precizeStart: true,
      precizeEnd: true,
      status: ChunkStatus.FullyLoaded,
      splitted: false,
    };
  }

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
      const content = createMockContent();
      content.period.end = 100;
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
      const content = createMockContent();
      const mockCheckDiscontinuity = vi
        .spyOn(content.representation.index, "checkDiscontinuity")
        .mockReturnValue(25);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        false,
      );
      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        false,
        [],
      );
      expect(result).toEqual({ start: undefined, end: 25 });
      expect(mockCheckDiscontinuity).toHaveBeenCalledWith(10);
    });

    it("should return discontinuity to Period's end when has finished loading without segment and range after Period's end", () => {
      const content = createMockContent();
      content.period.end = 29;
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        false,
      );
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
      const content = createMockContent();
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        false,
      );
      content.period.end = 30;
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
      const content = createMockContent();
      content.period.end = 31;
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        false,
      );
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
      const bufferedSegments = [
        makeBufferedChunk({ start: 15, end: 20, segmentTime: 15, segmentEnd: 20 }),
      ];
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
      const bufferedSegments = [
        makeBufferedChunk({ start: 15, end: 20, segmentTime: 15, segmentEnd: 20 }),
      ];
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
      const bufferedSegments = [
        makeBufferedChunk({ start: 15, end: 20, segmentTime: 15, segmentEnd: 20 }),
      ];
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
      const content = createMockContent();
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      const mockAwaitSegmentBetween = vi
        .spyOn(content.representation.index, "awaitSegmentBetween")
        .mockReturnValue(true);
      const bufferedSegments = [
        makeBufferedChunk({ start: 15, end: 20, segmentTime: 15, segmentEnd: 20 }),
      ];
      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 25 },
        null,
        false, // not finished loading
        bufferedSegments,
      );
      expect(result).toBeNull();
      expect(mockAwaitSegmentBetween).toHaveBeenCalledWith(10, 15);
    });
  });

  describe("when there's a hole between buffered segments", () => {
    it("should detect discontinuity between consecutive segments", () => {
      const content = createMockContent();
      const bufferedSegments = [
        makeBufferedChunk({ start: 10, end: 15, segmentTime: 10, segmentEnd: 15 }),
        makeBufferedChunk({ start: 20, end: 25, segmentTime: 20, segmentEnd: 25 }), // hole from 15 to 20
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
        makeBufferedChunk({ start: 10, end: 15, segmentTime: 10, segmentEnd: 15 }),
        makeBufferedChunk({ start: 20, end: 25, segmentTime: 20, segmentEnd: 25 }),
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
        makeBufferedChunk({ start: 10, end: 15, segmentTime: 10, segmentEnd: 15 }),
        makeBufferedChunk({ start: 20, end: 25, segmentTime: 20, segmentEnd: 25 }),
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
      const content = createMockContent();
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      const mockAwaitSegmentBetween = vi
        .spyOn(content.representation.index, "awaitSegmentBetween")
        .mockReturnValue(true);
      const bufferedSegments = [
        makeBufferedChunk({ start: 10, end: 15, segmentTime: 10, segmentEnd: 15 }),
        makeBufferedChunk({ start: 20, end: 25, segmentTime: 20, segmentEnd: 25 }),
      ];
      const result = checkForDiscontinuity(
        content,
        { start: 10, end: 30 },
        null,
        false, // not finished loading
        bufferedSegments,
      );
      expect(result).toBeNull();
      expect(mockAwaitSegmentBetween).toHaveBeenCalledWith(15, 20);
    });
  });

  describe("when checking for discontinuity at period end", () => {
    it("should detect discontinuity when last segment ends before period end", () => {
      const content = createMockContent();
      content.period.end = 100;
      const bufferedSegments = [
        makeBufferedChunk({ start: 80, end: 90, segmentTime: 80, segmentEnd: 90 }), // ends before period end
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
      const content = createMockContent();
      content.period.end = 100;
      const bufferedSegments = [
        makeBufferedChunk({ start: 80, end: 90, segmentTime: 80, segmentEnd: 90 }),
      ];
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
      const content = createMockContent();
      content.period.end = 100;
      const bufferedSegments = [
        makeBufferedChunk({ start: 80, end: 100, segmentTime: 80, segmentEnd: 100 }),
      ];
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
      const content = createMockContent();
      const mockCheckDiscontinuity = vi
        .spyOn(content.representation.index, "checkDiscontinuity")
        .mockImplementation((time) => (time === 50 ? 60 : null));
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        undefined,
      );
      const bufferedSegments = [
        makeBufferedChunk({ start: 30, end: 40, segmentTime: 30, segmentEnd: 40 }),
      ];
      const result = checkForDiscontinuity(
        content,
        { start: 30, end: 50 },
        null,
        false,
        bufferedSegments,
      );
      expect(result).toEqual({ start: 40, end: 60 });
      expect(mockCheckDiscontinuity).toHaveBeenCalledWith(50);
    });

    it("should return null when no manifest discontinuity at range end", () => {
      const content = createMockContent();
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        false,
      );
      const bufferedSegments = [
        makeBufferedChunk({ start: 30, end: 40, segmentTime: 30, segmentEnd: 40 }),
      ];
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
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        undefined,
      );
      const bufferedSegments = [
        makeBufferedChunk({
          bufferedStart: undefined,
          bufferedEnd: 15,
          segmentTime: 10,
          segmentEnd: 15,
          start: 10,
          end: 15,
        }),
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
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        undefined,
      );
      const bufferedSegments = [
        makeBufferedChunk({
          bufferedStart: 10,
          bufferedEnd: undefined,
          segmentTime: 10,
          segmentEnd: 15,
          start: 10,
          end: 15,
        }),
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
        makeBufferedChunk({ start: 5, end: 8, segmentTime: 5, segmentEnd: 8 }), // before range
        makeBufferedChunk({ start: 10, end: 15, segmentTime: 10, segmentEnd: 15 }), // in range
        makeBufferedChunk({ start: 20, end: 25, segmentTime: 20, segmentEnd: 25 }), // in range
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
      vi.spyOn(content.representation.index, "checkDiscontinuity").mockReturnValue(null);
      vi.spyOn(content.representation.index, "awaitSegmentBetween").mockReturnValue(
        undefined,
      );
      const bufferedSegments = [
        makeBufferedChunk({ start: 10, end: 15, segmentTime: 10, segmentEnd: 15 }),
        makeBufferedChunk({ start: 15, end: 20, segmentTime: 15, segmentEnd: 20 }),
        makeBufferedChunk({ start: 20, end: 25, segmentTime: 20, segmentEnd: 25 }),
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
