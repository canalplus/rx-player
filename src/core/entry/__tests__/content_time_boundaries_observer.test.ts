import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sleep from "../../../utils/sleep";
import type { IBufferType } from "../../segment_sinks";
import ContentTimeBoundariesObserver from "../content_time_boundaries_observer";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

const {
  mockTrigger,
  mockCancellerSignal,
  mockCanceller,
  mockPlaybackObserverListen,
  mockManifestEventListener,
  mockGetMinimumSafePosition,
  mockGetMaximumSafePosition,
  mockGetLastAvailablePosition,
  mockGetEnd,
} = vi.hoisted(() => ({
  mockTrigger: vi.fn(),
  mockCancellerSignal: { isCancelled: vi.fn(() => false) },
  mockCanceller: {
    signal: { isCancelled: vi.fn(() => false) },
    isUsed: vi.fn(() => false),
    cancel: vi.fn(),
  },
  mockPlaybackObserverListen: vi.fn(),
  mockManifestEventListener: vi.fn(),
  mockGetMinimumSafePosition: vi.fn(() => 0),
  mockGetMaximumSafePosition: vi.fn((): number | undefined => 100),
  mockGetLastAvailablePosition: vi.fn(),
  mockGetEnd: vi.fn(),
}));

vi.mock("../../../utils/event_emitter", () => ({
  default: class EventEmitter {
    trigger = mockTrigger;
    removeEventListener = vi.fn();
    addEventListener = vi.fn();
  },
}));

vi.mock("../../../utils/task_canceller", () => ({
  default: class TaskCanceller {
    signal = mockCancellerSignal;
    isUsed = mockCanceller.isUsed;
    cancel = mockCanceller.cancel;
  },
}));

vi.mock("../../../utils/queue_microtask", () => ({
  default: (fn: () => void) => Promise.resolve().then(() => fn()),
}));

describe("ContentTimeBoundariesObserver", () => {
  const createMockManifest = (overrides = {}): any => ({
    periods: [],
    isLastPeriodKnown: false,
    isDynamic: false,
    getMinimumSafePosition: mockGetMinimumSafePosition,
    getMaximumSafePosition: mockGetMaximumSafePosition,
    addEventListener: mockManifestEventListener,
    ...overrides,
  });

  const createMockPlaybackObserver = (): any => ({
    listen: mockPlaybackObserverListen,
  });

  const createMockPeriod = (id: string, start: number = 0): any => ({
    id,
    start,
    duration: 10,
    end: start + 10,
  });

  const createMockAdaptation = (representations: any[] = []): any => ({
    id: "adaptation-1",
    representations,
  });

  const createMockRepresentation = (): any => ({
    id: "representation-1",
    index: {
      getLastAvailablePosition: mockGetLastAvailablePosition,
      getEnd: mockGetEnd,
    },
  });

  beforeEach(() => {
    mockGetMinimumSafePosition.mockReturnValue(0);
    mockGetMaximumSafePosition.mockReturnValue(100);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should initialize and set up playback observer", async () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const bufferTypes: IBufferType[] = ["audio", "video"];

      new ContentTimeBoundariesObserver(manifest, playbackObserver, bufferTypes);
      await sleep(0);
      expect(mockPlaybackObserverListen).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          includeLastObservation: false,
          clearSignal: mockCancellerSignal,
        }),
      );
    });

    it("should set up manifest event listener", async () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();

      new ContentTimeBoundariesObserver(manifest, playbackObserver, ["audio"]);
      await sleep(0);

      expect(mockManifestEventListener).toHaveBeenCalledWith(
        "manifestUpdate",
        expect.any(Function),
        mockCancellerSignal,
      );
    });

    it("should trigger warning when position is before manifest minimum", async () => {
      mockGetMinimumSafePosition.mockReturnValue(10);
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();

      new ContentTimeBoundariesObserver(manifest, playbackObserver, ["audio"]);
      await sleep(0);

      const positionCallback = mockPlaybackObserverListen.mock.calls[0][0];
      positionCallback({ position: { getWanted: () => 5 } });

      expect(mockTrigger).toHaveBeenCalledWith("warning", expect.any(Object));
      const warning = mockTrigger.mock.calls[0][1];
      expect(warning.code).toBe("MEDIA_TIME_BEFORE_MANIFEST");
      expect(warning.timeInfo).toEqual({
        position: 5,
        minPosition: 10,
        maxPosition: 100,
      });
    });

    it("should trigger warning when position is after manifest maximum", async () => {
      mockGetMaximumSafePosition.mockReturnValue(100);
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();

      new ContentTimeBoundariesObserver(manifest, playbackObserver, ["audio"]);
      await sleep(0);

      const positionCallback = mockPlaybackObserverListen.mock.calls[0][0];
      positionCallback({ position: { getWanted: () => 150 } });

      expect(mockTrigger).toHaveBeenCalledWith("warning", expect.any(Object));
      const warning = mockTrigger.mock.calls[0][1];
      expect(warning.code).toBe("MEDIA_TIME_AFTER_MANIFEST");
    });
  });

  describe("getCurrentEndingTime", () => {
    it("should return ending position when manifest is not dynamic", async () => {
      mockGetMaximumSafePosition.mockReturnValue(100);
      const manifest = createMockManifest({ isDynamic: false });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);
      await sleep(0);

      const result = observer.getCurrentEndingTime();

      expect(result).toEqual({
        isEnd: true,
        endingPosition: 100,
      });
    });

    it("should return isEnd: true when ending position is determined for dynamic content", () => {
      const representation = createMockRepresentation();
      mockGetEnd.mockReturnValue(100);
      const adaptation = createMockAdaptation([representation]);
      const period = createMockPeriod("period-1");
      const manifest = createMockManifest({
        isDynamic: true,
        isLastPeriodKnown: true,
        periods: [period],
      });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onAdaptationChange("audio", period, adaptation);

      const result = observer.getCurrentEndingTime();

      expect(result).toEqual({
        isEnd: true,
        endingPosition: 100,
      });
    });

    it("should return isEnd: false when ending position is undetermined for non-dynamic content", () => {
      mockGetMaximumSafePosition.mockReturnValue(undefined);
      const manifest = createMockManifest({ isDynamic: false });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      const result = observer.getCurrentEndingTime();

      expect(result).toEqual({
        isEnd: false,
        endingPosition: undefined,
      });
    });

    it("should return isEnd: false when ending position is undetermined for dynamic content", () => {
      const representation = createMockRepresentation();
      mockGetEnd.mockReturnValue(100);
      const adaptation = createMockAdaptation([representation]);
      const period = createMockPeriod("period-1");
      const manifest = createMockManifest({
        isDynamic: true,
        isLastPeriodKnown: false,
        periods: [period],
      });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onAdaptationChange("audio", period, adaptation);

      const result = observer.getCurrentEndingTime();

      expect(result).toEqual({
        isEnd: false,
        endingPosition: 100,
      });
    });
  });

  describe("onAdaptationChange", () => {
    it("should trigger endingPositionChange for audio adaptation on last period", () => {
      const representation = createMockRepresentation();
      mockGetLastAvailablePosition.mockReturnValue(80);
      const adaptation = createMockAdaptation([representation]);
      const period = createMockPeriod("period-1");
      const manifest = createMockManifest({
        isLastPeriodKnown: true,
        periods: [period],
      });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onAdaptationChange("audio", period, adaptation);

      expect(mockTrigger).toHaveBeenCalledWith(
        "endingPositionChange",
        expect.objectContaining({
          endingPosition: expect.any(Number),
        }),
      );
    });

    it("should trigger endingPositionChange for video adaptation on last period", () => {
      const representation = createMockRepresentation();
      mockGetLastAvailablePosition.mockReturnValue(90);
      const adaptation = createMockAdaptation([representation]);
      const period = createMockPeriod("period-1");
      const manifest = createMockManifest({
        isLastPeriodKnown: true,
        periods: [period],
      });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "video",
      ]);

      observer.onAdaptationChange("video", period, adaptation);

      expect(mockTrigger).toHaveBeenCalledWith(
        "endingPositionChange",
        expect.objectContaining({
          endingPosition: expect.any(Number),
        }),
      );
    });

    it("should not trigger events after canceller is used", () => {
      mockCanceller.isUsed.mockReturnValue(true);
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const period = createMockPeriod("period-1");

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      mockTrigger.mockClear();
      observer.onAdaptationChange("audio", period, null);

      // Only manifestUpdate related triggers should have been called
      const periodChangeCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "periodChange",
      );
      expect(periodChangeCalls).toHaveLength(0);
    });

    it("should calculate minimum of audio and video positions", () => {
      const audioRep = createMockRepresentation();
      const videoRep = createMockRepresentation();
      let i = 0;
      mockGetLastAvailablePosition.mockImplementation(() => {
        i++;
        return (10 - i) * 10;
      });

      const audioAdaptation = createMockAdaptation([audioRep]);
      const videoAdaptation = createMockAdaptation([videoRep]);
      const period = createMockPeriod("period-1");
      const manifest = createMockManifest({
        isLastPeriodKnown: true,
        periods: [period],
      });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
        "video",
      ]);

      observer.onAdaptationChange("audio", period, audioAdaptation);
      observer.onAdaptationChange("video", period, videoAdaptation);

      const result = observer.getCurrentEndingTime();

      expect(result.endingPosition).toBe(60);
      expect(i).toEqual(4);
    });
  });

  describe("onRepresentationChange", () => {
    it("should add period to active periods", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const period1 = createMockPeriod("period-1", 0);

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onRepresentationChange("audio", period1);

      // Should trigger periodChange when period becomes active across all buffer types
      expect(mockTrigger).toHaveBeenCalledWith("periodChange", period1);
    });
  });

  describe("onPeriodCleared", () => {
    it("should remove period from active periods", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const period1 = createMockPeriod("period-1", 0);
      const period2 = createMockPeriod("period-2", 10);

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onRepresentationChange("audio", period1);
      observer.onRepresentationChange("audio", period2);

      mockTrigger.mockClear();

      observer.onPeriodCleared("audio", period1);

      // Should trigger periodChange for period2
      expect(mockTrigger).toHaveBeenCalledWith("periodChange", period2);
    });

    it("should handle clearing non-existent period gracefully", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const period1 = createMockPeriod("period-1", 0);

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      // Should not throw
      expect(() => {
        observer.onPeriodCleared("audio", period1);
      }).not.toThrow();
    });
  });

  describe("periodChange event", () => {
    it("should trigger periodChange only when period is active in all buffer types", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const period = createMockPeriod("period-1", 0);

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
        "video",
      ]);

      mockTrigger.mockClear();

      observer.onRepresentationChange("audio", period);

      // Should not trigger yet - not active in video
      const periodChangeCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "periodChange",
      );
      expect(periodChangeCalls).toHaveLength(0);

      observer.onRepresentationChange("video", period);

      // Now should trigger
      expect(mockTrigger).toHaveBeenCalledWith("periodChange", period);
    });

    it("should not trigger periodChange multiple times for same period", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const period = createMockPeriod("period-1", 0);

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onRepresentationChange("audio", period);

      mockTrigger.mockClear();

      observer.onRepresentationChange("audio", period);

      const periodChangeCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "periodChange",
      );
      expect(periodChangeCalls).toHaveLength(0);
    });

    it("should trigger periodChange when switching to different period", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();
      const period1 = createMockPeriod("period-1", 0);
      const period2 = createMockPeriod("period-2", 10);
      const adap1 = createMockAdaptation([]);
      const adap2 = createMockAdaptation([]);

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onAdaptationChange("audio", period1, adap1);
      observer.onRepresentationChange("audio", period1);
      expect(mockTrigger).toHaveBeenCalledWith("periodChange", period1);
      mockTrigger.mockClear();
      observer.onPeriodCleared("audio", period1);
      observer.onAdaptationChange("audio", period2, adap2);
      observer.onRepresentationChange("audio", period2);
      expect(mockTrigger).toHaveBeenCalledWith("periodChange", period2);
    });
  });

  describe("onLastSegmentFinishedLoading", () => {
    it("should trigger endOfStream when all buffer types finished loading", () => {
      const manifest = createMockManifest({ isLastPeriodKnown: true });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
        "video",
      ]);

      mockTrigger.mockClear();

      observer.onLastSegmentFinishedLoading("audio");
      observer.onLastSegmentFinishedLoading("video");

      expect(mockTrigger).toHaveBeenCalledWith("endOfStream", null);
    });

    it("should not trigger endOfStream if not all buffer types finished", () => {
      const manifest = createMockManifest({ isLastPeriodKnown: true });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
        "video",
      ]);

      mockTrigger.mockClear();

      observer.onLastSegmentFinishedLoading("audio");

      const endOfStreamCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "endOfStream",
      );
      expect(endOfStreamCalls).toHaveLength(0);
    });

    it("should not trigger endOfStream if last period is not known", () => {
      const manifest = createMockManifest({ isLastPeriodKnown: false });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      mockTrigger.mockClear();

      observer.onLastSegmentFinishedLoading("audio");

      const endOfStreamCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "endOfStream",
      );
      expect(endOfStreamCalls).toHaveLength(0);
    });

    it("should not trigger multiple times for same buffer type", () => {
      const manifest = createMockManifest({ isLastPeriodKnown: true });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onLastSegmentFinishedLoading("audio");

      mockTrigger.mockClear();

      observer.onLastSegmentFinishedLoading("audio");

      const endOfStreamCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "endOfStream",
      );
      expect(endOfStreamCalls).toHaveLength(0);
    });
  });

  describe("onLastSegmentLoadingResume", () => {
    it("should trigger resumeStream after endOfStream", () => {
      const manifest = createMockManifest({ isLastPeriodKnown: true });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
        "video",
      ]);

      observer.onLastSegmentFinishedLoading("audio");
      observer.onLastSegmentFinishedLoading("video");

      mockTrigger.mockClear();

      observer.onLastSegmentLoadingResume("audio");

      expect(mockTrigger).toHaveBeenCalledWith("resumeStream", null);
    });

    it("should not trigger if already in loading state", () => {
      const manifest = createMockManifest({ isLastPeriodKnown: true });
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.onLastSegmentLoadingResume("audio");

      mockTrigger.mockClear();

      observer.onLastSegmentLoadingResume("audio");

      const resumeStreamCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "resumeStream",
      );
      expect(resumeStreamCalls).toHaveLength(0);
    });
  });

  describe("manifestUpdate event", () => {
    it("should trigger endingPositionChange on manifest update", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();

      new ContentTimeBoundariesObserver(manifest, playbackObserver, ["audio"]);

      const manifestUpdateCallback = mockManifestEventListener.mock.calls[0][1];

      mockTrigger.mockClear();
      manifestUpdateCallback();

      expect(mockTrigger).toHaveBeenCalledWith(
        "endingPositionChange",
        expect.objectContaining({
          endingPosition: expect.any(Number),
          isEnd: expect.any(Boolean),
        }),
      );
    });

    it("should not trigger events if canceller is cancelled", () => {
      mockCancellerSignal.isCancelled.mockReturnValue(true);
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();

      new ContentTimeBoundariesObserver(manifest, playbackObserver, ["audio"]);

      const manifestUpdateCallback = mockManifestEventListener.mock.calls[0][1];

      mockTrigger.mockClear();
      manifestUpdateCallback();

      // endingPositionChange should still be called, but endOfStream check skipped
      const endOfStreamCalls = mockTrigger.mock.calls.filter(
        (call) => call[0] === "endOfStream",
      );
      expect(endOfStreamCalls).toHaveLength(0);
    });
  });

  describe("dispose", () => {
    it("should cancel operations with provided reason", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.dispose("test reason");

      expect(mockCanceller.cancel).toHaveBeenCalledWith("test reason");
    });

    it("should cancel operations with default reason when none provided", () => {
      const manifest = createMockManifest();
      const playbackObserver = createMockPlaybackObserver();

      const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
        "audio",
      ]);

      observer.dispose(undefined);

      expect(mockCanceller.cancel).toHaveBeenCalledWith(
        "ContentTimeBoundariesObserver dispose",
      );
    });
  });

  describe("MaximumPositionCalculator", () => {
    describe("getMaximumAvailablePosition", () => {
      it("should return manifest safe position for dynamic content", () => {
        mockGetMaximumSafePosition.mockReturnValue(120);
        const manifest = createMockManifest({ isDynamic: true });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
        ]);

        const result = observer.getCurrentEndingTime();

        expect(result.endingPosition).toBe(120);
      });

      it("should return manifest safe position when adaptations not set", () => {
        mockGetMaximumSafePosition.mockReturnValue(100);
        const manifest = createMockManifest({ isDynamic: false });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
          "video",
        ]);

        const result = observer.getCurrentEndingTime();

        expect(result.endingPosition).toBe(100);
      });

      it("should handle null audio adaptation", () => {
        const videoRep = createMockRepresentation();
        mockGetLastAvailablePosition.mockReturnValue(90);
        const videoAdaptation = createMockAdaptation([videoRep]);
        const period = createMockPeriod("period-1");
        const manifest = createMockManifest({
          isDynamic: false,
          isLastPeriodKnown: true,
          periods: [period],
        });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
          "video",
        ]);

        observer.onAdaptationChange("audio", period, null);
        observer.onAdaptationChange("video", period, videoAdaptation);

        const result = observer.getCurrentEndingTime();

        expect(result.endingPosition).toBe(90);
      });

      it("should handle null video adaptation", () => {
        const audioRep = createMockRepresentation();
        mockGetLastAvailablePosition.mockReturnValue(85);
        const audioAdaptation = createMockAdaptation([audioRep]);
        const period = createMockPeriod("period-1");
        const manifest = createMockManifest({
          isDynamic: false,
          isLastPeriodKnown: true,
          periods: [period],
        });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
          "video",
        ]);

        observer.onAdaptationChange("audio", period, audioAdaptation);
        observer.onAdaptationChange("video", period, null);

        const result = observer.getCurrentEndingTime();

        expect(result.endingPosition).toBe(85);
      });

      it("should handle both adaptations being null", () => {
        mockGetMaximumSafePosition.mockReturnValue(100);
        const period = createMockPeriod("period-1");
        const manifest = createMockManifest({
          isDynamic: false,
          isLastPeriodKnown: true,
          periods: [period],
        });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
          "video",
        ]);

        observer.onAdaptationChange("audio", period, null);
        observer.onAdaptationChange("video", period, null);

        const result = observer.getCurrentEndingTime();

        expect(result.endingPosition).toBe(100);
      });

      it("should fallback to manifest position when representation returns undefined", () => {
        mockGetMaximumSafePosition.mockReturnValue(100);
        const audioRep = createMockRepresentation();
        mockGetLastAvailablePosition.mockReturnValue(undefined);
        const audioAdaptation = createMockAdaptation([audioRep]);
        const period = createMockPeriod("period-1");
        const manifest = createMockManifest({
          isDynamic: false,
          isLastPeriodKnown: true,
          periods: [period],
        });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
        ]);

        observer.onAdaptationChange("audio", period, audioAdaptation);

        const result = observer.getCurrentEndingTime();

        expect(result.endingPosition).toBe(100);
      });
    });

    describe("getEndingPosition for dynamic content", () => {
      it("should return undefined when adaptations not set", () => {
        const manifest = createMockManifest({ isDynamic: true });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
          "video",
        ]);

        const result = observer.getCurrentEndingTime();

        expect(result.isEnd).toBe(false);
      });

      it("should return ending position from audio when video is null", () => {
        const audioRep = createMockRepresentation();
        mockGetEnd.mockReturnValue(95);
        const audioAdaptation = createMockAdaptation([audioRep]);
        const period = createMockPeriod("period-1");
        const manifest = createMockManifest({
          isDynamic: true,
          isLastPeriodKnown: true,
          periods: [period],
        });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
          "video",
        ]);

        observer.onAdaptationChange("audio", period, audioAdaptation);
        observer.onAdaptationChange("video", period, null);

        const result = observer.getCurrentEndingTime();

        expect(result).toEqual({
          isEnd: true,
          endingPosition: 95,
        });
      });

      it("should return undefined when both adaptations are null", () => {
        const period = createMockPeriod("period-1");
        const manifest = createMockManifest({
          isDynamic: true,
          isLastPeriodKnown: true,
          periods: [period],
        });
        const playbackObserver = createMockPlaybackObserver();

        const observer = new ContentTimeBoundariesObserver(manifest, playbackObserver, [
          "audio",
          "video",
        ]);

        observer.onAdaptationChange("audio", period, null);
        observer.onAdaptationChange("video", period, null);

        const result = observer.getCurrentEndingTime();

        expect(result.isEnd).toBe(false);
      });
    });
  });
});
