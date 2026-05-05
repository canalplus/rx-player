import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DummyAdaptation,
  DummyManifest,
  DummyPeriod,
  DummyRepresentation,
  createSegment,
} from "../../../../manifest/classes/__tests__/mocks.ts";
import type { IManifestEvents } from "../../../../manifest/classes/manifest.ts";
import type { IPeriodsUpdateResult } from "../../../../manifest/classes/update_periods.ts";
import type {
  IManifest,
  IPeriod,
  IUpdatedRepresentationInfo,
} from "../../../../manifest/index.ts";
import {
  DummyObservationPosition,
  makeReadyOnlyPlaybackObserver,
} from "../../../../playback_observer/__tests__/mocks.ts";
import EventEmitter from "../../../../utils/event_emitter.ts";
import SharedReference from "../../../../utils/reference.ts";
import type { CancellationSignal } from "../../../../utils/task_canceller.ts";
import TaskCanceller from "../../../../utils/task_canceller.ts";
import { makeMockedClass } from "../../../../utils/test-utils.ts";
import type { IRepresentationEstimator } from "../../../adaptive/index.ts";
import type { SegmentQueueCreator } from "../../../fetchers/index.ts";
import { DummySegmentSink } from "../../../segment_sinks/__tests__/mocks.ts";
import { ChunkStatus } from "../../../segment_sinks/index.ts";
import type { IBufferedChunk, SegmentSink } from "../../../segment_sinks/index.ts";
import type SegmentSinksStore from "../../../segment_sinks/index.ts";
import type {
  IAdaptationChoice,
  IWaitingMediaSourceReloadPayload,
} from "../../adaptation/index.ts";
import type {
  IPeriodStreamArguments,
  IPeriodStreamCallbacks,
  IPeriodStreamReadyPayload,
} from "../../period/index.ts";
import type { IStreamStatusPayload } from "../../representation/index.ts";
import StreamOrchestrator from "../stream_orchestrator.ts";
import type {
  IPeriodStreamClearedPayload,
  IStreamOrchestratorCallbacks,
  IStreamOrchestratorPlaybackObservation,
} from "../stream_orchestrator.ts";

type IPeriodStreamFunction = (
  args: IPeriodStreamArguments,
  callbacks: IPeriodStreamCallbacks,
  cancelSignal: CancellationSignal,
) => void;

const { mockPeriodStream, queuedMicrotasks } = vi.hoisted(() => {
  const microtasks: Array<() => void> = [];
  return {
    mockPeriodStream: vi.fn<IPeriodStreamFunction>(),
    queuedMicrotasks: microtasks,
  };
});

vi.mock("../../period", () => ({
  default: mockPeriodStream,
}));

vi.mock("../../../../utils/queue_microtask", () => ({
  default: (fn: () => void) => {
    queuedMicrotasks.push(fn);
  },
}));

const DummySegmentSinksStore = makeMockedClass<SegmentSinksStore>(
  {
    getBufferTypes: notImplemented("getBufferTypes"),
    getNativeBufferTypes: notImplemented("getNativeBufferTypes"),
    getStatus: notImplemented("getStatus"),
    waitForUsableBuffers: notImplemented("waitForUsableBuffers"),
    disableSegmentSink: notImplemented("disableSegmentSink"),
    createSegmentSink: notImplemented("createSegmentSink"),
    disposeSegmentSink: notImplemented("disposeSegmentSink"),
    disposeAll: notImplemented("disposeAll"),
    getSegmentSinksMetrics: notImplemented("getSegmentSinksMetrics"),
  },
  {},
);

const DummySegmentQueueCreator = makeMockedClass<SegmentQueueCreator>(
  {
    createSegmentQueue: notImplemented("createSegmentQueue"),
  },
  {},
);

describe("StreamOrchestrator", () => {
  let manifest: IManifest;
  let period: IPeriod;
  let nextPeriod: IPeriod;
  let manifestEventEmitter: TestManifestEventEmitter;
  let playbackObserver: ReturnType<
    typeof makeReadyOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>
  >;
  let segmentSink: SegmentSink;
  let removeBufferSpy: ReturnType<typeof vi.fn<SegmentSink["removeBuffer"]>>;
  let segmentSinksStore: SegmentSinksStore;
  let callbacks: IStreamOrchestratorCallbacks;
  let periodStreamClearedSpy: ReturnType<
    typeof vi.fn<(payload: IPeriodStreamClearedPayload) => void>
  >;
  let lockedStreamSpy: ReturnType<
    typeof vi.fn<IStreamOrchestratorCallbacks["lockedStream"]>
  >;
  let needsMediaSourceReloadSpy: ReturnType<
    typeof vi.fn<IStreamOrchestratorCallbacks["needsMediaSourceReload"]>
  >;
  let streamStatusUpdateSpy: ReturnType<
    typeof vi.fn<IStreamOrchestratorCallbacks["streamStatusUpdate"]>
  >;
  let needsDecipherabilityFlushSpy: ReturnType<
    typeof vi.fn<IStreamOrchestratorCallbacks["needsDecipherabilityFlush"]>
  >;
  let periodStreamCalls: IPeriodStreamCall[];
  let orchestratorCanceller: TaskCanceller;
  let representationEstimator: IRepresentationEstimator;
  let segmentQueueCreator: SegmentQueueCreator;

  beforeEach(() => {
    queuedMicrotasks.length = 0;
    mockPeriodStream.mockReset();
    periodStreamCalls = [];

    period = new DummyPeriod({ id: "period-1", start: 0, end: 10 });
    nextPeriod = new DummyPeriod({ id: "period-2", start: 10, end: 20 });
    manifestEventEmitter = new TestManifestEventEmitter();
    manifest = new DummyManifest({
      periods: [period, nextPeriod],
      addEventListener: manifestEventEmitter.addEventListener.bind(manifestEventEmitter),
      removeEventListener:
        manifestEventEmitter.removeEventListener.bind(manifestEventEmitter),
    });

    vi.spyOn(manifest, "getPeriodForTime").mockImplementation((time) => {
      if (time < 10) {
        return period;
      }
      if (time < 20) {
        return nextPeriod;
      }
      return undefined;
    });
    vi.spyOn(manifest, "getNextPeriod").mockReturnValue(undefined);

    playbackObserver =
      makeReadyOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>({
        position: new DummyObservationPosition({
          getWanted: () => 5,
          getPolled: () => 5,
        }),
        paused: { last: false, pending: undefined },
        duration: 20,
        readyState: 4,
        speed: 1,
        maximumPosition: 20,
        buffered: { audio: null, video: null, text: null },
        canStream: true,
      });

    removeBufferSpy = vi.fn<SegmentSink["removeBuffer"]>().mockResolvedValue([]);
    segmentSink = new DummySegmentSink({
      bufferType: "video",
      getPendingOperations: () => [],
      getLastKnownInventory: () => [makeBufferedChunk()],
      removeBuffer: removeBufferSpy,
    });

    segmentSinksStore = new DummySegmentSinksStore({
      getBufferTypes: () => ["video"],
      getStatus: () => ({ type: "initialized", value: segmentSink }),
    });

    ({
      callbacks,
      periodStreamClearedSpy,
      lockedStreamSpy,
      needsMediaSourceReloadSpy,
      streamStatusUpdateSpy,
      needsDecipherabilityFlushSpy,
    } = createCallbacks());
    orchestratorCanceller = new TaskCanceller("test");
    representationEstimator = () => {
      throw new Error("representationEstimator not implemented");
    };
    segmentQueueCreator = new DummySegmentQueueCreator();
    mockPeriodStream.mockImplementation((args, orchestratorCallbacks, signal) => {
      periodStreamCalls.push({
        args,
        callbacks: orchestratorCallbacks,
        streamCancellerSignal: signal,
      });
    });
  });

  afterEach(() => {
    orchestratorCanceller.cancel("cleanup");
    playbackObserver.reset();
    vi.resetAllMocks();
  });

  it("should ignore stale decipherability restarts once a newer restart supersedes them", async () => {
    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );
    expect(mockPeriodStream).toHaveBeenCalledTimes(1);

    const updates = [makeDecipherabilityUpdate()];
    manifestEventEmitter.emit("decipherabilityUpdate", updates);
    manifestEventEmitter.emit("decipherabilityUpdate", updates);
    await Promise.resolve();
    await Promise.resolve();

    expect(queuedMicrotasks).toHaveLength(2);

    while (queuedMicrotasks.length > 0) {
      const task = queuedMicrotasks.shift();
      task?.();
    }
    await Promise.resolve();

    expect(mockPeriodStream).toHaveBeenCalledTimes(2);
  });

  it("should clear an already-created next PeriodStream when a manifest update removes it", () => {
    let currentNextPeriod: IPeriod | null = nextPeriod;
    vi.spyOn(manifest, "getPeriodAfter").mockImplementation((askedPeriod) => {
      return askedPeriod.id === period.id ? currentNextPeriod : null;
    });

    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );
    expect(periodStreamCalls).toHaveLength(1);

    periodStreamCalls[0].callbacks.streamStatusUpdate(makeFinishedLoadingStatus(period));
    expect(periodStreamCalls).toHaveLength(2);

    currentNextPeriod = null;
    manifestEventEmitter.emit(
      "manifestUpdate",
      makeManifestUpdateRemovingNextPeriod(nextPeriod),
    );

    expect(periodStreamCalls[1].streamCancellerSignal.isCancelled()).toBe(true);
    expect(periodStreamClearedSpy).toHaveBeenCalledWith({
      type: "video",
      manifest,
      period: nextPeriod,
    });
  });

  it("should create one PeriodStream per available buffer type", () => {
    segmentSinksStore = new DummySegmentSinksStore({
      getBufferTypes: () => ["audio", "video"],
      getStatus: () => ({ type: "initialized", value: segmentSink }),
    });

    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );

    expect(periodStreamCalls).toHaveLength(2);
    expect(periodStreamCalls.map((call) => call.args.bufferType)).toEqual([
      "audio",
      "video",
    ]);
  });

  it("should lock waiting media source reloads for non-current periods", () => {
    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );

    periodStreamCalls[0].callbacks.waitingMediaSourceReload(
      makeWaitingMediaSourceReloadPayload(nextPeriod, false),
    );

    expect(lockedStreamSpy).toHaveBeenCalledWith({
      bufferType: "video",
      period: nextPeriod,
    });
    expect(needsMediaSourceReloadSpy).not.toHaveBeenCalled();
  });

  it("should request a media source reload for the current period with bounded positions", () => {
    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );
    periodStreamCalls[0].callbacks.periodStreamReady(
      makePeriodStreamReadyPayload(period),
    );

    periodStreamCalls[0].callbacks.waitingMediaSourceReload(
      makeWaitingMediaSourceReloadPayload(period, true),
    );

    expect(needsMediaSourceReloadSpy).toHaveBeenCalledWith({
      timeOffset: 12,
      minimumPosition: period.start,
      maximumPosition: period.end,
    });
    expect(lockedStreamSpy).not.toHaveBeenCalled();
  });

  it("should restart from the wanted period when playback goes out of the current period list", () => {
    vi.spyOn(manifest, "getPeriodAfter").mockReturnValue(nextPeriod);

    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );
    periodStreamCalls[0].callbacks.periodStreamReady(
      makePeriodStreamReadyPayload(period),
    );

    playbackObserver.emit(makeObservationAt(15));

    expect(periodStreamClearedSpy).toHaveBeenCalledWith({
      type: "video",
      manifest,
      period,
    });
    expect(periodStreamCalls[0].streamCancellerSignal.isCancelled()).toBe(true);
    expect(periodStreamCalls).toHaveLength(2);
    expect(periodStreamCalls[1].args.content.period).toBe(nextPeriod);
  });

  it("should destroy the prefetched next PeriodStream when the current one becomes active again", () => {
    vi.spyOn(manifest, "getPeriodAfter").mockReturnValue(nextPeriod);

    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );

    periodStreamCalls[0].callbacks.streamStatusUpdate(makeFinishedLoadingStatus(period));
    expect(periodStreamCalls).toHaveLength(2);

    periodStreamCalls[0].callbacks.streamStatusUpdate(makeActiveStatus(period));

    expect(periodStreamClearedSpy).toHaveBeenCalledWith({
      type: "video",
      manifest,
      period: nextPeriod,
    });
    expect(periodStreamCalls[1].streamCancellerSignal.isCancelled()).toBe(true);
    expect(streamStatusUpdateSpy).toHaveBeenLastCalledWith(makeActiveStatus(period));
  });

  it("should ask for media source reload when the current period is removed from the manifest", () => {
    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );

    manifestEventEmitter.emit("manifestUpdate", {
      addedPeriods: [],
      removedPeriods: [{ id: period.id, start: period.start, end: period.end }],
      updatedPeriods: [],
    });
    expect(queuedMicrotasks).toHaveLength(1);

    queuedMicrotasks.shift()?.();

    expect(needsMediaSourceReloadSpy).toHaveBeenCalledWith({
      timeOffset: 0,
      minimumPosition: undefined,
      maximumPosition: undefined,
    });
  });

  it("should clear a PeriodStream once playback moves beyond its period end", () => {
    const boundedPeriod = new DummyPeriod({
      id: "period-bounded",
      start: 0,
      end: 10,
      containsTime: () => false,
    });
    manifest = new DummyManifest({
      periods: [boundedPeriod, nextPeriod],
      addEventListener: manifestEventEmitter.addEventListener.bind(manifestEventEmitter),
      removeEventListener:
        manifestEventEmitter.removeEventListener.bind(manifestEventEmitter),
    });
    vi.spyOn(manifest, "getPeriodForTime").mockReturnValue(boundedPeriod);
    vi.spyOn(manifest, "getNextPeriod").mockReturnValue(undefined);
    vi.spyOn(manifest, "getPeriodAfter").mockReturnValue(nextPeriod);

    startOrchestrator(
      manifest,
      boundedPeriod,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );

    playbackObserver.emit(makeObservationAt(12));

    expect(periodStreamClearedSpy).toHaveBeenCalledWith({
      type: "video",
      manifest,
      period: boundedPeriod,
    });
    expect(periodStreamCalls[0].streamCancellerSignal.isCancelled()).toBe(true);
  });

  it("should remove undecipherable ranges, request a flush, and restart the stream", async () => {
    startOrchestrator(
      manifest,
      period,
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );
    periodStreamCalls[0].callbacks.periodStreamReady(
      makePeriodStreamReadyPayload(period),
    );

    manifestEventEmitter.emit("decipherabilityUpdate", [makeDecipherabilityUpdate()]);
    await Promise.resolve();
    expect(periodStreamClearedSpy).toHaveBeenCalledWith({
      type: "video",
      manifest,
      period,
    });
    expect(removeBufferSpy).toHaveBeenCalledWith(0, 1);
    expect(queuedMicrotasks).toHaveLength(1);

    queuedMicrotasks.shift()?.();

    expect(needsDecipherabilityFlushSpy).toHaveBeenCalledTimes(1);
    expect(periodStreamCalls).toHaveLength(2);
    expect(periodStreamCalls[1].args.content.period).toBe(period);
  });
});

interface IPeriodStreamCall {
  args: IPeriodStreamArguments;
  callbacks: IPeriodStreamCallbacks;
  streamCancellerSignal: TaskCanceller["signal"];
}

class TestManifestEventEmitter extends EventEmitter<IManifestEvents> {
  public emit<TEventName extends keyof IManifestEvents>(
    eventName: TEventName,
    payload: IManifestEvents[TEventName],
  ): void {
    this.trigger(eventName, payload);
  }
}

function startOrchestrator(
  manifest: IManifest,
  initialPeriod: IPeriod,
  playbackObserver: ReturnType<
    typeof makeReadyOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>
  >,
  representationEstimator: IRepresentationEstimator,
  segmentSinksStore: SegmentSinksStore,
  segmentQueueCreator: SegmentQueueCreator,
  callbacks: IStreamOrchestratorCallbacks,
  orchestratorCanceller: TaskCanceller,
): void {
  StreamOrchestrator(
    { manifest, initialPeriod },
    playbackObserver.observer,
    representationEstimator,
    segmentSinksStore,
    segmentQueueCreator,
    {
      drmSystemId: undefined,
      enableFastSwitching: true,
      onCodecSwitch: "continue",
      wantedBufferAhead: new SharedReference(20),
      maxVideoBufferSize: new SharedReference(20),
      maxBufferAhead: new SharedReference(20),
      maxBufferBehind: new SharedReference(20),
    },
    callbacks,
    orchestratorCanceller.signal,
  );
}

function createCallbacks(): {
  callbacks: IStreamOrchestratorCallbacks;
  periodStreamClearedSpy: ReturnType<
    typeof vi.fn<(payload: IPeriodStreamClearedPayload) => void>
  >;
  lockedStreamSpy: ReturnType<typeof vi.fn<IStreamOrchestratorCallbacks["lockedStream"]>>;
  needsMediaSourceReloadSpy: ReturnType<
    typeof vi.fn<IStreamOrchestratorCallbacks["needsMediaSourceReload"]>
  >;
  streamStatusUpdateSpy: ReturnType<
    typeof vi.fn<IStreamOrchestratorCallbacks["streamStatusUpdate"]>
  >;
  needsDecipherabilityFlushSpy: ReturnType<
    typeof vi.fn<IStreamOrchestratorCallbacks["needsDecipherabilityFlush"]>
  >;
} {
  const periodStreamClearedSpy = vi.fn<(payload: IPeriodStreamClearedPayload) => void>();
  const lockedStreamSpy = vi.fn<IStreamOrchestratorCallbacks["lockedStream"]>();
  const needsMediaSourceReloadSpy =
    vi.fn<IStreamOrchestratorCallbacks["needsMediaSourceReload"]>();
  const streamStatusUpdateSpy =
    vi.fn<IStreamOrchestratorCallbacks["streamStatusUpdate"]>();
  const needsDecipherabilityFlushSpy =
    vi.fn<IStreamOrchestratorCallbacks["needsDecipherabilityFlush"]>();
  return {
    callbacks: {
      adaptationChange: vi.fn(),
      bitrateEstimateChange: vi.fn(),
      encryptionDataEncountered: vi.fn(),
      error: vi.fn(),
      inbandEvent: vi.fn(),
      lockedStream: lockedStreamSpy,
      manifestMightBeOufOfSync: vi.fn(),
      needsBufferFlush: vi.fn(),
      needsDecipherabilityFlush: needsDecipherabilityFlushSpy,
      needsManifestRefresh: vi.fn(),
      needsMediaSourceReload: needsMediaSourceReloadSpy,
      periodStreamCleared: periodStreamClearedSpy,
      periodStreamReady: vi.fn(),
      representationChange: vi.fn(),
      streamStatusUpdate: streamStatusUpdateSpy,
      warning: vi.fn(),
    },
    periodStreamClearedSpy,
    lockedStreamSpy,
    needsMediaSourceReloadSpy,
    streamStatusUpdateSpy,
    needsDecipherabilityFlushSpy,
  };
}

function makeFinishedLoadingStatus(period: IPeriod): IStreamStatusPayload {
  return {
    period,
    bufferType: "video",
    imminentDiscontinuity: null,
    hasFinishedLoading: true,
    isEmptyStream: false,
    neededSegments: [],
    position: period.start,
  };
}

function makeActiveStatus(period: IPeriod): IStreamStatusPayload {
  return {
    period,
    bufferType: "video",
    imminentDiscontinuity: null,
    hasFinishedLoading: false,
    isEmptyStream: false,
    neededSegments: [],
    position: period.start,
  };
}

function makePeriodStreamReadyPayload(period: IPeriod): IPeriodStreamReadyPayload {
  return {
    type: "video",
    manifest: new DummyManifest(),
    period,
    adaptationRef: new SharedReference<IAdaptationChoice | null | undefined>(undefined),
  };
}

function makeManifestUpdateRemovingNextPeriod(nextPeriod: IPeriod): IPeriodsUpdateResult {
  return {
    addedPeriods: [],
    removedPeriods: [{ id: nextPeriod.id, start: nextPeriod.start, end: nextPeriod.end }],
    updatedPeriods: [],
  };
}

function makeObservationAt(position: number): IStreamOrchestratorPlaybackObservation {
  return {
    position: new DummyObservationPosition({
      getWanted: () => position,
      getPolled: () => position,
    }),
    paused: { last: false, pending: undefined },
    duration: 20,
    readyState: 4,
    speed: 1,
    maximumPosition: 20,
    buffered: { audio: null, video: null, text: null },
    canStream: true,
  };
}

function makeDecipherabilityUpdate(): IUpdatedRepresentationInfo {
  return {
    manifest: new DummyManifest(),
    adaptation: new DummyAdaptation({ id: "adaptation-1", type: "video" }),
    period: new DummyPeriod({ id: "period-1", start: 0, end: 10 }),
    representation: new DummyRepresentation({
      id: "representation-1",
      decipherable: false,
    }),
  };
}

function makeWaitingMediaSourceReloadPayload(
  period: IPeriod,
  stayInPeriod: boolean,
): IWaitingMediaSourceReloadPayload {
  return {
    period,
    bufferType: "video",
    timeOffset: 12,
    stayInPeriod,
  };
}

function makeBufferedChunk(): IBufferedChunk {
  return {
    infos: {
      period: new DummyPeriod({ id: "period-1", start: 0, end: 10 }),
      adaptation: new DummyAdaptation({ id: "adaptation-1", type: "video" }),
      representation: new DummyRepresentation({ id: "representation-1" }),
      segment: createSegment({ time: 0, duration: 1, end: 1 }),
    },
    bufferedStart: 0,
    bufferedEnd: 1,
    start: 0,
    end: 1,
    insertionTs: 0,
    chunkSize: 1,
    precizeStart: true,
    precizeEnd: true,
    status: ChunkStatus.FullyLoaded,
    splitted: false,
  };
}

function notImplemented(name: string): () => never {
  return () => {
    throw new Error(`${name} not implemented`);
  };
}
