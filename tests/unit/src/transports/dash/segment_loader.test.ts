import { describe, expect, it, vi } from "vitest";
import log from "../../../../../src/log.ts";
import type { ISegmentLoader as ICustomSegmentLoader } from "../../../../../src/public_types.ts";
import generateSegmentLoader from "../../../../../src/transports/dash/segment_loader.ts";
import type {
  ISegmentContext,
  ISegmentLoaderCallbacks,
} from "../../../../../src/transports/types.ts";
import TaskCanceller from "../../../../../src/utils/task_canceller.ts";

describe("DASH segment loader", () => {
  it("should call the custom segmentLoader in low-latency mode", async () => {
    const customSegmentLoader = vi.fn<ICustomSegmentLoader>((_, callbacks) => {
      callbacks.resolve({ data: new ArrayBuffer(0) });
    });
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });

    await loader(
      { baseUrl: "https://example.com/", id: "cdn" },
      createSegmentContext(),
      { cmcdPayload: undefined },
      new TaskCanceller("test").signal,
      createCallbacks(),
    );

    expect(customSegmentLoader).toHaveBeenCalledOnce();
  });

  it("should communicate complete chunks before the request is resolved", async () => {
    const completeChunk = new Uint8Array([
      0,
      0,
      0,
      8,
      0x6d,
      0x6f,
      0x6f,
      0x66, // moof
      0,
      0,
      0,
      8,
      0x6d,
      0x64,
      0x61,
      0x74, // mdat
    ]);
    const customSegmentLoader: ICustomSegmentLoader = (_, callbacks) => {
      callbacks.data({ data: completeChunk.subarray(0, 10) });
      callbacks.data({ data: completeChunk.subarray(10) });
      callbacks.resolve({ data: null, duration: 12, size: completeChunk.length });
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });
    const callbacks = createCallbacks();

    const result = await loader(
      { baseUrl: "https://example.com/", id: "cdn" },
      createSegmentContext(),
      { cmcdPayload: undefined },
      new TaskCanceller("test").signal,
      callbacks,
    );

    expect(callbacks.onNewChunk).toHaveBeenCalledOnce();
    expect(callbacks.onNewChunk).toHaveBeenCalledWith(completeChunk);
    expect(result).toEqual({
      resultType: "chunk-complete",
      resultData: {
        url: "https://example.com/segment.m4s",
        size: completeChunk.length,
        requestDuration: 12,
      },
    });
  });

  it("should return the whole segment when no complete chunk could be extracted", async () => {
    const customSegmentLoader: ICustomSegmentLoader = (_, callbacks) => {
      callbacks.data({ data: new Uint8Array([1, 2]) });
      callbacks.resolve({ data: new Uint8Array([3, 4]) });
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });
    const callbacks = createCallbacks();

    const result = await loader(
      { baseUrl: "https://example.com/", id: "cdn" },
      createSegmentContext(),
      { cmcdPayload: undefined },
      new TaskCanceller("test").signal,
      callbacks,
    );

    expect(callbacks.onNewChunk).not.toHaveBeenCalled();
    expect(result.resultType).toBe("segment-loaded");
    if (result.resultType === "segment-loaded") {
      expect(result.resultData.responseData).toEqual(new Uint8Array([1, 2, 3, 4]));
    }
  });

  it("should ignore incomplete data remaining after a complete chunk", async () => {
    const completeChunk = new Uint8Array([
      0, 0, 0, 8, 0x6d, 0x6f, 0x6f, 0x66, 0, 0, 0, 8, 0x6d, 0x64, 0x61, 0x74,
    ]);
    const customSegmentLoader: ICustomSegmentLoader = (_, callbacks) => {
      callbacks.data({ data: completeChunk });
      callbacks.resolve({ data: new Uint8Array([0, 0, 0, 8]) });
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });
    const logWarn = vi.spyOn(log, "warn").mockImplementation(vi.fn());

    const result = await loader(
      { baseUrl: "https://example.com/", id: "cdn" },
      createSegmentContext(),
      { cmcdPayload: undefined },
      new TaskCanceller("test").signal,
      createCallbacks(),
    );

    expect(result).toEqual({
      resultType: "chunk-complete",
      resultData: {
        url: "https://example.com/segment.m4s",
        size: undefined,
        requestDuration: undefined,
      },
    });
    expect(logWarn).toHaveBeenCalledWith(
      "dash",
      "Ignoring incomplete data at the end of a custom segment request.",
    );
    logWarn.mockRestore();
  });

  it("should reject when resolving with no data", async () => {
    const customSegmentLoader: ICustomSegmentLoader = (_, callbacks) => {
      callbacks.resolve({ data: null });
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });

    await expect(
      loader(
        { baseUrl: "https://example.com/", id: "cdn" },
        createSegmentContext(),
        { cmcdPayload: undefined },
        new TaskCanceller("test").signal,
        createCallbacks(),
      ),
    ).rejects.toThrow("No data received when resolving the segment request.");
  });

  it("should ignore empty data", async () => {
    const customSegmentLoader: ICustomSegmentLoader = (_, callbacks) => {
      callbacks.data({ data: new Uint8Array(0) });
      callbacks.resolve({ data: null });
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });

    await expect(
      loader(
        { baseUrl: "https://example.com/", id: "cdn" },
        createSegmentContext(),
        { cmcdPayload: undefined },
        new TaskCanceller("test").signal,
        createCallbacks(),
      ),
    ).rejects.toThrow("No data received when resolving the segment request.");
  });

  it("should keep a custom loader error retryable when no chunk has been emitted", async () => {
    const customSegmentLoader: ICustomSegmentLoader = (_, callbacks) => {
      callbacks.data({ data: new Uint8Array([1, 2]) });
      callbacks.reject({ message: "Custom error", canRetry: true });
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });

    await expect(
      loader(
        { baseUrl: "https://example.com/", id: "cdn" },
        createSegmentContext(),
        { cmcdPayload: undefined },
        new TaskCanceller("test").signal,
        createCallbacks(),
      ),
    ).rejects.toMatchObject({ message: "Custom error", canRetry: true });
  });

  it("should keep a custom loader error retryable after a chunk has been emitted", async () => {
    const completeChunk = new Uint8Array([
      0, 0, 0, 8, 0x6d, 0x6f, 0x6f, 0x66, 0, 0, 0, 8, 0x6d, 0x64, 0x61, 0x74,
    ]);
    const customSegmentLoader: ICustomSegmentLoader = (_, callbacks) => {
      callbacks.data({ data: completeChunk });
      callbacks.reject({ message: "Custom error", canRetry: true });
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });

    await expect(
      loader(
        { baseUrl: "https://example.com/", id: "cdn" },
        createSegmentContext(),
        { cmcdPayload: undefined },
        new TaskCanceller("test").signal,
        createCallbacks(),
      ),
    ).rejects.toMatchObject({ message: "Custom error", canRetry: true });
  });

  it("should format an error synchronously thrown by the custom loader", async () => {
    const customSegmentLoader: ICustomSegmentLoader = () => {
      throw new Error("Synchronous custom error");
    };
    const loader = generateSegmentLoader({
      lowLatencyMode: true,
      segmentLoader: customSegmentLoader,
    });

    await expect(
      loader(
        { baseUrl: "https://example.com/", id: "cdn" },
        createSegmentContext(),
        { cmcdPayload: undefined },
        new TaskCanceller("test").signal,
        createCallbacks(),
      ),
    ).rejects.toMatchObject({
      message: "Synchronous custom error",
      canRetry: false,
    });
  });
});

function createSegmentContext(): ISegmentContext {
  return {
    segment: {
      id: "segment",
      isInit: false,
      time: 0,
      end: 4,
      duration: 4,
      timescale: 1,
      complete: true,
      privateInfos: {},
      url: "segment.m4s",
    },
    type: "video",
    language: undefined,
    isLive: true,
    periodStart: 0,
    periodEnd: undefined,
    mimeType: "video/mp4",
    baseCodecs: ["avc1.4d401f"],
    chosenCodec: "avc1.4d401f",
    manifestPublishTime: undefined,
  };
}

function createCallbacks(): ISegmentLoaderCallbacks<ArrayBuffer | Uint8Array | null> & {
  onNewChunk: ReturnType<
    typeof vi.fn<ISegmentLoaderCallbacks<ArrayBuffer | Uint8Array | null>["onNewChunk"]>
  >;
} {
  return {
    onProgress: vi.fn(),
    onNewChunk: vi.fn(),
  };
}
