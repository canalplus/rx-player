import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import configHandler from "../../../../../../../src/config.ts";
import type {
  IBufferedChunk,
  SegmentSink,
} from "../../../../../../../src/core/segment_sinks/index.ts";
import {
  ChunkStatus,
  SegmentSinkOperation,
} from "../../../../../../../src/core/segment_sinks/index.ts";
import type { IPeriodStreamPlaybackObservation } from "../../../../../../../src/core/stream/period/types.ts";
import getAdaptationSwitchStrategy from "../../../../../../../src/core/stream/period/utils/get_adaptation_switch_strategy.ts";
import {
  type Adaptation,
  type Period,
} from "../../../../../../../src/manifest/classes/index.ts";
import {
  DummyPeriod,
  DummyAdaptation,
  createSegment,
  DummyRepresentation,
} from "../../../../../mocks/manifest.ts";
import {
  makeReadyOnlyPlaybackObserver,
  DummyObservationPosition,
} from "../../../../../mocks/playback_observer.ts";
import { DummySegmentSink } from "../../../../../mocks/segment_sinks.ts";

describe("getAdaptationSwitchStrategy", () => {
  let mockSegmentSink: SegmentSink;
  let mockPeriod: Period;
  let mockAdaptation: Adaptation;
  const mockedPlaybackObserver =
    makeReadyOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>({
      position: new DummyObservationPosition({
        getPolled: () => 15,
      }),
      readyState: 3,
      paused: {
        last: false,
        pending: undefined,
      },
      duration: NaN,
      speed: 1,
      maximumPosition: Number.MAX_SAFE_INTEGER,
      buffered: { video: null, audio: null, text: null },
      canStream: true,
    });
  beforeEach(() => {
    const originalConfig = configHandler.getCurrent();
    vi.spyOn(configHandler, "getCurrent").mockReturnValue({
      ...originalConfig,
      ADAP_REP_SWITCH_BUFFER_PADDINGS: {
        video: { before: 0.5, after: 0.5 },
        audio: { before: 0.5, after: 0.5 },
        text: { before: 0, after: 0 },
      },
    });
    mockSegmentSink = new DummySegmentSink({
      getLastKnownInventory: () => [],
      getPendingOperations: () => [],
    });
    mockPeriod = new DummyPeriod({
      id: "period-1",
      start: 10,
      end: 20,
    });
    mockAdaptation = new DummyAdaptation({
      id: "adaptation-1",
      type: "video",
    });
    vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockImplementation(
      () => 15,
    );
    vi.spyOn(mockedPlaybackObserver.observer, "getReadyState").mockImplementation(
      () => 3,
    );
  });
  afterEach(() => {
    mockedPlaybackObserver.reset();
    vi.resetModules();
  });
  function makeBufferedChunk({
    bufferedStart,
    bufferedEnd,
    start,
    end,
    periodId = "period-1",
    periodStart = 0,
    periodEnd,
    adaptationId = "adaptation-1",
    representationId = "rep-1",
  }: {
    bufferedStart: number | undefined;
    bufferedEnd: number | undefined;
    start: number;
    end: number;
    periodId?: string;
    periodStart?: number;
    periodEnd?: number | undefined;
    adaptationId?: string;
    representationId?: string;
  }): IBufferedChunk {
    return {
      infos: {
        period: new DummyPeriod({
          id: periodId,
          start: periodStart,
          end: periodEnd,
        }),
        adaptation: new DummyAdaptation({ id: adaptationId }),
        representation: new DummyRepresentation({
          id: representationId,
        }),
        segment: createSegment({ time: start, end }),
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

  describe("codec compatibility", () => {
    it("should return needs-reload when codec is incompatible and onCodecSwitch is reload", () => {
      mockSegmentSink.codec = "avc1.64001f";
      const currMockAdap = new DummyAdaptation({
        id: "adaptation-1",
        type: "video",
        representations: [
          new DummyRepresentation({
            isPlayable: () => true,
            getMimeTypeString: () => "video/mp4; codecs=hev1.1.6.L93.B0",
          }),
        ],
      });

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        currMockAdap,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "reload" },
      );

      expect(result).toEqual({ type: "needs-reload", value: undefined });
    });

    it("should continue when codec is compatible", () => {
      mockSegmentSink.codec = "video/mp4;codecs=avc1.64001f";
      const currMockAdap = new DummyAdaptation({
        id: "adaptation-1",
        type: "video",
        representations: [
          new DummyRepresentation({
            isPlayable: () => true,
            getMimeTypeString: () => "video/mp4;codecs=avc1.65001f",
          }),
        ],
      });

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        currMockAdap,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "reload" },
      );

      expect(result.type).not.toBe("needs-reload");
    });

    it("should continue when onCodecSwitch is continue regardless of codec", () => {
      mockSegmentSink.codec = "avc1.64001f";
      const currMockAdap = new DummyAdaptation({
        id: "adaptation-1",
        type: "video",
        representations: [
          new DummyRepresentation({
            isPlayable: () => true,
            getMimeTypeString: () => "video/mp4; codecs=hev1.1.6.L93.B0",
          }),
        ],
      });

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        currMockAdap,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("needs-reload");
    });
  });

  describe("no unwanted segments", () => {
    it("should return continue when no other adaptation is buffered", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 10,
          end: 15,
          bufferedStart: 10,
          bufferedEnd: 15,
          periodId: "period-1",
          adaptationId: "adaptation-1",
        }),
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should return continue when segments are from different period", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 5,
          end: 10,
          bufferedStart: 5,
          bufferedEnd: 10,
          periodId: "period-0",
          adaptationId: "adaptation-2",
        }),
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("unwanted segments in inventory", () => {
    it("should detect unwanted segments from different adaptation in same period", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 10,
          end: 15,
          bufferedStart: 10,
          bufferedEnd: 15,
          periodId: "period-1",
          adaptationId: "adaptation-2", // Different adaptation
        }),
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
    });

    it("should use bufferedStart/bufferedEnd when available", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 10,
          end: 15,
          bufferedStart: 10.5,
          bufferedEnd: 14.5,
          periodId: "period-1",
          adaptationId: "adaptation-2",
        }),
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
    });
  });

  describe("pending operations", () => {
    it("should include unwanted segments from pending push operations", () => {
      vi.spyOn(mockSegmentSink, "getPendingOperations").mockReturnValue([
        {
          type: SegmentSinkOperation.Push,
          value: {
            inventoryInfos: {
              period: mockPeriod,
              adaptation: new DummyAdaptation({
                id: "adaptation-2",
              }),
              representation: new DummyRepresentation(),
              segment: createSegment({
                time: 12,
                duration: 3,
              }),
              chunkSize: 1024,
              start: 0,
              end: 1000,
            },
            data: {
              initSegmentUniqueId: "a",
              chunk: 4,
              codec: "toto",
              timestampOffset: 0,
              appendWindow: [undefined, undefined],
            },
          },
        },
      ]);
      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
    });

    it("should ignore non-push operations", () => {
      vi.spyOn(mockSegmentSink, "getPendingOperations").mockReturnValue([
        {
          type: SegmentSinkOperation.Remove,
          value: { start: 10, end: 15 },
        },
        {
          type: SegmentSinkOperation.SignalSegmentComplete,
          value: {
            adaptation: mockAdaptation,
            period: mockPeriod,
            representation: new DummyRepresentation(),
            segment: createSegment(),
          },
        },
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("switching modes", () => {
    beforeEach(() => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 10,
          end: 15,
          bufferedStart: 10,
          bufferedEnd: 15,
          periodId: "period-1",
          adaptationId: "adaptation-2",
        }),
      ]);
    });

    it("should return needs-reload when switchingMode is reload and readyState > 1", () => {
      vi.spyOn(mockedPlaybackObserver.observer, "getReadyState").mockReturnValue(3);
      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "reload",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "needs-reload", value: undefined });
    });

    it("should not reload when readyState is 1 or less", () => {
      vi.spyOn(mockedPlaybackObserver.observer, "getReadyState").mockReturnValue(1);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "reload",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("needs-reload");
    });

    it("should flush-buffer for direct mode with non-text adaptation", () => {
      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "direct",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).toBe("flush-buffer");
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it("should clean-buffer for direct mode with text adaptation", () => {
      const currMockAdap = new DummyAdaptation({
        id: "adaptation-1",
        type: "text",
      });

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        currMockAdap,
        "direct",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).toBe("clean-buffer");
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it("should clean-buffer for seamless mode", () => {
      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).toBe("clean-buffer");
    });
  });

  describe("range exclusion logic", () => {
    beforeEach(() => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 12,
          end: 18,
          bufferedStart: 12,
          bufferedEnd: 18,
          periodId: "period-1",
          adaptationId: "adaptation-2",
        }),
      ]);
    });

    it("should return continue when all unwanted ranges are excluded around current position", () => {
      // Set up inventory with segments only around current time (which will be excluded)
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          periodId: "period-1",
          adaptationId: "adaptation-2",
        }),
      ]);
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(15);
      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should clean ranges that are far from period boundaries", () => {
      // Segment in the middle of the period, away from boundaries
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 13,
          end: 17,
          bufferedStart: 13,
          bufferedEnd: 17,
          periodId: "period-1",
          adaptationId: "adaptation-2",
        }),
      ]);
      // Away from segment
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(18);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it("should exclude range near period start when previous period segment is close", () => {
      // Set up inventory where segment from period-1 exists
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 8,
          end: 9.5,
          bufferedStart: 8,
          bufferedEnd: 9.5, // Less than 1 second before period start (10)
          periodId: "period-0",
          adaptationId: "adaptation-1",
        }),
        makeBufferedChunk({
          start: 10,
          end: 10.5,
          bufferedStart: 10,
          bufferedEnd: 10.5,
          periodId: "period-1",
          adaptationId: "adaptation-2",
        }),
      ]);
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(18);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      // The segment at period start should be excluded from removal
      expect(result.type).toBe("continue");
    });

    it("should exclude range near period end when next period segment is close", () => {
      // Set up inventory where segment from next period exists
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 19.5,
          end: 20,
          bufferedStart: 19.5,
          bufferedEnd: 20,
          periodId: "period-1",
          periodStart: 0,
          periodEnd: 20,
          adaptationId: "adaptation-2",
        }),
        makeBufferedChunk({
          start: 20,
          end: 21,
          bufferedStart: 20.5, // Less than 1 second after period end (20)
          bufferedEnd: 21,
          periodId: "period-2",
          periodStart: 20,
          adaptationId: "adaptation-1",
        }),
      ]);
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(12);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      // The segment at period end should be excluded from removal
      expect(result.type).toBe("continue");
    });

    it("should not exclude period end range when period.end is undefined", () => {
      mockPeriod.end = undefined;
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 12,
          end: 15,
          bufferedStart: 12,
          bufferedEnd: 15,
          periodId: "period-1",
          periodStart: 10,
          adaptationId: "adaptation-2",
        }),
      ]);
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(18);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      // Should be able to clean buffer since no end boundary to worry about
      expect(result.type).not.toBe("continue");
    });

    it("should exclude current position padding for seamless mode", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          periodId: "period-1",
          periodStart: 10,
          adaptationId: "adaptation-2",
        }),
      ]);
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(15);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      // Segment is within padding (15 - 0.5 to 15 + 0.5), so should be excluded
      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should not exclude current position padding for direct mode", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          periodId: "period-1",
          periodStart: 10,
          adaptationId: "adaptation-2",
        }),
      ]);
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(15);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "direct",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      // In direct mode, current position is not excluded, so buffer should be flushed
      expect(result.type).toBe("flush-buffer");
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it("should use polled position when getCurrentTime returns undefined", () => {
      const mockGetRef = vi.spyOn(mockedPlaybackObserver.observer, "getReference");
      vi.spyOn(mockedPlaybackObserver.observer, "getCurrentTime").mockReturnValue(
        undefined,
      );
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockReturnValue([
        makeBufferedChunk({
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          periodId: "period-1",
          periodStart: 10,
          adaptationId: "adaptation-2",
        }),
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockedPlaybackObserver.observer,
        { onCodecSwitch: "continue" },
      );

      expect(mockGetRef).toHaveBeenCalled();
      // Should still exclude based on polled position (15)
      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });
});
