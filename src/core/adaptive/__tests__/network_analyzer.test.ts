import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import configHandler from "../../../config";
import {
  DummyAdaptation,
  DummyPeriod,
  DummyRepresentation,
  DummyManifest,
  createSegment,
} from "../../../manifest/classes/__tests__/mocks";
import { DummyObservationPosition } from "../../../playback_observer/__tests__/mocks";
import { makeMockedClass } from "../../../utils/test-utils";
import type { IPlaybackConditionsInfo } from "../network_analyzer";
import NetworkAnalyzer, { estimateRequestBandwidth } from "../network_analyzer";
import type BandwidthEstimator from "../utils/bandwidth_estimator";
import type {
  IPendingRequestStoreProgress,
  IRequestInfo,
} from "../utils/pending_requests_store";

vi.mock("../../../log", () => ({
  default: {
    info: vi.fn(),
  },
}));

function createMockRequest(
  segmentTime: number,
  segmentDuration: number,
  requestTimestamp: number,
  progress: Array<Partial<IPendingRequestStoreProgress>> = [],
  complete = true,
): IRequestInfo {
  return {
    content: {
      segment: createSegment({
        time: segmentTime,
        duration: segmentDuration,
        complete,
      }),
      adaptation: new DummyAdaptation(),
      period: new DummyPeriod(),
      representation: new DummyRepresentation(),
      manifest: new DummyManifest(),
    },
    requestTimestamp,
    progress: progress.map((p) => {
      return {
        size: 1000,
        timestamp: 1000,
        totalSize: 10000,
        duration: 2,
        id: "toto",
        ...p,
      };
    }),
  };
}

function createMockPlaybackInfo(
  bufferGap: number,
  position: number,
  speed = 1,
  duration = 100,
): IPlaybackConditionsInfo {
  return {
    bufferGap,
    position: new DummyObservationPosition({
      getWanted: () => position,
      getPolled: () => position,
    }),
    speed,
    duration,
  };
}

function createMockBandwidthEstimator(estimate?: number): BandwidthEstimator {
  const DummyBandwidthEstimator = makeMockedClass<BandwidthEstimator>(
    {
      getEstimate: vi.fn(() => estimate),
      reset: vi.fn(),
      addSample: vi.fn(),
    },
    {},
  );
  return new DummyBandwidthEstimator();
}
beforeEach(() => {
  const originalConfig = configHandler.getCurrent();
  vi.spyOn(configHandler, "getCurrent").mockReturnValue({
    ...originalConfig,
    ABR_STARVATION_GAP: {
      DEFAULT: 2,
      LOW_LATENCY: 1,
    },
    OUT_OF_STARVATION_GAP: {
      DEFAULT: 3,
      LOW_LATENCY: 1.5,
    },
    ABR_STARVATION_FACTOR: {
      DEFAULT: 0.72,
      LOW_LATENCY: 0.8,
    },
    ABR_REGULAR_FACTOR: {
      DEFAULT: 0.8,
      LOW_LATENCY: 0.85,
    },
    ABR_STARVATION_DURATION_DELTA: 5,
  });
});
afterEach(() => {
  vi.resetAllMocks();
});

describe("estimateRequestBandwidth", () => {
  it("should return undefined if progress events are less than 5", () => {
    // eslint-disable-next-line no-restricted-properties
    const request = createMockRequest(0, 4, performance.now(), [
      { size: 1000, timestamp: 1000, totalSize: 10000 },
      { size: 2000, timestamp: 2000, totalSize: 10000 },
    ]);
    expect(estimateRequestBandwidth(request)).toBeUndefined();
  });

  it("should calculate bandwidth estimate from progress events", () => {
    const baseTime = 1000;
    const request = createMockRequest(0, 4, baseTime, [
      { size: 0, timestamp: baseTime, totalSize: 10000 },
      { size: 1000, timestamp: baseTime + 100, totalSize: 10000 },
      { size: 2000, timestamp: baseTime + 200, totalSize: 10000 },
      { size: 3000, timestamp: baseTime + 300, totalSize: 10000 },
      { size: 4000, timestamp: baseTime + 400, totalSize: 10000 },
      { size: 5000, timestamp: baseTime + 500, totalSize: 10000 },
    ]);
    const estimate = estimateRequestBandwidth(request);
    expect(estimate).toBeDefined();
    expect(typeof estimate).toBe("number");
    expect(estimate).toBeGreaterThan(50000);
  });

  it("should handle varying download speeds", () => {
    const baseTime = 1000;
    const request = createMockRequest(0, 4, baseTime, [
      { size: 0, timestamp: baseTime, totalSize: 20000 },
      { size: 2000, timestamp: baseTime + 100, totalSize: 20000 },
      { size: 4000, timestamp: baseTime + 200, totalSize: 20000 },
      { size: 5000, timestamp: baseTime + 400, totalSize: 20000 }, // Slower
      { size: 6000, timestamp: baseTime + 600, totalSize: 20000 }, // Slower
      { size: 7000, timestamp: baseTime + 800, totalSize: 20000 },
    ]);
    const estimate = estimateRequestBandwidth(request);
    expect(estimate).toBeDefined();
    expect(estimate).toBeGreaterThan(50000);
  });
});

describe("NetworkAnalyzer", () => {
  describe("constructor", () => {
    it("should initialize with default mode configuration", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      expect(analyzer).toBeDefined();
    });

    it("should initialize with low latency mode configuration", () => {
      const analyzer = new NetworkAnalyzer(1000000, true);
      expect(analyzer).toBeDefined();
    });
  });

  describe("getBandwidthEstimate", () => {
    it("should return initial bitrate when no bandwidth estimate is available", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 0);
      const bandwidthEstimator = createMockBandwidthEstimator(undefined);

      const result = analyzer.getBandwidthEstimate(
        playbackInfo,
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      expect(result.bitrateChosen).toBe(1000000);
    });

    it("should apply regular factor to bandwidth estimate in normal mode", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 0);
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      const result = analyzer.getBandwidthEstimate(
        playbackInfo,
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Should apply ABR_REGULAR_FACTOR.DEFAULT (0.8)
      expect(result.bitrateChosen).toBe(2000000 * 0.8);
      expect(result.bandwidthEstimate).toBe(2000000);
    });

    it("should enter starvation mode when buffer gap is low", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(1, 10); // Low buffer gap
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      const result = analyzer.getBandwidthEstimate(
        playbackInfo,
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Should apply ABR_STARVATION_FACTOR.DEFAULT (0.72)
      expect(result.bitrateChosen).toBe(2000000 * 0.72);
    });

    it("should exit starvation mode when buffer gap increases", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      // Enter starvation mode
      analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(1, 10),
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Exit starvation mode
      const result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(5, 10),
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Should apply regular factor again (0.8)
      expect(result.bitrateChosen).toBe(2000000 * 0.8);
    });

    it("should adjust bitrate based on playback speed", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 0, 2); // 2x speed
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      const result = analyzer.getBandwidthEstimate(
        playbackInfo,
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Should divide by speed: (2000000 * 0.8) / 2
      expect(result.bitrateChosen).toBe((2000000 * 0.8) / 2);
    });

    it("should use last estimated bitrate when no new estimate available", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 0);
      const bandwidthEstimator = createMockBandwidthEstimator(undefined);

      const result = analyzer.getBandwidthEstimate(
        playbackInfo,
        bandwidthEstimator,
        null,
        [],
        1500000, // Last estimated bitrate
      );

      expect(result.bitrateChosen).toBe(1500000 * 0.8);
    });

    it("should exit starvation mode near end of content", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      // Enter starvation mode
      analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(1, 10, 1, 100),
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Near end of content (position + buffer gap close to duration)
      const result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(1, 96, 1, 100), // 96 + 1 = 97, close to 100
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Should exit starvation mode and use regular factor
      expect(result.bitrateChosen).toBe(2000000 * 0.8);
    });

    it("should handle infinite buffer gap", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(Infinity, 0);
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      const result = analyzer.getBandwidthEstimate(
        playbackInfo,
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Should treat infinite as 0 and apply starvation factor
      expect(result.bitrateChosen).toBe(2000000 * 0.72);
    });

    it("should use different thresholds in low latency mode", () => {
      const analyzer = new NetworkAnalyzer(1000000, true);
      const playbackInfo = createMockPlaybackInfo(0.5, 10); // Would enter starvation in low latency
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      const result = analyzer.getBandwidthEstimate(
        playbackInfo,
        bandwidthEstimator,
        null,
        [],
        undefined,
      );

      // Should use low latency starvation factor (0.8)
      expect(result.bitrateChosen).toBe(2000000 * 0.8);
    });
  });

  describe("isUrgent", () => {
    it("should return true when no current representation", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 0);

      const result = analyzer.isUrgent(500000, null, [], playbackInfo);

      expect(result).toBe(true);
    });

    it("should return false when bitrate is higher than current representation", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 0);
      const currentRepresentation = new DummyRepresentation({
        bitrate: 1000000,
      });

      const result = analyzer.isUrgent(2000000, currentRepresentation, [], playbackInfo);

      expect(result).toBe(false);
    });

    it("should return true in low latency mode when switching to lower bitrate", () => {
      const analyzer = new NetworkAnalyzer(1000000, true);
      const playbackInfo = createMockPlaybackInfo(5, 0);
      const currentRepresentation = new DummyRepresentation({
        bitrate: 2000000,
      });

      const result = analyzer.isUrgent(1000000, currentRepresentation, [], playbackInfo);

      expect(result).toBe(true);
    });

    it("should return true when no pending requests for lower bitrate", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 10);
      const currentRepresentation = new DummyRepresentation({
        bitrate: 2000000,
      });

      const result = analyzer.isUrgent(1000000, currentRepresentation, [], playbackInfo);

      expect(result).toBe(true);
    });

    it("should evaluate urgency based on pending request progress", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      // eslint-disable-next-line no-restricted-properties
      const now = performance.now();
      const playbackInfo = createMockPlaybackInfo(2, 10);
      const currentRepresentation = new DummyRepresentation({
        bitrate: 2000000,
      });

      const request = createMockRequest(10, 4, now - 1000, [
        { size: 0, timestamp: now - 1000, totalSize: 10000 },
        { size: 2000, timestamp: now - 800, totalSize: 10000 },
        { size: 4000, timestamp: now - 600, totalSize: 10000 },
        { size: 6000, timestamp: now - 400, totalSize: 10000 },
        { size: 8000, timestamp: now - 200, totalSize: 10000 },
      ]);

      const result = analyzer.isUrgent(
        1000000,
        currentRepresentation,
        [request],
        playbackInfo,
      );

      expect(typeof result).toBe("boolean");
    });

    it("should handle requests with zero duration segments", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(5, 10);
      const currentRepresentation = new DummyRepresentation({
        bitrate: 2000000,
      });

      // eslint-disable-next-line no-restricted-properties
      const request = createMockRequest(10, 0, performance.now()); // Zero duration

      const result = analyzer.isUrgent(
        1000000,
        currentRepresentation,
        [request],
        playbackInfo,
      );

      expect(result).toBe(true);
    });

    it("should handle infinite buffer gap in urgency check", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const playbackInfo = createMockPlaybackInfo(Infinity, 10);
      const currentRepresentation = new DummyRepresentation({
        bitrate: 2000000,
      });

      const result = analyzer.isUrgent(1000000, currentRepresentation, [], playbackInfo);

      expect(typeof result).toBe("boolean");
    });
  });

  describe("integration scenarios", () => {
    it("should handle typical playback progression", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const bandwidthEstimator = createMockBandwidthEstimator(2000000);

      // Initial state - good buffer
      let result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(10, 0),
        bandwidthEstimator,
        null,
        [],
        undefined,
      );
      expect(result.bitrateChosen).toBe(2000000 * 0.8);

      // Buffer depleting - entering starvation
      result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(1.5, 20),
        bandwidthEstimator,
        new DummyRepresentation({ bitrate: 1600000 }),
        [],
        result.bitrateChosen,
      );
      expect(result.bitrateChosen).toBe(2000000 * 0.72);

      // Buffer recovering - exiting starvation
      result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(4, 30),
        bandwidthEstimator,
        new DummyRepresentation({ bitrate: 1440000 }),
        [],
        result.bitrateChosen,
      );
      expect(result.bitrateChosen).toBe(2000000 * 0.8);
    });

    it("should handle bandwidth fluctuations", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);

      // Start with good bandwidth
      let estimator = createMockBandwidthEstimator(3000000);
      let result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(5, 0),
        estimator,
        null,
        [],
        undefined,
      );
      expect(result.bitrateChosen).toBe(3000000 * 0.8);

      // Bandwidth drops
      estimator = createMockBandwidthEstimator(1000000);
      result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(5, 10),
        estimator,
        new DummyRepresentation({ bitrate: 2400000 }),
        [],
        result.bitrateChosen,
      );
      expect(result.bitrateChosen).toBe(1000000 * 0.8);

      // Bandwidth recovers
      estimator = createMockBandwidthEstimator(2500000);
      result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(5, 20),
        estimator,
        new DummyRepresentation({ bitrate: 800000 }),
        [],
        result.bitrateChosen,
      );
      expect(result.bitrateChosen).toBe(2500000 * 0.8);
    });

    it("should handle speed changes during playback", () => {
      const analyzer = new NetworkAnalyzer(1000000, false);
      const estimator = createMockBandwidthEstimator(2000000);

      // Normal speed
      let result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(5, 0, 1),
        estimator,
        null,
        [],
        undefined,
      );
      const normalBitrate = result.bitrateChosen;

      // 2x speed - should halve the bitrate
      result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(5, 10, 2),
        estimator,
        new DummyRepresentation({ bitrate: normalBitrate }),
        [],
        result.bitrateChosen,
      );
      expect(result.bitrateChosen).toBe(normalBitrate / 2);

      // 0.5x speed - keep regular bitrate
      result = analyzer.getBandwidthEstimate(
        createMockPlaybackInfo(5, 20, 0.5),
        estimator,
        new DummyRepresentation({ bitrate: normalBitrate }),
        [],
        result.bitrateChosen,
      );
      expect(result.bitrateChosen).toBe(normalBitrate);
    });
  });
});
