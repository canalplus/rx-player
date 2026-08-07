import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  scheduleRequestWithCdns,
  scheduleRequestPromise,
} from "../../../../../../src/core/fetchers/utils/schedule_request.ts";
import { NetworkErrorTypes } from "../../../../../../src/errors/index.ts";
import { RequestError } from "../../../../../../src/utils/request/index.ts";
import TaskCanceller from "../../../../../../src/utils/task_canceller.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const { mockLog, mockCancellableSleep, mockGetFuzzedDelay, mockGetTimestamp } =
  vi.hoisted(() => {
    return {
      mockLog: { warn: vi.fn() },
      mockCancellableSleep: vi.fn(),
      mockGetFuzzedDelay: vi.fn((delay: number) => delay),
      mockGetTimestamp: vi.fn(() => 0),
    };
  });

vi.mock("../../../../../../src/core/log", () => ({ default: mockLog }));
vi.mock("../../../../../../src/core/utils/cancellable_sleep", () => ({
  default: mockCancellableSleep,
}));
vi.mock("../../../../../../src/core/utils/get_fuzzed_delay", () => ({
  default: mockGetFuzzedDelay,
}));
vi.mock("../../../../../../src/core/utils/monotonic_timestamp", () => ({
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
