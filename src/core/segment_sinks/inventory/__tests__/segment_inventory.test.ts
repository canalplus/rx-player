import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import configHandler from "../../../../config.ts";
import logger from "../../../../log.ts";
import {
  DummyAdaptation,
  DummyPeriod,
  DummyRepresentation,
  createSegment,
} from "../../../../manifest/classes/__tests__/mocks.ts";
import BufferedHistory from "../buffered_history.ts";
import SegmentInventory, { ChunkStatus } from "../segment_inventory.ts";
import type { IInsertedChunkInfos } from "../segment_inventory.ts";

const { mockGetMonotonicTimeStamp } = vi.hoisted(() => {
  return { mockGetMonotonicTimeStamp: vi.fn().mockReturnValue(1000) };
});

vi.mock("../../../../utils/monotonic_timestamp", () => ({
  default: mockGetMonotonicTimeStamp,
}));

function makeChunkInfos(
  overrides: Partial<IInsertedChunkInfos> = {},
  segmentId: string,
): IInsertedChunkInfos {
  return {
    adaptation: new DummyAdaptation(),
    period: new DummyPeriod(),
    representation: new DummyRepresentation(),
    segment: createSegment({ id: segmentId, isInit: false, complete: true }),
    chunkSize: 1000,
    start: 0,
    end: 10,
    ...overrides,
  };
}

function spyConfig(overrides: Record<string, unknown> = {}) {
  const originalConfig = configHandler.getCurrent();
  vi.spyOn(configHandler, "getCurrent").mockReturnValue({
    ...originalConfig,
    MINIMUM_SEGMENT_SIZE: 0.2,
    SEGMENT_SYNCHRONIZATION_DELAY: 500,
    MISSING_DATA_TRIGGER_SYNC_DELAY: 0.1,
    MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE: 0.5,
    MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE: 0.5,
    BUFFERED_HISTORY_RETENTION_TIME: 60000,
    BUFFERED_HISTORY_MAXIMUM_ENTRIES: 100,
    ...overrides,
  });
}

describe("SegmentInventory", () => {
  const mockGetHistoryFor = vi.fn().mockReturnValue([]);
  const mockAddBufferedSegment = vi.fn();
  beforeEach(() => {
    vi.spyOn(logger, "debug").mockImplementation(vi.fn());
    vi.spyOn(logger, "warn").mockImplementation(vi.fn());
    vi.spyOn(logger, "info").mockImplementation(vi.fn());
    vi.spyOn(logger, "error").mockImplementation(vi.fn());
    vi.spyOn(BufferedHistory.prototype, "getHistoryFor").mockImplementation(
      mockGetHistoryFor,
    );
    vi.spyOn(BufferedHistory.prototype, "addBufferedSegment").mockImplementation(
      mockAddBufferedSegment,
    );
    spyConfig();
  });
  afterEach(() => {
    vi.resetAllMocks();
    spyConfig();
  });

  describe("reset()", () => {
    it("clears all chunks from the inventory", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 5, end: 10 }, "2"), true, 200);
      expect(inv.getInventory()).toHaveLength(2);
      inv.reset();
      expect(inv.getInventory()).toHaveLength(0);
    });
  });

  describe("insertChunk()", () => {
    it("does nothing for init segments", () => {
      const inv = new SegmentInventory();
      const infos = makeChunkInfos(
        {
          segment: createSegment({ isInit: true, id: "1" }),
        },
        "1",
      );
      inv.insertChunk(infos, true, 100);
      expect(inv.getInventory()).toHaveLength(0);
    });

    it("discards chunks where start >= end", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 5, end: 5 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 10, end: 5 }, "2"), true, 100);
      expect(inv.getInventory()).toHaveLength(0);
    });

    it("inserts the first chunk correctly", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), true, 100);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(1);
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].end).toBe(10);
      expect(chunks[0].status).toBe(ChunkStatus.PartiallyPushed);
    });

    it("marks failed chunks with ChunkStatus.Failed", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), false, 100);
      expect(inv.getInventory()[0].status).toBe(ChunkStatus.Failed);
    });

    it("appends a chunk strictly after an existing one (no overlap)", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 5, end: 10 }, "2"), true, 200);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(2);
      expect(chunks[0].start).toBe(0);
      expect(chunks[1].start).toBe(5);
    });

    it("appends a chunk with a gap between", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 7, end: 10 }, "2"), true, 200);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(2);
      expect(chunks[1].start).toBe(7);
    });

    it("inserts a chunk before all existing ones", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 10, end: 20 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "2"), true, 200);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(2);
      expect(chunks[0].start).toBe(0);
      expect(chunks[1].start).toBe(10);
    });

    it("replaces an existing chunk with same start and smaller/equal end", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "2"), true, 200);
      expect(inv.getInventory()).toHaveLength(1);
      expect(inv.getInventory()[0].insertionTs).toBe(200);
    });

    it("overlapping new chunk updates end of previous segment", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 5, end: 15 }, "2"), true, 200);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(2);
      expect(chunks[0].end).toBe(5);
      expect(chunks[1].start).toBe(5);
      expect(chunks[1].end).toBe(15);
    });

    it("new chunk contained in existing one splits the existing", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 20 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 5, end: 10 }, "2"), true, 200);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(3);
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].end).toBe(5);
      expect(chunks[1].start).toBe(5);
      expect(chunks[1].end).toBe(10);
      expect(chunks[2].start).toBe(10);
      expect(chunks[2].end).toBe(20);
      expect(chunks[0].splitted).toBe(true);
      expect(chunks[2].splitted).toBe(true);
    });

    it("new chunk larger than existing one replaces it", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 2, end: 8 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "2"), true, 200);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(1);
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].end).toBe(10);
    });

    it("new chunk overlapping start of first segment trims the first", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 5, end: 15 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 0, end: 8 }, "2"), true, 200);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(2);
      expect(chunks[0].end).toBe(8);
      expect(chunks[1].start).toBe(8);
    });

    it("new chunk that covers next segment removes the next one", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), true, 100);
      inv.insertChunk(makeChunkInfos({ start: 6, end: 9 }, "2"), true, 200);
      inv.insertChunk(makeChunkInfos({ start: 0, end: 20 }, "3"), true, 300);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(1);
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].end).toBe(20);
    });
  });

  describe("completeSegment()", () => {
    it("does nothing for init segments", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "0"), true, 100);
      const content = {
        adaptation: new DummyAdaptation(),
        period: new DummyPeriod(),
        representation: new DummyRepresentation(),
        segment: createSegment({ isInit: true, id: "0" }),
      };
      inv.completeSegment(content);
      // Still PartiallyPushed because it was ignored
      expect(inv.getInventory()[0].status).toBe(ChunkStatus.PartiallyPushed);
    });

    it("updates matching chunk status to FullyLoaded", () => {
      const inv = new SegmentInventory();
      const infos = makeChunkInfos({ start: 0, end: 10 }, "1");
      inv.insertChunk(infos, true, 100);
      inv.completeSegment({
        adaptation: infos.adaptation,
        period: infos.period,
        representation: infos.representation,
        segment: infos.segment,
      });
      expect(inv.getInventory()[0].status).toBe(ChunkStatus.FullyLoaded);
    });

    it("merges multiple partial chunks for the same segment", () => {
      const inv = new SegmentInventory();
      const infos1 = makeChunkInfos({ start: 0, end: 5 }, "1");
      const infos2 = makeChunkInfos({ start: 5, end: 10 }, "1");
      inv.insertChunk(infos1, true, 100);
      inv.insertChunk(infos2, true, 200);
      expect(inv.getInventory()).toHaveLength(2);

      // mockAreSameContent.mockReturnValue(true);
      inv.completeSegment({
        adaptation: infos1.adaptation,
        period: infos1.period,
        representation: infos1.representation,
        segment: infos1.segment,
      });
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(1);
      expect(chunks[0].end).toBe(10);
      expect(chunks[0].status).toBe(ChunkStatus.FullyLoaded);
    });

    it("calls addBufferedSegment when bufferedStart and bufferedEnd are known", () => {
      const inv = new SegmentInventory();
      const infos = makeChunkInfos({ start: 0, end: 10 }, "1");
      inv.insertChunk(infos, true, 100);

      // Manually set buffered positions to simulate a synchronization
      const chunk = inv.getInventory()[0];
      chunk.bufferedStart = 0;
      chunk.bufferedEnd = 10;

      // mockAreSameContent.mockReturnValue(true);
      inv.completeSegment({
        adaptation: infos.adaptation,
        period: infos.period,
        representation: infos.representation,
        segment: infos.segment,
      });
      expect(mockAddBufferedSegment).toHaveBeenCalledOnce();
    });

    it("does not call addBufferedSegment when buffered positions are unknown", () => {
      const inv = new SegmentInventory();
      const infos = makeChunkInfos({ start: 0, end: 10 }, "1");
      inv.insertChunk(infos, true, 100);
      // mockAreSameContent.mockReturnValue(true);
      inv.completeSegment({
        adaptation: infos.adaptation,
        period: infos.period,
        representation: infos.representation,
        segment: infos.segment,
      });
      expect(mockAddBufferedSegment).not.toHaveBeenCalled();
    });
  });

  describe("synchronizeBuffered()", () => {
    it("does nothing when inventory is empty", () => {
      const inv = new SegmentInventory();
      inv.synchronizeBuffered([{ start: 0, end: 10 }]);
      expect(inv.getInventory()).toHaveLength(0);
    });

    it("skips ranges that are too small", () => {
      spyConfig({ MINIMUM_SEGMENT_SIZE: 1 });
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), true, 100);
      // Range of 0.1 < MINIMUM_SEGMENT_SIZE of 1
      inv.synchronizeBuffered([{ start: 0, end: 0.1 }]);
      // Chunk should remain since the range was skipped
      expect(inv.getInventory()).toHaveLength(1);
    });

    it("sets bufferedStart and bufferedEnd for a single segment in a single range", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), true, 0);
      // insertionTs=0, now=1000 => well above SEGMENT_SYNCHRONIZATION_DELAY=500
      inv.synchronizeBuffered([{ start: 0, end: 10 }]);
      const chunk = inv.getInventory()[0];
      expect(chunk.bufferedStart).not.toBeUndefined();
      expect(chunk.bufferedEnd).not.toBeUndefined();
    });

    it("garbage collects segments not covered by any range", () => {
      const inv = new SegmentInventory();
      // insertionTs=0, now=1000 => old enough to GC
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), true, 0);
      inv.insertChunk(makeChunkInfos({ start: 20, end: 30 }, "2"), true, 0);
      inv.synchronizeBuffered([{ start: 20, end: 30 }]);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(1);
      expect(chunks[0].start).toBe(20);
    });

    it("does not GC segments that are too recently inserted", () => {
      spyConfig({ SEGMENT_SYNCHRONIZATION_DELAY: 5000 });
      // now=1000, insertionTs=500 => delta=500 < 5000
      mockGetMonotonicTimeStamp.mockReturnValue(1000);
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 50, end: 60 }, "1"), true, 500);
      inv.synchronizeBuffered([{ start: 0, end: 10 }]);
      // The segment at 50-60 should NOT be removed yet
      expect(inv.getInventory()).toHaveLength(1);
    });

    it("updates bufferedStart based on range start", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0.1, end: 10 }, "1"), true, 0);
      inv.synchronizeBuffered([{ start: 0, end: 10 }]);
      expect(inv.getInventory()[0].bufferedStart).toBe(0);
    });

    it("updates bufferedEnd based on range end", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), true, 0);
      inv.synchronizeBuffered([{ start: 0, end: 10 }]);
      expect(inv.getInventory()[0].bufferedEnd).toBe(10);
    });

    it("handles multiple segments in one range (contiguous)", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), true, 0);
      inv.insertChunk(makeChunkInfos({ start: 5, end: 10 }, "2"), true, 0);
      inv.synchronizeBuffered([{ start: 0, end: 10 }]);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(2);
      expect(chunks[0].bufferedEnd).not.toBeUndefined();
      expect(chunks[1].bufferedEnd).toBe(10);
    });

    it("handles multiple ranges mapping to multiple segments", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), true, 0);
      inv.insertChunk(makeChunkInfos({ start: 10, end: 15 }, "2"), true, 0);
      inv.synchronizeBuffered([
        { start: 0, end: 5 },
        { start: 10, end: 15 },
      ]);
      const chunks = inv.getInventory();
      expect(chunks).toHaveLength(2);
      expect(chunks[0].bufferedEnd).toBe(5);
      expect(chunks[1].bufferedEnd).toBe(15);
    });

    it("trims bufferedStart when it falls before range start (partial GC at start)", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "1"), true, 0);
      // Manually set an old bufferedStart that now falls before the range
      inv.getInventory()[0].bufferedStart = 0;
      inv.synchronizeBuffered([{ start: 2, end: 10 }]);
      expect(inv.getInventory()[0].bufferedStart).toBe(2);
    });

    it("trims bufferedEnd when it exceeds range end (partial GC at end)", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 10 }, "2"), true, 0);
      inv.getInventory()[0].bufferedEnd = 12;
      inv.synchronizeBuffered([{ start: 0, end: 10 }]);
      expect(inv.getInventory()[0].bufferedEnd).toBe(10);
    });

    it("calls addBufferedSegment for GC'd segments that were never synced", () => {
      const inv = new SegmentInventory();
      const chunkInfos = makeChunkInfos({ start: 0, end: 5 }, "3");
      // insertionTs=0, now=1000 => old enough
      inv.insertChunk(chunkInfos, true, 0);
      inv.synchronizeBuffered([{ start: 10, end: 20 }]);
      // The 0-5 chunk was GC'd with no bufferedStart/End => should call addBufferedSegment
      expect(mockAddBufferedSegment).toHaveBeenCalledWith(
        {
          period: chunkInfos.period,
          adaptation: chunkInfos.adaptation,
          representation: chunkInfos.representation,
          segment: chunkInfos.segment,
        },
        null,
      );
    });

    it("does not call addBufferedSegment for GC'd Failed segments", () => {
      const inv = new SegmentInventory();
      inv.insertChunk(makeChunkInfos({ start: 0, end: 5 }, "1"), false, 0);
      inv.synchronizeBuffered([{ start: 10, end: 20 }]);
      expect(mockAddBufferedSegment).not.toHaveBeenCalled();
    });
  });

  describe("getHistoryFor()", () => {
    it("delegates to BufferedHistory.getHistoryFor", () => {
      const inv = new SegmentInventory();
      const context = {
        adaptation: new DummyAdaptation(),
        period: new DummyPeriod(),
        representation: new DummyRepresentation(),
        segment: createSegment({ isInit: false }),
      };
      const fakeHistory = [{ date: 1, buffered: null, context }];
      mockGetHistoryFor.mockReturnValue(fakeHistory);
      const result = inv.getHistoryFor(context);
      expect(result).toBe(fakeHistory);
      expect(mockGetHistoryFor).toHaveBeenCalledWith(context);
    });
  });
});
