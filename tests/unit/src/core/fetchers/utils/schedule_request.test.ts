import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CdnPrioritizer from "../../../../../../src/core/fetchers/cdn_prioritizer.ts";
import {
  scheduleRequestWithCdns,
  scheduleRequestPromise,
} from "../../../../../../src/core/fetchers/utils/schedule_request.ts";
import {
  CustomLoaderError,
  NetworkErrorTypes,
} from "../../../../../../src/errors/index.ts";
import type * as cancellableSleepModule from "../../../../../../src/utils/cancellable_sleep.ts";
import { RequestError } from "../../../../../../src/utils/request/index.ts";
import TaskCanceller from "../../../../../../src/utils/task_canceller.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const {
  mockConfigGetCurrent,
  mockLog,
  mockCancellableSleep,
  mockGetFuzzedDelay,
  mockGetTimestamp,
} = vi.hoisted(() => {
  return {
    mockConfigGetCurrent: vi.fn(),
    mockLog: { debug: vi.fn(), warn: vi.fn() },
    mockCancellableSleep: vi.fn(),
    mockGetFuzzedDelay: vi.fn((delay: number) => delay),
    mockGetTimestamp: vi.fn(() => 0),
  };
});

vi.mock("../../../../../../src/config", () => ({
  default: { getCurrent: mockConfigGetCurrent },
}));
vi.mock("../../../../../../src/log", () => ({ default: mockLog }));
vi.mock("../../../../../../src/utils/cancellable_sleep", () => ({
  default: mockCancellableSleep,
}));
vi.mock("../../../../../../src/utils/get_fuzzed_delay", () => ({
  default: mockGetFuzzedDelay,
}));
vi.mock("../../../../../../src/utils/monotonic_timestamp", () => ({
  default: mockGetTimestamp,
}));

const defaultOptions = {
  baseDelay: 100,
  maxDelay: 2000,
  maxRetry: 3,
  onRetry: vi.fn(),
};

function makeCdn(id: string): any {
  return { baseUrl: id };
}

beforeEach(() => {
  mockConfigGetCurrent.mockReturnValue({ MAX_RETRY_AFTER_DELAY: 60_000 });
  mockGetTimestamp.mockReturnValue(0);
  mockGetFuzzedDelay.mockImplementation((delay: number) => delay);
  // By default cancellableSleep resolves immediately
  mockCancellableSleep.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe.skip("scheduleRequestWithCdns", () => {
  it("resolves with the result of a successful request", async () => {
    const cdn = makeCdn("https://cdn1.example.com");
    const performRequest = vi.fn().mockResolvedValue("ok");
    const result = await scheduleRequestWithCdns(
      [cdn],
      null,
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );
    expect(result).toBe("ok");
    expect(performRequest).toHaveBeenCalledTimes(1);
    expect(performRequest).toHaveBeenCalledWith(cdn, expect.anything());
  });

  it("passes null cdn when cdns param is null", async () => {
    const performRequest = vi.fn().mockResolvedValue("data");
    await scheduleRequestWithCdns(
      null,
      null,
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );
    expect(performRequest).toHaveBeenCalledWith(null, expect.anything());
  });

  it("throws immediately if cancellationSignal is already cancelled", async () => {
    const cancellationError = new Error("cancelled");
    const signal: any = {
      cancellationError,
      isCancelled: () => true,
    };

    await expect(
      scheduleRequestWithCdns([makeCdn("a")], null, vi.fn(), defaultOptions, signal),
    ).rejects.toThrow("cancelled");
  });

  it("throws 'No CDN to request' when given an empty CDN array", async () => {
    await expect(
      scheduleRequestWithCdns(
        [],
        null,
        vi.fn(),
        defaultOptions,
        new TaskCanceller("test").signal,
      ),
    ).rejects.toThrow("No CDN to request");
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it("retries on a 500 HTTP error and resolves on second attempt", async () => {
    const cdn = makeCdn("https://cdn1.example.com");
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("recovered");

    const onRetry = vi.fn();
    const result = await scheduleRequestWithCdns(
      [cdn],
      null,
      performRequest,
      { ...defaultOptions, onRetry },
      new TaskCanceller("test").signal,
    );
    expect(result).toBe("recovered");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(error);
  });

  it("retries on TIMEOUT error", async () => {
    const cdn = makeCdn("https://cdn1.example.com");
    const error = new RequestError("url", 0, NetworkErrorTypes.TIMEOUT);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");
    const result = await scheduleRequestWithCdns(
      [cdn],
      null,
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );
    expect(result).toBe("ok");
  });

  it("does NOT retry on a 403 HTTP error and rejects immediately", async () => {
    const cdn = makeCdn("https://cdn1.example.com");
    const error = new RequestError("url", 403, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi.fn().mockRejectedValue(error);
    const onRetry = vi.fn();

    await expect(
      scheduleRequestWithCdns(
        [cdn],
        null,
        performRequest,
        { ...defaultOptions, maxRetry: 5, onRetry },
        new TaskCanceller("test").signal,
      ),
    ).rejects.toThrow();
    // 403 should not be retried — performRequest called once only
    expect(performRequest).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("blacklists a CDN after maxRetry exhaustion and rejects", async () => {
    const cdn = makeCdn("https://cdn1.example.com");
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi.fn().mockRejectedValue(error);
    const onRetry = vi.fn();
    const maxRetry = 2;

    await expect(
      scheduleRequestWithCdns(
        [cdn],
        null,
        performRequest,
        { ...defaultOptions, maxRetry, onRetry },
        new TaskCanceller("test").signal,
      ),
    ).rejects.toThrow();

    // initial attempt + maxRetry retries = maxRetry+1 calls
    expect(performRequest).toHaveBeenCalledTimes(maxRetry + 1);
  });

  it("falls over to next CDN when first CDN fails with a non-retryable error", async () => {
    const cdn1 = makeCdn("https://cdn1.example.com");
    const cdn2 = makeCdn("https://cdn2.example.com");
    // 403 is non-retryable → should move to cdn2
    const error403 = new RequestError("url", 403, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error403)
      .mockResolvedValueOnce("cdn2-response");

    const result = await scheduleRequestWithCdns(
      [cdn1, cdn2],
      null,
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );
    expect(result).toBe("cdn2-response");
    expect(performRequest).toHaveBeenNthCalledWith(1, cdn1, expect.anything());
    expect(performRequest).toHaveBeenNthCalledWith(2, cdn2, expect.anything());
  });

  it("rejects with the last error when all CDNs are exhausted", async () => {
    const cdn1 = makeCdn("cdn1");
    const cdn2 = makeCdn("cdn2");
    const error1 = new RequestError("url1", 403, NetworkErrorTypes.ERROR_HTTP_CODE);
    const error2 = new RequestError("url2", 403, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2);

    await expect(
      scheduleRequestWithCdns(
        [cdn1, cdn2],
        null,
        performRequest,
        defaultOptions,
        new TaskCanceller("test").signal,
      ),
    ).rejects.toThrow();
    expect(performRequest).toHaveBeenCalledTimes(2);
  });

  it("downgrades CDN in prioritizer after failure", async () => {
    const cdn = makeCdn("cdn1");
    const error = new RequestError("url", 403, NetworkErrorTypes.ERROR_HTTP_CODE);
    const cdnPrioritizer = {
      getCdnPreferenceForResource: vi.fn().mockReturnValue([cdn]),
      downgradeCdn: vi.fn(),
      addEventListener: vi.fn(),
    };
    const performRequest = vi.fn().mockRejectedValue(error);

    await expect(
      scheduleRequestWithCdns(
        [cdn],
        cdnPrioritizer as never,
        performRequest,
        defaultOptions,
        new TaskCanceller("test").signal,
      ),
    ).rejects.toThrow();

    expect(cdnPrioritizer.downgradeCdn).toHaveBeenCalledWith(cdn);
  });

  it("retries on INTEGRITY_ERROR", async () => {
    const cdn = makeCdn("cdn1");
    const integrityError = { code: "INTEGRITY_ERROR" };
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(integrityError)
      .mockResolvedValueOnce("ok");

    const result = await scheduleRequestWithCdns(
      [cdn],
      null,
      performRequest,
      { ...defaultOptions, maxRetry: 2 },
      new TaskCanceller("test").signal,
    );
    expect(result).toBe("ok");
  });

  it("computes exponential backoff delay capped at maxDelay", async () => {
    const cdn = makeCdn("cdn1");
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    // Fail twice then succeed
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("done");

    const baseDelay = 100;
    const maxDelay = 150;

    await scheduleRequestWithCdns(
      [cdn],
      null,
      performRequest,
      { baseDelay, maxDelay, maxRetry: 5, onRetry: vi.fn() },
      new TaskCanceller("test").signal,
    );

    // After 1st failure: delay = min(100 * 2^0, 150) = 100
    // After 2nd failure: delay = min(100 * 2^1, 150) = 150
    expect(mockGetFuzzedDelay).toHaveBeenNthCalledWith(1, 100);
    expect(mockGetFuzzedDelay).toHaveBeenNthCalledWith(2, 150);
  });
});

describe("scheduleRequestWithCdns backoff", () => {
  const cdn1 = { baseUrl: "cdn1" };
  const cdn2 = { baseUrl: "cdn2" };
  let requestCanceller: TaskCanceller;
  let prioritizerCanceller: TaskCanceller;
  let prioritizer: CdnPrioritizer;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    mockGetTimestamp.mockImplementation(() => Date.now());
    mockConfigGetCurrent.mockReturnValue({
      MAX_RETRY_AFTER_DELAY: 60_000,
      DEFAULT_CDN_DOWNGRADE_TIME: 60_000,
    });
    const { default: cancellableSleep } = await vi.importActual<
      typeof cancellableSleepModule
    >("../../../../../../src/utils/cancellable_sleep.ts");
    mockCancellableSleep.mockImplementation(cancellableSleep);
    requestCanceller = new TaskCanceller("test request");
    prioritizerCanceller = new TaskCanceller("test prioritizer");
    prioritizer = new CdnPrioritizer(prioritizerCanceller.signal);
  });

  afterEach(() => {
    requestCanceller.cancel("test cleanup");
    prioritizerCanceller.cancel("test cleanup");
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([50, 150])(
    "waits for the new CDN when priorities change at %i ms during a backoff",
    async (priorityChangeTime) => {
      mockConfigGetCurrent.mockReturnValue({
        MAX_RETRY_AFTER_DELAY: 60_000,
        DEFAULT_CDN_DOWNGRADE_TIME: 10,
      });
      const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
      let resolveRequest!: (value: string) => void;
      const replacementRequest = new Promise<string>((resolve) => {
        resolveRequest = resolve;
      });
      const performRequest = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockReturnValue(replacementRequest);
      const onSuccess = vi.fn();
      const onFailure = vi.fn();
      const result = scheduleRequestWithCdns(
        [cdn1, cdn2],
        prioritizer,
        performRequest,
        defaultOptions,
        requestCanceller.signal,
      ).then(onSuccess, onFailure);

      await vi.advanceTimersByTimeAsync(20);
      expect(performRequest).toHaveBeenCalledTimes(2);
      mockConfigGetCurrent.mockReturnValue({
        MAX_RETRY_AFTER_DELAY: 60_000,
        DEFAULT_CDN_DOWNGRADE_TIME: 60_000,
      });

      // Move the clock without running the timeout, which may be delayed by
      // a busy JS thread. Both CDNs can be retried from 100 ms onwards.
      vi.setSystemTime(priorityChangeTime);
      prioritizer.downgradeCdn(cdn1);
      await vi.advanceTimersByTimeAsync(Math.max(100 - priorityChangeTime, 0));

      expect(performRequest).toHaveBeenCalledTimes(3);
      expect(performRequest).toHaveBeenNthCalledWith(3, cdn2, requestCanceller.signal);
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onFailure).not.toHaveBeenCalled();
      expect(requestCanceller.signal.isCancelled()).toBe(false);

      resolveRequest("ok");
      await result;
      expect(onSuccess).toHaveBeenCalledExactlyOnceWith("ok");
      expect(onFailure).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(performRequest).toHaveBeenCalledTimes(3);
    },
  );

  it("forwards the request error if the retries fail after switching CDN", async () => {
    mockConfigGetCurrent.mockReturnValue({
      MAX_RETRY_AFTER_DELAY: 60_000,
      DEFAULT_CDN_DOWNGRADE_TIME: 10,
    });
    const initialError = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const lastError = new RequestError("url", 403, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(initialError)
      .mockRejectedValueOnce(initialError)
      .mockRejectedValue(lastError);
    const result = scheduleRequestWithCdns(
      [cdn1, cdn2],
      prioritizer,
      performRequest,
      defaultOptions,
      requestCanceller.signal,
    ).catch((err: unknown) => err);

    await vi.advanceTimersByTimeAsync(20);
    vi.setSystemTime(150);
    prioritizer.downgradeCdn(cdn1);
    expect(await result).toBe(lastError);
    expect(performRequest).toHaveBeenCalledTimes(4);
    expect(performRequest).toHaveBeenNthCalledWith(3, cdn2, requestCanceller.signal);
    expect(performRequest).toHaveBeenNthCalledWith(4, cdn1, requestCanceller.signal);
    expect(requestCanceller.signal.isCancelled()).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(performRequest).toHaveBeenCalledTimes(4);
  });

  it("still cancels while waiting for the new CDN's backoff", async () => {
    mockConfigGetCurrent.mockReturnValue({
      MAX_RETRY_AFTER_DELAY: 60_000,
      DEFAULT_CDN_DOWNGRADE_TIME: 10,
    });
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue("ok");
    const result = scheduleRequestWithCdns(
      [cdn1, cdn2],
      prioritizer,
      performRequest,
      defaultOptions,
      requestCanceller.signal,
    ).catch((err: unknown) => err);

    await vi.advanceTimersByTimeAsync(20);
    vi.setSystemTime(50);
    prioritizer.downgradeCdn(cdn1);
    await vi.advanceTimersByTimeAsync(0);
    requestCanceller.cancel("resource no longer needed");
    expect(await result).toBe(requestCanceller.signal.cancellationError);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(performRequest).toHaveBeenCalledTimes(2);
  });

  it("does not request again when CDN priorities change after a successful retry", async () => {
    const getCdnPreference = vi.spyOn(prioritizer, "getCdnPreferenceForResource");
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue("ok");
    const result = scheduleRequestWithCdns(
      [cdn1, cdn2],
      prioritizer,
      performRequest,
      defaultOptions,
      requestCanceller.signal,
    );

    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe("ok");
    expect(performRequest).toHaveBeenCalledTimes(3);
    expect(performRequest).toHaveBeenNthCalledWith(1, cdn1, requestCanceller.signal);
    expect(performRequest).toHaveBeenNthCalledWith(2, cdn2, requestCanceller.signal);
    expect(performRequest).toHaveBeenNthCalledWith(3, cdn1, requestCanceller.signal);

    await vi.advanceTimersByTimeAsync(60_000);
    getCdnPreference.mockClear();
    prioritizer.downgradeCdn(cdn1);
    await vi.advanceTimersByTimeAsync(0);
    expect(performRequest).toHaveBeenCalledTimes(3);
    expect(getCdnPreference).not.toHaveBeenCalled();
    expect(requestCanceller.signal.isCancelled()).toBe(false);
  });

  it("stops listening to CDN priorities when the last retry fails", async () => {
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi.fn().mockRejectedValue(error);
    const getCdnPreference = vi.spyOn(prioritizer, "getCdnPreferenceForResource");
    const result = scheduleRequestWithCdns(
      [cdn1],
      prioritizer,
      performRequest,
      { ...defaultOptions, maxRetry: 1 },
      requestCanceller.signal,
    );
    const rejection = expect(result).rejects.toBe(error);

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(performRequest).toHaveBeenCalledTimes(2);

    getCdnPreference.mockClear();
    prioritizer.downgradeCdn(cdn2);
    expect(getCdnPreference).not.toHaveBeenCalled();
    expect(requestCanceller.signal.isCancelled()).toBe(false);
  });

  it("still cancels a request waiting for its backoff", async () => {
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi.fn().mockRejectedValue(error);
    const getCdnPreference = vi.spyOn(prioritizer, "getCdnPreferenceForResource");
    const result = scheduleRequestWithCdns(
      [cdn1, cdn2],
      prioritizer,
      performRequest,
      defaultOptions,
      requestCanceller.signal,
    ).catch((err: unknown) => err);

    await vi.advanceTimersByTimeAsync(0);
    expect(performRequest).toHaveBeenCalledTimes(2);
    requestCanceller.cancel("resource no longer needed");
    expect(await result).toBe(requestCanceller.signal.cancellationError);

    getCdnPreference.mockClear();
    prioritizer.downgradeCdn(cdn1);
    await vi.advanceTimersByTimeAsync(200);
    expect(performRequest).toHaveBeenCalledTimes(2);
    expect(getCdnPreference).not.toHaveBeenCalled();
  });
});

describe("scheduleRequestPromise", () => {
  it("resolves with the performRequest result", async () => {
    const performRequest = vi.fn().mockResolvedValue("result");
    const result = await scheduleRequestPromise(
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );
    expect(result).toBe("result");
  });

  it("retries and resolves after transient failure", async () => {
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");
    const result = await scheduleRequestPromise(
      performRequest,
      { ...defaultOptions, maxRetry: 2 },
      new TaskCanceller("test").signal,
    );
    expect(result).toBe("ok");
  });

  it("uses a Retry-After header on 429 HTTP errors", async () => {
    const error = new RequestError("url", 429, NetworkErrorTypes.ERROR_HTTP_CODE, {
      retryAfter: "3",
    });
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    const result = await scheduleRequestPromise(
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );

    expect(result).toBe("ok");
    expect(mockCancellableSleep).toHaveBeenCalledWith(3000, expect.anything());
    expect(mockLog.warn).not.toHaveBeenCalled();
    expect(mockLog.debug).toHaveBeenCalledWith("utils", "Applying Retry-After delay.", {
      retryAfter: "3",
      selectedDelay: 3000,
    });
  });

  it("caps too long Retry-After delays and logs a warning", async () => {
    mockConfigGetCurrent.mockReturnValue({ MAX_RETRY_AFTER_DELAY: 1_000 });
    const retryAfter = "10000";
    const error = new RequestError("url", 429, NetworkErrorTypes.ERROR_HTTP_CODE, {
      retryAfter,
    });
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    await scheduleRequestPromise(
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );

    expect(mockCancellableSleep).toHaveBeenCalledWith(1_000, expect.anything());
    expect(mockLog.warn).toHaveBeenCalledWith("utils", "Capping Retry-After delay.", {
      retryAfter,
      maximumRetryAfterDelay: 1_000,
      selectedDelay: 1_000,
    });
  });

  it("falls back to the regular backoff for invalid Retry-After headers", async () => {
    const error = new RequestError("url", 429, NetworkErrorTypes.ERROR_HTTP_CODE, {
      retryAfter: "not-a-date",
    });
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    await scheduleRequestPromise(
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );

    expect(mockCancellableSleep).toHaveBeenCalledWith(100, expect.anything());
    expect(mockLog.debug).toHaveBeenCalledWith(
      "utils",
      "Ignoring invalid Retry-After header.",
      {
        retryAfter: "not-a-date",
        selectedDelay: 100,
      },
    );
  });

  it("ignores Retry-After headers on non-429 retryable HTTP errors", async () => {
    const error = new RequestError("url", 529, NetworkErrorTypes.ERROR_HTTP_CODE, {
      retryAfter: "3",
    });
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    await scheduleRequestPromise(
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );

    expect(mockCancellableSleep).toHaveBeenCalledWith(100, expect.anything());
  });

  it("uses a Retry-After header from a custom loader XHR on 429 errors", async () => {
    const getResponseHeader = vi.fn().mockReturnValue("2");
    const xhr = {
      status: 429,
      getResponseHeader,
    } as unknown as XMLHttpRequest;
    const error = new CustomLoaderError("Too many requests", true, xhr);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    await scheduleRequestPromise(
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );

    expect(mockCancellableSleep).toHaveBeenCalledWith(2000, expect.anything());
    expect(getResponseHeader).toHaveBeenCalledWith("Retry-After");
  });

  it("uses regular backoff when reading Retry-After from a custom loader throws", async () => {
    const getResponseHeader = vi.fn(() => {
      throw new Error("Cannot read response headers");
    });
    const xhr = {
      status: 429,
      getResponseHeader,
    } as unknown as XMLHttpRequest;
    const error = new CustomLoaderError("Too many requests", true, xhr);
    const performRequest = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    await scheduleRequestPromise(
      performRequest,
      defaultOptions,
      new TaskCanceller("test").signal,
    );

    expect(mockCancellableSleep).toHaveBeenCalledWith(100, expect.anything());
    expect(mockLog.debug).toHaveBeenCalledWith(
      "utils",
      "Could not read Retry-After header from custom loader XHR.",
    );
  });

  it("rejects after all retries are exhausted", async () => {
    const error = new RequestError("url", 500, NetworkErrorTypes.ERROR_HTTP_CODE);
    const performRequest = vi.fn().mockRejectedValue(error);
    await expect(
      scheduleRequestPromise(
        performRequest,
        { ...defaultOptions, maxRetry: 1 },
        new TaskCanceller("test").signal,
      ),
    ).rejects.toThrow();
    // 1 initial + 1 retry = 2 total
    expect(performRequest).toHaveBeenCalledTimes(2);
  });
});
