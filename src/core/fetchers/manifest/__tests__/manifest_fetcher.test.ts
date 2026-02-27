import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import noop from "../../../../utils/noop";
import sleep from "../../../../utils/sleep";
import TaskCanceller from "../../../../utils/task_canceller";
import ManifestFetcher from "../manifest_fetcher";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

const {
  mockConfigGetCurrent,
  mockFormatError,
  mockLogInfo,
  mockLogWarn,
  mockLogDebug,
  mockLoadManifest,
  mockParseManifest,
  mockScheduleRequestPromise,
  mockErrorSelector,
  MockManifest,
} = vi.hoisted(() => {
  class MockManifestImplem {
    expired: Promise<void> | null = null;
    lifetime: number | undefined = undefined;
    clockOffset: number | undefined = undefined;
    updateUrl: string | undefined = undefined;
    replace = vi.fn();
    update = vi.fn();
    getUrls = vi.fn(() => ["http://example.com/manifest"]);
  }
  return {
    mockConfigGetCurrent: vi.fn(),
    mockFormatError: vi.fn((e: unknown) => e),
    mockLogInfo: vi.fn(),
    mockLogWarn: vi.fn(),
    mockLogDebug: vi.fn(),
    mockLoadManifest: vi.fn(),
    mockParseManifest: vi.fn(),
    mockScheduleRequestPromise: vi.fn((fn: () => Promise<unknown>) => fn()),
    mockErrorSelector: vi.fn((e: unknown) => e),
    MockManifest: MockManifestImplem,
  };
});

vi.mock("../../../../config", () => ({ default: { getCurrent: mockConfigGetCurrent } }));
vi.mock("../../../../errors", () => ({ formatError: mockFormatError }));
vi.mock("../../../../log", () => ({
  default: { info: mockLogInfo, warn: mockLogWarn, debug: mockLogDebug },
}));
vi.mock("../../../../manifest/classes", () => ({ default: MockManifest }));
vi.mock("../../utils/error_selector", () => ({ default: mockErrorSelector }));
vi.mock("../../utils/schedule_request", () => ({
  scheduleRequestPromise: mockScheduleRequestPromise,
}));

const DEFAULT_CONFIG = {
  DEFAULT_REQUEST_TIMEOUT: 30_000,
  DEFAULT_CONNECTION_TIMEOUT: 10_000,
  DEFAULT_MAX_MANIFEST_REQUEST_RETRY: 4,
  INITIAL_BACKOFF_DELAY_BASE: { LOW_LATENCY: 100, REGULAR: 200 },
  MAX_BACKOFF_DELAY_BASE: { LOW_LATENCY: 3_000, REGULAR: 10_000 },
  MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE: 5,
  MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE: 100,
  FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY: 2_000,
};

function makeSettings(overrides: Record<string, unknown> = {}) {
  return {
    lowLatencyMode: false,
    maxRetry: undefined,
    requestTimeout: undefined,
    connectionTimeout: undefined,
    minimumManifestUpdateInterval: 0,
    initialManifest: undefined,
    cmcdDataBuilder: null,
    ...overrides,
  };
}

function makePipelines(): any {
  return {
    transportName: "dash" as const,
    manifest: { loadManifest: mockLoadManifest, parseManifest: mockParseManifest },
  };
}

/** Resolved load response with sensible defaults */
function makeLoadResponse(overrides: Record<string, unknown> = {}) {
  return {
    responseData: {},
    size: 100,
    requestDuration: 10,
    sendingTime: 1_000,
    receivedTime: 1_010,
    ...overrides,
  };
}

describe.skip("ManifestFetcher", () => {
  beforeEach(() => {
    mockConfigGetCurrent.mockReturnValue(DEFAULT_CONFIG);
    mockFormatError.mockImplementation((e: unknown) => e);
    mockErrorSelector.mockImplementation((e: unknown) => e);
    mockScheduleRequestPromise.mockImplementation((fn: () => Promise<unknown>) => fn());
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("before start()", () => {
    it("scheduleManualRefresh is a no-op and does not throw", () => {
      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );
      expect(() =>
        fetcher.scheduleManualRefresh({
          enablePartialRefresh: false,
          delay: 0,
          canUseUnsafeMode: false,
        }),
      ).not.toThrow();
    });
  });

  describe("dispose()", () => {
    it("calls cancel with the given reason", () => {
      const mockCancel = vi.spyOn(TaskCanceller.prototype, "cancel");
      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );
      fetcher.dispose("test reason");
      expect(mockCancel).toHaveBeenCalledWith("test reason");
      mockCancel.mockRestore();
    });

    it("uses a default message when reason is undefined", () => {
      const mockCancel = vi.spyOn(TaskCanceller.prototype, "cancel");
      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );
      fetcher.dispose(undefined);
      expect(mockCancel).toHaveBeenCalledWith("ManifestFetcher dispose");
      mockCancel.mockRestore();
    });
  });

  describe("start() with a Manifest instance as initialManifest", () => {
    it("emits manifestReady immediately without fetching", async () => {
      const manifest = new MockManifest();
      const fetcher = new ManifestFetcher(
        undefined,
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );

      const onReady = vi.fn();
      fetcher.addEventListener("manifestReady", onReady);
      fetcher.start();
      await flushPromises();

      expect(onReady).toHaveBeenCalledWith(manifest);
      expect(mockLoadManifest).not.toHaveBeenCalled();
    });

    it("calling start() twice only emits manifestReady once", async () => {
      const manifest = new MockManifest();
      const fetcher = new ManifestFetcher(
        undefined,
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );

      const onReady = vi.fn();
      fetcher.addEventListener("manifestReady", onReady);
      fetcher.start();
      fetcher.start();
      await flushPromises();

      expect(onReady).toHaveBeenCalledTimes(1);
    });
  });

  describe("start() with raw initialManifest", () => {
    it("parses it and emits manifestReady (sync parser)", async () => {
      const manifest = new MockManifest();
      mockParseManifest.mockReturnValue({ manifest });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: { raw: true } }),
      );

      const onReady = vi.fn();
      fetcher.addEventListener("manifestReady", onReady);
      fetcher.start();
      await flushPromises();

      expect(mockParseManifest).toHaveBeenCalled();
      expect(onReady).toHaveBeenCalledWith(manifest);
      expect(mockLoadManifest).not.toHaveBeenCalled();
    });

    it("parses it and emits manifestReady (async parser)", async () => {
      const manifest = new MockManifest();
      mockParseManifest.mockReturnValue(Promise.resolve({ manifest }));

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: { raw: true } }),
      );

      const onReady = vi.fn();
      fetcher.addEventListener("manifestReady", onReady);
      fetcher.start();
      await flushPromises();

      expect(onReady).toHaveBeenCalledWith(manifest);
    });
  });

  describe("start() fetching from URL", () => {
    it("calls loadManifest with the first URL and emits manifestReady", async () => {
      const manifest = new MockManifest();
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );

      const onReady = vi.fn();
      fetcher.addEventListener("manifestReady", onReady);
      fetcher.start();
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledWith(
        "http://example.com/manifest",
        expect.objectContaining({ timeout: 30_000, connectionTimeout: 10_000 }),
        expect.anything(),
      );
      expect(onReady).toHaveBeenCalledWith(manifest);
    });

    it("passes undefined URL when no URLs are provided", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(undefined, makePipelines(), makeSettings());
      fetcher.start();
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledWith(
        undefined,
        expect.anything(),
        expect.anything(),
      );
    });

    it("sets timeout/connectionTimeout to undefined when given negative values", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ requestTimeout: -1, connectionTimeout: -1 }),
      );
      fetcher.start();
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timeout: undefined, connectionTimeout: undefined }),
        expect.anything(),
      );
    });

    it("uses custom requestTimeout and connectionTimeout when positive", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ requestTimeout: 5_000, connectionTimeout: 2_000 }),
      );
      fetcher.start();
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timeout: 5_000, connectionTimeout: 2_000 }),
        expect.anything(),
      );
    });

    it("includes CMCD payload when cmcdDataBuilder is set", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });
      const cmcdPayload = { sid: "abc" };

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({
          cmcdDataBuilder: { getCmcdDataForManifest: vi.fn(() => cmcdPayload) },
        }),
      );
      fetcher.start();
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cmcdPayload }),
        expect.anything(),
      );
    });

    it("emits error when loadManifest rejects", async () => {
      const loadError = new Error("network failure");
      mockLoadManifest.mockRejectedValue(loadError);

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );

      const onError = vi.fn();
      fetcher.addEventListener("error", onError);
      fetcher.start();
      await flushPromises();

      expect(onError).toHaveBeenCalledWith(loadError);
    });

    it("emits error when parseManifest throws", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      const parseError = new Error("parse failure");
      mockFormatError.mockReturnValue(parseError);
      mockParseManifest.mockImplementation(() => {
        throw parseError;
      });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );

      const onError = vi.fn();
      fetcher.addEventListener("error", onError);
      fetcher.start();
      await flushPromises();

      expect(onError).toHaveBeenCalledWith(parseError);
    });

    it("swallows the error when the canceller is already used at the time of failure", async () => {
      const mockIsUsed = vi.spyOn(TaskCanceller.prototype, "isUsed");
      mockIsUsed.mockImplementation(() => true);
      mockLoadManifest.mockRejectedValue(new Error("boom"));

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );

      const onError = vi.fn();
      fetcher.addEventListener("error", onError);
      fetcher.start();
      await flushPromises();

      expect(onError).not.toHaveBeenCalled();
      mockIsUsed.mockRestore();
    });
  });

  describe("backoff settings", () => {
    it("passes REGULAR delays in normal mode and uses config maxRetry as default", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ lowLatencyMode: false }),
      );
      fetcher.start();
      await flushPromises();

      expect(mockScheduleRequestPromise).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ baseDelay: 200, maxDelay: 10_000, maxRetry: 4 }),
        expect.anything(),
      );
    });

    it("passes LOW_LATENCY delays when lowLatencyMode is true", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ lowLatencyMode: true }),
      );
      fetcher.start();
      await flushPromises();

      expect(mockScheduleRequestPromise).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ baseDelay: 100, maxDelay: 3_000 }),
        expect.anything(),
      );
    });

    it("uses custom maxRetry from settings when provided", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ maxRetry: 10 }),
      );
      fetcher.start();
      await flushPromises();

      expect(mockScheduleRequestPromise).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ maxRetry: 10 }),
        expect.anything(),
      );
    });
  });

  describe("updateContentUrls()", () => {
    it("does not trigger a load when refreshNow is false", async () => {
      const manifest = new MockManifest();
      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await flushPromises();

      fetcher.updateContentUrls(["http://new.com/manifest"], false);
      await sleep(0);
      await flushPromises();

      expect(mockLoadManifest).not.toHaveBeenCalled();
    });

    it("triggers an immediate refresh with the new URL when refreshNow is true", async () => {
      const manifest = new MockManifest();
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await flushPromises();

      fetcher.updateContentUrls(["http://new.com/manifest"], true);
      await sleep(0);
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledWith(
        "http://new.com/manifest",
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("automatic refresh scheduling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    it("schedules a refresh after manifest.lifetime seconds", async () => {
      const manifest = new MockManifest();
      manifest.lifetime = 10;
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      vi.advanceTimersByTime(10_000);
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledTimes(1);
    });

    it("does not schedule a refresh when lifetime is undefined", async () => {
      const manifest = new MockManifest();
      manifest.lifetime = undefined;

      const fetcher = new ManifestFetcher(
        undefined,
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      vi.advanceTimersByTime(100_000);
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(mockLoadManifest).not.toHaveBeenCalled();
    });

    it("triggers a refresh when manifest.expired resolves", async () => {
      let resolveExpired!: () => void;
      const manifest = new MockManifest();
      manifest.expired = new Promise<void>((res) => {
        resolveExpired = res;
      });
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      resolveExpired();
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledTimes(1);
    });

    it("does not start a second refresh while one is already in-flight", async () => {
      const manifest = new MockManifest();
      // loader never resolves → refresh stays pending
      mockLoadManifest.mockReturnValue(
        new Promise(() => {
          /* pending */
        }),
      );

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      fetcher.scheduleManualRefresh({
        enablePartialRefresh: false,
        delay: 0,
        canUseUnsafeMode: false,
      });
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      fetcher.scheduleManualRefresh({
        enablePartialRefresh: false,
        delay: 0,
        canUseUnsafeMode: false,
      });
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledTimes(1);
    });

    it("respects minimumManifestUpdateInterval before firing a manual refresh", async () => {
      const manifest = new MockManifest();
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: new MockManifest() });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest, minimumManifestUpdateInterval: 5_000 }),
      );
      fetcher.start();
      await Promise.resolve();

      fetcher.scheduleManualRefresh({
        enablePartialRefresh: false,
        delay: 0,
        canUseUnsafeMode: false,
      });

      vi.advanceTimersByTime(4_999);
      expect(mockLoadManifest).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockLoadManifest).toHaveBeenCalledTimes(1);
    });
  });

  describe("full vs partial refresh", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    it("calls manifest.replace() on a full refresh", async () => {
      const manifest = new MockManifest();
      const refreshManifest = new MockManifest();
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: refreshManifest });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      fetcher.scheduleManualRefresh({
        enablePartialRefresh: false,
        delay: 0,
        canUseUnsafeMode: false,
      });
      vi.advanceTimersByTime(0);
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(manifest.replace).toHaveBeenCalledWith(refreshManifest);
      expect(manifest.update).not.toHaveBeenCalled();
    });

    it("calls manifest.update() on a partial refresh when updateUrl is set", async () => {
      const manifest = new MockManifest();
      manifest.updateUrl = "http://example.com/update";
      const refreshManifest = new MockManifest();
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: refreshManifest });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      fetcher.scheduleManualRefresh({
        enablePartialRefresh: true,
        delay: 0,
        canUseUnsafeMode: false,
      });
      vi.advanceTimersByTime(0);
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(manifest.replace).not.toHaveBeenCalled();
      expect(manifest.update).toHaveBeenCalledWith(refreshManifest);
    });

    it("falls back to a full refresh when manifest.update() throws, after a delay", async () => {
      const manifest = new MockManifest();
      manifest.updateUrl = "http://example.com/update";
      manifest.update.mockImplementationOnce(() => {
        throw new Error("conflict");
      });

      const refreshManifest = new MockManifest();
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: refreshManifest });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      fetcher.scheduleManualRefresh({
        enablePartialRefresh: true,
        delay: 0,
        canUseUnsafeMode: false,
      });
      vi.advanceTimersByTime(0);
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      // Fallback full refresh fires after FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY
      vi.advanceTimersByTime(DEFAULT_CONFIG.FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY);
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(manifest.replace).toHaveBeenCalledWith(refreshManifest);
      expect(mockLogWarn).toHaveBeenCalledWith(
        "MF",
        expect.stringContaining("Attempt to update Manifest failed"),
        "Re-downloading the Manifest fully",
      );
    });

    it("uses the prioritized URL (from updateContentUrls) and forces a full refresh", async () => {
      const manifest = new MockManifest();
      manifest.updateUrl = "http://example.com/update";
      const refreshManifest = new MockManifest();
      mockLoadManifest.mockResolvedValue(makeLoadResponse());
      mockParseManifest.mockReturnValue({ manifest: refreshManifest });

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings({ initialManifest: manifest }),
      );
      fetcher.start();
      await Promise.resolve();

      fetcher.updateContentUrls(["http://prioritized.com/manifest"], false);
      fetcher.scheduleManualRefresh({
        enablePartialRefresh: true,
        delay: 0,
        canUseUnsafeMode: false,
      });
      vi.advanceTimersByTime(0);
      await vi.waitFor(noop, { timeout: 0 }); // real delay
      await flushPromises();

      expect(mockLoadManifest).toHaveBeenCalledWith(
        "http://prioritized.com/manifest",
        expect.anything(),
        expect.anything(),
      );
      expect(manifest.replace).toHaveBeenCalled();
      expect(manifest.update).not.toHaveBeenCalled();
    });
  });

  describe("warning events from the parser", () => {
    it("emits a warning for each entry reported via the onWarnings callback", async () => {
      mockLoadManifest.mockResolvedValue(makeLoadResponse());

      let capturedOnWarnings!: (w: Error[]) => void;
      mockParseManifest.mockImplementation(
        (_data: unknown, _opts: unknown, onWarnings: (w: Error[]) => void) => {
          capturedOnWarnings = onWarnings;
          return { manifest: new MockManifest() };
        },
      );

      const parseWarning = new Error("minor issue");
      mockFormatError.mockReturnValue(parseWarning);

      const fetcher = new ManifestFetcher(
        ["http://example.com/manifest"],
        makePipelines(),
        makeSettings(),
      );

      const onWarning = vi.fn();
      fetcher.addEventListener("warning", onWarning);
      fetcher.start();
      await flushPromises();

      capturedOnWarnings([parseWarning]);

      expect(onWarning).toHaveBeenCalledWith(parseWarning);
    });
  });
});

/** Flush microtask queue */
async function flushPromises(ticks = 100) {
  for (let i = 0; i < ticks; i++) {
    await Promise.resolve();
  }
}
