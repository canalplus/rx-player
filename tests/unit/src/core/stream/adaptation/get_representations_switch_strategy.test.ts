import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import configHandler from "../../../../../../src/config.ts";
import {
  ChunkStatus,
  SegmentSinkOperation,
  type IBufferedChunk,
  type SegmentSink,
} from "../../../../../../src/core/segment_sinks/index.ts";
import getRepresentationsSwitchingStrategy from "../../../../../../src/core/stream/adaptation/get_representations_switch_strategy.ts";
import type { IRepresentationStreamMediaObservation } from "../../../../../../src/core/stream/representation/index.ts";
import type { IAdaptation, IPeriod } from "../../../../../../src/manifest/index.ts";
import SharedReference from "../../../../../../src/utils/reference.ts";
import {
  DummyPeriod,
  DummyAdaptation,
  DummyRepresentation,
  createSegment,
} from "../../../../mocks/manifest.ts";
import {
  makeReadyOnlyMediaElementMonitor,
  DummyObservationPosition,
} from "../../../../mocks/media_element_monitor.ts";
import { DummySegmentSink } from "../../../../mocks/segment_sinks.ts";

describe("getRepresentationsSwitchingStrategy", () => {
  let mockPeriod: IPeriod;
  let mockAdaptation: IAdaptation;
  let mockSegmentSink: SegmentSink;
  const mockedMediaElementMonitor =
    makeReadyOnlyMediaElementMonitor<IRepresentationStreamMediaObservation>({
      position: new DummyObservationPosition({
        getPolled: () => 10,
      }),
      paused: {
        last: false,
        pending: undefined,
      },
      speed: 1,
      canStream: true,
    });
  const originalConfig = configHandler.getCurrent();
  vi.spyOn(configHandler, "getCurrent").mockImplementation(() => {
    return {
      ...originalConfig,
      ADAP_REP_SWITCH_BUFFER_PADDINGS: {
        video: { before: 0.5, after: 0.5 },
        audio: { before: 0.5, after: 0.5 },
        text: { before: 0, after: 0 },
      },
    };
  });

  function makeBufferedChunk({
    bufferedStart,
    bufferedEnd,
    start,
    end,
    periodId = "period-1",
    adaptationId = "adaptation-1",
    representationId = "rep-1",
  }: {
    bufferedStart: number | undefined;
    bufferedEnd: number | undefined;
    start: number;
    end: number;
    periodId?: string;
    adaptationId?: string;
    representationId?: string;
  }): IBufferedChunk {
    return {
      infos: {
        period: new DummyPeriod({ id: periodId }),
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

  beforeEach(() => {
    mockPeriod = new DummyPeriod({
      id: "period-1",
      start: 0,
      end: 100,
    });
    mockAdaptation = new DummyAdaptation({
      id: "adaptation-1",
      type: "video",
    });
    mockSegmentSink = new DummySegmentSink({
      getLastKnownInventory: () => [],
      getPendingOperations: () => [],
    });
    vi.spyOn(mockedMediaElementMonitor.observer, "getReadyState").mockImplementation(
      () => 4,
    );
    vi.spyOn(mockedMediaElementMonitor.observer, "getCurrentTime").mockImplementation(
      () => 10,
    );
  });
  afterEach(() => {
    mockedMediaElementMonitor.reset();
    vi.resetAllMocks();
  });

  describe("lazy switching mode", () => {
    it("should return continue when switching mode is lazy", () => {
      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "lazy", representationIds: ["rep-1"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );
      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("no unwanted segments", () => {
    it("should return continue when inventory is empty", () => {
      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-1"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );
      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should return continue when all segments match current representation", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 10, bufferedStart: 0, bufferedEnd: 10 }),
        ];
      });
      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-1"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );
      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("unwanted segments in inventory", () => {
    it("should identify unwanted segments from different representation", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({
            start: 0,
            end: 10,
            bufferedStart: 0,
            bufferedEnd: 10,
            representationId: "rep-1",
          }),
        ];
      });
      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );
      expect(result.type).toBe("flush-buffer");
    });

    it("should identify unwanted segments from different adaptation", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({
            start: 0,
            end: 10,
            bufferedStart: 0,
            bufferedEnd: 10,
            adaptationId: "adaptation-2",
          }),
        ];
      });
      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-1"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );
      expect(result.type).toBe("flush-buffer");
    });

    it("should ignore segments from different periods", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({
            start: 0,
            end: 10,
            bufferedStart: 0,
            bufferedEnd: 10,
            periodId: "period-2",
          }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("pending operations", () => {
    it("should identify unwanted segments in pending push operations", () => {
      vi.spyOn(mockSegmentSink, "getPendingOperations").mockImplementation(() => {
        return [
          {
            type: SegmentSinkOperation.Push,
            value: {
              inventoryInfos: {
                period: new DummyPeriod({ id: "period-1" }),
                adaptation: new DummyAdaptation({
                  id: "adaptation-1",
                }),
                representation: new DummyRepresentation({
                  id: "rep-1",
                }),
                segment: createSegment({ time: 5, duration: 5 }),
                chunkSize: 1024,
                start: 0,
                end: 1000,
              },
              data: {
                initSegmentUniqueId: "4",
                codec: "5",
                timestampOffset: 0,
                appendWindow: [undefined, undefined],
                chunk: new Uint8Array([0, 1, 2, 3]),
              },
            },
          },
        ];
      });
      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );
      expect(result.type).toBe("flush-buffer");
    });

    it("should ignore non-push pending operations", () => {
      vi.spyOn(mockSegmentSink, "getPendingOperations").mockImplementation(() => {
        return [
          {
            type: SegmentSinkOperation.Remove,
            value: {
              start: 0,
              end: 100000,
            },
          },
        ];
      });
      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );
      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("reload switching mode", () => {
    it("should return needs-reload when readyState > 1 and mode is reload", () => {
      vi.spyOn(mockedMediaElementMonitor.observer, "getReadyState").mockImplementation(
        () => 4,
      );
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 10, bufferedStart: 0, bufferedEnd: 10 }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "reload", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result).toEqual({ type: "needs-reload", value: undefined });
    });

    it("should reload when readyState is undefined", () => {
      vi.spyOn(mockedMediaElementMonitor.observer, "getReadyState").mockImplementation(
        () => undefined,
      );
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 10, bufferedStart: 0, bufferedEnd: 10 }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "reload", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result.type).toBe("needs-reload");
    });

    it("should not reload when readyState <= 1", () => {
      vi.spyOn(mockedMediaElementMonitor.observer, "getReadyState").mockImplementation(
        () => 1,
      );
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 10, bufferedStart: 0, bufferedEnd: 10 }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "reload", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result.type).not.toBe("needs-reload");
    });
  });

  describe("direct vs clean-buffer mode", () => {
    it("should return flush-buffer when mode is direct", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 10, bufferedStart: 0, bufferedEnd: 10 }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result.type).toBe("flush-buffer");
    });

    it("should return clean-buffer when mode is not direct or reload", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 10, bufferedStart: 0, bufferedEnd: 10 }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "seamless", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result.type).toBe("clean-buffer");
    });
  });

  describe("getCurrentTime fallback", () => {
    it("should use getPolled when getCurrentTime returns undefined", () => {
      const getPolledMock = vi.fn(() => 15);
      vi.spyOn(mockedMediaElementMonitor.observer, "getCurrentTime").mockImplementation(
        () => undefined,
      );
      vi.spyOn(mockedMediaElementMonitor.observer, "getReference").mockImplementation(() => {
        return new SharedReference({
          position: new DummyObservationPosition({
            getPolled: getPolledMock,
          }),
          paused: {
            last: false,
            pending: undefined,
          },
          speed: 1,
          canStream: true,
        });
      });
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 10, bufferedStart: 0, bufferedEnd: 10 }),
        ];
      });

      getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "seamless", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(getPolledMock).toHaveBeenCalled();
    });
  });

  describe("segment buffered time handling", () => {
    it("should use bufferedStart/bufferedEnd when available", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({ start: 0, end: 20, bufferedStart: 5, bufferedEnd: 15 }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result.type).toBe("flush-buffer");
    });

    it("should fallback to start/end when bufferedStart/bufferedEnd is undefined", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({
            start: 0,
            end: 10,
            bufferedStart: undefined,
            bufferedEnd: undefined,
          }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-2"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result.type).toBe("flush-buffer");
    });
  });

  describe("multiple representation IDs", () => {
    it("should not mark segments as unwanted if they match any of the representation IDs", () => {
      vi.spyOn(mockSegmentSink, "getLastKnownInventory").mockImplementation(() => {
        return [
          makeBufferedChunk({
            start: 0,
            end: 10,
            bufferedStart: 0,
            bufferedEnd: 10,
            representationId: "rep-2",
          }),
        ];
      });

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        { switchingMode: "direct", representationIds: ["rep-1", "rep-2", "rep-3"] },
        mockSegmentSink,
        mockedMediaElementMonitor.observer,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });
});
