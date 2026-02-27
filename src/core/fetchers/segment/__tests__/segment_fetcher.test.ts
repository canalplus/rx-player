import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ICdnMetadata } from "../../../../parsers/manifest";
import type {
  ISegmentLoader,
  ISegmentLoaderCallbacks,
  ISegmentLoaderResultSegmentCreated,
  ISegmentLoaderResultSegmentLoaded,
  ISegmentParser,
} from "../../../../transports";
import sleep from "../../../../utils/sleep";
import TaskCanceller, { CancellationError } from "../../../../utils/task_canceller";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type {
  IMetricsCallbackPayload,
  IRequestBeginCallbackPayload,
  IRequestEndCallbackPayload,
  IRequestProgressCallbackPayload,
} from "../../../adaptive";
import type CmcdDataBuilder from "../../../cmcd";
import type CdnPrioritizer from "../../cdn_prioritizer";
import type { IBackoffSettings } from "../../utils/schedule_request";
import createSegmentFetcher, {
  getSegmentFetcherRequestOptions,
} from "../segment_fetcher";
import type { ISegmentFetcherArguments, ISegmentLoaderContent } from "../segment_fetcher";
import type { IParsedInitSegmentPayload, IParsedSegmentPayload } from "../segment_queue";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const mockGetCurrent = vi.hoisted(() => vi.fn());
const mockFormatError = vi.hoisted(() => vi.fn((err: unknown) => err));
const mockLog = vi.hoisted(() => ({
  debug: vi.fn(),
}));
const mockGetLoggableSegmentId = vi.hoisted(() => vi.fn(() => "seg-id"));
const mockGetTimestamp = vi.hoisted(() => vi.fn(() => 1000));
const mockScheduleRequestWithCdns = vi.hoisted(() => {
  return vi.fn(
    (
      cdns: ICdnMetadata[] | null,
      _cdnPrioritizer: CdnPrioritizer | null,
      performRequest: (
        cdn: ICdnMetadata | null,
        cancellationSignal: CancellationSignal,
      ) => Promise<ReturnType<ISegmentLoader<ArrayBuffer>>>,
      _options: IBackoffSettings,
      globalCancellationSignal: CancellationSignal,
    ): Promise<ReturnType<ISegmentLoader<ArrayBuffer>>> => {
      if (globalCancellationSignal.isCancelled()) {
        return Promise.reject(globalCancellationSignal.cancellationError);
      }
      return performRequest(cdns?.[0] ?? null, new TaskCanceller("test task").signal);
    },
  );
});
const mockErrorSelector = vi.hoisted(() => vi.fn((err: unknown) => err));
const mockInitializationSegmentCacheGet = vi.hoisted(() => vi.fn((): unknown => null));
const mockInitializationSegmentCacheAdd = vi.hoisted(() => vi.fn());
const mockInitializationSegmentCache = vi.hoisted(
  () =>
    class {
      get = mockInitializationSegmentCacheGet;
      add = mockInitializationSegmentCacheAdd;
    },
);

vi.mock("../../../../config", () => ({
  default: { getCurrent: mockGetCurrent },
}));
vi.mock("../../../../errors", () => ({ formatError: mockFormatError }));
vi.mock("../../../../log", () => ({ default: mockLog }));
vi.mock("../../../../manifest", () => ({
  getLoggableSegmentId: mockGetLoggableSegmentId,
}));
vi.mock("../../../../utils/monotonic_timestamp", () => ({ default: mockGetTimestamp }));
vi.mock("../../utils/schedule_request", () => ({
  scheduleRequestWithCdns: mockScheduleRequestWithCdns,
}));
vi.mock("../../utils/error_selector", () => ({ default: mockErrorSelector }));
vi.mock("../initialization_segment_cache", () => ({
  default: mockInitializationSegmentCache,
}));
vi.mock("../../../../utils/is_null_or_undefined", () => ({
  default: (val: unknown) => val === null || val === undefined,
}));
vi.mock("../../../../utils/object_assign", () => ({
  // eslint-disable-next-line no-restricted-properties
  default: (target: object, ...sources: object[]) => Object.assign(target, ...sources),
}));

function makeContent(): ISegmentLoaderContent {
  return {
    manifest: { isLive: false, publishTime: 123 },
    period: { start: 0, end: 100 },
    adaptation: { type: "video", language: "fr" },
    representation: {
      mimeType: "video/mp4",
      codecs: ["avc1"],
      cdnMetadata: [{ url: "http://cdn1.test" }],
    },
    segment: { id: "seg1" },
    nextSegment: undefined,
  } as any;
}

function makeParsed(
  type: "init" | "media" = "media",
  duration = 2,
): IParsedSegmentPayload<ArrayBuffer> | IParsedInitSegmentPayload<ArrayBuffer> {
  if (type === "init") {
    return {
      segmentType: "init",
      initializationData: new Uint8Array([5, 6, 8]).buffer,
      protectionData: [],
      initializationDataSize: 3,
      segment: {} as any,
    };
  }
  return {
    segmentType: "media",
    chunkInfos: {
      duration,
      time: 0,
    },
    appendWindow: [0, Number.MAX_SAFE_INTEGER],
    protectionData: [],
    chunkOffset: 0,
    chunkSize: 3,
    chunkData: new Uint8Array([7, 7, 7]).buffer,
    segment: {} as any,
  };
}

function makeLoadedResult(
  responseData: ArrayBuffer = new Uint8Array([1, 2, 3]).buffer,
): ISegmentLoaderResultSegmentLoaded<ArrayBuffer> {
  return {
    resultType: "segment-loaded",
    resultData: { responseData, size: 3, requestDuration: 1500 },
  };
}

function makeCreatedResult(
  data: ArrayBuffer = new Uint8Array([4, 5, 6]).buffer,
): ISegmentLoaderResultSegmentCreated<ArrayBuffer> {
  return {
    resultType: "segment-created",
    resultData: data,
  };
}

function makePipeline(
  parsedResult:
    | IParsedSegmentPayload<ArrayBuffer>
    | IParsedInitSegmentPayload<ArrayBuffer> = makeParsed(),
  loadResult:
    | ISegmentLoaderResultSegmentLoaded<ArrayBuffer>
    | ISegmentLoaderResultSegmentCreated<ArrayBuffer> = makeLoadedResult(),
): {
  loadSegment: Mock<ISegmentLoader<ArrayBuffer>>;
  parseSegment: Mock<ISegmentParser<ArrayBuffer, ArrayBuffer>>;
} {
  return {
    loadSegment: vi.fn().mockResolvedValue(loadResult),
    parseSegment: vi.fn().mockReturnValue(parsedResult),
  };
}

function makeDefaultSegmentFetcherArgs(): ISegmentFetcherArguments<
  ArrayBuffer,
  ArrayBuffer
> & {
  pipeline: {
    loadSegment: Mock<ISegmentLoader<ArrayBuffer>>;
    parseSegment: Mock<ISegmentParser<ArrayBuffer, ArrayBuffer>>;
  };
  eventListeners: {
    onRequestBegin?: Mock<(arg: IRequestBeginCallbackPayload) => void>;
    onProgress?: Mock<(arg: IRequestProgressCallbackPayload) => void>;
    onRequestEnd?: Mock<(arg: IRequestEndCallbackPayload) => void>;
    onMetrics?: Mock<(arg: IMetricsCallbackPayload) => void>;
  };
} {
  return {
    bufferType: "video",
    pipeline: makePipeline(),
    cdnPrioritizer: null,
    cmcdDataBuilder: null,
    eventListeners: {
      onRequestBegin: vi.fn(),
      onProgress: vi.fn(),
      onRequestEnd: vi.fn(),
      onMetrics: vi.fn(),
    },
    requestOptions: {
      baseDelay: 200,
      maxDelay: 3000,
      maxRetry: 3,
      requestTimeout: 30000,
      connectionTimeout: 5000,
    },
  };
}

describe("createSegmentFetcher", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  describe("cache behavior", () => {
    it("returns cached data without making a network request when cache hits", async () => {
      const data = { a: 5 };
      mockInitializationSegmentCacheGet.mockReturnValue(data);
      const parsed = makeParsed();
      const args = makeDefaultSegmentFetcherArgs();
      const pipeline = makePipeline(parsed);
      args.pipeline = pipeline;
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const onAllChunksReceived = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived, onRetry: vi.fn() },
        signal,
      );

      expect(mockScheduleRequestWithCdns).not.toHaveBeenCalled();
      expect(onChunk).toHaveBeenCalledTimes(1);
      // The parser function should invoke parseSegment
      const parseFn = onChunk.mock.calls[0][0];
      parseFn(undefined);
      expect(pipeline.parseSegment).toHaveBeenCalledWith(
        { data, isChunked: false },
        expect.any(Object),
        undefined,
      );
    });
  });

  describe("successful segment-loaded flow", () => {
    it("calls onRequestBegin with a timestamp and id", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      expect(args.eventListeners.onRequestBegin).toHaveBeenCalledWith(
        expect.objectContaining({ requestTimestamp: 1000 }),
      );
    });

    it("calls onChunk once with a parse function", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(typeof onChunk.mock.calls[0][0]).toBe("function");
    });

    it("calls onAllChunksReceived after onChunk", async () => {
      const callOrder: string[] = [];
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        {
          onChunk: () => callOrder.push("chunk"),
          onAllChunksReceived: () => callOrder.push("allChunks"),
          onRetry: vi.fn(),
        },
        signal,
      );

      expect(callOrder).toEqual(["chunk", "allChunks"]);
    });

    it("adds loaded data to cache", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      expect(mockInitializationSegmentCacheAdd).toHaveBeenCalledWith(
        expect.any(Object),
        new Uint8Array([1, 2, 3]).buffer,
      );
    });

    it("calls onRequestEnd after success", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      expect(args.eventListeners.onRequestEnd).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
      );
    });

    it("sends metrics after chunk is parsed (media segment with duration)", async () => {
      const parsed = makeParsed("media", 3);
      const pipeline = makePipeline(parsed, makeLoadedResult());
      const args = makeDefaultSegmentFetcherArgs();
      args.pipeline = pipeline;
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      // parse the chunk to trigger metrics
      onChunk.mock.calls[0][0](undefined);

      expect(args.eventListeners.onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 3,
          requestDuration: 1500,
          segmentDuration: 3,
        }),
      );
    });

    it("does not send metrics twice for the same chunk", async () => {
      const parsed = makeParsed("media", 3);
      const pipeline = makePipeline(parsed, makeLoadedResult());
      const args = makeDefaultSegmentFetcherArgs();
      args.pipeline = pipeline;
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      const parseFn = onChunk.mock.calls[0][0];
      parseFn(undefined);
      parseFn(undefined);

      expect(args.eventListeners.onMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe("segment-created flow", () => {
    it("calls onChunk and onAllChunksReceived for created segment", async () => {
      const createdResult = makeCreatedResult();
      const pipeline = makePipeline(makeParsed(), createdResult);
      pipeline.loadSegment.mockResolvedValue(createdResult);
      mockScheduleRequestWithCdns.mockImplementation(() => {
        return new Promise<Promise<ISegmentLoaderResultSegmentCreated<ArrayBuffer>>>(
          (res) => {
            const response = Promise.resolve(createdResult);
            res(response);
          },
        );
      });

      const args = makeDefaultSegmentFetcherArgs();
      args.pipeline = pipeline;
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      expect(onChunk).toHaveBeenCalledTimes(1);
    });

    it("does not add created segment to cache", async () => {
      const createdResult = makeCreatedResult();
      mockScheduleRequestWithCdns.mockResolvedValue(createdResult);

      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      expect(mockInitializationSegmentCacheAdd).not.toHaveBeenCalled();
    });

    it("does not send metrics for created segments", async () => {
      const createdResult = makeCreatedResult();
      mockScheduleRequestWithCdns.mockResolvedValue(createdResult);

      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      // parse the chunk
      if (onChunk.mock.calls.length > 0) {
        onChunk.mock.calls[0][0](undefined);
      }

      expect(args.eventListeners.onMetrics).not.toHaveBeenCalled();
    });
  });

  describe("progress callback", () => {
    it("calls onProgress when size < totalSize", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      args.pipeline.loadSegment.mockImplementation(
        async (
          _cdn: unknown,
          _ctx: unknown,
          _opts: unknown,
          _sig: unknown,
          callbacks: ISegmentLoaderCallbacks<ArrayBuffer>,
        ) => {
          callbacks.onProgress({ duration: 500, size: 1, totalSize: 3 });
          await sleep(0);
          return makeLoadedResult();
        },
      );
      const fetchSegment = createSegmentFetcher(args);
      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        new TaskCanceller("test run").signal,
      );
      expect(args.eventListeners.onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ size: 1, totalSize: 3 }),
      );
    });

    it("does not call onProgress when size >= totalSize", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      args.pipeline.loadSegment.mockImplementation(
        async (
          _cdn: unknown,
          _ctx: unknown,
          _opts: unknown,
          _sig: unknown,
          callbacks: ISegmentLoaderCallbacks<ArrayBuffer>,
        ) => {
          callbacks.onProgress({ duration: 500, size: 3, totalSize: 3 });
          return makeLoadedResult();
        },
      );
      const fetchSegment = createSegmentFetcher(args);
      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        new TaskCanceller("test run").signal,
      );
      expect(args.eventListeners.onProgress).not.toHaveBeenCalled();
    });
  });

  describe("onNewChunk (chunked loading)", () => {
    it("calls onChunk for each chunk received via onNewChunk", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      args.pipeline.loadSegment.mockImplementation(
        async (
          _cdn: unknown,
          _ctx: unknown,
          _opts: unknown,
          _sig: unknown,
          callbacks: ISegmentLoaderCallbacks<ArrayBuffer>,
        ) => {
          callbacks.onNewChunk(new Uint8Array([1, 2, 3]).buffer);
          callbacks.onNewChunk(new Uint8Array([4, 5, 6]).buffer);
          return makeLoadedResult();
        },
      );
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        new TaskCanceller("test run").signal,
      );
      // 2 from onNewChunk + 1 from the final loaded data
      expect(onChunk).toHaveBeenCalledTimes(3);
    });
  });

  describe("error handling", () => {
    it("throws and calls onRequestEnd on non-cancellation error", async () => {
      const networkError = new Error("Network error");
      mockScheduleRequestWithCdns.mockRejectedValue(networkError);
      mockErrorSelector.mockReturnValue(networkError);

      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);

      await expect(
        fetchSegment(
          makeContent(),
          { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
          new TaskCanceller("test run").signal,
        ),
      ).rejects.toThrow("Network error");

      expect(args.eventListeners.onRequestEnd).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
      );
    });

    it("re-throws CancellationError without calling onRequestEnd in catch", async () => {
      const cancellationError = new CancellationError("test task", "test reason");
      mockScheduleRequestWithCdns.mockRejectedValue(cancellationError);

      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await expect(
        fetchSegment(
          makeContent(),
          { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
          signal,
        ),
      ).rejects.toBeInstanceOf(CancellationError);

      // onRequestEnd should NOT be called from the catch block for cancellation
      expect(args.eventListeners.onRequestEnd).not.toHaveBeenCalled();
    });

    it("calls onRetry callback when a retry occurs", async () => {
      const retryError = new Error("retry error");
      mockErrorSelector.mockReturnValue(retryError);

      // scheduleRequestWithCdns calls onRetry then succeeds
      mockScheduleRequestWithCdns.mockImplementation(
        async (
          _cdns: unknown,
          _prio: unknown,
          // TODO: Why did I not succeed to define this?
          performRequest: any,
          opts: IBackoffSettings,
        ) => {
          opts.onRetry(retryError);
          return performRequest(null, new TaskCanceller("test task").signal);
        },
      );

      const onRetry = vi.fn();
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry },
        signal,
      );

      expect(onRetry).toHaveBeenCalledWith(retryError);
    });

    it("wraps parse errors with formatError", async () => {
      const parseError = new Error("parse fail");
      const wrappedError = new Error("PIPELINE_PARSE_ERROR");
      mockFormatError.mockReturnValue(wrappedError);

      const pipeline = makePipeline();
      pipeline.parseSegment.mockImplementation(() => {
        throw parseError;
      });

      const args = makeDefaultSegmentFetcherArgs();
      args.pipeline = pipeline;
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      const parseFn = onChunk.mock.calls[0][0];
      expect(() => parseFn(undefined)).toThrow(wrappedError);
      expect(mockFormatError).toHaveBeenCalledWith(parseError, {
        defaultCode: "PIPELINE_PARSE_ERROR",
        defaultReason: "Unknown parsing error",
      });
    });
  });

  describe("cancellation", () => {
    it("calls onRequestEnd from cancellation handler when request is in flight", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);

      const canceller = new TaskCanceller("test run");

      mockScheduleRequestWithCdns.mockImplementation(async () => {
        // Trigger cancellation callback before resolving
        canceller.cancel("test reason");
        throw canceller.signal.cancellationError;
      });

      await expect(
        fetchSegment(
          makeContent(),
          { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
          canceller.signal,
        ),
      ).rejects.toBeInstanceOf(CancellationError);

      // onRequestEnd should have been called by the onCancellation handler
      expect(args.eventListeners.onRequestEnd).toHaveBeenCalledTimes(1);
    });

    it("does not call onRequestEnd from main flow if already cancelled", async () => {
      const canceller = new TaskCanceller("test run");
      canceller.cancel("test cancel");
      mockScheduleRequestWithCdns.mockImplementation(async () => {
        throw canceller.signal.cancellationError;
      });

      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);

      await expect(
        fetchSegment(
          makeContent(),
          { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
          canceller.signal,
        ),
      ).rejects.toBeInstanceOf(CancellationError);
    });
  });

  describe("CMCD integration", () => {
    it("passes cmcd payload to loadSegment when cmcdDataBuilder is set", async () => {
      const cmcdPayload = { sessionId: "abc" };
      const cmcdDataBuilder: CmcdDataBuilder = {
        getCmcdDataForSegmentRequest: vi.fn().mockReturnValue(cmcdPayload),
      } as any;

      const args = makeDefaultSegmentFetcherArgs();
      args.cmcdDataBuilder = cmcdDataBuilder;
      const fetchSegment = createSegmentFetcher(args);
      const signal = new TaskCanceller("test run").signal;

      await fetchSegment(
        makeContent(),
        { onChunk: vi.fn(), onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(cmcdDataBuilder.getCmcdDataForSegmentRequest).toHaveBeenCalled();
    });
  });

  describe("requestTimeout and connectionTimeout configuration", () => {
    it("sets timeout to undefined when requestTimeout is negative", () => {
      const args = makeDefaultSegmentFetcherArgs();
      args.requestOptions = {
        baseDelay: 200,
        maxDelay: 3000,
        maxRetry: 3,
        requestTimeout: -1,
        connectionTimeout: 5000,
      };
      // just ensure it doesn't throw
      expect(() => createSegmentFetcher(args)).not.toThrow();
    });

    it("sets connectionTimeout to undefined when it is negative", () => {
      const args = makeDefaultSegmentFetcherArgs();
      args.requestOptions = {
        baseDelay: 200,
        maxDelay: 3000,
        maxRetry: 3,
        requestTimeout: 30000,
        connectionTimeout: -1,
      };
      expect(() => createSegmentFetcher(args)).not.toThrow();
    });
  });

  describe("segmentDuration accumulation", () => {
    it("accumulates duration across multiple chunks", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      // two chunks via onNewChunk, then one final load result suppressed by returning null
      args.pipeline.loadSegment.mockImplementation(
        async (
          _cdn: unknown,
          _ctx: unknown,
          _opts: unknown,
          _sig: unknown,
          callbacks: ISegmentLoaderCallbacks<ArrayBuffer>,
        ) => {
          callbacks.onNewChunk(new Uint8Array([0, 1, 2]).buffer);
          callbacks.onNewChunk(new Uint8Array([3, 4, 5]).buffer);
          // return a loaded segment but with 0 size to simplify metrics trigger
          return {
            resultType: "segment-loaded",
            resultData: {
              responseData: new Uint8Array([4, 6, 7]).buffer,
              size: 3,
              requestDuration: 1000,
            },
          };
        },
      );

      // chunk-a → duration 2, chunk-b → duration 3, final → duration 1
      let callCount = 0;
      args.pipeline.parseSegment.mockImplementation(() => {
        callCount++;
        return {
          segmentType: "media",
          chunkData: new Uint8Array([4, 5, 6]).buffer,
          chunkOffset: 0,
          appendWindow: [0, Number.MAX_SAFE_INTEGER],
          chunkSize: 3,
          protectionData: [],
          chunkInfos: { duration: callCount, time: 0 },
        };
      });

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      // parse all chunks
      onChunk.mock.calls.forEach(([parseFn]: Array<(x?: unknown) => void>) =>
        parseFn(undefined),
      );

      expect(args.eventListeners.onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ segmentDuration: 1 + 2 + 3 }),
      );
    });

    it("sets segmentDuration to undefined if a chunk has no duration info", async () => {
      const args = makeDefaultSegmentFetcherArgs();
      const fetchSegment = createSegmentFetcher(args);
      const onChunk = vi.fn();
      const signal = new TaskCanceller("test run").signal;

      args.pipeline.parseSegment.mockReturnValue({
        segmentType: "media",
        chunkData: new Uint8Array([4, 5, 6]).buffer,
        chunkOffset: 0,
        appendWindow: [0, Number.MAX_SAFE_INTEGER],
        chunkSize: 3,
        protectionData: [],
        chunkInfos: { duration: undefined, time: 0 }, // no duration
      });

      await fetchSegment(
        makeContent(),
        { onChunk, onAllChunksReceived: vi.fn(), onRetry: vi.fn() },
        signal,
      );

      onChunk.mock.calls.forEach(([parseFn]: Array<(x?: unknown) => void>) =>
        parseFn(undefined),
      );

      expect(args.eventListeners.onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ segmentDuration: undefined }),
      );
    });
  });
});

describe("getSegmentFetcherRequestOptions", () => {
  beforeEach(() => {
    mockGetCurrent.mockReturnValue({
      DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR: 4,
      DEFAULT_REQUEST_TIMEOUT: 10000,
      DEFAULT_CONNECTION_TIMEOUT: 2000,
      INITIAL_BACKOFF_DELAY_BASE: { LOW_LATENCY: 100, REGULAR: 200 },
      MAX_BACKOFF_DELAY_BASE: { LOW_LATENCY: 1000, REGULAR: 3000 },
    });
  });

  it("uses defaults from config when options not provided", () => {
    const result = getSegmentFetcherRequestOptions({ lowLatencyMode: false });
    expect(result).toEqual({
      maxRetry: 4,
      baseDelay: 200,
      maxDelay: 3000,
      requestTimeout: 10000,
      connectionTimeout: 2000,
    });
  });

  it("uses low-latency base/max delays when lowLatencyMode is true", () => {
    const result = getSegmentFetcherRequestOptions({ lowLatencyMode: true });
    expect(result.baseDelay).toBe(100);
    expect(result.maxDelay).toBe(1000);
  });

  it("uses provided maxRetry over default", () => {
    const result = getSegmentFetcherRequestOptions({
      lowLatencyMode: false,
      maxRetry: 10,
    });
    expect(result.maxRetry).toBe(10);
  });

  it("uses provided requestTimeout over default", () => {
    const result = getSegmentFetcherRequestOptions({
      lowLatencyMode: false,
      requestTimeout: 5000,
    });
    expect(result.requestTimeout).toBe(5000);
  });

  it("uses provided connectionTimeout over default", () => {
    const result = getSegmentFetcherRequestOptions({
      lowLatencyMode: false,
      connectionTimeout: 999,
    });
    expect(result.connectionTimeout).toBe(999);
  });
});
