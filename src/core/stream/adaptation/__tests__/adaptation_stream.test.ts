import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DummyAdaptation,
  DummyManifest,
  DummyPeriod,
  DummyRepresentation,
  createSegment,
} from "../../../../manifest/classes/__tests__/mocks.ts";
import type { IPeriodsUpdateResult } from "../../../../manifest/classes/update_periods.ts";
import type {
  IAdaptation,
  IManifest,
  IPeriod,
  IRepresentation,
} from "../../../../manifest/index.ts";
import {
  DummyObservationPosition,
  makeReadyOnlyPlaybackObserver,
} from "../../../../playback_observer/__tests__/mocks.ts";
import type { ObservationPosition } from "../../../../playback_observer/index.ts";
import SharedReference from "../../../../utils/reference.ts";
import TaskCanceller, { CancellationError } from "../../../../utils/task_canceller.ts";
import { makeMockedClass } from "../../../../utils/test-utils.ts";
import type {
  IRepresentationEstimator,
  IRepresentationEstimatorCallbacks,
} from "../../../adaptive/index.ts";
import type { SegmentQueueCreator } from "../../../fetchers/index.ts";
import type SegmentQueue from "../../../fetchers/segment/segment_queue.ts";
import { DummySegmentSink } from "../../../segment_sinks/__tests__/mocks.ts";
import type { SegmentSink } from "../../../segment_sinks/index.ts";
import type {
  IRepresentationsChoice,
  IRepresentationStreamCallbacks,
} from "../../representation/index.ts";
import AdaptationStream from "../adaptation_stream.ts";
import type { IAdaptationStreamCallbacks } from "../types.ts";

const {
  mockGetRepresentationsSwitchingStrategy,
  mockRepresentationStream,
  mockCancellableSleep,
  mockFormatError,
} = vi.hoisted(() => ({
  mockGetRepresentationsSwitchingStrategy: vi.fn(),
  mockRepresentationStream: vi.fn(),
  mockCancellableSleep: vi.fn(),
  mockFormatError: vi.fn(),
}));

vi.mock("../get_representations_switch_strategy", () => ({
  default: mockGetRepresentationsSwitchingStrategy,
}));

vi.mock("../../representation", () => ({
  default: mockRepresentationStream,
}));

vi.mock("../../../../utils/cancellable_sleep", () => ({
  default: mockCancellableSleep,
}));

vi.mock("../../../../errors", () => ({
  formatError: mockFormatError,
}));

const DummySegmentQueue = makeMockedClass<SegmentQueue<unknown>>(
  {
    addEventListener: notImplemented("addEventListener"),
    removeEventListener: notImplemented("removeEventListener"),
    getRequestedInitSegment: notImplemented("getRequestedInitSegment"),
    getRequestedMediaSegment: notImplemented("getRequestedMediaSegment"),
    resetForContent: notImplemented("resetForContent"),
    stop: notImplemented("stop"),
  },
  {},
);

const DummySegmentQueueCreator = makeMockedClass<SegmentQueueCreator>(
  {
    createSegmentQueue: notImplemented("createSegmentQueue"),
  },
  {},
);

describe("AdaptationStream", () => {
  let manifest: IManifest;
  interface IPlaybackObservation {
    position: ObservationPosition;
    paused: { last: boolean; pending: undefined };
    speed: number;
    canStream: boolean;
    bufferGap: number;
    duration: number;
    maximumPosition: number;
  }
  interface IEstimate {
    representation: IRepresentation | null;
    bitrate: number | undefined;
    knownStableBitrate?: number | undefined;
    urgent: boolean;
  }
  let period: IPeriod;
  let adaptation: IAdaptation;
  let representation: IRepresentation;
  let parentCanceller: TaskCanceller;
  let playbackObserver: ReturnType<
    typeof makeReadyOnlyPlaybackObserver<IPlaybackObservation>
  >;
  let manifestUpdateListener: ((updates: IPeriodsUpdateResult) => void) | undefined;

  beforeEach(() => {
    manifest = new DummyManifest();
    period = new DummyPeriod({ id: "period-1", start: 0, end: 100 });
    adaptation = new DummyAdaptation({ id: "adaptation-1", type: "video" });
    representation = new DummyRepresentation({ id: "rep-1", bitrate: 1000 });
    parentCanceller = new TaskCanceller("test");
    manifestUpdateListener = undefined;
    const initialObservation: IPlaybackObservation = {
      position: new DummyObservationPosition({
        getPolled: () => 10,
        getWanted: () => 10,
      }),
      paused: { last: false, pending: undefined },
      speed: 1,
      canStream: true,
      bufferGap: 5,
      duration: 100,
      maximumPosition: 100,
    };
    playbackObserver = makeReadyOnlyPlaybackObserver(initialObservation);
    vi.spyOn(playbackObserver.observer, "getCurrentTime").mockReturnValue(10);
    vi.spyOn(playbackObserver.observer, "getReadyState").mockReturnValue(4);
    vi.spyOn(manifest, "addEventListener").mockImplementation((eventName, listener) => {
      if (eventName === "manifestUpdate") {
        manifestUpdateListener = (updates) => {
          listener(updates);
        };
      }
    });
    mockGetRepresentationsSwitchingStrategy.mockReset();
    mockRepresentationStream.mockReset();
    mockCancellableSleep.mockReset();
    mockFormatError.mockReset();
    mockCancellableSleep.mockResolvedValue(undefined);
    mockFormatError.mockImplementation((err: Error) => err);
  });

  afterEach(() => {
    parentCanceller.cancel("cleanup");
    playbackObserver.reset();
    vi.resetAllMocks();
  });

  // Test an actual complex issue we had at some point
  it("should ignore cancellation errors from a superseded representation choice", async () => {
    let resolve!: (value: undefined | PromiseLike<undefined>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<undefined>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const firstRemoval = { promise, resolve, reject };
    const representations = new SharedReference<IRepresentationsChoice>({
      switchingMode: "direct",
      representationIds: ["rep-1"],
    });
    const { callbacks } = createCallbacks();
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const removeBuffer = vi
      .spyOn(segmentSink, "removeBuffer")
      .mockImplementationOnce(() => firstRemoval.promise)
      .mockResolvedValue(undefined);
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "flush-buffer",
      value: [{ start: 0, end: 1 }],
    });

    AdaptationStream(
      createArgs({
        representations,
        segmentSink,
        estimateRefValue: { representation: null, bitrate: undefined, urgent: false },
      }),
      callbacks,
      parentCanceller.signal,
    );

    expect(removeBuffer).toHaveBeenCalledTimes(1);

    representations.setValue({
      switchingMode: "direct",
      representationIds: ["rep-1", "rep-2"],
    });
    expect(removeBuffer).toHaveBeenCalledTimes(2);

    firstRemoval.reject(new CancellationError("old choice", "cancelled"));
    await Promise.resolve();
    await Promise.resolve();

    expect(callbacks.error).not.toHaveBeenCalled();
  });

  it("should not ignore non-cancellation errors from a superseded representation choice", async () => {
    let resolve!: (value: undefined | PromiseLike<undefined>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<undefined>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const firstRemoval = { promise, resolve, reject };
    const representations = new SharedReference<IRepresentationsChoice>({
      switchingMode: "direct",
      representationIds: ["rep-1"],
    });
    const { callbacks } = createCallbacks();
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const removeBuffer = vi
      .spyOn(segmentSink, "removeBuffer")
      .mockImplementationOnce(() => firstRemoval.promise)
      .mockResolvedValue(undefined);
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "flush-buffer",
      value: [{ start: 0, end: 1 }],
    });

    AdaptationStream(
      createArgs({
        representations,
        segmentSink,
        estimateRefValue: { representation: null, bitrate: undefined, urgent: false },
      }),
      callbacks,
      parentCanceller.signal,
    );

    expect(removeBuffer).toHaveBeenCalledTimes(1);

    representations.setValue({
      switchingMode: "direct",
      representationIds: ["rep-1", "rep-2"],
    });
    expect(removeBuffer).toHaveBeenCalledTimes(2);

    firstRemoval.reject(new Error("old choice"));
    await Promise.resolve();
    await Promise.resolve();

    expect(callbacks.error).toHaveBeenCalled();
  });

  it("should keep requesting a media-source reload until the switch is cancelled", async () => {
    const { callbacks, waitingMediaSourceReload } = createCallbacks();
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "needs-reload",
      value: undefined,
    });

    AdaptationStream(
      createArgs({
        estimateRefValue: { representation: null, bitrate: undefined, urgent: false },
      }),
      callbacks,
      parentCanceller.signal,
    );

    await Promise.resolve();
    expect(waitingMediaSourceReload).toHaveBeenCalledTimes(1);

    playbackObserver.emit({
      position: new DummyObservationPosition({
        getPolled: () => 11,
        getWanted: () => 11,
      }),
      paused: { last: false, pending: undefined },
      speed: 1,
      canStream: true,
      bufferGap: 5,
      duration: 100,
      maximumPosition: 100,
    });
    await Promise.resolve();

    expect(waitingMediaSourceReload).toHaveBeenCalledTimes(2);
  });

  it("should reduce infinite buffer goals to 5 minutes before applying the ratio", async () => {
    const { callbacks } = createCallbacks();
    const observedBufferGoals: number[] = [];
    let representationStreamCallCount = 0;

    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });
    mockFormatError.mockReturnValue({ code: "BUFFER_FULL_ERROR" });
    mockRepresentationStream.mockImplementation(
      (
        args: { options: { bufferGoal: SharedReference<number> } },
        repCallbacks: IRepresentationStreamCallbacks,
      ) => {
        representationStreamCallCount++;
        observedBufferGoals.push(args.options.bufferGoal.getValue());
        if (representationStreamCallCount === 1) {
          repCallbacks.error(new Error("buffer full"));
        }
      },
    );

    AdaptationStream(
      createArgs({
        estimateRefValue: {
          representation,
          bitrate: undefined,
          knownStableBitrate: undefined,
          urgent: false,
        },
        wantedBufferAhead: new SharedReference(Infinity),
      }),
      callbacks,
      parentCanceller.signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(observedBufferGoals).toEqual([Infinity, 210]);
  });

  it("should create a representation stream directly on a continue strategy", () => {
    const { callbacks, representationChange } = createCallbacks();
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });

    AdaptationStream(createArgs({}), callbacks, parentCanceller.signal);

    expect(mockRepresentationStream).toHaveBeenCalledTimes(1);
    expect(representationChange).toHaveBeenCalledWith({
      type: "video",
      adaptation,
      period,
      representation,
    });
  });

  it("should not create a representation stream when the estimate selects no representation", () => {
    const { callbacks, representationChange } = createCallbacks();
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });

    AdaptationStream(
      createArgs({
        estimateRefValue: { representation: null, bitrate: undefined, urgent: false },
      }),
      callbacks,
      parentCanceller.signal,
    );

    expect(mockRepresentationStream).not.toHaveBeenCalled();
    expect(representationChange).not.toHaveBeenCalled();
  });

  it("should clean buffers without flushing when strategy type is clean-buffer", async () => {
    const { callbacks, needsBufferFlush } = createCallbacks();
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const removeBuffer = vi
      .spyOn(segmentSink, "removeBuffer")
      .mockResolvedValue(undefined);
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "clean-buffer",
      value: [
        { start: 1, end: 2 },
        { start: 3, end: 4 },
      ],
    });

    AdaptationStream(
      createArgs({
        segmentSink,
      }),
      callbacks,
      parentCanceller.signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(removeBuffer).toHaveBeenNthCalledWith(1, 1, 2);
    expect(removeBuffer).toHaveBeenNthCalledWith(2, 3, 4);
    expect(needsBufferFlush).not.toHaveBeenCalled();
    expect(mockRepresentationStream).toHaveBeenCalledTimes(1);
  });

  it("should emit bitrate changes only when the estimate changes to a defined bitrate", () => {
    const { callbacks, bitrateEstimateChange } = createCallbacks();
    const estimates = new SharedReference<IEstimate>({
      representation,
      bitrate: undefined,
      knownStableBitrate: undefined,
      urgent: false,
    });
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });

    AdaptationStream(
      createArgs({
        representationEstimator: createRepresentationEstimator(estimates),
      }),
      callbacks,
      parentCanceller.signal,
    );

    estimates.setValue({
      representation,
      bitrate: 100,
      knownStableBitrate: 120,
      urgent: false,
    });
    estimates.setValue({
      representation,
      bitrate: 100,
      knownStableBitrate: 130,
      urgent: false,
    });
    estimates.setValue({
      representation,
      bitrate: 150,
      knownStableBitrate: 160,
      urgent: false,
    });

    expect(bitrateEstimateChange).toHaveBeenNthCalledWith(1, {
      type: "video",
      bitrate: 100,
    });
    expect(bitrateEstimateChange).toHaveBeenNthCalledWith(2, {
      type: "video",
      bitrate: 150,
    });
    expect(bitrateEstimateChange).toHaveBeenCalledTimes(2);
  });

  it("should update fast-switch threshold from stable bitrate estimates", () => {
    const { callbacks } = createCallbacks();
    const estimates = new SharedReference<IEstimate>({
      representation,
      bitrate: 100,
      knownStableBitrate: 120,
      urgent: false,
    });
    let fastSwitchThresholdRef: SharedReference<number | undefined> | undefined;
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });
    mockRepresentationStream.mockImplementation(
      (args: {
        options: { fastSwitchThreshold: SharedReference<number | undefined> };
      }) => {
        fastSwitchThresholdRef = args.options.fastSwitchThreshold;
      },
    );

    AdaptationStream(
      createArgs({
        options: {
          drmSystemId: undefined,
          enableFastSwitching: true,
        },
        representationEstimator: createRepresentationEstimator(estimates),
      }),
      callbacks,
      parentCanceller.signal,
    );

    expect(fastSwitchThresholdRef?.getValue()).toBe(120);

    estimates.setValue({
      representation,
      bitrate: 130,
      knownStableBitrate: 240,
      urgent: false,
    });

    expect(fastSwitchThresholdRef?.getValue()).toBe(240);
  });

  it("should update segment queue interruption state from playback observations", () => {
    const { callbacks } = createCallbacks();
    const segmentQueueCreator = new DummySegmentQueueCreator();
    let interruptionRef: SharedReference<boolean> | undefined;
    vi.spyOn(segmentQueueCreator, "createSegmentQueue").mockImplementation(
      (_bufferType, _eventListeners, isMediaSegmentQueueInterrupted) => {
        interruptionRef = isMediaSegmentQueueInterrupted;
        return new DummySegmentQueue();
      },
    );
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });

    AdaptationStream(
      createArgs({
        segmentQueueCreator,
      }),
      callbacks,
      parentCanceller.signal,
    );

    if (interruptionRef === undefined) {
      throw new Error("Missing interruption reference");
    }
    expect(interruptionRef.getValue()).toBe(false);

    playbackObserver.emit({
      position: new DummyObservationPosition({
        getPolled: () => 12,
        getWanted: () => 12,
      }),
      paused: { last: false, pending: undefined },
      speed: 1,
      canStream: false,
      bufferGap: 5,
      duration: 100,
      maximumPosition: 100,
    });
    expect(interruptionRef.getValue()).toBe(true);

    playbackObserver.emit({
      position: new DummyObservationPosition({
        getPolled: () => 13,
        getWanted: () => 13,
      }),
      paused: { last: false, pending: undefined },
      speed: 1,
      canStream: true,
      bufferGap: 5,
      duration: 100,
      maximumPosition: 100,
    });
    expect(interruptionRef.getValue()).toBe(false);
  });

  it("should propagate urgent and non-urgent estimate changes to the terminate reference", () => {
    const { callbacks } = createCallbacks();
    const otherRepresentation = new DummyRepresentation({ id: "rep-2", bitrate: 2000 });
    const estimates = new SharedReference<IEstimate>({
      representation,
      bitrate: 100,
      knownStableBitrate: undefined,
      urgent: false,
    });
    let terminateRef: SharedReference<unknown> | undefined;
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });
    mockRepresentationStream.mockImplementation(
      (args: { terminate: SharedReference<unknown> }) => {
        terminateRef = args.terminate;
      },
    );

    AdaptationStream(
      createArgs({
        representationEstimator: createRepresentationEstimator(estimates),
      }),
      callbacks,
      parentCanceller.signal,
    );

    estimates.setValue({
      representation: otherRepresentation,
      bitrate: 200,
      knownStableBitrate: undefined,
      urgent: false,
    });
    expect(terminateRef?.getValue()).toEqual({
      urgent: false,
      reason: "Non-urgent Representation switch",
    });

    estimates.setValue({
      representation,
      bitrate: 110,
      knownStableBitrate: undefined,
      urgent: false,
    });
    estimates.setValue({
      representation: otherRepresentation,
      bitrate: 300,
      knownStableBitrate: undefined,
      urgent: true,
    });
    expect(terminateRef?.getValue()).toEqual({
      urgent: true,
      reason: "Urgent Representation switch",
    });
  });

  it("should recreate the representation stream when the previous one terminates", () => {
    const { callbacks, representationChange } = createCallbacks();
    const otherRepresentation = new DummyRepresentation({ id: "rep-2", bitrate: 2000 });
    const estimates = new SharedReference<IEstimate>({
      representation,
      bitrate: 100,
      knownStableBitrate: undefined,
      urgent: false,
    });
    const streamCallbacks: IRepresentationStreamCallbacks[] = [];
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });
    mockRepresentationStream.mockImplementation(
      (_args: unknown, repCallbacks: IRepresentationStreamCallbacks) => {
        streamCallbacks.push(repCallbacks);
      },
    );

    AdaptationStream(
      createArgs({
        representationEstimator: createRepresentationEstimator(estimates),
      }),
      callbacks,
      parentCanceller.signal,
    );

    estimates.setValue({
      representation: otherRepresentation,
      bitrate: 200,
      knownStableBitrate: undefined,
      urgent: false,
    });
    streamCallbacks[0].terminating();

    expect(mockRepresentationStream).toHaveBeenCalledTimes(2);
    expect(representationChange).toHaveBeenNthCalledWith(2, {
      type: "video",
      adaptation,
      period,
      representation: otherRepresentation,
    });
  });

  it("should forward added segments to the ABR callbacks", () => {
    const { callbacks } = createCallbacks();
    const addedSegment = vi.fn();
    const payload = {
      content: { period, adaptation, representation },
      segment: createSegment({ time: 0, duration: 4 }),
      buffered: [{ start: 0, end: 4 }],
    };
    let streamCallbacks: IRepresentationStreamCallbacks | undefined;
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });
    mockRepresentationStream.mockImplementation(
      (_args: unknown, repCallbacks: IRepresentationStreamCallbacks) => {
        streamCallbacks = repCallbacks;
      },
    );

    AdaptationStream(
      createArgs({
        representationEstimator: createRepresentationEstimator(
          new SharedReference<IEstimate>({
            representation,
            bitrate: 100,
            knownStableBitrate: undefined,
            urgent: false,
          }),
          { addedSegment },
        ),
      }),
      callbacks,
      parentCanceller.signal,
    );

    streamCallbacks?.addedSegment(payload);

    expect(addedSegment).toHaveBeenCalledWith(payload);
  });

  it("should forward non-buffer-full errors to the adaptation callbacks", () => {
    const { callbacks } = createCallbacks();
    let streamCallbacks: IRepresentationStreamCallbacks | undefined;
    const fatalError = new Error("fatal");
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });
    mockRepresentationStream.mockImplementation(
      (_args: unknown, repCallbacks: IRepresentationStreamCallbacks) => {
        streamCallbacks = repCallbacks;
      },
    );
    mockFormatError.mockReturnValue({ code: "OTHER_ERROR" });

    AdaptationStream(createArgs({}), callbacks, parentCanceller.signal);

    streamCallbacks?.error(fatalError);

    expect(callbacks.error).toHaveBeenCalledWith(fatalError);
  });

  it("should stop retrying buffer-full errors once the reduced goal is too small", () => {
    const { callbacks } = createCallbacks();
    let streamCallbacks: IRepresentationStreamCallbacks | undefined;
    const formattedError = { code: "BUFFER_FULL_ERROR", reason: "full" };
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });
    mockRepresentationStream.mockImplementation(
      (_args: unknown, repCallbacks: IRepresentationStreamCallbacks) => {
        streamCallbacks = repCallbacks;
      },
    );
    mockFormatError.mockReturnValue(formattedError);

    AdaptationStream(
      createArgs({
        wantedBufferAhead: new SharedReference(2),
      }),
      callbacks,
      parentCanceller.signal,
    );

    streamCallbacks?.error(new Error("buffer full"));

    expect(mockCancellableSleep).not.toHaveBeenCalled();
    expect(callbacks.error).toHaveBeenCalledWith(formattedError);
  });

  it("should request a reload when the active representation is removed from the manifest", () => {
    const { callbacks, waitingMediaSourceReload } = createCallbacks();
    const estimates = new SharedReference<IEstimate>({
      representation,
      bitrate: 100,
      knownStableBitrate: undefined,
      urgent: false,
    });
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });

    AdaptationStream(
      createArgs({
        representationEstimator: createRepresentationEstimator(estimates),
      }),
      callbacks,
      parentCanceller.signal,
    );

    if (manifestUpdateListener === undefined) {
      throw new Error("Missing manifestUpdate listener");
    }
    manifestUpdateListener({
      updatedPeriods: [
        {
          period: {
            id: period.id,
            start: period.start,
            end: period.end,
            duration: undefined,
            streamEvents: [],
          },
          result: {
            updatedAdaptations: [
              {
                adaptation: adaptation.id,
                trackType: "video",
                updatedRepresentations: [],
                removedRepresentations: [representation.id],
                addedRepresentations: [],
              },
            ],
            removedAdaptations: [],
            addedAdaptations: [],
            updatedThumbnailTracks: [],
            removedThumbnailTracks: [],
            addedThumbnailTracks: [],
          },
        },
      ],
      addedPeriods: [],
      removedPeriods: [],
    });

    expect(waitingMediaSourceReload).toHaveBeenCalledWith({
      bufferType: "video",
      period,
      timeOffset: 0,
      stayInPeriod: true,
    });
  });

  it("should not request a reload for manifest updates unrelated to the active representation", () => {
    const { callbacks, waitingMediaSourceReload } = createCallbacks();
    mockGetRepresentationsSwitchingStrategy.mockReturnValue({
      type: "continue",
      value: undefined,
    });

    AdaptationStream(createArgs({}), callbacks, parentCanceller.signal);

    if (manifestUpdateListener === undefined) {
      throw new Error("Missing manifestUpdate listener");
    }
    manifestUpdateListener({
      updatedPeriods: [
        {
          period: {
            id: period.id,
            start: period.start,
            end: period.end,
            duration: undefined,
            streamEvents: [],
          },
          result: {
            updatedAdaptations: [
              {
                adaptation: adaptation.id,
                trackType: "video",
                updatedRepresentations: [],
                removedRepresentations: ["other"],
                addedRepresentations: [],
              },
            ],
            removedAdaptations: [],
            addedAdaptations: [],
            updatedThumbnailTracks: [],
            removedThumbnailTracks: [],
            addedThumbnailTracks: [],
          },
        },
      ],
      addedPeriods: [],
      removedPeriods: [],
    });

    expect(waitingMediaSourceReload).not.toHaveBeenCalled();
  });

  function createArgs({
    representations = new SharedReference<IRepresentationsChoice>({
      switchingMode: "direct",
      representationIds: ["rep-1"],
    }),
    segmentSink = new DummySegmentSink({ bufferType: "video" }),
    estimateRefValue = {
      representation,
      bitrate: undefined,
      knownStableBitrate: undefined,
      urgent: false,
    },
    wantedBufferAhead = new SharedReference(30),
    representationEstimator = createRepresentationEstimator(
      new SharedReference(estimateRefValue),
    ),
    segmentQueueCreator = createSegmentQueueCreator(),
    options = {
      drmSystemId: undefined,
      enableFastSwitching: false,
    },
  }: {
    representations?: SharedReference<IRepresentationsChoice>;
    segmentSink?: SegmentSink;
    estimateRefValue?: IEstimate;
    wantedBufferAhead?: SharedReference<number>;
    representationEstimator?: IRepresentationEstimator;
    segmentQueueCreator?: SegmentQueueCreator;
    options?: {
      drmSystemId: string | undefined;
      enableFastSwitching: boolean;
    };
  }) {
    return {
      playbackObserver: playbackObserver.observer,
      content: {
        manifest,
        period,
        adaptation,
        representations,
      },
      options,
      representationEstimator,
      segmentSink,
      segmentQueueCreator,
      wantedBufferAhead,
      maxVideoBufferSize: new SharedReference(Infinity),
    };
  }

  function createRepresentationEstimator(
    estimates: SharedReference<IEstimate>,
    callbacks: Partial<IRepresentationEstimatorCallbacks> = {},
  ): IRepresentationEstimator {
    return (
      _context,
      _currentRepresentation,
      _representations,
      _playbackObserver,
      _stopAllEstimates,
    ) => ({
      estimates,
      callbacks: {
        requestBegin: vi.fn(),
        requestEnd: vi.fn(),
        requestProgress: vi.fn(),
        metrics: vi.fn(),
        addedSegment: vi.fn(),
        ...callbacks,
      },
    });
  }

  function createSegmentQueueCreator(): SegmentQueueCreator {
    const segmentQueueCreator = new DummySegmentQueueCreator();
    vi.spyOn(segmentQueueCreator, "createSegmentQueue").mockImplementation(() => {
      return new DummySegmentQueue();
    });
    return segmentQueueCreator;
  }

  function createCallbacks(): {
    callbacks: IAdaptationStreamCallbacks;
    bitrateEstimateChange: ReturnType<typeof vi.fn>;
    needsBufferFlush: ReturnType<typeof vi.fn>;
    representationChange: ReturnType<typeof vi.fn>;
    waitingMediaSourceReload: ReturnType<typeof vi.fn>;
  } {
    const bitrateEstimateChange = vi.fn();
    const needsBufferFlush = vi.fn();
    const representationChange = vi.fn();
    const waitingMediaSourceReload = vi.fn();
    return {
      bitrateEstimateChange,
      needsBufferFlush,
      representationChange,
      waitingMediaSourceReload,
      callbacks: {
        bitrateEstimateChange,
        representationChange,
        waitingMediaSourceReload,
        needsBufferFlush,
        streamStatusUpdate: vi.fn(),
        encryptionDataEncountered: vi.fn(),
        manifestMightBeOufOfSync: vi.fn(),
        needsManifestRefresh: vi.fn(),
        inbandEvent: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
      },
    };
  }
});

function notImplemented(name: string): () => never {
  return () => {
    throw new Error(`${name} not implemented`);
  };
}
