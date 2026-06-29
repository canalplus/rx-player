import { afterEach, describe, expect, it, vi } from "vitest";
import request from "../../../../../src/utils/request/xhr.ts";

describe("xhr request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should expose Retry-After from an HTTP 429 response", async () => {
    const getResponseHeader = vi.fn((name: string) =>
      name === "Retry-After" ? "3" : null,
    );
    class FakeXMLHttpRequest {
      public static readonly DONE = 4;
      public static readonly HEADERS_RECEIVED = 2;

      public readonly abort = vi.fn();
      public readonly getResponseHeader = getResponseHeader;
      public readonly open = vi.fn();
      public readonly setRequestHeader = vi.fn();
      public onload: ((event: ProgressEvent) => void) | null = null;
      public readyState = FakeXMLHttpRequest.DONE;
      public responseType: XMLHttpRequestResponseType = "";
      public status = 429;
      public timeout = 0;

      public send(): void {
        this.onload?.(new ProgressEvent("load"));
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);

    await expect(
      request({ url: "https://example.com/segment", responseType: "text" }),
    ).rejects.toMatchObject({
      name: "RequestError",
      status: 429,
      type: "ERROR_HTTP_CODE",
      retryAfter: "3",
    });
    expect(getResponseHeader).toHaveBeenCalledWith("Retry-After");
  });
});
