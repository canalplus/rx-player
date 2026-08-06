import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IRepresentationEstimator } from "../../../../../../src/core/adaptive/index.ts";
import type { SegmentQueueCreator } from "../../../../../../src/core/fetchers/index.ts";
import { ChunkStatus } from "../../../../../../src/core/segment_sinks/index.ts";
import type {
  IBufferedChunk,
  SegmentSink,
} from "../../../../../../src/core/segment_sinks/index.ts";
import type SegmentSinksStore from "../../../../../../src/core/segment_sinks/index.ts";
import type {
  IAdaptationChoice,
  IWaitingMediaSourceReloadPayload,
} from "../../../../../../src/core/stream/adaptation/index.ts";
import StreamOrchestrator from "../../../../../../src/core/stream/orchestrator/stream_orchestrator.ts";
import type {
  IPeriodStreamClearedPayload,
  IStreamOrchestratorCallbacks,
  IStreamOrchestratorMediaObservation,
} from "../../../../../../src/core/stream/orchestrator/stream_orchestrator.ts";
import type {
  IPeriodStreamArguments,
  IPeriodStreamCallbacks,
  IPeriodStreamReadyPayload,
} from "../../../../../../src/core/stream/period/index.ts";
import type { IStreamStatusPayload } from "../../../../../../src/core/stream/representation/index.ts";
import type { IManifestEvents } from "../../../../../../src/manifest/classes/manifest.ts";
import type { IPeriodsUpdateResult } from "../../../../../../src/manifest/classes/update_periods.ts";
import type {
  IManifest,
  IPeriod,
  IUpdatedRepresentationInfo,
} from "../../../../../../src/manifest/index.ts";
import EventEmitter from "../../../../../../src/utils/event_emitter.ts";
import SharedReference from "../../../../../../src/utils/reference.ts";
import TaskCanceller from "../../../../../../src/utils/task_canceller.ts";
import type { CancellationSignal } from "../../../../../../src/utils/task_canceller.ts";
import {
  DummyAdaptation,
  DummyManifest,
  DummyPeriod,
  DummyRepresentation,
  createSegment,
} from "../../../../mocks/manifest.ts";
import {
  DummyObservationPosition,
  makeReadyOnlyMediaElementMonitor,
} from "../../../../mocks/media_element_monitor.ts";
import { DummySegmentSink } from "../../../../mocks/segment_sinks.ts";
import { makeMockedClass } from "../../../../mocks/utils.ts";

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

vi.mock("../../../../../../src/core/stream/period", () => ({
  default: mockPeriodStream,
}));

vi.mock("../../../../../../src/utils/queue_microtask", () => ({
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
  let mediaElementMonitor: ReturnType<
    typeof makeReadyOnlyMediaElementMonitor<IStreamOrchestratorMediaObservation>
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

    mediaElementMonitor =
      makeReadyOnlyMediaElementMonitor<IStreamOrchestratorMediaObservation>({
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
    mediaElementMonitor.reset();
    vi.resetAllMocks();
  });

  it("should ignore stale decipherability restarts once a newer restart supersedes them", async () => {
    startOrchestrator(
      manifest,
      period,
      mediaElementMonitor,
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
      mediaElementMonitor,
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
      mediaElementMonitor,
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
      mediaElementMonitor,
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
      mediaElementMonitor,
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
      mediaElementMonitor,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );
    periodStreamCalls[0].callbacks.periodStreamReady(
      makePeriodStreamReadyPayload(period),
    );

    mediaElementMonitor.emit(makeObservationAt(15));

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
      mediaElementMonitor,
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
      mediaElementMonitor,
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
      mediaElementMonitor,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      callbacks,
      orchestratorCanceller,
    );

    mediaElementMonitor.emit(makeObservationAt(12));

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
      mediaElementMonitor,
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
  mediaElementMonitor: ReturnType<
    typeof makeReadyOnlyMediaElementMonitor<IStreamOrchestratorMediaObservation>
  >,
  representationEstimator: IRepresentationEstimator,
  segmentSinksStore: SegmentSinksStore,
  segmentQueueCreator: SegmentQueueCreator,
  callbacks: IStreamOrchestratorCallbacks,
  orchestratorCanceller: TaskCanceller,
): void {
  StreamOrchestrator(
    { manifest, initialPeriod },
    mediaElementMonitor.observer,
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

function makeObservationAt(position: number): IStreamOrchestratorMediaObservation {
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
