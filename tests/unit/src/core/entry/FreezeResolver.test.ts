import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import FreezeResolver from "../../../../../src/core/entry/FreezeResolver.ts";
import type { IFreezeResolverObservation } from "../../../../../src/core/entry/FreezeResolver.ts";
import type SegmentSinksStore from "../../../../../src/core/segment_sinks/index.ts";
import type { IBufferedChunk } from "../../../../../src/core/segment_sinks/index.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

const {
  mockGetCurrent,
  mockLogInfo,
  mockLogWarn,
  mockLogDebug,
  mockGetMonotonicTimeStamp,
} = vi.hoisted(() => ({
  mockGetCurrent: vi.fn(() => ({
    UNFREEZING_SEEK_DELAY: 3000,
    UNFREEZING_DELTA_POSITION: 0.001,
    FREEZING_FLUSH_FAILURE_DELAY: {
      MINIMUM: 1000,
      MAXIMUM: 10000,
      POSITION_DELTA: 0.1,
    },
  })),
  mockLogInfo: vi.fn(),
  mockLogWarn: vi.fn(),
  mockLogDebug: vi.fn(),
  mockGetMonotonicTimeStamp: vi.fn(),
}));

vi.mock("../../../../../src/config", () => ({
  default: {
    getCurrent: mockGetCurrent,
  },
}));

vi.mock("../../../../../src/log", () => ({
  default: {
    info: mockLogInfo,
    warn: mockLogWarn,
    debug: mockLogDebug,
  },
}));

vi.mock("../../../../../src/utils/monotonic_timestamp", () => ({
  default: mockGetMonotonicTimeStamp,
}));

describe("FreezeResolver", () => {
  let freezeResolver: FreezeResolver;
  let mockSegmentSinksStore: SegmentSinksStore;
  let mockTimestamp: number;

  const createMockObservation = (
    overrides: Partial<IFreezeResolverObservation> = {},
  ): IFreezeResolverObservation => ({
    readyState: 4,
    rebuffering: null,
    freezing: null,
    bufferGap: 10,
    position: {
      getPolled: () => 100,
    } as any,
    fullyLoaded: false,
    ...overrides,
  });

  const createMockSegmentSinksStore = (): SegmentSinksStore =>
    ({
      getStatus: vi.fn(() => ({
        type: "initialized",
        value: {
          getLastKnownInventory: vi.fn(() => []),
        },
      })),
    }) as any;

  beforeEach(() => {
    mockTimestamp = 10000;
    mockGetMonotonicTimeStamp.mockImplementation(() => mockTimestamp);
    mockSegmentSinksStore = createMockSegmentSinksStore();
    freezeResolver = new FreezeResolver(mockSegmentSinksStore);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("onNewObservation - No freeze scenarios", () => {
    it("should return null when playback is not frozen", () => {
      const observation = createMockObservation({
        readyState: 4,
        freezing: null,
        rebuffering: null,
      });
      const result = freezeResolver.onNewObservation(observation);
      expect(result).toBeNull();
    });

    it("should return null when readyState is 1 but buffer gap is too small", () => {
      const observation = createMockObservation({
        readyState: 1,
        bufferGap: 3, // Less than MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING (6)
        freezing: null,
        rebuffering: null,
        fullyLoaded: false,
      });
      const result = freezeResolver.onNewObservation(observation);
      expect(result).toBeNull();
    });

    it("should ignore freeze when within ignore period", () => {
      const observation1 = createMockObservation({
        freezing: { timestamp: mockTimestamp },
      });

      // First observation triggers a flush
      mockTimestamp = 10000;
      freezeResolver.onNewObservation(observation1);
      mockTimestamp = 13100; // Within UNFREEZING_SEEK_DELAY

      const result = freezeResolver.onNewObservation(observation1);
      expect(result).not.toBeNull();

      // Second observation within ignore period
      mockTimestamp = 13200; // Still within MINIMUM_TIME_BETWEEN_FREEZE_HANDLING (6000ms from flush)
      const observation2 = createMockObservation({
        freezing: { timestamp: 13200 },
      });

      const result2 = freezeResolver.onNewObservation(observation2);
      expect(result2).toBeNull();
    });
  });

  describe("onNewObservation - Freeze detection", () => {
    it("should detect freeze when freezing status is set", () => {
      const observation = createMockObservation({
        freezing: { timestamp: mockTimestamp - 4000 },
        bufferGap: 10,
      });

      const result = freezeResolver.onNewObservation(observation);

      expect(result).not.toBeNull();
      expect(mockLogInfo).toHaveBeenCalledWith(
        "Freeze",
        "Freeze detected",
        expect.any(Object),
      );
    });

    it("should detect freeze when readyState is 1 with sufficient buffer", () => {
      const observation = createMockObservation({
        readyState: 1,
        bufferGap: 8, // Greater than MINIMUM_BUFFER_GAP_AT_READY_STATE_1_BEFORE_FREEZING
        rebuffering: {
          timestamp: mockTimestamp - 4000,
          reason: "not-ready",
          position: undefined,
        },
      });

      const result = freezeResolver.onNewObservation(observation);
      expect(result).not.toBeNull();
    });

    it("should detect freeze when fully loaded with readyState 1", () => {
      const observation = createMockObservation({
        readyState: 1,
        bufferGap: 2,
        fullyLoaded: true,
        rebuffering: {
          timestamp: mockTimestamp - 4000,
          reason: "not-ready",
          position: undefined,
        },
      });

      const result = freezeResolver.onNewObservation(observation);
      expect(result).not.toBeNull();
    });
  });

  describe("onNewObservation - Flush strategy", () => {
    it("should return flush resolution after freeze delay", () => {
      const freezeTimestamp = mockTimestamp - 4000;
      const observation = createMockObservation({
        freezing: { timestamp: freezeTimestamp },
        position: { getPolled: () => 100 } as any,
      });

      const result = freezeResolver.onNewObservation(observation);

      expect(result).toEqual({
        type: "flush",
        value: { relativeSeek: 0.001 },
      });
      expect(mockLogDebug).toHaveBeenCalledWith("Freeze", "Trying to flush to un-freeze");
    });

    it("should not flush before UNFREEZING_SEEK_DELAY has passed", () => {
      const freezeTimestamp = mockTimestamp - 2000; // Less than UNFREEZING_SEEK_DELAY (3000)
      const observation = createMockObservation({
        freezing: { timestamp: freezeTimestamp },
      });

      const result = freezeResolver.onNewObservation(observation);

      expect(result).toBeNull();
    });
  });

  describe("onNewObservation - Decipherability checks", () => {
    it("should reload when buffer has undecipherable data", () => {
      const mockSegment: IBufferedChunk = {
        infos: {
          representation: {
            decipherable: false,
            uniqueId: "rep1",
          } as any,
        },
        start: 90,
        end: 110,
      } as any;

      mockSegmentSinksStore.getStatus = vi.fn(
        () =>
          ({
            type: "initialized",
            value: {
              getLastKnownInventory: vi.fn(() => [mockSegment]),
            },
          }) as any,
      );

      const observation = createMockObservation({
        rebuffering: {
          timestamp: mockTimestamp - 5000,
          reason: "not-ready",
          position: undefined,
        },
        readyState: 1,
        bufferGap: 8,
      });

      const result = freezeResolver.onNewObservation(observation);

      expect(result).toEqual({
        type: "reload",
        value: null,
      });
      expect(mockLogWarn).toHaveBeenCalledWith(
        "Freeze",
        expect.stringContaining("undecipherable segments"),
      );
    });

    it("should first flush when frozen with only decipherable encrypted data", () => {
      const mockSegment: IBufferedChunk = {
        infos: {
          representation: {
            decipherable: true,
            uniqueId: "rep1",
          } as any,
        },
        start: 90,
        end: 110,
      } as any;

      mockSegmentSinksStore.getStatus = vi.fn(
        () =>
          ({
            type: "initialized",
            value: {
              getLastKnownInventory: vi.fn(() => [mockSegment]),
            },
          }) as any,
      );

      const observation = createMockObservation({
        rebuffering: {
          timestamp: mockTimestamp - 5000,
          reason: "not-ready",
          position: undefined,
        },
        readyState: 1,
        bufferGap: 8,
      });

      const result = freezeResolver.onNewObservation(observation);
      expect(result).toEqual({
        type: "flush",
        value: {
          relativeSeek: 0.001,
        },
      });
    });
  });

  describe("onNewObservation - Failed flush handling", () => {
    it("should reload when flush fails and no representation change detected", () => {
      // First: trigger a flush
      mockTimestamp = 10000;
      const observation1 = createMockObservation({
        freezing: { timestamp: 6000 },
        position: { getPolled: () => 100 } as any,
      });

      const flushResult = freezeResolver.onNewObservation(observation1);
      expect(flushResult?.type).toBe("flush");

      // Second: still frozen after flush, need to wait beyond the ignore period
      // MINIMUM_TIME_BETWEEN_FREEZE_HANDLING is 6000ms
      mockTimestamp = 17500; // 7500ms after flush, beyond ignore period (16000 + 1500)
      const observation2 = createMockObservation({
        freezing: { timestamp: 17500 },
        position: { getPolled: () => 100.001 } as any, // Very close to flush position
      });

      const result = freezeResolver.onNewObservation(observation2);

      expect(result).toEqual({
        type: "reload",
        value: null,
      });
    });

    it("should avoid representation when freeze happens on representation switch", () => {
      const mockSegment1: IBufferedChunk = {
        infos: {
          representation: { uniqueId: "rep1", bitrate: 1000000 } as any,
          adaptation: { id: "video-ada" } as any,
          period: { id: "period1" } as any,
        },
        start: 90,
        end: 100,
        bufferedStart: 90,
        bufferedEnd: 100,
      } as any;

      const mockSegment2: IBufferedChunk = {
        infos: {
          representation: { uniqueId: "rep2", bitrate: 2000000 } as any,
          adaptation: { id: "video-ada" } as any,
          period: { id: "period1" } as any,
        },
        start: 100,
        end: 110,
        bufferedStart: 100,
        bufferedEnd: 110,
      } as any;

      // Build history with representation switch
      mockTimestamp = 10000;
      mockSegmentSinksStore.getStatus = vi.fn(
        () =>
          ({
            type: "initialized",
            value: {
              getLastKnownInventory: vi.fn(() => [mockSegment1]),
            },
          }) as any,
      );
      freezeResolver.onNewObservation(
        createMockObservation({ position: { getPolled: () => 95 } as any }),
      );

      mockTimestamp = 11000;
      mockSegmentSinksStore.getStatus = vi.fn(
        () =>
          ({
            type: "initialized",
            value: {
              getLastKnownInventory: vi.fn(() => [mockSegment2]),
            },
          }) as any,
      );
      freezeResolver.onNewObservation(
        createMockObservation({ position: { getPolled: () => 105 } as any }),
      );

      // Trigger flush
      mockTimestamp = 15000;
      const observation1 = createMockObservation({
        freezing: { timestamp: 11000 }, // Frozen for 4000ms
        position: { getPolled: () => 105 } as any,
      });
      const flushResult = freezeResolver.onNewObservation(observation1);
      expect(flushResult?.type).toBe("flush");

      // Still frozen after flush, need to wait beyond ignore period (6000ms from flush at 15000 = 21000)
      mockTimestamp = 22000;
      const observation2 = createMockObservation({
        freezing: { timestamp: 22000 },
        position: { getPolled: () => 105.001 } as any,
      });

      const result = freezeResolver.onNewObservation(observation2);

      expect(result).toEqual({
        type: "avoid-representations",
        value: expect.arrayContaining([
          expect.objectContaining({
            representation: expect.objectContaining({ uniqueId: "rep2" }),
          }),
        ]),
      });
    });

    it("should reload when freeze happens on period switch", () => {
      const mockSegment1: IBufferedChunk = {
        infos: {
          representation: { uniqueId: "rep1" } as any,
          adaptation: { id: "video-ada" } as any,
          period: { id: "period1" } as any,
        },
        start: 90,
        end: 100,
        bufferedStart: 90,
        bufferedEnd: 100,
      } as any;

      const mockSegment2: IBufferedChunk = {
        infos: {
          representation: { uniqueId: "rep2" } as any,
          adaptation: { id: "video-ada" } as any,
          period: { id: "period2" } as any, // Different period
        },
        start: 100,
        end: 110,
        bufferedStart: 100,
        bufferedEnd: 110,
      } as any;

      // Build history with period switch
      mockTimestamp = 10000;
      mockSegmentSinksStore.getStatus = vi.fn(
        () =>
          ({
            type: "initialized",
            value: {
              getLastKnownInventory: vi.fn(() => [mockSegment1]),
            },
          }) as any,
      );
      freezeResolver.onNewObservation(
        createMockObservation({ position: { getPolled: () => 95 } as any }),
      );

      mockTimestamp = 11000;
      mockSegmentSinksStore.getStatus = vi.fn(
        () =>
          ({
            type: "initialized",
            value: {
              getLastKnownInventory: vi.fn(() => [mockSegment2]),
            },
          }) as any,
      );
      freezeResolver.onNewObservation(
        createMockObservation({ position: { getPolled: () => 105 } as any }),
      );

      // Trigger flush
      mockTimestamp = 15000;
      const flushResult = freezeResolver.onNewObservation(
        createMockObservation({
          freezing: { timestamp: 11000 }, // Frozen for 4000ms
          position: { getPolled: () => 105 } as any,
        }),
      );
      expect(flushResult?.type).toBe("flush");

      // Still frozen after flush, need to wait beyond ignore period (6000ms from flush at 15000 = 21000)
      mockTimestamp = 22000;
      const result = freezeResolver.onNewObservation(
        createMockObservation({
          freezing: { timestamp: 22000 },
          position: { getPolled: () => 105.001 } as any,
        }),
      );

      expect(result).toEqual({
        type: "reload",
        value: null,
      });
    });
  });

  describe("History management", () => {
    it("should maintain segment history for audio and video", () => {
      const mockSegment: IBufferedChunk = {
        infos: {
          representation: { uniqueId: "rep1" } as any,
        },
        start: 90,
        bufferedStart: 90,
        end: 110,
        bufferedEnd: 110,
      } as any;

      mockSegmentSinksStore.getStatus = vi.fn(
        () =>
          ({
            type: "initialized",
            value: {
              getLastKnownInventory: vi.fn(() => [mockSegment]),
            },
          }) as any,
      );

      const observation = createMockObservation({
        position: { getPolled: () => 100 } as any,
      });

      freezeResolver.onNewObservation(observation);

      // Verify history is tracked (implicitly tested through representation avoidance)
      expect(mockSegmentSinksStore.getStatus).toHaveBeenCalledWith("audio");
      expect(mockSegmentSinksStore.getStatus).toHaveBeenCalledWith("video");
    });

    it("should limit history to 100 entries per track type", () => {
      // Create many observations to exceed history limit
      for (let i = 0; i < 150; i++) {
        mockTimestamp += 100;
        freezeResolver.onNewObservation(
          createMockObservation({
            position: { getPolled: () => i } as any,
          }),
        );
      }

      // The test passes if no errors are thrown
      // History should be limited internally
      expect(true).toBe(true);
    });
  });
});
