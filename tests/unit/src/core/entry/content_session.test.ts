import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContentSession from "../../../../../src/core/entry/content_session.ts";
import initializeCoreEntry from "../../../../../src/core/entry/core_entry.ts";
import type { IMessageReceiverCallback } from "../../../../../src/core/entry/core_entry.ts";
import { ManifestFetcher } from "../../../../../src/core/fetchers/index.ts";
import type { IManifestFetcherEvent } from "../../../../../src/core/fetchers/manifest/manifest_fetcher.ts";
import { CoreMessageType } from "../../../../../src/core/types.ts";
import type { ICoreMessage } from "../../../../../src/core/types.ts";
import features from "../../../../../src/features/index.ts";
import type {
  IContentInitializationData,
  IMainThreadMessage,
} from "../../../../../src/main_thread/types.ts";
import { MainThreadMessageType } from "../../../../../src/main_thread/types.ts";
import type {
  IManifest,
  IPeriodsUpdateResult,
} from "../../../../../src/manifest/index.ts";
import type { ITransportPipelines } from "../../../../../src/transports/index.ts";
import EventEmitter from "../../../../../src/utils/event_emitter.ts";
import SharedReference from "../../../../../src/utils/reference.ts";
import TaskCanceller from "../../../../../src/utils/task_canceller.ts";

class TestManifest extends EventEmitter<{ manifestUpdate: IPeriodsUpdateResult }> {
  public periods = [];

  public update(updates: IPeriodsUpdateResult): void {
    this.trigger("manifestUpdate", updates);
  }
}

// Drive the real fetcher's events without starting network requests.
function emitFetcher<T extends keyof IManifestFetcherEvent>(
  fetcher: ManifestFetcher,
  name: T,
  value: IManifestFetcherEvent[T],
): void {
  (
    fetcher as unknown as {
      trigger: (event: T, payload: IManifestFetcherEvent[T]) => void;
    }
  ).trigger(name, value);
}

function createContext(contentId = "content"): IContentInitializationData {
  return {
    contentId,
    enableRepresentationAvoidance: false,
    playbackSupport: { mseInWorker: false, videoTrack: true, textTrack: false },
    transport: "test",
    transportOptions: {
      lowLatencyMode: false,
      manifestLoader: undefined,
      segmentLoader: undefined,
      representationFilter: undefined,
    },
    manifestRetryOptions: {
      lowLatencyMode: false,
      maxRetry: undefined,
      requestTimeout: undefined,
      connectionTimeout: undefined,
      minimumManifestUpdateInterval: 0,
      initialManifest: undefined,
    },
    segmentRetryOptions: {
      lowLatencyMode: false,
      maxRetry: undefined,
      requestTimeout: undefined,
      connectionTimeout: undefined,
    },
  };
}

function createHarness() {
  let session: ContentSession | null = null;
  const sendMessage = vi.fn<(msg: ICoreMessage) => void>();
  const callbacks = {
    onReady: vi.fn(),
    onError: vi.fn(),
    onWarning: vi.fn(),
    onManifestUpdate: vi.fn(),
  };
  const initialize = (context = createContext()) => {
    session = new ContentSession(
      sendMessage,
      context,
      {
        limitResolution: {
          video: new SharedReference({
            height: undefined,
            width: undefined,
            pixelRatio: 1,
          }),
        },
        throttleBitrate: { video: new SharedReference(Infinity) },
      },
      {
        manifestLoaders: new Map(),
        segmentLoaders: new Map(),
        representationFilters: new Map(),
      },
      callbacks,
    );
  };
  const current = () => {
    const content = session?.state.data ?? null;
    if (content === null) {
      throw new Error("Expected prepared content");
    }
    return content;
  };
  const manifest = new TestManifest();
  const manifestValue = manifest as unknown as IManifest;
  const manifestReady = () =>
    emitFetcher(current().manifestFetcher, "manifestReady", manifestValue);
  const open = () => current().mediaSource.onMediaSourceReadyStateChanged?.("open");
  return {
    get session() {
      if (session === null) {
        throw new Error("Session not created");
      }
      return session;
    },
    sendMessage,
    callbacks,
    initialize,
    current,
    manifest,
    manifestValue,
    manifestReady,
    open,
  };
}

function createCoreHarness() {
  let receiveMessage: IMessageReceiverCallback = () => {
    throw new Error("Core entry not initialized");
  };
  const sendMessage = vi.fn<(msg: ICoreMessage) => void>();
  initializeCoreEntry(
    (receiver) => {
      receiveMessage = receiver;
    },
    sendMessage,
    {
      manifestLoaders: new Map(),
      segmentLoaders: new Map(),
      representationFilters: new Map(),
    },
  );
  return {
    sendMessage,
    receive: (data: IMainThreadMessage) => receiveMessage({ data }),
  };
}

describe("ContentSession callback contract", () => {
  let fetchers: ManifestFetcher[];

  beforeEach(() => {
    fetchers = [];
    features.transports.test = () =>
      ({ transportName: "dash", thumbnails: {} }) as ITransportPipelines;
    vi.spyOn(ManifestFetcher.prototype, "start").mockImplementation(function (
      this: ManifestFetcher,
    ) {
      fetchers.push(this);
    });
  });

  afterEach(() => {
    delete features.transports.test;
    vi.restoreAllMocks();
  });

  it.each(["manifest-first", "media-source-first"])(
    "reports readiness in the original microtask position (%s)",
    async (order) => {
      const h = createHarness();
      expect(h.initialize()).toBeUndefined();
      const calls: string[] = [];
      h.callbacks.onReady.mockImplementation(() => calls.push("ready"));
      if (order === "manifest-first") {
        h.manifestReady();
      } else {
        h.open();
      }
      await Promise.resolve();
      expect(h.callbacks.onReady).not.toHaveBeenCalled();

      queueMicrotask(() => calls.push("before"));
      if (order === "manifest-first") {
        h.open();
      } else {
        h.manifestReady();
      }
      queueMicrotask(() => calls.push("after"));
      expect(h.callbacks.onReady).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(calls).toEqual(["before", "ready", "after"]);
      expect(h.callbacks.onReady).toHaveBeenCalledExactlyOnceWith(h.manifestValue);
      expect(h.session.state.type).toBe("ready");
      expect(h.callbacks.onError).not.toHaveBeenCalled();
      h.session.dispose("test cleanup");
    },
  );

  it("keeps warnings and Manifest updates synchronous, including around readiness", async () => {
    const h = createHarness();
    h.initialize();
    const warning = new Error("warning") as IManifestFetcherEvent["warning"];
    emitFetcher(h.current().manifestFetcher, "warning", warning);
    expect(h.callbacks.onWarning).toHaveBeenCalledExactlyOnceWith(warning);
    expect(h.sendMessage.mock.calls.map(([msg]) => msg.type)).toEqual([
      CoreMessageType.CreateMediaSource,
    ]);

    h.manifestReady();
    h.open();
    const updates: IPeriodsUpdateResult = {
      addedPeriods: [],
      removedPeriods: [],
      updatedPeriods: [],
    };
    h.manifest.update(updates);
    expect(h.callbacks.onManifestUpdate).toHaveBeenCalledWith(h.manifestValue, updates);
    expect(h.callbacks.onReady).not.toHaveBeenCalled();
    await Promise.resolve();
    h.manifest.update(updates);
    expect(h.callbacks.onManifestUpdate).toHaveBeenCalledTimes(2);

    const fetcher = h.current().manifestFetcher;
    h.session.dispose("test cleanup");
    h.manifest.update(updates);
    emitFetcher(fetcher, "warning", warning);
    expect(h.callbacks.onManifestUpdate).toHaveBeenCalledTimes(2);
    expect(h.callbacks.onWarning).toHaveBeenCalledOnce();
  });

  it.each(["unsupported transport", "throwing transport", "fetch error", "cancellation"])(
    "reports initialization failure once and asynchronously: %s",
    async (failure) => {
      const h = createHarness();
      const error = new Error("setup failed");
      if (failure === "unsupported transport") {
        delete features.transports.test;
      } else if (failure === "throwing transport") {
        features.transports.test = () => {
          throw error;
        };
      }
      expect(() => h.initialize()).not.toThrow();
      if (failure === "fetch error") {
        emitFetcher(h.current().manifestFetcher, "error", error);
        emitFetcher(h.current().manifestFetcher, "error", new Error("again"));
      } else if (failure === "cancellation") {
        h.session.dispose("test cancellation");
      }
      expect(h.callbacks.onError).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(h.callbacks.onError).toHaveBeenCalledOnce();
      expect(h.session.state.type).toBe(
        failure === "cancellation" ? "disposed" : "failed",
      );
      expect(h.callbacks.onReady).not.toHaveBeenCalled();
      if (failure === "cancellation") {
        expect(
          TaskCanceller.isCancellationError(h.callbacks.onError.mock.calls[0][0]),
        ).toBe(true);
      } else if (failure !== "unsupported transport") {
        expect(h.callbacks.onError).toHaveBeenCalledWith(error);
      }
      h.session.dispose("test cleanup");
    },
  );

  it("preserves settled readiness when disposed before its callback runs", async () => {
    const h = createHarness();
    h.initialize();
    h.manifestReady();
    h.open();
    h.session.dispose("stop before readiness notification");
    await Promise.resolve();
    expect(h.callbacks.onReady).toHaveBeenCalledExactlyOnceWith(h.manifestValue);
    expect(h.session.state).toEqual({ type: "disposed", data: null });
    expect(h.callbacks.onError).not.toHaveBeenCalled();
  });

  it("reports replacement cancellation before the next content's readiness", async () => {
    const h = createHarness();
    const calls: string[] = [];
    h.callbacks.onError.mockImplementation(() => calls.push("cancelled"));
    h.callbacks.onReady.mockImplementation(() => calls.push("ready"));
    h.initialize(createContext("first"));
    const firstSession = h.session;
    firstSession.dispose("new init");
    h.initialize(createContext("second"));
    expect(h.session).not.toBe(firstSession);
    expect(firstSession.state).toEqual({ type: "disposed", data: null });
    h.manifestReady();
    h.open();
    expect(calls).toEqual([]);
    await Promise.resolve();
    expect(calls).toEqual(["cancelled", "ready"]);
    h.session.dispose("test cleanup");
  });

  it("keeps message translation and ordering in core_entry", async () => {
    const core = createCoreHarness();
    const { sendMessage } = core;
    const receiveMessage: IMessageReceiverCallback = ({ data }) => core.receive(data);
    receiveMessage({
      data: { type: MainThreadMessageType.PrepareContent, value: createContext() },
    });
    const fetcher = fetchers[0];
    const testManifest = new TestManifest();
    const manifest = testManifest as unknown as IManifest;
    const warning = new Error("warning") as IManifestFetcherEvent["warning"];
    emitFetcher(fetcher, "warning", warning);
    emitFetcher(fetcher, "manifestReady", manifest);
    const createMediaSource = sendMessage.mock.calls[0][0];
    if (createMediaSource.type !== CoreMessageType.CreateMediaSource) {
      throw new Error("Expected MediaSource creation message");
    }
    const mediaSourceId = createMediaSource.mediaSourceId;
    receiveMessage({
      data: {
        type: MainThreadMessageType.MediaSourceReadyStateChange,
        mediaSourceId,
        value: "open",
      },
    });
    const updates: IPeriodsUpdateResult = {
      addedPeriods: [],
      removedPeriods: [],
      updatedPeriods: [],
    };
    testManifest.update(updates);
    expect(sendMessage.mock.calls.map(([msg]) => msg.type)).toEqual([
      CoreMessageType.CreateMediaSource,
      CoreMessageType.Warning,
      CoreMessageType.ManifestUpdate,
    ]);
    await Promise.resolve();
    expect(sendMessage.mock.calls.map(([msg]) => msg.type)).toEqual([
      CoreMessageType.CreateMediaSource,
      CoreMessageType.Warning,
      CoreMessageType.ManifestUpdate,
      CoreMessageType.ManifestReady,
    ]);
    expect(sendMessage.mock.calls[2][0]).toEqual({
      type: CoreMessageType.ManifestUpdate,
      contentId: "content",
      value: { manifest, updates },
    });
    expect(sendMessage.mock.calls[3][0]).toEqual({
      type: CoreMessageType.ManifestReady,
      contentId: "content",
      value: { manifest },
    });
    receiveMessage({
      data: {
        type: MainThreadMessageType.StopContent,
        contentId: "content",
        value: null,
      },
    });
  });

  it("disposes the old session before creating its replacement and ignores stale messages", async () => {
    const core = createCoreHarness();
    const { sendMessage, receive } = core;
    receive({
      type: MainThreadMessageType.PrepareContent,
      value: createContext("first"),
    });
    const firstCreation = sendMessage.mock.calls[0][0];
    if (firstCreation.type !== CoreMessageType.CreateMediaSource) {
      throw new Error("Expected MediaSource creation message");
    }
    const firstDispose = vi.spyOn(fetchers[0], "dispose");
    receive({
      type: MainThreadMessageType.PrepareContent,
      value: createContext("second"),
    });
    expect(firstDispose).toHaveBeenCalledExactlyOnceWith("new init");
    expect(
      sendMessage.mock.calls.map(([msg]) => [
        msg.type,
        "contentId" in msg ? msg.contentId : undefined,
      ]),
    ).toEqual([
      [CoreMessageType.CreateMediaSource, "first"],
      [CoreMessageType.DisposeMediaSource, undefined],
      [CoreMessageType.CreateMediaSource, "second"],
    ]);
    await Promise.resolve();
    expect(sendMessage.mock.calls[3][0]).toMatchObject({
      type: CoreMessageType.Error,
      contentId: "first",
    });

    const secondCreation = sendMessage.mock.calls[2][0];
    if (secondCreation.type !== CoreMessageType.CreateMediaSource) {
      throw new Error("Expected MediaSource creation message");
    }
    const secondDispose = vi.spyOn(fetchers[1], "dispose");
    receive({ type: MainThreadMessageType.StopContent, contentId: "first", value: null });
    receive({
      type: MainThreadMessageType.MediaSourceReadyStateChange,
      mediaSourceId: firstCreation.mediaSourceId,
      value: "open",
    });
    const manifest = new TestManifest() as unknown as IManifest;
    emitFetcher(fetchers[0], "manifestReady", manifest);
    emitFetcher(
      fetchers[0],
      "warning",
      new Error("old warning") as IManifestFetcherEvent["warning"],
    );
    emitFetcher(fetchers[1], "manifestReady", manifest);
    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledTimes(4);
    expect(secondDispose).not.toHaveBeenCalled();

    receive({
      type: MainThreadMessageType.MediaSourceReadyStateChange,
      mediaSourceId: secondCreation.mediaSourceId,
      value: "open",
    });
    await Promise.resolve();
    expect(sendMessage.mock.calls[4][0]).toEqual({
      type: CoreMessageType.ManifestReady,
      contentId: "second",
      value: { manifest },
    });
    receive({
      type: MainThreadMessageType.StopContent,
      contentId: "second",
      value: null,
    });
    expect(secondDispose).toHaveBeenCalledExactlyOnceWith("StopContent message");
    const count = sendMessage.mock.calls.length;
    receive({
      type: MainThreadMessageType.StopContent,
      contentId: "second",
      value: null,
    });
    receive({
      type: MainThreadMessageType.MediaSourceReadyStateChange,
      mediaSourceId: secondCreation.mediaSourceId,
      value: "open",
    });
    expect(sendMessage).toHaveBeenCalledTimes(count);
  });

  it("keeps failed replacement separate from the disposed content", async () => {
    const { receive, sendMessage } = createCoreHarness();
    receive({
      type: MainThreadMessageType.PrepareContent,
      value: createContext("first"),
    });
    const oldFetcher = fetchers[0];
    const oldDispose = vi.spyOn(oldFetcher, "dispose");
    const context = createContext("second");
    context.transport = "unsupported";
    receive({ type: MainThreadMessageType.PrepareContent, value: context });
    await Promise.resolve();
    expect(oldDispose).toHaveBeenCalledOnce();
    expect(sendMessage.mock.calls.map(([msg]) => msg.type)).toEqual([
      CoreMessageType.CreateMediaSource,
      CoreMessageType.DisposeMediaSource,
      CoreMessageType.Error,
      CoreMessageType.Error,
    ]);
    receive({ type: MainThreadMessageType.StopContent, contentId: "first", value: null });
    receive({
      type: MainThreadMessageType.StopContent,
      contentId: "second",
      value: null,
    });
    expect(oldDispose).toHaveBeenCalledOnce();
  });

  it("replaces only MediaSource resources when reloading the session", async () => {
    const h = createHarness();
    h.initialize();
    h.manifestReady();
    h.open();
    await Promise.resolve();
    const resources = h.current();
    const { mediaSource, segmentSinksStore, freezeResolver, ...contentResources } =
      resources;
    const oldDispose = vi.spyOn(mediaSource, "dispose");
    const calls: string[] = [];
    const reloaded = h.session
      .reloadMediaSource(h.sendMessage)
      .then(() => calls.push("reloaded"));
    expect(oldDispose).toHaveBeenCalledOnce();
    expect(h.current()).toBe(resources);
    expect(resources.mediaSource).not.toBe(mediaSource);
    expect(resources.segmentSinksStore).not.toBe(segmentSinksStore);
    expect(resources.freezeResolver).not.toBe(freezeResolver);
    expect(resources).toMatchObject(contentResources);
    expect(h.sendMessage.mock.calls.map(([msg]) => msg.type)).toEqual([
      CoreMessageType.CreateMediaSource,
      CoreMessageType.DisposeMediaSource,
      CoreMessageType.CreateMediaSource,
    ]);
    queueMicrotask(() => calls.push("before"));
    h.open();
    queueMicrotask(() => calls.push("after"));
    expect(calls).toEqual([]);
    await reloaded;
    expect(calls).toEqual(["before", "reloaded", "after"]);
    expect(h.callbacks.onReady).toHaveBeenCalledOnce();
    h.session.dispose("test cleanup");
  });

  it.each(["dispose", "supersede"])(
    "cancels a pending MediaSource reload on %s",
    async (action) => {
      const h = createHarness();
      h.initialize();
      h.manifestReady();
      h.open();
      await Promise.resolve();
      const reloading = h.session.reloadMediaSource(h.sendMessage);
      const oldMediaSource = h.current().mediaSource;
      let nextReload: Promise<void> | undefined;
      if (action === "dispose") {
        h.session.dispose("stop during reload");
      } else {
        nextReload = h.session.reloadMediaSource(h.sendMessage);
      }
      oldMediaSource.onMediaSourceReadyStateChanged?.("open");
      await expect(reloading).rejects.toSatisfy((error: unknown) =>
        TaskCanceller.isCancellationError(error),
      );
      if (nextReload !== undefined) {
        h.open();
        await nextReload;
      }
      h.session.dispose("test cleanup");
      const count = h.sendMessage.mock.calls.length;
      h.session.dispose("repeat cleanup");
      h.session.scheduleManifestRefresh({
        enablePartialRefresh: false,
        canUseUnsafeMode: false,
      });
      await expect(h.session.reloadMediaSource(h.sendMessage)).rejects.toThrow(
        "No content anymore",
      );
      expect(h.sendMessage).toHaveBeenCalledTimes(count);
      expect(h.session.state).toEqual({ type: "disposed", data: null });
    },
  );
});

describe("ContentSession manifest errors", () => {
  let h: ReturnType<typeof createHarness>;

  beforeEach(() => {
    features.transports.test = () =>
      ({ transportName: "dash", thumbnails: {} }) as ITransportPipelines;
    vi.spyOn(ManifestFetcher.prototype, "start").mockImplementation(() => undefined);
    h = createHarness();
    h.initialize();
  });

  afterEach(() => {
    h.session.dispose("test cleanup");
    delete features.transports.test;
    vi.restoreAllMocks();
  });

  it.each([false, true])(
    "reports preparation errors once when manifest readiness is %s",
    async (manifestReady) => {
      const error = new Error("manifest failed");
      if (manifestReady) {
        h.manifestReady();
      }
      emitFetcher(h.current().manifestFetcher, "error", error);
      expect(h.callbacks.onError).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(h.callbacks.onError).toHaveBeenCalledExactlyOnceWith(error);
      expect(h.callbacks.onReady).not.toHaveBeenCalled();
      expect(
        h.sendMessage.mock.calls.filter(([msg]) => msg.type === CoreMessageType.Error),
      ).toHaveLength(0);
    },
  );

  it("forwards fatal refresh errors after preparation has resolved", async () => {
    h.open();
    h.manifestReady();
    await Promise.resolve();
    const error = new Error("refresh failed");
    emitFetcher(h.current().manifestFetcher, "error", error);
    expect(h.callbacks.onError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("keeps forwarding retry warnings without treating them as fatal errors", async () => {
    h.open();
    h.manifestReady();
    await Promise.resolve();
    const warning = new Error("retry") as IManifestFetcherEvent["warning"];
    emitFetcher(h.current().manifestFetcher, "warning", warning);
    expect(h.callbacks.onWarning).toHaveBeenCalledExactlyOnceWith(warning);
    expect(h.callbacks.onError).not.toHaveBeenCalled();
  });

  it("ignores errors from disposed content", async () => {
    const fetcher = h.current().manifestFetcher;
    h.open();
    h.manifestReady();
    await Promise.resolve();
    h.session.dispose("content stopped");
    emitFetcher(fetcher, "error", new Error("disposed"));
    expect(h.callbacks.onError).not.toHaveBeenCalled();
  });
});
