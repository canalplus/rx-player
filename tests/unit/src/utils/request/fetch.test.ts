import { afterEach, describe, expect, it, vi } from "vitest";
import fetchRequest from "../../../../../src/utils/request/fetch.ts";
import TaskCanceller from "../../../../../src/utils/task_canceller.ts";

describe("fetchRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should expose Retry-After from an HTTP 429 response", async () => {
    const getHeader = vi.fn((name: string) => (name === "Retry-After" ? "3" : null));
    const mockFetch = vi.fn().mockResolvedValue({
      status: 429,
      url: "https://example.com/segment",
      headers: { get: getHeader },
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchRequest({
        url: "https://example.com/segment",
        onData: vi.fn(),
        cancelSignal: new TaskCanceller("test").signal,
      }),
    ).rejects.toMatchObject({
      name: "RequestError",
      status: 429,
      type: "ERROR_HTTP_CODE",
      retryAfter: "3",
    });
    expect(getHeader).toHaveBeenCalledWith("Retry-After");
  });
});
