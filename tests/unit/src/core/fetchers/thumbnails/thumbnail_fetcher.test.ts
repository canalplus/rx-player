import type { Mock } from "vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import type CdnPrioritizer from "../../../../../../src/core/fetchers/cdn_prioritizer.ts";
import createThumbnailFetcher from "../../../../../../src/core/fetchers/thumbnails/thumbnail_fetcher.ts";
import type { IBackoffSettings } from "../../../../../../src/core/fetchers/utils/schedule_request.ts";
import type { ICdnMetadata } from "../../../../../../src/parsers/manifest/index.ts";
import type {
  IRequestedData,
  IThumbnailLoader,
  IThumbnailParser,
} from "../../../../../../src/transports/index.ts";
import type { CancellationSignal } from "../../../../../../src/utils/task_canceller.ts";
import TaskCanceller, {
  CancellationError,
} from "../../../../../../src/utils/task_canceller.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const {
  mockConfig,
  mockLog,
  mockScheduleRequestWithCdns,
  mockFormatApiError,
  mockErrorSelector,
} = vi.hoisted(() => {
  return {
    mockConfig: {
      getCurrent: vi.fn(() => ({
        DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR: 3,
        DEFAULT_THUMBNAIL_REQUEST_TIMEOUT: 10000,
        DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT: 5000,
        INITIAL_BACKOFF_DELAY_BASE: { REGULAR: 200 },
        MAX_BACKOFF_DELAY_BASE: { REGULAR: 3000 },
      })),
    },
    mockLog: {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    mockScheduleRequestWithCdns: vi.fn(
      (
        cdns: ICdnMetadata[] | null,
        _cdnPrioritizer: CdnPrioritizer | null,
        performRequest: (
          cdn: ICdnMetadata | null,
          cancellationSignal: CancellationSignal,
        ) => Promise<IRequestedData<ArrayBuffer>>,
        _options: IBackoffSettings,
        globalCancellationSignal: CancellationSignal,
      ): Promise<IRequestedData<ArrayBuffer>> => {
        if (globalCancellationSignal.isCancelled()) {
          return Promise.reject(globalCancellationSignal.cancellationError);
        }
        return performRequest(cdns?.[0] ?? null, new TaskCanceller("test task").signal);
      },
    ),
    mockFormatApiError: vi.fn((err: unknown): any => err),
    mockErrorSelector: vi.fn((err: unknown): any => err),
  };
});

vi.mock("../../../../../../src/config", () => ({ default: mockConfig }));
vi.mock("../../../../../../src/log", () => ({ default: mockLog }));
vi.mock("../../../../../../src/core/fetchers/utils/schedule_request", () => ({
  scheduleRequestWithCdns: mockScheduleRequestWithCdns,
}));
vi.mock("../../../../../../src/errors/public_api", () => ({
  formatApiError: mockFormatApiError,
}));
vi.mock("../../../../../../src/core/fetchers/utils/error_selector", () => ({
  default: mockErrorSelector,
}));

describe("createThumbnailFetcher", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns a function (fetchThumbnail)", () => {
    const fetcher = createThumbnailFetcher(makePipeline(), null);
    expect(typeof fetcher).toBe("function");
  });

  describe("successful fetch", () => {
    it("calls loadThumbnail and parseThumbnail, returns parsed result", async () => {
      const pipeline = makePipeline(
        () =>
          Promise.resolve({
            responseData: new Uint8Array([0, 1, 2]).buffer,
            size: 3,
            requestDuration: 1000,
          }),
        (d) => ({ data: d, mimeType: "image/png", thumbnails: [] }),
      );
      pipeline.loadThumbnail.mockResolvedValue({
        responseData: new Uint8Array([7, 7, 7]).buffer,
        size: 3,
        requestDuration: 500,
      });

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller = new TaskCanceller("test");
      const ctx = makeThumbnailContext();

      const result = await fetcher(ctx, canceller.signal);
      expect(result).toEqual({
        data: new Uint8Array([7, 7, 7]).buffer,
        mimeType: "image/png",
        thumbnails: [],
      });
      expect(pipeline.parseThumbnail).toHaveBeenCalledTimes(1);
    });
  });

  describe("request deduplication", () => {
    it("shares the same promise when the same thumbnail is requested twice concurrently", async () => {
      const pipeline = makePipeline();
      let resolveRequest!: (v: IRequestedData<ArrayBuffer>) => void;
      mockScheduleRequestWithCdns.mockReturnValue(
        new Promise((res) => {
          resolveRequest = res;
        }),
      );
      pipeline.parseThumbnail.mockReturnValue({
        mimeType: "image/gif",
        data: new Uint8Array([4, 2, 2]).buffer,
        thumbnails: [],
      });

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller1 = new TaskCanceller("test1");
      const canceller2 = new TaskCanceller("test2");
      const ctx = makeThumbnailContext();

      const p1 = fetcher(ctx, canceller1.signal);
      const p2 = fetcher(ctx, canceller2.signal);

      // Only one network call should have been made
      expect(mockScheduleRequestWithCdns).toHaveBeenCalledTimes(1);

      resolveRequest({
        responseData: new Uint8Array([5, 6, 7]).buffer,
        size: 3,
        requestDuration: 900,
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual({
        mimeType: "image/gif",
        data: new Uint8Array([4, 2, 2]).buffer,
        thumbnails: [],
      });
      expect(r2).toEqual({
        mimeType: "image/gif",
        data: new Uint8Array([4, 2, 2]).buffer,
        thumbnails: [],
      });
    });

    it("makes a new request when thumbnails differ", async () => {
      const pipeline = makePipeline();
      mockScheduleRequestWithCdns.mockResolvedValue({
        responseData: new Uint8Array([7, 8, 7]).buffer,
        size: 3,
        requestDuration: 500,
      });

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller1 = new TaskCanceller("test1");
      const canceller2 = new TaskCanceller("test2");

      // Fetch sequentially so there is no overlap
      await fetcher(makeThumbnailContext({ segmentId: "seg-1" }), canceller1.signal);
      await fetcher(makeThumbnailContext({ segmentId: "seg-2" }), canceller2.signal);

      expect(mockScheduleRequestWithCdns).toHaveBeenCalledTimes(2);
    });
  });

  describe("cancellation", () => {
    it("rejects with CancellationError when the signal is already cancelled on entry", async () => {
      const pipeline = makePipeline();
      let resolveRequest!: (v: IRequestedData<ArrayBuffer>) => void;
      mockScheduleRequestWithCdns.mockReturnValue(
        new Promise((res) => {
          resolveRequest = res;
        }),
      );

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller = new TaskCanceller("test");
      const ctx = makeThumbnailContext();

      const fetchPromise = fetcher(ctx, canceller.signal);
      canceller.cancel("cancelled");
      resolveRequest({
        responseData: new Uint8Array([9, 7, 7]).buffer,
        size: 3,
        requestDuration: 500,
      });

      await expect(fetchPromise).rejects.toBeInstanceOf(CancellationError);
    });

    it("cancels the underlying request when all callers cancel", async () => {
      const pipeline = makePipeline();
      let rejectRequest!: (e: unknown) => void;
      mockScheduleRequestWithCdns.mockReturnValue(
        new Promise((_res, rej) => {
          rejectRequest = rej;
        }),
      );

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller1 = new TaskCanceller("test1");
      const canceller2 = new TaskCanceller("test2");
      const ctx = makeThumbnailContext();

      const p1 = fetcher(ctx, canceller1.signal);
      const p2 = fetcher(ctx, canceller2.signal);

      // Only one network request made
      expect(mockScheduleRequestWithCdns).toHaveBeenCalledTimes(1);

      canceller1.cancel("cancel1");
      // Request should still be live because p2 is still pending
      canceller2.cancel("cancel2");

      // Trigger the underlying rejection to settle the promises
      const cancelErr = new CancellationError("test task", "aborted");
      rejectRequest(cancelErr);

      await expect(p1).rejects.toBeInstanceOf(CancellationError);
      await expect(p2).rejects.toBeInstanceOf(CancellationError);
    });

    it("keeps the request alive when only one of two callers cancels", async () => {
      const pipeline = makePipeline();
      let resolveRequest!: (v: IRequestedData<ArrayBuffer>) => void;
      mockScheduleRequestWithCdns.mockReturnValue(
        new Promise((res) => {
          resolveRequest = res;
        }),
      );

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller1 = new TaskCanceller("test1");
      const canceller2 = new TaskCanceller("test2");
      const ctx = makeThumbnailContext();

      const p1 = fetcher(ctx, canceller1.signal);
      const p2 = fetcher(ctx, canceller2.signal);

      canceller1.cancel("only first cancels");
      resolveRequest({
        responseData: new Uint8Array([4, 7, 7]).buffer,
        size: 3,
        requestDuration: 500,
      });

      // p2 should still resolve
      const result = await p2;
      expect(result).toEqual({
        data: new Uint8Array([4, 7, 7]).buffer,

        // Default mocked characteristics
        mimeType: "image/png",
        thumbnails: [
          {
            height: 720,
            width: 1280,
            offsetX: 0,
            offsetY: 0,
            start: 0,
            end: Number.MAX_SAFE_INTEGER,
          },
        ],
      });

      // p1 should reject
      await expect(p1).rejects.toBeInstanceOf(CancellationError);
    });

    it("does not pass the first caller's cancellation signal to the shared loader", async () => {
      let loadSignal: CancellationSignal | undefined;
      let resolveRequest!: (v: IRequestedData<ArrayBuffer>) => void;
      const pipeline = makePipeline(
        (
          _cdnMetadata,
          _segment,
          _options,
          cancellationSignal: CancellationSignal,
        ): Promise<IRequestedData<ArrayBuffer>> => {
          loadSignal = cancellationSignal;
          return new Promise((res) => {
            resolveRequest = res;
          });
        },
      );

      mockScheduleRequestWithCdns.mockImplementation(
        (
          cdns: ICdnMetadata[] | null,
          _cdnPrioritizer: CdnPrioritizer | null,
          performRequest: (
            cdn: ICdnMetadata | null,
            cancellationSignal: CancellationSignal,
          ) => Promise<IRequestedData<ArrayBuffer>>,
          _options: IBackoffSettings,
          globalCancellationSignal: CancellationSignal,
        ): Promise<IRequestedData<ArrayBuffer>> => {
          return performRequest(cdns?.[0] ?? null, globalCancellationSignal);
        },
      );

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller1 = new TaskCanceller("test1");
      const canceller2 = new TaskCanceller("test2");
      const ctx = makeThumbnailContext();

      const p1 = fetcher(ctx, canceller1.signal);
      const p2 = fetcher(ctx, canceller2.signal);

      expect(mockScheduleRequestWithCdns).toHaveBeenCalledTimes(1);
      expect(loadSignal).not.toBe(canceller1.signal);
      expect(loadSignal).not.toBe(canceller2.signal);

      canceller1.cancel("only first cancels");
      expect(loadSignal?.isCancelled()).toBe(false);

      resolveRequest({
        responseData: new Uint8Array([4, 7, 7]).buffer,
        size: 3,
        requestDuration: 500,
      });

      await expect(p1).rejects.toBeInstanceOf(CancellationError);
      await expect(p2).resolves.toEqual({
        data: new Uint8Array([4, 7, 7]).buffer,
        mimeType: "image/png",
        thumbnails: [
          {
            height: 720,
            width: 1280,
            offsetX: 0,
            offsetY: 0,
            start: 0,
            end: Number.MAX_SAFE_INTEGER,
          },
        ],
      });
    });
  });

  describe("error handling", () => {
    it("throws a formatted error when the network request fails with a non-cancellation error", async () => {
      const networkError = new Error("network failure");
      const formattedError = new Error("formatted request error");
      mockScheduleRequestWithCdns.mockRejectedValue(networkError);
      mockErrorSelector.mockReturnValue(formattedError);

      const pipeline = makePipeline();
      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller = new TaskCanceller("test");

      await expect(fetcher(makeThumbnailContext(), canceller.signal)).rejects.toBe(
        formattedError,
      );
      expect(mockErrorSelector).toHaveBeenCalledWith(networkError);
    });

    it("throws a formatted error when parseThumbnail throws", async () => {
      const parseError = new Error("parse boom");
      const formattedParseError = new Error("formatted parse error");
      const pipeline = makePipeline();
      pipeline.loadThumbnail.mockResolvedValue({
        responseData: new Uint8Array([0, 1, 2]).buffer,
        size: 3,
        requestDuration: 1100,
      });
      pipeline.parseThumbnail.mockImplementation(() => {
        throw parseError;
      });
      mockFormatApiError.mockReturnValue(formattedParseError);

      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller = new TaskCanceller("test");

      await expect(fetcher(makeThumbnailContext(), canceller.signal)).rejects.toBe(
        formattedParseError,
      );
      expect(mockFormatApiError).toHaveBeenCalledWith(
        parseError,
        expect.objectContaining({
          defaultCode: "PIPELINE_PARSE_ERROR",
        }),
      );
    });

    it("propagates CancellationError from scheduleRequestWithCdns without wrapping", async () => {
      const cancelErr = new CancellationError("test task", "aborted");
      mockScheduleRequestWithCdns.mockRejectedValue(cancelErr);

      const pipeline = makePipeline();
      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller = new TaskCanceller("test");

      await expect(fetcher(makeThumbnailContext(), canceller.signal)).rejects.toBe(
        cancelErr,
      );
      // errorSelector should not be called for CancellationError
      expect(mockErrorSelector).not.toHaveBeenCalled();
    });
  });

  describe("retry logging", () => {
    it("calls onRetry and logs a warning when the request retries", async () => {
      const retryError = new Error("retry me");
      const formattedRetryError = new Error("formatted retry");
      mockErrorSelector.mockReturnValue(formattedRetryError);

      mockScheduleRequestWithCdns.mockImplementation(
        async (
          _cdns: ICdnMetadata[] | null,
          _cdnPrioritizer: CdnPrioritizer | null,
          _performRequest: (
            cdn: ICdnMetadata | null,
            cancellationSignal: CancellationSignal,
          ) => Promise<IRequestedData<ArrayBuffer>>,
          options: IBackoffSettings,
          _globalCancellationSignal: CancellationSignal,
        ) => {
          // Simulate the retry callback being invoked before eventual failure
          options.onRetry?.(retryError);
          throw retryError;
        },
      );
      mockErrorSelector.mockReturnValue(formattedRetryError);

      const pipeline = makePipeline();
      const fetcher = createThumbnailFetcher(pipeline, null);
      const canceller = new TaskCanceller("test");

      await expect(
        fetcher(makeThumbnailContext(), canceller.signal),
      ).rejects.toBeDefined();
      expect(mockLog.warn).toHaveBeenCalledWith(
        "Thumbnails",
        "Thumbnail request retry ",
        expect.any(Object),
        formattedRetryError,
      );
    });
  });
});

/**
 * Construct `pipeline` argument for a ThumbnailFetcher
 */
function makePipeline(
  loadThumbnailImpl?: IThumbnailLoader,
  parseThumbnailImpl?: IThumbnailParser,
): {
  loadThumbnail: Mock<IThumbnailLoader>;
  parseThumbnail: Mock<IThumbnailParser>;
} {
  return {
    loadThumbnail: vi.fn(
      loadThumbnailImpl ??
        (() =>
          Promise.resolve({
            responseData: new Uint8Array([0, 1, 2]).buffer,
            requestDuration: undefined,
            url: undefined,
            sendingTime: undefined,
            receivedTime: undefined,
            size: undefined,
          })),
    ),
    parseThumbnail: vi.fn(
      parseThumbnailImpl ??
        ((data: ArrayBuffer) => ({
          data,
          mimeType: "image/png",
          thumbnails: [
            {
              height: 720,
              width: 1280,
              offsetX: 0,
              offsetY: 0,
              start: 0,
              end: Number.MAX_SAFE_INTEGER,
            },
          ],
        })),
    ),
  };
}

function makeThumbnailContext(
  overrides: { segmentId?: string; trackId?: string; periodId?: string } = {},
): any {
  return {
    segment: { id: overrides.segmentId ?? "seg-1", time: 0 },
    track: { id: overrides.trackId ?? "track-1", cdnMetadata: [] },
    period: { id: overrides.periodId ?? "period-1" },
  };
}
