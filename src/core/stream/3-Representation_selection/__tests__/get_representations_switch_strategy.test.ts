import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IAdaptation, IPeriod } from "../../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import type { SegmentSink } from "../../../segment_sinks";
import { SegmentSinkOperation } from "../../../segment_sinks";
import getRepresentationsSwitchingStrategy from "../get_representations_switch_strategy";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Mock dependencies
vi.mock("../../../config", () => ({
  default: {
    getCurrent: vi.fn(() => ({
      ADAP_REP_SWITCH_BUFFER_PADDINGS: {
        video: { before: 0.5, after: 0.5 },
        audio: { before: 0.5, after: 0.5 },
        text: { before: 0, after: 0 },
      },
    })),
  },
}));

describe("getRepresentationsSwitchingStrategy", () => {
  let mockPeriod: IPeriod;
  let mockAdaptation: IAdaptation;
  let mockSegmentSink: any;
  let mockPlaybackObserver: any;

  beforeEach(() => {
    mockPeriod = {
      id: "period-1",
      start: 0,
      end: 100,
    } as IPeriod;

    mockAdaptation = {
      id: "adaptation-1",
      type: "video",
    } as IAdaptation;

    mockSegmentSink = {
      getLastKnownInventory: vi.fn(() => []),
      getPendingOperations: vi.fn(() => []),
    } as unknown as SegmentSink;

    mockPlaybackObserver = {
      getReadyState: vi.fn(() => 4),
      getCurrentTime: vi.fn(() => 10),
      getReference: vi.fn(() => ({
        getValue: () => ({
          position: {
            getPolled: () => 10,
          },
        }),
      })),
    } as unknown as IReadOnlyPlaybackObserver<any>;
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("lazy switching mode", () => {
    it("should return continue when switching mode is lazy", () => {
      const settings = {
        switchingMode: "lazy" as const,
        representationIds: ["rep-1"],
      };

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("no unwanted segments", () => {
    it("should return continue when inventory is empty", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-1"],
      };

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should return continue when all segments match current representation", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-1"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("unwanted segments in inventory", () => {
    it("should identify unwanted segments from different representation", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" }, // Different representation
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("flush-buffer");
    });

    it("should identify unwanted segments from different adaptation", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-1"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-2" }, // Different adaptation
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("flush-buffer");
    });

    it("should ignore segments from different periods", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-2" }, // Different period
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("pending operations", () => {
    it("should identify unwanted segments in pending push operations", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getPendingOperations = vi.fn(() => [
        {
          type: SegmentSinkOperation.Push,
          value: {
            inventoryInfos: {
              period: { id: "period-1" },
              adaptation: { id: "adaptation-1" },
              representation: { id: "rep-1" }, // Different representation
              segment: {
                time: 5,
                duration: 5,
              },
            },
          },
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("flush-buffer");
    });

    it("should ignore non-push pending operations", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getPendingOperations = vi.fn(() => [
        {
          type: "remove",
          value: {},
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("reload switching mode", () => {
    it("should return needs-reload when readyState > 1 and mode is reload", () => {
      const settings = {
        switchingMode: "reload" as const,
        representationIds: ["rep-2"],
      };

      mockPlaybackObserver.getReadyState = vi.fn(() => 4);

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result).toEqual({ type: "needs-reload", value: undefined });
    });

    it("should reload when readyState is undefined", () => {
      const settings = {
        switchingMode: "reload" as const,
        representationIds: ["rep-2"],
      };

      mockPlaybackObserver.getReadyState = vi.fn(() => undefined);

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("needs-reload");
    });

    it("should not reload when readyState <= 1", () => {
      const settings = {
        switchingMode: "reload" as const,
        representationIds: ["rep-2"],
      };

      mockPlaybackObserver.getReadyState = vi.fn(() => 1);

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).not.toBe("needs-reload");
    });
  });

  describe("direct vs clean-buffer mode", () => {
    it("should return flush-buffer when mode is direct", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("flush-buffer");
    });

    it("should return clean-buffer when mode is not direct or reload", () => {
      const settings = {
        switchingMode: "seamless" as any,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("clean-buffer");
    });
  });

  describe("getCurrentTime fallback", () => {
    it("should use getPolled when getCurrentTime returns undefined", () => {
      const settings = {
        switchingMode: "seamless" as any,
        representationIds: ["rep-2"],
      };

      const getPolledMock = vi.fn(() => 15);
      mockPlaybackObserver.getCurrentTime = vi.fn(() => undefined);
      mockPlaybackObserver.getReference = vi.fn(() => ({
        getValue: () => ({
          position: {
            getPolled: getPolledMock,
          },
        }),
      }));

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(getPolledMock).toHaveBeenCalled();
    });
  });

  describe("segment buffered time handling", () => {
    it("should use bufferedStart/bufferedEnd when available", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: 5,
          bufferedEnd: 15,
          start: 0,
          end: 20,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("flush-buffer");
    });

    it("should fallback to start/end when bufferedStart/bufferedEnd is undefined", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-2"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-1" },
          },
          bufferedStart: undefined,
          bufferedEnd: undefined,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result.type).toBe("flush-buffer");
    });
  });

  describe("multiple representation IDs", () => {
    it("should not mark segments as unwanted if they match any of the representation IDs", () => {
      const settings = {
        switchingMode: "direct" as const,
        representationIds: ["rep-1", "rep-2", "rep-3"],
      };

      mockSegmentSink.getLastKnownInventory = vi.fn(() => [
        {
          infos: {
            period: { id: "period-1" },
            adaptation: { id: "adaptation-1" },
            representation: { id: "rep-2" },
          },
          bufferedStart: 0,
          bufferedEnd: 10,
          start: 0,
          end: 10,
        },
      ]);

      const result = getRepresentationsSwitchingStrategy(
        mockPeriod,
        mockAdaptation,
        settings,
        mockSegmentSink,
        mockPlaybackObserver,
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });
});
