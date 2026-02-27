import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ContentPreparer from "../content_preparer";
import type { ICorePlugins } from "../utils";
import type { IABRThrottlers } from "../../adaptive";
import type { ITransportName, ITransportPipelines } from "../../../transports";
import type MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import type { IMediaSourceHandle } from "../../../mse/types";
import type { MainSourceBufferInterface } from "../../../mse/main_media_source_interface";
import type {
  CdnPrioritizer,
  ManifestFetcher,
  SegmentQueueCreator,
} from "../../fetchers";
import type CmcdDataBuilder from "../../cmcd";
import type WorkerMediaSourceInterface from "../../../mse/worker_media_source_interface";
import type { WorkerSourceBufferInterface } from "../../../mse/worker_media_source_interface";
import type FreezeResolver from "../FreezeResolver";
import type SegmentSinksStore from "../../segment_sinks";
import type TrackChoiceSetter from "../track_choice_setter";
import type CoreTextDisplayerInterface from "../core_text_displayer_interface";
import type { IContentInitializationData } from "../../../main_thread/types";

const {
  mockLog,
  mockFeatures,
  mockRepresentationEstimator,
  mockCreateAdaptiveRepresentationSelector,
  mockFetchThumbnailDataFn,
  mockCreateThumbnailFetcher,
  mockUpdateCodecSupportInWorkerMode,
  mockManifestFetcherCtor,
  mockWorkerMediaSourceCtor,
  mockMainMediaSourceCtor,
  // mockCdnPrioritizerCtor,
  mockSegmentQueueCreatorCtor,
  mockCmcdDataBuilderCtor,
  mockFreezeResolverCtor,
  // mockSegmentSinksStoreCtor,
  mockTrackChoiceSetterCtor,
  mockCoreTextDisplayerCtor,
  MockMainMediaSourceInterfaceClass,
  MockWorkerMediaSourceInterfaceClass,
  MockCdnPrioritizerClass,
  MockManifestFetcherClass,
  MockSegmentQueueCreatorClass,
  MockCmcdDataBuilderClass,
  MockFreezeResolverClass,
  MockSegmentSinksStoreClass,
  MockTrackChoiceSetterClass,
  MockCoreTextDisplayerInterfaceClass,
} = vi.hoisted(() => {
  const innerMockRepresentationEstimator = {};
  const innerMockFetchThumbnailDataFn = vi.fn();

  const mockManifestFetcherCtor = vi.fn();
  const mockWorkerMediaSourceCtor = vi.fn();
  const mockMainMediaSourceCtor = vi.fn();
  const mockCdnPrioritizerCtor = vi.fn();
  const mockSegmentQueueCreatorCtor = vi.fn();
  const mockCmcdDataBuilderCtor = vi.fn();
  const mockFreezeResolverCtor = vi.fn();
  const mockSegmentSinksStoreCtor = vi.fn();
  const mockTrackChoiceSetterCtor = vi.fn();
  const mockCoreTextDisplayerCtor = vi.fn();

  function makeEmitter() {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    return {
      addEventListener: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        (listeners[event] ??= []).push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = (listeners[event] ?? []).filter((l) => l !== cb);
      }),
      _emit(event: string, ...args: unknown[]) {
        (listeners[event] ?? []).forEach((cb) => cb(...args));
      },
      _reset() {
        Object.keys(listeners).forEach((k) => delete listeners[k]);
      },
    };
  }

  // Trick to only have the public API
  type PublicMainMediaSource = {
    [K in keyof MainMediaSourceInterface]: MainMediaSourceInterface[K];
  };
  class MockMainMediaSourceInterfaceClass implements PublicMainMediaSource {
    public id = "main-ms-id";
    public readyState: ReadyState = "closed";
    public handle: IMediaSourceHandle = { type: "handle", value: new Blob() };
    public sourceBuffers: MainSourceBufferInterface[] = [];
    public streaming = true;
    private _emitter = makeEmitter();
    addEventListener: any = (
      ...args: Parameters<ReturnType<typeof makeEmitter>["addEventListener"]>
    ) => this._emitter.addEventListener(...args);
    removeEventListener: any = (
      ...args: Parameters<ReturnType<typeof makeEmitter>["removeEventListener"]>
    ) => this._emitter.removeEventListener(...args);
    _emit = (...args: Parameters<ReturnType<typeof makeEmitter>["_emit"]>) =>
      this._emitter._emit(...args);
    _reset = () => this._emitter._reset();
    addSourceBuffer = vi.fn();
    setDuration = vi.fn();
    interruptDurationSetting = vi.fn();
    dispose = vi.fn();
    maintainEndOfStream = vi.fn();
    stopEndOfStream = vi.fn();
    constructor() {
      mockMainMediaSourceCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicWorkerMediaSource = {
    [K in keyof WorkerMediaSourceInterface]: WorkerMediaSourceInterface[K];
  };
  class MockWorkerMediaSourceInterfaceClass implements PublicWorkerMediaSource {
    public id = "worker-ms-id";
    public readyState: ReadyState = "closed";
    public handle: undefined = undefined;
    public sourceBuffers: WorkerSourceBufferInterface[] = [];
    public streaming = true;
    private _emitter = makeEmitter();
    addEventListener: any = (
      ...args: Parameters<ReturnType<typeof makeEmitter>["addEventListener"]>
    ) => this._emitter.addEventListener(...args);
    removeEventListener: any = (
      ...args: Parameters<ReturnType<typeof makeEmitter>["removeEventListener"]>
    ) => this._emitter.removeEventListener(...args);
    _emit = (...args: Parameters<ReturnType<typeof makeEmitter>["_emit"]>) =>
      this._emitter._emit(...args);
    _reset = () => this._emitter._reset();
    onMediaSourceReadyStateChanged = vi.fn();
    addSourceBuffer = vi.fn();
    setDuration = vi.fn();
    interruptDurationSetting = vi.fn();
    dispose = vi.fn();
    maintainEndOfStream = vi.fn();
    stopEndOfStream = vi.fn();
    constructor() {
      mockWorkerMediaSourceCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicCdnPrioritizer = { [K in keyof CdnPrioritizer]: CdnPrioritizer[K] };
  class MockCdnPrioritizerClass implements PublicCdnPrioritizer {
    addEventListener: any = vi.fn();
    removeEventListener: any = vi.fn();
    getCdnPreferenceForResource = vi.fn(() => []);
    downgradeCdn = vi.fn();
    constructor() {
      mockCdnPrioritizerCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicManifestFetcher = { [K in keyof ManifestFetcher]: ManifestFetcher[K] };
  class MockManifestFetcherClass implements PublicManifestFetcher {
    private _emitter = makeEmitter();
    addEventListener: any = (
      ...args: Parameters<ReturnType<typeof makeEmitter>["addEventListener"]>
    ) => this._emitter.addEventListener(...args);
    removeEventListener: any = (
      ...args: Parameters<ReturnType<typeof makeEmitter>["removeEventListener"]>
    ) => this._emitter.removeEventListener(...args);
    _emit = (...args: Parameters<ReturnType<typeof makeEmitter>["_emit"]>) =>
      this._emitter._emit(...args);
    start = vi.fn();
    scheduleManifestRefresh = vi.fn();
    scheduleManualRefresh = vi.fn();
    updateContentUrls = vi.fn();
    dispose = vi.fn();
    constructor() {
      mockManifestFetcherCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicSegmentQueueCreator = {
    [K in keyof SegmentQueueCreator]: SegmentQueueCreator[K];
  };
  class MockSegmentQueueCreatorClass implements PublicSegmentQueueCreator {
    createSegmentQueue = vi.fn();
    constructor() {
      mockSegmentQueueCreatorCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicCmcdDataBuilder = { [K in keyof CmcdDataBuilder]: CmcdDataBuilder[K] };
  class MockCmcdDataBuilderClass implements PublicCmcdDataBuilder {
    startMonitoringPlayback = vi.fn();
    stopMonitoringPlayback = vi.fn();
    updateThroughput = vi.fn();
    getCmcdDataForManifest = vi.fn();
    getCmcdDataForSegmentRequest = vi.fn();
    constructor() {
      mockCmcdDataBuilderCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicFreezeResolver = { [K in keyof FreezeResolver]: FreezeResolver[K] };
  class MockFreezeResolverClass implements PublicFreezeResolver {
    onNewObservation = vi.fn();
    constructor() {
      mockFreezeResolverCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicSegmentSinksStore = { [K in keyof SegmentSinksStore]: SegmentSinksStore[K] };
  class MockSegmentSinksStoreClass implements PublicSegmentSinksStore {
    getStatus = vi.fn();
    getBufferTypes = vi.fn();
    getNativeBufferTypes = vi.fn();
    getSegmentSinksMetrics = vi.fn();
    get = vi.fn();
    waitForUsableBuffers = vi.fn();
    disableSegmentSink = vi.fn();
    createSegmentSink = vi.fn();
    disposeAll = vi.fn();
    disposeSegmentSink = vi.fn();
    constructor() {
      mockSegmentSinksStoreCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicTrackChoiceSetter = { [K in keyof TrackChoiceSetter]: TrackChoiceSetter[K] };
  class MockTrackChoiceSetterClass implements PublicTrackChoiceSetter {
    reset = vi.fn();
    addTrackSetter = vi.fn();
    setTrack = vi.fn();
    updateRepresentations = vi.fn();
    removeTrackSetter = vi.fn();
    constructor() {
      mockTrackChoiceSetterCtor(this);
    }
  }

  // Trick to only have the public API
  type PublicCoreTextDisplayerInterface = {
    [K in keyof CoreTextDisplayerInterface]: CoreTextDisplayerInterface[K];
  };
  class MockCoreTextDisplayerInterfaceClass implements PublicCoreTextDisplayerInterface {
    _queues = { pushTextData: [], remove: [] };
    pushTextData = vi.fn();
    remove = vi.fn();
    reset = vi.fn();
    stop = vi.fn();
    onPushedTrackSuccess = vi.fn();
    onPushedTrackError = vi.fn();
    onRemoveSuccess = vi.fn();
    onRemoveError = vi.fn();
    constructor() {
      mockCoreTextDisplayerCtor(this);
    }
  }

  return {
    mockLog: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
    mockFeatures: { transports: {} as Record<string, unknown> },
    mockRepresentationEstimator: innerMockRepresentationEstimator,
    mockCreateAdaptiveRepresentationSelector: vi.fn(
      () => innerMockRepresentationEstimator,
    ),
    mockFetchThumbnailDataFn: innerMockFetchThumbnailDataFn,
    mockCreateThumbnailFetcher: vi.fn(() => innerMockFetchThumbnailDataFn),
    mockUpdateCodecSupportInWorkerMode: vi.fn(),
    mockManifestFetcherCtor,
    mockWorkerMediaSourceCtor,
    mockMainMediaSourceCtor,
    mockCdnPrioritizerCtor,
    mockSegmentQueueCreatorCtor,
    mockCmcdDataBuilderCtor,
    mockFreezeResolverCtor,
    mockSegmentSinksStoreCtor,
    mockTrackChoiceSetterCtor,
    mockCoreTextDisplayerCtor,
    MockMainMediaSourceInterfaceClass,
    MockWorkerMediaSourceInterfaceClass,
    MockCdnPrioritizerClass,
    MockManifestFetcherClass,
    MockSegmentQueueCreatorClass,
    MockCmcdDataBuilderClass,
    MockFreezeResolverClass,
    MockSegmentSinksStoreClass,
    MockTrackChoiceSetterClass,
    MockCoreTextDisplayerInterfaceClass,
  };
});

vi.mock("../../../features", () => ({ default: mockFeatures }));
vi.mock("../../../log", () => ({ default: mockLog }));
vi.mock("../../../mse/main_media_source_interface", () => ({
  default: MockMainMediaSourceInterfaceClass,
}));
vi.mock("../../../mse/worker_media_source_interface", () => ({
  default: MockWorkerMediaSourceInterfaceClass,
}));
vi.mock("../../fetchers", () => ({
  ManifestFetcher: MockManifestFetcherClass,
  SegmentQueueCreator: MockSegmentQueueCreatorClass,
}));
vi.mock("../../fetchers/cdn_prioritizer", () => ({ default: MockCdnPrioritizerClass }));
vi.mock("../../fetchers/thumbnails/thumbnail_fetcher", () => ({
  default: mockCreateThumbnailFetcher,
}));
vi.mock("../../adaptive", () => ({ default: mockCreateAdaptiveRepresentationSelector }));
vi.mock("../../cmcd", () => ({ default: MockCmcdDataBuilderClass }));
vi.mock("../../segment_sinks", () => ({ default: MockSegmentSinksStoreClass }));
vi.mock("../core_text_displayer_interface", () => ({
  default: MockCoreTextDisplayerInterfaceClass,
}));
vi.mock("../FreezeResolver", () => ({ default: MockFreezeResolverClass }));
vi.mock("../track_choice_setter", () => ({ default: MockTrackChoiceSetterClass }));
vi.mock("../utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils")>();
  return {
    ...original,
    updateCodecSupportInWorkerMode: mockUpdateCodecSupportInWorkerMode,
    formatErrorForSender: (err: unknown) => err,
  };
});

function lastInstance<T>(spy: ReturnType<typeof vi.fn>): T {
  return spy.mock.calls[spy.mock.calls.length - 1][0] as T;
}

function mockManifestFetcherInstance() {
  return lastInstance<InstanceType<typeof MockManifestFetcherClass>>(
    mockManifestFetcherCtor,
  );
}
function mockWorkerMediaSourceInstance() {
  return lastInstance<InstanceType<typeof MockWorkerMediaSourceInterfaceClass>>(
    mockWorkerMediaSourceCtor,
  );
}
function mockMainMediaSourceInstance() {
  return lastInstance<InstanceType<typeof MockMainMediaSourceInterfaceClass>>(
    mockMainMediaSourceCtor,
  );
}
function mockCmcdDataBuilderInstance() {
  return lastInstance<InstanceType<typeof MockCmcdDataBuilderClass>>(
    mockCmcdDataBuilderCtor,
  );
}
function mockCoreTextDisplayerInstance() {
  return lastInstance<InstanceType<typeof MockCoreTextDisplayerInterfaceClass>>(
    mockCoreTextDisplayerCtor,
  );
}
function mockTrackChoiceSetterInstance() {
  return lastInstance<InstanceType<typeof MockTrackChoiceSetterClass>>(
    mockTrackChoiceSetterCtor,
  );
}
function mockFreezeResolverInstance() {
  return lastInstance<InstanceType<typeof MockFreezeResolverClass>>(
    mockFreezeResolverCtor,
  );
}
function mockSegmentQueueCreatorInstance() {
  return lastInstance<InstanceType<typeof MockSegmentQueueCreatorClass>>(
    mockSegmentQueueCreatorCtor,
  );
}

function makeManifest() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    addEventListener: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      (listeners[event] ??= []).push(cb);
    }),
    _emit(event: string, ...args: unknown[]) {
      (listeners[event] ?? []).forEach((cb) => cb(...args));
    },
  };
}

function makeContext(
  overrides: Partial<IContentInitializationData> = {},
): IContentInitializationData {
  return {
    contentId: "test-content-id",
    url: "https://example.com/manifest.mpd",
    hasText: false,
    transport: "dash",
    transportOptions: { lowLatencyMode: false },
    useMseInWorker: false,
    enableRepresentationAvoidance: false,
    cmcd: undefined,
    manifestRetryOptions: {},
    segmentRetryOptions: {},
    initialAudioBitrate: undefined,
    initialVideoBitrate: undefined,
    ...overrides,
  } as IContentInitializationData;
}

function makeSendMessage() {
  return vi.fn();
}

function makeDefaultThrottlers(): IABRThrottlers {
  return { limitResolution: {}, throttleBitrate: {} };
}

function makeDefaultCorePlugins(): ICorePlugins {
  return {
    segmentLoaders: new Map(),
    manifestLoaders: new Map(),
    representationFilters: new Map(),
  };
}

function makeTransportPipeline(transportName: ITransportName): ITransportPipelines {
  const notImplemented = () => {
    throw new Error("not implemented");
  };
  return {
    transportName,
    thumbnails: { loadThumbnail: notImplemented, parseThumbnail: notImplemented },
    audio: { loadSegment: notImplemented, parseSegment: notImplemented },
    video: { loadSegment: notImplemented, parseSegment: notImplemented },
    text: { loadSegment: notImplemented, parseSegment: notImplemented },
    manifest: { loadManifest: notImplemented, parseManifest: notImplemented },
  };
}

async function initContent(
  preparer: ContentPreparer,
  ctx: IContentInitializationData,
  sendMessage = makeSendMessage(),
) {
  const manifest = makeManifest();
  const promise = preparer.initializeNewContent(
    sendMessage,
    ctx,
    makeDefaultThrottlers(),
    makeDefaultCorePlugins(),
  );
  const ms = ctx.useMseInWorker
    ? mockMainMediaSourceInstance()
    : mockWorkerMediaSourceInstance();
  mockManifestFetcherInstance()._emit("manifestReady", manifest);
  ms._emit("mediaSourceOpen");
  await promise;
  return { manifest, sendMessage };
}

describe("ContentPreparer", () => {
  beforeEach(() => {
    mockFeatures.transports["dash"] = vi.fn(() => makeTransportPipeline("dash"));
    if (typeof URL.createObjectURL !== "function") {
      URL.createObjectURL = vi.fn(() => "blob:fake-url");
      URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("exposes no current content immediately after creation", () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      expect(preparer.getCurrentContent()).toBeNull();
    });
  });

  describe("initializeNewContent", () => {
    it("rejects immediately when the transport is unknown", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ transport: "unknown-transport" });
      await expect(
        preparer.initializeNewContent(
          makeSendMessage(),
          ctx,
          makeDefaultThrottlers(),
          makeDefaultCorePlugins(),
        ),
      ).rejects.toThrow(/transport "unknown-transport" not supported/);
    });

    it("creates a ManifestFetcher and calls start()", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));
      expect(mockManifestFetcherCtor).toHaveBeenCalledOnce();
      expect(mockManifestFetcherInstance().start).toHaveBeenCalledOnce();
    });

    it("resolves with the manifest once both events fire (worker ms path)", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ useMseInWorker: false });
      const manifest = makeManifest();

      const promise = preparer.initializeNewContent(
        makeSendMessage(),
        ctx,
        makeDefaultThrottlers(),
        makeDefaultCorePlugins(),
      );
      mockManifestFetcherInstance()._emit("manifestReady", manifest);
      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");

      expect(await promise).toBe(manifest);
    });

    it("resolves with the manifest on the main-media-source path (useMseInWorker: true)", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ useMseInWorker: true });
      const manifest = makeManifest();
      const sendMessage = makeSendMessage();

      const promise = preparer.initializeNewContent(
        sendMessage,
        ctx,
        makeDefaultThrottlers(),
        makeDefaultCorePlugins(),
      );
      mockManifestFetcherInstance()._emit("manifestReady", manifest);
      mockMainMediaSourceInstance()._emit("mediaSourceOpen");

      expect(await promise).toBe(manifest);
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.any(String) }),
        expect.any(Array),
      );
    });

    it("populates getCurrentContent() after both events fire", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const { manifest } = await initContent(
        preparer,
        makeContext({ useMseInWorker: false }),
      );

      const content = preparer.getCurrentContent();
      expect(content).not.toBeNull();
      expect(content!.contentId).toBe("test-content-id");
      expect(content!.manifest).toBe(manifest);
      expect(content!.manifestFetcher).toBe(mockManifestFetcherInstance());
      expect(content!.representationEstimator).toBe(mockRepresentationEstimator);
      expect(content!.segmentQueueCreator).toBe(mockSegmentQueueCreatorInstance());
      expect(content!.trackChoiceSetter).toBe(mockTrackChoiceSetterInstance());
      expect(content!.fetchThumbnailData).toBe(mockFetchThumbnailDataFn);
      expect(content!.freezeResolver).toBe(mockFreezeResolverInstance());
    });

    it("creates a CmcdDataBuilder when cmcd is provided", async () => {
      const preparer = new ContentPreparer({ hasVideo: false });
      await initContent(
        preparer,
        makeContext({ cmcd: { sessionId: "s1" }, useMseInWorker: false }),
      );
      expect(mockCmcdDataBuilderCtor).toHaveBeenCalledOnce();
      expect(preparer.getCurrentContent()!.cmcdDataBuilder).toBe(
        mockCmcdDataBuilderInstance(),
      );
    });

    it("does NOT create a CmcdDataBuilder when cmcd is undefined", async () => {
      const preparer = new ContentPreparer({ hasVideo: false });
      await initContent(
        preparer,
        makeContext({ cmcd: undefined, useMseInWorker: false }),
      );
      expect(mockCmcdDataBuilderCtor).not.toHaveBeenCalled();
      expect(preparer.getCurrentContent()!.cmcdDataBuilder).toBeNull();
    });

    it("creates a CoreTextDisplayerInterface when hasText is true", async () => {
      const preparer = new ContentPreparer({ hasVideo: false });
      await initContent(preparer, makeContext({ hasText: true, useMseInWorker: false }));
      expect(mockCoreTextDisplayerCtor).toHaveBeenCalledOnce();
      expect(preparer.getCurrentContent()!.coreTextSender).toBe(
        mockCoreTextDisplayerInstance(),
      );
    });

    it("does NOT create a CoreTextDisplayerInterface when hasText is false", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ hasText: false, useMseInWorker: false }));
      expect(mockCoreTextDisplayerCtor).not.toHaveBeenCalled();
      expect(preparer.getCurrentContent()!.coreTextSender).toBeNull();
    });

    it("does not resolve before mediaSourceOpen fires", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ useMseInWorker: false });
      const manifest = makeManifest();
      let resolved = false;

      const promise = preparer
        .initializeNewContent(
          makeSendMessage(),
          ctx,
          makeDefaultThrottlers(),
          makeDefaultCorePlugins(),
        )
        .then((m) => {
          resolved = true;
          return m;
        });

      mockManifestFetcherInstance()._emit("manifestReady", manifest);
      await Promise.resolve();
      expect(resolved).toBe(false);

      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");
      await promise;
      expect(resolved).toBe(true);
    });

    it("does not resolve before manifestReady fires", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ useMseInWorker: false });
      let resolved = false;

      const promise = preparer
        .initializeNewContent(
          makeSendMessage(),
          ctx,
          makeDefaultThrottlers(),
          makeDefaultCorePlugins(),
        )
        .then((m) => {
          resolved = true;
          return m;
        });

      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");
      await Promise.resolve();
      expect(resolved).toBe(false);

      mockManifestFetcherInstance()._emit("manifestReady", makeManifest());
      await promise;
      expect(resolved).toBe(true);
    });

    it("ignores duplicate manifestReady events and logs a warning", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ useMseInWorker: false });
      const manifest1 = makeManifest();
      const manifest2 = makeManifest();

      const promise = preparer.initializeNewContent(
        makeSendMessage(),
        ctx,
        makeDefaultThrottlers(),
        makeDefaultCorePlugins(),
      );

      mockManifestFetcherInstance()._emit("manifestReady", manifest1);
      mockManifestFetcherInstance()._emit("manifestReady", manifest2);
      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");

      expect(await promise).toBe(manifest1);
      expect(mockLog.warn).toHaveBeenCalledWith(
        "Core",
        expect.stringContaining("Multiple `manifestReady`"),
      );
    });

    it("rejects and sends an error message when manifestFetcher emits 'error'", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ useMseInWorker: false });
      const sendMessage = makeSendMessage();
      const fakeError = new Error("fetch failed");

      const promise = preparer.initializeNewContent(
        sendMessage,
        ctx,
        makeDefaultThrottlers(),
        makeDefaultCorePlugins(),
      );
      mockManifestFetcherInstance()._emit("error", fakeError);

      await expect(promise).rejects.toThrow("fetch failed");
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.any(String) }),
      );
    });

    it("forwards manifest 'warning' events as messages", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx = makeContext({ useMseInWorker: false });
      const sendMessage = makeSendMessage();

      const promise = preparer.initializeNewContent(
        sendMessage,
        ctx,
        makeDefaultThrottlers(),
        makeDefaultCorePlugins(),
      );
      mockManifestFetcherInstance()._emit("warning", new Error("minor issue"));

      mockManifestFetcherInstance()._emit("manifestReady", makeManifest());
      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");
      await promise;

      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.any(String) }),
      );
    });

    it("calls updateCodecSupportInWorkerMode with the manifest once ready", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const { manifest } = await initContent(
        preparer,
        makeContext({ useMseInWorker: false }),
      );
      expect(mockUpdateCodecSupportInWorkerMode).toHaveBeenCalledOnce();
      expect(mockUpdateCodecSupportInWorkerMode).toHaveBeenCalledWith(manifest);
    });

    it("cancels the previous content's promise when initializeNewContent is called again", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const ctx1 = makeContext({ contentId: "content-1", useMseInWorker: false });
      const ctx2 = makeContext({ contentId: "content-2", useMseInWorker: false });

      const promise1 = preparer.initializeNewContent(
        makeSendMessage(),
        ctx1,
        makeDefaultThrottlers(),
        makeDefaultCorePlugins(),
      );

      const promise2 = preparer.initializeNewContent(
        makeSendMessage(),
        ctx2,
        makeDefaultThrottlers(),
        makeDefaultCorePlugins(),
      );

      const manifest = makeManifest();
      mockManifestFetcherInstance()._emit("manifestReady", manifest);
      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");

      await expect(promise1).rejects.toBeDefined();
      await expect(promise2).resolves.toBe(manifest);
    });

    it("sends manifestUpdate message when manifest emits 'manifestUpdate'", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      const sendMessage = makeSendMessage();
      const { manifest } = await initContent(
        preparer,
        makeContext({ useMseInWorker: false }),
        sendMessage,
      );

      manifest._emit("manifestUpdate", { periods: [] });

      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          contentId: "test-content-id",
        }),
      );
    });
  });

  describe("disposeCurrentContent", () => {
    it("cancels the content signal on disposal", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));
      expect(preparer.getCurrentContent()).not.toBeNull();
      expect(() => preparer.disposeCurrentContent("test")).not.toThrow();
    });
  });

  describe("scheduleManifestRefresh", () => {
    it("does nothing when no content is prepared", () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      expect(() =>
        preparer.scheduleManifestRefresh({
          delay: 0,
          enablePartialRefresh: false,
          canUseUnsafeMode: false,
        }),
      ).not.toThrow();
    });

    it("delegates to manifestFetcher.scheduleManualRefresh when content exists", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));

      const settings = {
        delay: 1000,
        enablePartialRefresh: true,
        canUseUnsafeMode: false,
      };
      preparer.scheduleManifestRefresh(settings);

      expect(mockManifestFetcherInstance().scheduleManualRefresh).toHaveBeenCalledWith(
        settings,
      );
    });
  });

  describe("reloadMediaSource", () => {
    it("rejects immediately when no content is prepared", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await expect(preparer.reloadMediaSource(makeSendMessage())).rejects.toThrow(
        "CP: No content anymore",
      );
    });

    it("resolves when the new mediaSource emits mediaSourceOpen", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));

      mockWorkerMediaSourceInstance()._reset();
      const reloadPromise = preparer.reloadMediaSource(makeSendMessage());
      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");

      await expect(reloadPromise).resolves.toBeUndefined();
    });

    it("rejects when the new mediaSource emits mediaSourceClose", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));

      mockWorkerMediaSourceInstance()._reset();
      const reloadPromise = preparer.reloadMediaSource(makeSendMessage());
      mockWorkerMediaSourceInstance()._emit("mediaSourceClose");

      await expect(reloadPromise).rejects.toThrow(
        "MediaSource ReadyState changed to close during init.",
      );
    });

    it("resets the TrackChoiceSetter on reload", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));

      mockWorkerMediaSourceInstance()._reset();
      mockTrackChoiceSetterInstance().reset.mockClear();

      const reloadPromise = preparer.reloadMediaSource(makeSendMessage());
      expect(mockTrackChoiceSetterInstance().reset).toHaveBeenCalledOnce();

      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");
      await reloadPromise;
    });

    it("creates a new FreezeResolver after reload", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));

      const callCountBefore = mockFreezeResolverCtor.mock.calls.length;
      mockWorkerMediaSourceInstance()._reset();

      const reloadPromise = preparer.reloadMediaSource(makeSendMessage());
      mockWorkerMediaSourceInstance()._emit("mediaSourceOpen");
      await reloadPromise;

      expect(mockFreezeResolverCtor.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  describe("MediaSource path selection", () => {
    it("uses WorkerMediaSourceInterface when useMseInWorker is false", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: false }));
      expect(mockWorkerMediaSourceCtor).toHaveBeenCalled();
      expect(mockMainMediaSourceCtor).not.toHaveBeenCalled();
    });

    it("uses MainMediaSourceInterface when useMseInWorker is true", async () => {
      const preparer = new ContentPreparer({ hasVideo: true });
      await initContent(preparer, makeContext({ useMseInWorker: true }));
      expect(mockMainMediaSourceCtor).toHaveBeenCalled();
      expect(mockWorkerMediaSourceCtor).not.toHaveBeenCalled();
    });
  });
});
