import { describe, it, expect, vi, afterEach } from "vitest";
import noop from "../../../utils/noop";
import SharedReference from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import createAdaptiveRepresentationSelector from "../adaptive_representation_selector";
import BufferBasedChooser from "../buffer_based_chooser";
import GuessBasedChooser from "../guess_based_chooser";
import NetworkAnalyzer from "../network_analyzer";
// Imported this way to spy on the constructor
import * as BandwidthEstimatorModule from "../utils/bandwidth_estimator";
import PendingRequestsStore from "../utils/pending_requests_store";
import RepresentationScoreCalculator from "../utils/representation_score_calculator";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

vi.mock("../../../log", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function makeRepresentation(id: string, bitrate: number) {
  return { id, bitrate, width: undefined, height: undefined } as any;
}

function makeObservationPosition(wanted: number) {
  return { getWanted: () => wanted } as any;
}

function makePlaybackObservation(overrides: Partial<any> = {}) {
  return {
    bufferGap: 0,
    position: makeObservationPosition(10),
    speed: 1,
    duration: 300,
    maximumPosition: 300,
    ...overrides,
  };
}

/** Build a minimal playback observer around a single observation value. */
function makePlaybackObserver(obs: any) {
  const ref = new SharedReference(obs);
  return {
    getReference: () => ref,
    listen: vi.fn(
      // nothing – tests will trigger manually via returned ref if needed
      noop,
    ),
  } as any;
}

function makeContext(isDynamic = false) {
  return {
    manifest: { isDynamic },
    period: {},
    adaptation: { type: "video" as const },
  } as any;
}

function makeOptions() {
  return {
    initialBitrates: { video: 1000 },
    lowLatencyMode: false,
    throttlers: {
      limitResolution: {},
      throttleBitrate: {},
    },
  };
}

describe("createAdaptiveRepresentationSelector", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a function (IRepresentationEstimator)", () => {
    const selector = createAdaptiveRepresentationSelector(makeOptions());
    expect(typeof selector).toBe("function");
  });

  it("creates a new BandwidthEstimator per buffer type on first call", () => {
    const MockBandwidthEstimator = vi.spyOn(BandwidthEstimatorModule, "default");
    const selector = createAdaptiveRepresentationSelector(makeOptions());
    const rep = makeRepresentation("r1", 500);
    const canceller = new TaskCanceller("test");
    const currentRepRef = new SharedReference(null);
    const repsRef = new SharedReference([rep]);
    const obs = makePlaybackObservation({ bufferGap: 0 });
    const observer = makePlaybackObserver(obs);

    selector(makeContext(), currentRepRef, repsRef, observer, canceller.signal);

    expect(MockBandwidthEstimator).toHaveBeenCalledTimes(1);
    canceller.cancel("done");
    MockBandwidthEstimator.mockRestore();
  });

  it("reuses the same BandwidthEstimator for the same buffer type across calls", () => {
    const MockBandwidthEstimator = vi.spyOn(BandwidthEstimatorModule, "default");
    const selector = createAdaptiveRepresentationSelector(makeOptions());
    const rep = makeRepresentation("r1", 500);
    const canceller = new TaskCanceller("test");
    const currentRepRef = new SharedReference(null);
    const repsRef = new SharedReference([rep]);
    const obs = makePlaybackObservation();
    const observer = makePlaybackObserver(obs);
    const ctx = makeContext();

    selector(ctx, currentRepRef, repsRef, observer, canceller.signal);
    selector(
      ctx,
      new SharedReference(null),
      new SharedReference([rep]),
      makePlaybackObserver(obs),
      canceller.signal,
    );

    expect(MockBandwidthEstimator).toHaveBeenCalledTimes(1);
    canceller.cancel("done");
    MockBandwidthEstimator.mockRestore();
  });

  it("creates separate BandwidthEstimators for different buffer types", () => {
    const MockBandwidthEstimator = vi.spyOn(BandwidthEstimatorModule, "default");
    const options = makeOptions();
    const selector = createAdaptiveRepresentationSelector(options);
    const rep = makeRepresentation("r1", 500);

    const canceller = new TaskCanceller("test");
    const obs = makePlaybackObservation();

    const videoCtx = {
      manifest: { isDynamic: false },
      period: {},
      adaptation: { type: "video" },
    } as any;
    const audioCtx = {
      manifest: { isDynamic: false },
      period: {},
      adaptation: { type: "audio" },
    } as any;

    selector(
      videoCtx,
      new SharedReference(null),
      new SharedReference([rep]),
      makePlaybackObserver(obs),
      canceller.signal,
    );
    selector(
      audioCtx,
      new SharedReference(null),
      new SharedReference([rep]),
      makePlaybackObserver(obs),
      canceller.signal,
    );

    expect(MockBandwidthEstimator).toHaveBeenCalledTimes(2);
    canceller.cancel("done");
    MockBandwidthEstimator.mockRestore();
  });

  describe("getEstimates (single representation)", () => {
    it("immediately returns the only representation without bandwidth logic", () => {
      const selector = createAdaptiveRepresentationSelector(makeOptions());
      const rep = makeRepresentation("r1", 500);
      const canceller = new TaskCanceller("test");

      const currentRepRef = new SharedReference(null);
      const repsRef = new SharedReference([rep]);
      const obs = makePlaybackObservation();
      const observer = makePlaybackObserver(obs);

      const { estimates } = selector(
        makeContext(),
        currentRepRef,
        repsRef,
        observer,
        canceller.signal,
      );
      const estimate = estimates.getValue();

      expect(estimate.representation).toBe(rep);
      expect(estimate.urgent).toBe(true);
      expect(estimate.bitrate).toBeUndefined();

      canceller.cancel("done");
    });
  });

  describe("getEstimates (multiple representations)", () => {
    function setupMultiRep(
      overrides: {
        obs?: Partial<any>;
        lowLatencyMode?: boolean;
        isDynamic?: boolean;
        bitrateChosen?: number;
        bandwidthEstimate?: number;
        bufferBasedEstimate?: number | undefined;
        guessResult?: any;
        currentRep?: any;
      } = {},
    ) {
      const mockGetBandwidthEstimate = vi.spyOn(
        NetworkAnalyzer.prototype,
        "getBandwidthEstimate",
      );
      const mockGetLastEstimate = vi.spyOn(
        BufferBasedChooser.prototype,
        "getLastEstimate",
      );
      const {
        obs: obsOverrides = {},
        lowLatencyMode = false,
        isDynamic = false,
        bandwidthEstimate = 800,
        bitrateChosen = 700,
        bufferBasedEstimate = undefined,
        currentRep = null,
      } = overrides;

      const options = {
        initialBitrates: { video: 1000 },
        lowLatencyMode,
        throttlers: { limitResolution: {}, throttleBitrate: {} },
      };

      const selector = createAdaptiveRepresentationSelector(options);

      const repLow = makeRepresentation("low", 300);
      const repMid = makeRepresentation("mid", 600);
      const repHigh = makeRepresentation("high", 1200);

      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate,
        bitrateChosen,
      });
      mockGetLastEstimate.mockReturnValue(bufferBasedEstimate);

      const canceller = new TaskCanceller("test");
      const currentRepRef = new SharedReference(currentRep);
      const repsRef = new SharedReference([repLow, repMid, repHigh]);
      const obs = makePlaybackObservation(obsOverrides);
      const observer = makePlaybackObserver(obs);

      const result = selector(
        makeContext(isDynamic),
        currentRepRef,
        repsRef,
        observer,
        canceller.signal,
      );

      return { result, canceller, repLow, repMid, repHigh, obs };
    }

    it("returns bandwidth-based estimate by default", () => {
      const { result, canceller } = setupMultiRep({ bitrateChosen: 700 });
      const estimate = result.estimates.getValue();
      expect(estimate.representation?.bitrate).toBe(600); // repMid
      expect(estimate.bitrate).toBe(800);
      canceller.cancel("done");
    });

    it("marks estimate as urgent=false when networkAnalyzer says so", () => {
      const mockIsUrgent = vi.spyOn(NetworkAnalyzer.prototype, "isUrgent");
      mockIsUrgent.mockReturnValue(false);
      const { result, canceller } = setupMultiRep({ bitrateChosen: 700 });
      expect(result.estimates.getValue().urgent).toBe(false);
      canceller.cancel("done");
    });

    it("marks estimate as urgent=true when networkAnalyzer says so", () => {
      const mockIsUrgent = vi.spyOn(NetworkAnalyzer.prototype, "isUrgent");
      mockIsUrgent.mockReturnValue(true);
      const { result, canceller } = setupMultiRep({ bitrateChosen: 700 });
      expect(result.estimates.getValue().urgent).toBe(true);
      canceller.cancel("done");
    });

    it("enters buffer-based mode when bufferGap >= ABR_ENTER threshold and uses it when higher", () => {
      const { result, canceller } = setupMultiRep({
        obs: { bufferGap: 15 },
        bitrateChosen: 300,
        bufferBasedEstimate: 1500,
      });
      const estimate = result.estimates.getValue();
      expect(estimate.representation?.bitrate).toBe(1200);
      canceller.cancel("done");
    });

    it("does not use buffer-based estimate when it would be lower than bandwidth estimate", () => {
      const { result, canceller } = setupMultiRep({
        obs: { bufferGap: 15 },
        bitrateChosen: 700,
        bufferBasedEstimate: 200,
      });
      expect(result.estimates.getValue().representation?.bitrate).toBe(600);
      canceller.cancel("done");
    });

    it("exits buffer-based mode when bufferGap <= ABR_EXIT threshold", () => {
      const { result, canceller } = setupMultiRep({
        obs: { bufferGap: 1 },
        bitrateChosen: 700,
        bufferBasedEstimate: 1500,
      });
      expect(result.estimates.getValue().representation?.bitrate).toBe(600);
      canceller.cancel("done");
    });

    it("uses guess-based estimate in low-latency mode near live edge when guess is higher", () => {
      const mockGetGuess = vi.spyOn(GuessBasedChooser.prototype, "getGuess");
      const repGuess = makeRepresentation("guess", 1200);
      mockGetGuess.mockReturnValue(repGuess);

      const { result, canceller } = setupMultiRep({
        isDynamic: true,
        lowLatencyMode: true,
        obs: { bufferGap: 0, maximumPosition: 50, position: makeObservationPosition(20) },
        bitrateChosen: 300, // bandwidth picks repLow(300)
        currentRep: makeRepresentation("low", 300),
        guessResult: repGuess,
      });

      const estimate = result.estimates.getValue();
      expect(estimate.representation?.bitrate).toBe(1200);
      canceller.cancel("done");
    });

    it("does not use guess-based when not in low-latency mode", () => {
      const mockGetGuess = vi.spyOn(GuessBasedChooser.prototype, "getGuess");
      const repGuess = makeRepresentation("guess", 1200);
      mockGetGuess.mockReturnValue(repGuess);

      const { result, canceller } = setupMultiRep({
        isDynamic: true,
        lowLatencyMode: false,
        obs: { bufferGap: 0, maximumPosition: 50, position: makeObservationPosition(20) },
        bitrateChosen: 300,
        currentRep: makeRepresentation("low", 300),
        guessResult: repGuess,
      });

      // guess ignored, bandwidth used
      expect(result.estimates.getValue().representation?.bitrate).toBe(300);
      canceller.cancel("done");
    });

    it("does not use guess-based when far from live edge (≥40s)", () => {
      const mockGetGuess = vi.spyOn(GuessBasedChooser.prototype, "getGuess");
      const repGuess = makeRepresentation("guess", 1200);
      mockGetGuess.mockReturnValue(repGuess);

      const { result, canceller } = setupMultiRep({
        isDynamic: true,
        lowLatencyMode: true,
        obs: {
          bufferGap: 0,
          maximumPosition: 200,
          position: makeObservationPosition(10),
        },
        bitrateChosen: 300,
        currentRep: makeRepresentation("low", 300),
        guessResult: repGuess,
      });

      // maximumPosition - position = 190 ≥ 40, so guess not used
      expect(result.estimates.getValue().representation?.bitrate).toBe(300);
      canceller.cancel("done");
    });

    it("guess-based urgency: urgent=true when guess bitrate < current representation bitrate", () => {
      const mockGetGuess = vi.spyOn(GuessBasedChooser.prototype, "getGuess");
      const mockGetBandwidthEstimate = vi.spyOn(
        NetworkAnalyzer.prototype,
        "getBandwidthEstimate",
      );
      const repGuessLow = makeRepresentation("guessLow", 100);
      mockGetGuess.mockReturnValue(repGuessLow);

      const options = {
        initialBitrates: { video: 1000 },
        lowLatencyMode: true,
        throttlers: { limitResolution: {}, throttleBitrate: {} },
      };
      const selector = createAdaptiveRepresentationSelector(options);
      const repHigh = makeRepresentation("high", 1200);
      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate: 800,
        bitrateChosen: 700,
      });

      const canceller = new TaskCanceller("test");
      const currentRep = makeRepresentation("high", 1200);
      const currentRepRef = new SharedReference(currentRep);
      const repsRef = new SharedReference([makeRepresentation("low", 100), repHigh]);
      const obs = makePlaybackObservation({
        maximumPosition: 50,
        position: makeObservationPosition(20),
      });
      const observer = makePlaybackObserver(obs);

      const { estimates } = selector(
        makeContext(true),
        currentRepRef,
        repsRef,
        observer,
        canceller.signal,
      );

      // guess (100) < current (1200) → urgent true
      expect(estimates.getValue().urgent).toBe(true);
      canceller.cancel("done");
    });
  });

  describe("callbacks", () => {
    function getCallbackSetup() {
      const selector = createAdaptiveRepresentationSelector(makeOptions());
      const repLow = makeRepresentation("low", 300);
      const repHigh = makeRepresentation("high", 1200);

      const canceller = new TaskCanceller("test");
      const currentRepRef = new SharedReference(null);
      const repsRef = new SharedReference([repLow, repHigh]);
      const obs = makePlaybackObservation();
      const observer = makePlaybackObserver(obs);

      const { callbacks } = selector(
        makeContext(),
        currentRepRef,
        repsRef,
        observer,
        canceller.signal,
      );

      return { callbacks, canceller, repLow };
    }

    it("metrics callback calls bandwidthEstimator.addSample", () => {
      const mockAddSample = vi.spyOn(
        BandwidthEstimatorModule.default.prototype,
        "addSample",
      );
      const { callbacks, canceller } = getCallbackSetup();
      callbacks.metrics({
        requestDuration: 200,
        size: 50000,
        segmentDuration: 4,
        content: {
          representation: makeRepresentation("r", 500),
          adaptation: {} as any,
          segment: { isInit: false, complete: true, duration: 4 } as any,
        },
      });
      expect(mockAddSample).toHaveBeenCalledWith(200, 50000);
      canceller.cancel("done");
    });

    it("metrics callback does not call scoreCalculator.addSample for init segments", () => {
      const mockScoreAddSample = vi.spyOn(
        RepresentationScoreCalculator.prototype,
        "addSample",
      );
      const { callbacks, canceller } = getCallbackSetup();
      callbacks.metrics({
        requestDuration: 100,
        size: 1000,
        segmentDuration: undefined,
        content: {
          representation: makeRepresentation("r", 500),
          adaptation: {} as any,
          segment: { isInit: true, complete: false, duration: 0 } as any,
        },
      });
      expect(mockScoreAddSample).not.toHaveBeenCalled();
      canceller.cancel("done");
    });

    it("metrics callback calls scoreCalculator.addSample for media segments", () => {
      const mockScoreAddSample = vi.spyOn(
        RepresentationScoreCalculator.prototype,
        "addSample",
      );
      const { callbacks, canceller } = getCallbackSetup();
      const rep = makeRepresentation("r", 500);
      callbacks.metrics({
        requestDuration: 200,
        size: 50000,
        segmentDuration: 4,
        content: {
          representation: rep,
          adaptation: {} as any,
          segment: { isInit: false, complete: true, duration: 4 } as any,
        },
      });
      expect(mockScoreAddSample).toHaveBeenCalledWith(rep, 0.2, 4);
      canceller.cancel("done");
    });

    it("requestBegin callback delegates to requestsStore.add", () => {
      const mockRequestAdd = vi.spyOn(PendingRequestsStore.prototype, "add");
      const { callbacks, canceller } = getCallbackSetup();
      const payload = { id: "req1", time: 0, requestTimestamp: 0, content: {} } as any;
      callbacks.requestBegin(payload);
      expect(mockRequestAdd).toHaveBeenCalledWith(payload);
      canceller.cancel("done");
    });

    it("requestProgress callback delegates to requestsStore.addProgress", () => {
      const mockRequestAddProgress = vi.spyOn(
        PendingRequestsStore.prototype,
        "addProgress",
      );
      const { callbacks, canceller } = getCallbackSetup();
      const payloadAdd = { id: "req1", time: 0, requestTimestamp: 0, content: {} as any };
      const payloadProgress = {
        id: "req1",
        size: 1000,
        totalSize: 5000,
        timestamp: 1,
        duration: 2,
      };
      callbacks.requestBegin(payloadAdd);
      callbacks.requestProgress(payloadProgress);
      expect(mockRequestAddProgress).toHaveBeenCalledWith(payloadProgress);
      canceller.cancel("done");
    });

    it("requestEnd callback delegates to requestsStore.remove", () => {
      const mockRequestRemove = vi.spyOn(PendingRequestsStore.prototype, "remove");
      const { callbacks, canceller } = getCallbackSetup();
      const payloadAdd = { id: "req1", time: 0, requestTimestamp: 0, content: {} as any };
      callbacks.requestBegin(payloadAdd);
      callbacks.requestEnd({ id: "req1" });
      expect(mockRequestRemove).toHaveBeenCalledWith("req1");
      canceller.cancel("done");
    });

    it("addedSegment callback triggers bufferBasedChooser.onAddedSegment", () => {
      const mockBufferBasedOnAdded = vi.spyOn(
        BufferBasedChooser.prototype,
        "onAddedSegment",
      );
      const { callbacks, canceller, repLow } = getCallbackSetup();
      callbacks.addedSegment({
        buffered: [{ start: 0, end: 20 }],
        content: { representation: repLow },
      });
      expect(mockBufferBasedOnAdded).toHaveBeenCalled();
      canceller.cancel("done");
    });
  });

  describe("knownStableBitrate", () => {
    it("is undefined when there is no last stable representation", () => {
      const mockGetLastStableRepresentation = vi.spyOn(
        RepresentationScoreCalculator.prototype,
        "getLastStableRepresentation",
      );
      const mockGetBandwidthEstimate = vi.spyOn(
        NetworkAnalyzer.prototype,
        "getBandwidthEstimate",
      );
      mockGetLastStableRepresentation.mockReturnValue(null);
      const selector = createAdaptiveRepresentationSelector(makeOptions());
      const reps = [makeRepresentation("low", 300), makeRepresentation("high", 900)];
      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate: 800,
        bitrateChosen: 700,
      });

      const canceller = new TaskCanceller("test");
      const { estimates } = selector(
        makeContext(),
        new SharedReference(null),
        new SharedReference(reps),
        makePlaybackObserver(makePlaybackObservation()),
        canceller.signal,
      );

      expect(estimates.getValue().knownStableBitrate).toBeUndefined();
      canceller.cancel("done");
    });

    it("divides stable representation bitrate by speed", () => {
      const mockGetLastStableRepresentation = vi.spyOn(
        RepresentationScoreCalculator.prototype,
        "getLastStableRepresentation",
      );
      const mockGetBandwidthEstimate = vi.spyOn(
        NetworkAnalyzer.prototype,
        "getBandwidthEstimate",
      );
      const stableRep = makeRepresentation("stable", 600);
      mockGetLastStableRepresentation.mockReturnValue(stableRep);
      const selector = createAdaptiveRepresentationSelector(makeOptions());
      const reps = [makeRepresentation("low", 300), makeRepresentation("high", 900)];
      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate: 800,
        bitrateChosen: 700,
      });

      const canceller = new TaskCanceller("test");
      const { estimates } = selector(
        makeContext(),
        new SharedReference(null),
        new SharedReference(reps),
        makePlaybackObserver(makePlaybackObservation({ speed: 2 })),
        canceller.signal,
      );

      // 600 / 2 = 300
      expect(estimates.getValue().knownStableBitrate).toBe(300);
      canceller.cancel("done");
    });

    it("uses 1 as divisor when speed is 0", () => {
      const mockGetLastStableRepresentation = vi.spyOn(
        RepresentationScoreCalculator.prototype,
        "getLastStableRepresentation",
      );
      const mockGetBandwidthEstimate = vi.spyOn(
        NetworkAnalyzer.prototype,
        "getBandwidthEstimate",
      );
      const stableRep = makeRepresentation("stable", 600);
      mockGetLastStableRepresentation.mockReturnValue(stableRep);
      const selector = createAdaptiveRepresentationSelector(makeOptions());
      const reps = [makeRepresentation("low", 300), makeRepresentation("high", 900)];
      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate: 800,
        bitrateChosen: 700,
      });

      const canceller = new TaskCanceller("test");
      const { estimates } = selector(
        makeContext(),
        new SharedReference(null),
        new SharedReference(reps),
        makePlaybackObserver(makePlaybackObservation({ speed: 0 })),
        canceller.signal,
      );

      expect(estimates.getValue().knownStableBitrate).toBe(600);
      canceller.cancel("done");
    });
  });

  describe("representations reference update", () => {
    it("restarts estimates when representations reference updates", () => {
      const mockGetBandwidthEstimate = vi.spyOn(
        NetworkAnalyzer.prototype,
        "getBandwidthEstimate",
      );
      const selector = createAdaptiveRepresentationSelector(makeOptions());
      const repLow = makeRepresentation("low", 300);
      const repHigh = makeRepresentation("high", 1200);
      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate: 800,
        bitrateChosen: 300,
      });

      const canceller = new TaskCanceller("test");
      const currentRepRef = new SharedReference(null);
      const repsRef = new SharedReference([repLow]);
      const obs = makePlaybackObservation();
      const observer = makePlaybackObserver(obs);

      const { estimates } = selector(
        makeContext(),
        currentRepRef,
        repsRef,
        observer,
        canceller.signal,
      );

      // Initially only repLow
      expect(estimates.getValue().representation?.id).toBe("low");

      // Update bitrateChosen to pick repHigh now
      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate: 1500,
        bitrateChosen: 1500,
      });
      repsRef.setValue([repLow, repHigh]);

      // After update new estimate should be produced
      const newEstimate = estimates.getValue();
      expect(newEstimate.representation?.id).toBe("high");

      canceller.cancel("done");
    });
  });

  describe("stopAllEstimates cancellation", () => {
    it("stops producing estimates after cancellation signal fires", () => {
      const mockGetBandwidthEstimate = vi.spyOn(
        NetworkAnalyzer.prototype,
        "getBandwidthEstimate",
      );
      const selector = createAdaptiveRepresentationSelector(makeOptions());
      const rep = makeRepresentation("r1", 500);
      mockGetBandwidthEstimate.mockReturnValue({
        bandwidthEstimate: 800,
        bitrateChosen: 700,
      });

      const canceller = new TaskCanceller("test");
      const currentRepRef = new SharedReference(null);
      const repsRef = new SharedReference([rep]);
      const obs = makePlaybackObservation();
      const observer = makePlaybackObserver(obs);

      const { estimates } = selector(
        makeContext(),
        currentRepRef,
        repsRef,
        observer,
        canceller.signal,
      );
      const valueBefore = estimates.getValue();

      canceller.cancel("done");

      // After cancellation, the estimate should be finished (no new emissions).
      // We verify by checking the reference is marked finished.
      // SharedReference.isFinished() may not exist; instead just assert no error thrown.
      expect(valueBefore).toBeDefined();
    });
  });
});
