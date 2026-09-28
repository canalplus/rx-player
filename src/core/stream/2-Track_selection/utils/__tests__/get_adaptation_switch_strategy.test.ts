import { describe, it, expect, vi, beforeEach } from "vitest";
import { SegmentSinkOperation } from "../../../../segment_sinks";
import getAdaptationSwitchStrategy from "../get_adaptation_switch_strategy";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

// Mock only external dependencies that have side effects or complex behavior
vi.mock("../../../../../config", () => ({
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

describe("getAdaptationSwitchStrategy", () => {
  let mockSegmentSink: any;
  let mockPeriod: any;
  let mockAdaptation: any;
  let mockPlaybackObserver: any;

  beforeEach(() => {
    // Create base mocks
    mockSegmentSink = {
      codec: undefined,
      getLastKnownInventory: vi.fn(() => []),
      getPendingOperations: vi.fn(() => []),
    };

    mockPeriod = {
      id: "period-1",
      start: 10,
      end: 20,
    };

    mockAdaptation = {
      id: "adaptation-1",
      type: "video",
      representations: [],
    };

    mockPlaybackObserver = {
      getCurrentTime: vi.fn(() => 15),
      getReadyState: vi.fn(() => 3),
      getReference: vi.fn(() => ({
        getValue: () => ({
          position: {
            getPolled: () => 15,
          },
        }),
      })),
    };
  });

  describe("codec compatibility", () => {
    it("should return needs-reload when codec is incompatible and onCodecSwitch is reload", () => {
      mockSegmentSink.codec = "avc1.64001f";
      mockAdaptation.representations = [
        {
          isPlayable: () => true,
          getMimeTypeString: () => "video/mp4; codecs=hev1.1.6.L93.B0",
        },
      ];

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "reload" },
      );

      expect(result).toEqual({ type: "needs-reload", value: undefined });
    });

    it("should continue when codec is compatible", () => {
      mockSegmentSink.codec = "video/mp4;codecs=avc1.64001f";
      mockAdaptation.representations = [
        {
          isPlayable: () => true,
          getMimeTypeString: () => "video/mp4;codecs=avc1.65001f",
        },
      ];

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "reload" },
      );

      expect(result.type).not.toBe("needs-reload");
    });

    it("should continue when onCodecSwitch is continue regardless of codec", () => {
      mockSegmentSink.codec = "avc1.64001f";
      mockAdaptation.representations = [
        {
          isPlayable: () => true,
          getMimeTypeString: () => "video/mp4; codecs=hev1.1.6.L93.B0",
        },
      ];

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("needs-reload");
    });
  });

  describe("no unwanted segments", () => {
    it("should return continue when no other adaptation is buffered", () => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 10,
          end: 15,
          bufferedStart: 10,
          bufferedEnd: 15,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-1" }, // Same adaptation
          },
        },
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should return continue when segments are from different period", () => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 5,
          end: 10,
          bufferedStart: 5,
          bufferedEnd: 10,
          infos: {
            period: { id: "period-0", start: 0 }, // Different period
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("unwanted segments in inventory", () => {
    it("should detect unwanted segments from different adaptation in same period", () => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 10,
          end: 15,
          bufferedStart: 10,
          bufferedEnd: 15,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-2" }, // Different adaptation
          },
        },
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
    });

    it("should use bufferedStart/bufferedEnd when available", () => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 10,
          end: 15,
          bufferedStart: 10.5,
          bufferedEnd: 14.5,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
    });
  });

  describe("pending operations", () => {
    it("should include unwanted segments from pending push operations", () => {
      mockSegmentSink.getPendingOperations.mockReturnValue([
        {
          type: SegmentSinkOperation.Push,
          value: {
            inventoryInfos: {
              period: { id: "period-1", start: 0 },
              adaptation: { id: "adaptation-2" },
              segment: {
                time: 12,
                duration: 3,
              },
            },
          },
        },
      ]);
      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
    });

    it("should ignore non-push operations", () => {
      mockSegmentSink.getPendingOperations.mockReturnValue([
        {
          type: SegmentSinkOperation.Remove,
          value: { start: 10, end: 15 },
        },
        {
          type: SegmentSinkOperation.SignalSegmentComplete,
          value: { start: 10, end: 15 },
        },
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });

  describe("switching modes", () => {
    beforeEach(() => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 10,
          end: 15,
          bufferedStart: 10,
          bufferedEnd: 15,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);
    });

    it("should return needs-reload when switchingMode is reload and readyState > 1", () => {
      mockPlaybackObserver.getReadyState.mockReturnValue(3);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "reload",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "needs-reload", value: undefined });
    });

    it("should not reload when readyState is 1 or less", () => {
      mockPlaybackObserver.getReadyState.mockReturnValue(1);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "reload",
        mockPlaybackObserver,
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
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).toBe("flush-buffer");
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it("should clean-buffer for direct mode with text adaptation", () => {
      mockAdaptation.type = "text";

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "direct",
        mockPlaybackObserver,
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
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).toBe("clean-buffer");
    });
  });

  describe("range exclusion logic", () => {
    beforeEach(() => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 12,
          end: 18,
          bufferedStart: 12,
          bufferedEnd: 18,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);
    });

    it("should return continue when all unwanted ranges are excluded around current position", () => {
      // Set up inventory with segments only around current time (which will be excluded)
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);
      mockPlaybackObserver.getCurrentTime.mockReturnValue(15);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should clean ranges that are far from period boundaries", () => {
      // Segment in the middle of the period, away from boundaries
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 13,
          end: 17,
          bufferedStart: 13,
          bufferedEnd: 17,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);
      mockPlaybackObserver.getCurrentTime.mockReturnValue(18); // Away from segment

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(result.type).not.toBe("continue");
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it("should exclude range near period start when previous period segment is close", () => {
      // Set up inventory where segment from period-1 exists
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 8,
          end: 9.5,
          bufferedStart: 8,
          bufferedEnd: 9.5, // Less than 1 second before period start (10)
          infos: {
            period: { id: "period-0", start: 0 },
            adaptation: { id: "adaptation-1" },
          },
        },
        {
          start: 10,
          end: 10.5,
          bufferedStart: 10,
          bufferedEnd: 10.5,
          infos: {
            period: { id: "period-1", start: 0 },
            adaptation: { id: "adaptation-2" }, // Different adaptation
          },
        },
      ]);
      mockPlaybackObserver.getCurrentTime.mockReturnValue(18); // Far away

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      // The segment at period start should be excluded from removal
      expect(result.type).toBe("continue");
    });

    it("should exclude range near period end when next period segment is close", () => {
      // Set up inventory where segment from next period exists
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 19.5,
          end: 20,
          bufferedStart: 19.5,
          bufferedEnd: 20,
          infos: {
            period: { id: "period-1", start: 0, end: 20 },
            adaptation: { id: "adaptation-2" }, // Different adaptation
          },
        },
        {
          start: 20,
          end: 21,
          bufferedStart: 20.5, // Less than 1 second after period end (20)
          bufferedEnd: 21,
          infos: {
            period: { id: "period-2", start: 20 },
            adaptation: { id: "adaptation-1" },
          },
        },
      ]);
      mockPlaybackObserver.getCurrentTime.mockReturnValue(12); // Far away

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      // The segment at period end should be excluded from removal
      expect(result.type).toBe("continue");
    });

    it("should not exclude period end range when period.end is undefined", () => {
      mockPeriod.end = undefined;
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 12,
          end: 15,
          bufferedStart: 12,
          bufferedEnd: 15,
          infos: {
            period: { id: "period-1", start: 10 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);
      mockPlaybackObserver.getCurrentTime.mockReturnValue(18);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      // Should be able to clean buffer since no end boundary to worry about
      expect(result.type).not.toBe("continue");
    });

    it("should exclude current position padding for seamless mode", () => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          infos: {
            period: { id: "period-1", start: 10 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);
      mockPlaybackObserver.getCurrentTime.mockReturnValue(15);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      // Segment is within padding (15 - 0.5 to 15 + 0.5), so should be excluded
      expect(result).toEqual({ type: "continue", value: undefined });
    });

    it("should not exclude current position padding for direct mode", () => {
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          infos: {
            period: { id: "period-1", start: 10 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);
      mockPlaybackObserver.getCurrentTime.mockReturnValue(15);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "direct",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      // In direct mode, current position is not excluded, so buffer should be flushed
      expect(result.type).toBe("flush-buffer");
      expect(result.value?.length).toBeGreaterThan(0);
    });

    it("should use polled position when getCurrentTime returns undefined", () => {
      mockPlaybackObserver.getCurrentTime.mockReturnValue(undefined);
      mockSegmentSink.getLastKnownInventory.mockReturnValue([
        {
          start: 14.6,
          end: 15.4,
          bufferedStart: 14.6,
          bufferedEnd: 15.4,
          infos: {
            period: { id: "period-1", start: 10 },
            adaptation: { id: "adaptation-2" },
          },
        },
      ]);

      const result = getAdaptationSwitchStrategy(
        mockSegmentSink,
        mockPeriod,
        mockAdaptation,
        "seamless",
        mockPlaybackObserver,
        { onCodecSwitch: "continue" },
      );

      expect(mockPlaybackObserver.getReference).toHaveBeenCalled();
      // Should still exclude based on polled position (15)
      expect(result).toEqual({ type: "continue", value: undefined });
    });
  });
});
