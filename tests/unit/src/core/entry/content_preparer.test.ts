import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContentPreparer from "../../../../../src/core/entry/content_preparer.ts";
import { ManifestFetcher } from "../../../../../src/core/fetchers/index.ts";
import type { IManifestFetcherEvent } from "../../../../../src/core/fetchers/manifest/manifest_fetcher.ts";
import { CoreMessageType } from "../../../../../src/core/types.ts";
import type { ICoreMessage } from "../../../../../src/core/types.ts";
import { NetworkError } from "../../../../../src/errors/index.ts";
import features from "../../../../../src/features/index.ts";
import type { IContentInitializationData } from "../../../../../src/main_thread/types.ts";
import type { IManifest } from "../../../../../src/manifest/index.ts";
import WorkerMediaSourceInterface from "../../../../../src/mse/worker_media_source_interface.ts";
import dash from "../../../../../src/transports/dash/index.ts";
import { RequestError } from "../../../../../src/utils/request/index.ts";

class ManifestFetcherEvents extends ManifestFetcher {
  public static emit<T extends keyof IManifestFetcherEvent>(
    fetcher: ManifestFetcherEvents,
    event: T,
    value: IManifestFetcherEvent[T],
  ): void {
    fetcher.trigger(event, value);
  }
}

const context: IContentInitializationData = {
  contentId: "test-content",
  transport: "dash",
  enableRepresentationAvoidance: false,
  playbackSupport: { mseInWorker: false, videoTrack: true, textTrack: false },
  transportOptions: {
    lowLatencyMode: false,
    manifestLoader: undefined,
    segmentLoader: undefined,
    representationFilter: undefined,
  },
  manifestRetryOptions: {
    lowLatencyMode: false,
    maxRetry: 4,
    requestTimeout: undefined,
    connectionTimeout: undefined,
    minimumManifestUpdateInterval: 0,
    initialManifest: undefined,
  },
  segmentRetryOptions: {
    lowLatencyMode: false,
    maxRetry: 4,
    requestTimeout: undefined,
    connectionTimeout: undefined,
  },
};

describe("ContentPreparer manifest errors", () => {
  const originalDash = features.transports.dash;
  let preparer: ContentPreparer;

  beforeEach(() => {
    features.transports.dash = dash;
    vi.spyOn(ManifestFetcher.prototype, "start").mockImplementation(() => undefined);
    preparer = new ContentPreparer();
  });

  afterEach(() => {
    preparer.disposeCurrentContent("test cleanup");
    features.transports.dash = originalDash;
    vi.restoreAllMocks();
  });

  function initialize() {
    const sendMessage = vi.fn<(message: ICoreMessage) => void>();
    const ready = preparer.initializeNewContent(
      sendMessage,
      context,
      { limitResolution: {}, throttleBitrate: {} },
      {
        manifestLoaders: new Map(),
        segmentLoaders: new Map(),
        representationFilters: new Map(),
      },
    );
    const content = preparer.getCurrentContent();
    if (content === null) {
      throw new Error("Content was not initialized");
    }
    const manifest = { periods: [], addEventListener: vi.fn() } as unknown as IManifest;
    const error = new NetworkError(
      "PIPELINE_LOAD_ERROR",
      new RequestError("https://example.com/live.mpd", 0, "ERROR_EVENT"),
    );
    return { sendMessage, ready, content, manifest, error };
  }

  function openMediaSource() {
    const mediaSource = preparer.getCurrentContent()?.mediaSource;
    if (!(mediaSource instanceof WorkerMediaSourceInterface)) {
      throw new Error("Expected a worker MediaSource interface");
    }
    mediaSource.onMediaSourceReadyStateChanged("open");
  }

  it("rejects preparation when the initial manifest fails without sending a duplicate error", async () => {
    const { sendMessage, ready, content, error } = initialize();
    ManifestFetcherEvents.emit(content.manifestFetcher, "error", error);
    await expect(ready).rejects.toBe(error);
    expect(
      sendMessage.mock.calls.filter(([msg]) => msg.type === CoreMessageType.Error),
    ).toHaveLength(0);
  });

  it("still rejects preparation if the manifest is ready but the MediaSource is not open", async () => {
    const { sendMessage, ready, content, manifest, error } = initialize();
    ManifestFetcherEvents.emit(content.manifestFetcher, "manifestReady", manifest);
    ManifestFetcherEvents.emit(content.manifestFetcher, "error", error);
    await expect(ready).rejects.toBe(error);
    expect(
      sendMessage.mock.calls.filter(([msg]) => msg.type === CoreMessageType.Error),
    ).toHaveLength(0);
  });

  it("forwards fatal refresh errors after preparation has resolved", async () => {
    const { sendMessage, ready, content, manifest, error } = initialize();
    openMediaSource();
    ManifestFetcherEvents.emit(content.manifestFetcher, "manifestReady", manifest);
    await expect(ready).resolves.toBe(manifest);
    sendMessage.mockClear();

    ManifestFetcherEvents.emit(content.manifestFetcher, "error", error);

    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({
      type: CoreMessageType.Error,
      contentId: context.contentId,
      value: error.serialize(),
    });
  });

  it("keeps forwarding retry warnings without treating them as fatal errors", async () => {
    const { sendMessage, ready, content, manifest, error } = initialize();
    openMediaSource();
    ManifestFetcherEvents.emit(content.manifestFetcher, "manifestReady", manifest);
    await ready;
    sendMessage.mockClear();

    ManifestFetcherEvents.emit(content.manifestFetcher, "warning", error);

    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({
      type: CoreMessageType.Warning,
      contentId: context.contentId,
      value: error.serialize(),
    });
  });

  it("ignores errors from a disposed content", async () => {
    const { sendMessage, ready, content, manifest, error } = initialize();
    openMediaSource();
    ManifestFetcherEvents.emit(content.manifestFetcher, "manifestReady", manifest);
    await ready;
    preparer.disposeCurrentContent("content stopped");
    sendMessage.mockClear();

    ManifestFetcherEvents.emit(content.manifestFetcher, "error", error);

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
