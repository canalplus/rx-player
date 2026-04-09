import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DummyAdaptation,
  DummyRepresentation,
  DummyPeriod,
  createSegment,
} from "../../../../manifest/classes/__tests__/mocks";
import BufferedHistory from "../buffered_history";
import type { IChunkContext } from "../types";

const { mockAreSameContent, mockGetMonotonicTimeStamp } = vi.hoisted(() => {
  return { mockAreSameContent: vi.fn(), mockGetMonotonicTimeStamp: vi.fn() };
});

vi.mock("../../../../manifest", () => ({
  areSameContent: mockAreSameContent,
}));

vi.mock("../../../../utils/monotonic_timestamp", () => ({
  default: mockGetMonotonicTimeStamp,
}));

const makeContext = (id: string): IChunkContext => ({
  adaptation: new DummyAdaptation({ id }),
  representation: new DummyRepresentation({ id }),
  period: new DummyPeriod({ id }),
  segment: createSegment({ id }),
});

describe("BufferedHistory", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetMonotonicTimeStamp.mockReturnValue(1000);
    mockAreSameContent.mockReturnValue(false);
  });

  describe("constructor", () => {
    it("should initialize with an empty history", () => {
      const history = new BufferedHistory(5000, 10);
      expect(history.getHistoryFor(makeContext("1"))).toHaveLength(0);
    });
  });

  describe("addBufferedSegment", () => {
    it("should add an entry with the current timestamp and buffered range", () => {
      mockGetMonotonicTimeStamp.mockReturnValue(2000);
      mockAreSameContent.mockReturnValue(true);

      const history = new BufferedHistory(5000, 10);
      const context = makeContext("1");
      const buffered = { start: 0, end: 10 };

      history.addBufferedSegment(context, buffered);

      const entries = history.getHistoryFor(context);
      expect(entries).toHaveLength(1);
      expect(entries[0].date).toBe(2000);
      expect(entries[0].buffered).toEqual({ start: 0, end: 10 });
      expect(entries[0].context).toBe(context);
    });

    it("should accept null as a buffered value", () => {
      mockGetMonotonicTimeStamp.mockReturnValue(1000);
      mockAreSameContent.mockReturnValue(true);

      const history = new BufferedHistory(5000, 10);
      const context = makeContext("1");

      history.addBufferedSegment(context, null);

      const entries = history.getHistoryFor(context);
      expect(entries).toHaveLength(1);
      expect(entries[0].buffered).toBeNull();
    });

    it("should store multiple entries in chronological order", () => {
      const history = new BufferedHistory(5000, 10);
      mockAreSameContent.mockReturnValue(true);

      mockGetMonotonicTimeStamp.mockReturnValue(1000);
      history.addBufferedSegment(makeContext("1"), { start: 0, end: 5 });

      mockGetMonotonicTimeStamp.mockReturnValue(2000);
      history.addBufferedSegment(makeContext("1"), { start: 5, end: 10 });

      const entries = history.getHistoryFor(makeContext("1"));
      expect(entries).toHaveLength(2);
      expect(entries[0].date).toBe(1000);
      expect(entries[1].date).toBe(2000);
    });
  });

  describe("getHistoryFor", () => {
    it("should return only entries matching the given context", () => {
      const contextA = makeContext("1");
      const contextB = makeContext("2");

      mockAreSameContent.mockImplementation((a, b) => a === b);

      const history = new BufferedHistory(5000, 10);
      history.addBufferedSegment(contextA, { start: 0, end: 5 });
      history.addBufferedSegment(contextB, { start: 5, end: 10 });
      history.addBufferedSegment(contextA, { start: 10, end: 15 });

      expect(history.getHistoryFor(contextA)).toHaveLength(2);
      expect(history.getHistoryFor(contextB)).toHaveLength(1);
    });

    it("should return an empty array when no entry matches", () => {
      mockAreSameContent.mockReturnValue(false);

      const history = new BufferedHistory(5000, 10);
      history.addBufferedSegment(makeContext("1"), { start: 0, end: 5 });

      expect(history.getHistoryFor(makeContext("99"))).toHaveLength(0);
    });
  });

  describe("_cleanHistory (lifetime enforcement)", () => {
    it("should remove entries older than the lifetime on addBufferedSegment", () => {
      mockAreSameContent.mockReturnValue(true);

      const history = new BufferedHistory(500, 10);

      mockGetMonotonicTimeStamp.mockReturnValue(1000);
      history.addBufferedSegment(makeContext("1"), { start: 0, end: 5 });

      mockGetMonotonicTimeStamp.mockReturnValue(1200);
      history.addBufferedSegment(makeContext("1"), { start: 5, end: 10 });

      // now = 1600, lifetime = 500 → entries before 1100 should be dropped
      mockGetMonotonicTimeStamp.mockReturnValue(1600);
      history.addBufferedSegment(makeContext("1"), { start: 10, end: 15 });

      const entries = history.getHistoryFor(makeContext("1"));
      expect(entries.every((e) => e.date >= 1100)).toBe(true);
      // eslint-disable-next-line no-restricted-properties
      expect(entries.find((e) => e.date === 1000)).toBeUndefined();
    });

    it("should keep entries whose date is exactly at the lifetime boundary", () => {
      mockAreSameContent.mockReturnValue(true);

      const history = new BufferedHistory(500, 10);

      // entry at t=1000, boundary when now=1500 is exactly 1000 — NOT expired
      mockGetMonotonicTimeStamp.mockReturnValue(1000);
      history.addBufferedSegment(makeContext("1"), { start: 0, end: 5 });

      mockGetMonotonicTimeStamp.mockReturnValue(1500);
      history.addBufferedSegment(makeContext("1"), { start: 5, end: 10 });

      const entries = history.getHistoryFor(makeContext("1"));
      // eslint-disable-next-line no-restricted-properties
      expect(entries.find((e) => e.date === 1000)).toBeDefined();
    });
  });

  describe("_cleanHistory (maxHistoryLength enforcement)", () => {
    it("should remove oldest entries when exceeding maxHistoryLength", () => {
      mockAreSameContent.mockReturnValue(true);

      const history = new BufferedHistory(99999, 3);

      for (let i = 0; i < 4; i++) {
        mockGetMonotonicTimeStamp.mockReturnValue(1000 + i);
        history.addBufferedSegment(makeContext("1"), { start: i, end: i + 1 });
      }

      const entries = history.getHistoryFor(makeContext("1"));
      expect(entries).toHaveLength(3);
      // The oldest entry (date=1000) should have been evicted
      // eslint-disable-next-line no-restricted-properties
      expect(entries.find((e) => e.date === 1000)).toBeUndefined();
      expect(entries[0].date).toBe(1001);
    });

    it("should keep exactly maxHistoryLength entries when at the limit", () => {
      mockAreSameContent.mockReturnValue(true);

      const history = new BufferedHistory(99999, 3);

      for (let i = 0; i < 3; i++) {
        mockGetMonotonicTimeStamp.mockReturnValue(1000 + i);
        history.addBufferedSegment(makeContext("1"), { start: i, end: i + 1 });
      }

      const entries = history.getHistoryFor(makeContext("1"));
      expect(entries).toHaveLength(3);
    });
  });

  describe("combined lifetime and maxHistoryLength", () => {
    it("should apply both constraints independently", () => {
      mockAreSameContent.mockReturnValue(true);

      const history = new BufferedHistory(500, 2);

      mockGetMonotonicTimeStamp.mockReturnValue(1000);
      history.addBufferedSegment(makeContext("1"), { start: 0, end: 1 });

      mockGetMonotonicTimeStamp.mockReturnValue(1100);
      history.addBufferedSegment(makeContext("1"), { start: 1, end: 2 });

      // now=1600 → t=1000 expired by lifetime; then only 1 entry remains, under max
      mockGetMonotonicTimeStamp.mockReturnValue(1600);
      history.addBufferedSegment(makeContext("1"), { start: 2, end: 3 });

      const entries = history.getHistoryFor(makeContext("1"));
      expect(entries).toHaveLength(2);
      // eslint-disable-next-line no-restricted-properties
      expect(entries.find((e) => e.date === 1000)).toBeUndefined();
    });
  });
});
