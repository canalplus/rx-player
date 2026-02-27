import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import noop from "../../../../utils/noop";
import SharedReference from "../../../../utils/reference";
import SegmentQueue from "../segment_queue";
import type { ISegmentQueueContext } from "../segment_queue";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const { mockLog, mockCreateRequest, mockUpdatePriority } = vi.hoisted(() => {
  return {
    mockLog: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    mockCreateRequest: vi.fn(),
    mockUpdatePriority: vi.fn(),
  };
});

vi.mock("../../../../log", () => ({ default: mockLog }));

/** Build a minimal fake segment. */
function makeSegment(id: string, time = 0): { id: string; time: number } {
  return { id, time };
}

/** Build a minimal ISegmentQueueContext. */
function makeContent(type = "video"): ISegmentQueueContext {
  return {
    adaptation: { type } as any,
    manifest: {} as any,
    period: {} as any,
    representation: {} as any,
  };
}

/**
 * Build a fake IPrioritizedSegmentFetcher whose `createRequest` delegates to
 * the shared `mockCreateRequest` spy and returns a controllable Promise.
 */
function makeSegmentFetcher() {
  return {
    createRequest: mockCreateRequest,
    updatePriority: mockUpdatePriority,
  };
}

/** Default interrupted reference (not interrupted). */
function makeInterruptedRef(initial = false) {
  return new SharedReference<boolean>(initial);
}

/**
 * Helper that captures the callbacks passed to `createRequest` for a given
 * call index and exposes controls to simulate request lifecycle events.
 */
function captureRequestCallbacks(callIndex = 0) {
  const [, , callbacks] = mockCreateRequest.mock.calls[callIndex];
  return callbacks as {
    onRetry: (err: any) => void;
    beforeInterrupted: () => void;
    onChunk: (parse: (ts: number | undefined) => any) => void;
    onAllChunksReceived: () => void;
    beforeEnded: () => void;
  };
}

describe("SegmentQueue", () => {
  let fetcher: ReturnType<typeof makeSegmentFetcher>;
  let interruptedRef: SharedReference<boolean>;

  beforeEach(() => {
    fetcher = makeSegmentFetcher();
    interruptedRef = makeInterruptedRef();

    // Default createRequest: return a never-resolving promise so we can
    // control resolution manually.
    mockCreateRequest.mockReturnValue(new Promise(noop));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor / initial state", () => {
    it("initialises with no pending requests", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      expect(queue.getRequestedInitSegment()).toBeNull();
      expect(queue.getRequestedMediaSegment()).toBeNull();
    });
  });

  describe("stop()", () => {
    it("does nothing when called before resetForContent", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      expect(() => queue.stop("test")).not.toThrow();
    });

    it("cancels ongoing content after resetForContent", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const content = makeContent();
      const downloadQueue = queue.resetForContent(content, false, undefined);

      // Finishing the SharedReference signals the canceller propagated.
      // We check by verifying that further updates on the returned ref do
      // NOT trigger new requests after stop().
      queue.stop("reason");

      // NOTE: Doing this in dev build might trigger console.error calls, we
      // mute it in case
      vi.spyOn(console, "error").mockImplementation(noop);

      // Push a media segment – should not start a request.
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s1") as any, priority: 1 }],
      });

      // createRequest should never have been called (no init, queue was stopped).
      expect(mockCreateRequest).not.toHaveBeenCalled();
    });
  });

  describe("resetForContent()", () => {
    it("cancels the previous content when called a second time", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const content1 = makeContent("video");
      const downloadQueue1 = queue.resetForContent(content1, false, undefined);

      const content2 = makeContent("audio");
      queue.resetForContent(content2, false, undefined);

      // NOTE: Doing this in dev build might trigger console.error calls, we
      // mute it in case
      vi.spyOn(console, "error").mockImplementation(noop);

      // After the second call, the first downloadQueue should be finished;
      // pushing on it has no further effect.
      expect(() =>
        downloadQueue1.setValue({ initSegment: null, segmentQueue: [] }),
      ).not.toThrow();
    });

    it("returns a SharedReference with default empty value", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const ref = queue.resetForContent(makeContent(), false, undefined);
      const val = ref.getValue();
      expect(val.initSegment).toBeNull();
      expect(val.segmentQueue).toEqual([]);
    });
  });

  describe("getRequestedInitSegment / getRequestedMediaSegment", () => {
    it("returns null when no requests are in flight", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      queue.resetForContent(makeContent(), false, undefined);
      expect(queue.getRequestedInitSegment()).toBeNull();
      expect(queue.getRequestedMediaSegment()).toBeNull();
    });

    it("returns the init segment once its request starts", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const content = makeContent();
      const downloadQueue = queue.resetForContent(content, true, undefined);

      const initSeg = makeSegment("init-1");
      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 1 },
        segmentQueue: [],
      });

      expect(queue.getRequestedInitSegment()).toEqual(initSeg);
      expect(queue.getRequestedMediaSegment()).toBeNull();
    });

    it("returns the media segment once its request starts", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const content = makeContent();
      // hasInitSegment=false so media can start without waiting for init
      const downloadQueue = queue.resetForContent(content, false, undefined);

      const mediaSeg = makeSegment("media-1");
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: mediaSeg as any, priority: 2 }],
      });

      expect(queue.getRequestedMediaSegment()).toEqual(mediaSeg);
    });
  });

  describe("media segment downloading", () => {
    it("does not start a request when queue is empty", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      queue.resetForContent(makeContent(), false, undefined);
      // Default value already has an empty segmentQueue – no request expected.
      expect(mockCreateRequest).not.toHaveBeenCalled();
    });

    it("starts a request when a segment is added to the queue", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s1") as any, priority: 1 }],
      });

      expect(mockCreateRequest).toHaveBeenCalledTimes(1);
    });

    it("updates priority when segment priority changes", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      const seg = makeSegment("s1");
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: seg as any, priority: 5 }],
      });
      expect(mockCreateRequest).toHaveBeenCalledTimes(1);

      // Change priority of the same segment
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: seg as any, priority: 1 }],
      });

      expect(mockUpdatePriority).toHaveBeenCalledTimes(1);
      expect(mockUpdatePriority.mock.calls[0][1]).toBe(1);
    });

    it("restarts the queue when the next needed segment changes", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s1") as any, priority: 1 }],
      });
      expect(mockCreateRequest).toHaveBeenCalledTimes(1);

      // Swap to a different segment at the head of the queue
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s2") as any, priority: 1 }],
      });

      // A second createRequest should have been issued for the new segment
      expect(mockCreateRequest).toHaveBeenCalledTimes(2);
    });

    it("emits emptyQueue event when segment queue becomes empty mid-flight", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      const emptyQueueHandler = vi.fn();
      queue.addEventListener("emptyQueue", emptyQueueHandler);

      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s1") as any, priority: 1 }],
      });

      // Now empty the queue while request is in-flight
      downloadQueue.setValue({ initSegment: null, segmentQueue: [] });

      expect(emptyQueueHandler).toHaveBeenCalled();
    });

    it("emits requestRetry when onRetry callback is invoked", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      const retryHandler = vi.fn();
      queue.addEventListener("requestRetry", retryHandler);

      const seg = makeSegment("s1");
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: seg as any, priority: 1 }],
      });

      const cbs = captureRequestCallbacks(0);
      const fakeError = new Error("network error");
      cbs.onRetry(fakeError);

      expect(retryHandler).toHaveBeenCalledWith({ segment: seg, error: fakeError });
    });

    it("emits fullyLoadedSegment after onAllChunksReceived (no init wait)", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      const fullyLoadedHandler = vi.fn();
      queue.addEventListener("fullyLoadedSegment", fullyLoadedHandler);

      const seg = makeSegment("s1");
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: seg as any, priority: 1 }],
      });

      const cbs = captureRequestCallbacks(0);
      cbs.onAllChunksReceived();

      expect(fullyLoadedHandler).toHaveBeenCalledWith(seg);
    });

    it("emits parsedMediaSegment when a chunk is received (no init segment)", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      const parsedHandler = vi.fn();
      queue.addEventListener("parsedMediaSegment", parsedHandler);

      const seg = makeSegment("s1");
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: seg as any, priority: 1 }],
      });

      const cbs = captureRequestCallbacks(0);
      const fakeChunkData = { segmentType: "media", chunkData: "data" };
      cbs.onChunk(() => fakeChunkData as any);

      expect(parsedHandler).toHaveBeenCalled();
      expect(parsedHandler.mock.calls[0][0]).toMatchObject({
        segmentType: "media",
        segment: seg,
      });
    });

    it("moves to the next segment after beforeEnded is called", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      const seg1 = makeSegment("s1");
      const seg2 = makeSegment("s2");
      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [
          { segment: seg1 as any, priority: 1 },
          { segment: seg2 as any, priority: 1 },
        ],
      });

      expect(mockCreateRequest).toHaveBeenCalledTimes(1);

      // Simulate end of first request
      const cbs = captureRequestCallbacks(0);
      cbs.beforeEnded();

      // A second request should have started for s2
      expect(mockCreateRequest).toHaveBeenCalledTimes(2);
    });

    it("emits error and stops when the request promise rejects", async () => {
      let rejectRequest!: (err: unknown) => void;
      mockCreateRequest.mockReturnValueOnce(
        new Promise<void>((_, reject) => {
          rejectRequest = reject;
        }),
      );

      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      const errorHandler = vi.fn();
      queue.addEventListener("error", errorHandler);

      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s1") as any, priority: 1 }],
      });

      const fakeErr = new Error("fatal");
      rejectRequest(fakeErr);

      // Let microtasks run
      await Promise.resolve();
      await Promise.resolve();

      expect(errorHandler).toHaveBeenCalledWith(fakeErr);
    });
  });

  describe("init segment downloading", () => {
    it("starts an init segment request when one is provided", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), true, undefined);

      const initSeg = makeSegment("init-1");
      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 0 },
        segmentQueue: [],
      });

      expect(mockCreateRequest).toHaveBeenCalledTimes(1);
      expect(queue.getRequestedInitSegment()).toEqual(initSeg);
    });

    it("emits parsedInitSegment event when init chunk arrives", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), true, undefined);

      const parsedInitHandler = vi.fn();
      queue.addEventListener("parsedInitSegment", parsedInitHandler);

      const initSeg = makeSegment("init-1");
      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 0 },
        segmentQueue: [],
      });

      const cbs = captureRequestCallbacks(0);
      const fakeInitData = { segmentType: "init", initTimescale: 90000 };
      cbs.onChunk(() => fakeInitData as any);

      expect(parsedInitHandler).toHaveBeenCalled();
      expect(parsedInitHandler.mock.calls[0][0]).toMatchObject({
        segmentType: "init",
        segment: initSeg,
      });
    });

    it("updates init segment priority when it changes", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), true, undefined);

      const initSeg = makeSegment("init-1");
      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 5 },
        segmentQueue: [],
      });
      expect(mockCreateRequest).toHaveBeenCalledTimes(1);

      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 1 },
        segmentQueue: [],
      });

      expect(mockUpdatePriority).toHaveBeenCalledTimes(1);
      expect(mockUpdatePriority.mock.calls[0][1]).toBe(1);
    });

    it("cancels init request when initSegment is set to null", () => {
      const queue = new SegmentQueue(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), true, undefined);

      const initSeg = makeSegment("init-1");
      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 0 },
        segmentQueue: [],
      });

      // Should not throw when init segment is removed
      expect(() =>
        downloadQueue.setValue({ initSegment: null, segmentQueue: [] }),
      ).not.toThrow();
    });

    it("emits fullyLoadedSegment for init segment after onAllChunksReceived", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), true, undefined);

      const fullyLoadedHandler = vi.fn();
      queue.addEventListener("fullyLoadedSegment", fullyLoadedHandler);

      const initSeg = makeSegment("init-1");
      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 0 },
        segmentQueue: [],
      });

      const cbs = captureRequestCallbacks(0);
      const fakeInitData = { segmentType: "init", initTimescale: 90000 };
      cbs.onChunk(() => fakeInitData as any);
      cbs.onAllChunksReceived();

      expect(fullyLoadedHandler).toHaveBeenCalledWith(initSeg);
    });
  });

  describe("isMediaSegmentQueueInterrupted", () => {
    it("does not start media requests when interrupted from the start", () => {
      const interrupted = makeInterruptedRef(true);
      const queue = new SegmentQueue(fetcher, interrupted);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s1") as any, priority: 1 }],
      });

      expect(mockCreateRequest).not.toHaveBeenCalled();
    });

    it("resumes media requests when interrupted flag goes back to false", () => {
      const interrupted = makeInterruptedRef(true);
      const queue = new SegmentQueue(fetcher, interrupted);
      const downloadQueue = queue.resetForContent(makeContent(), false, undefined);

      downloadQueue.setValue({
        initSegment: null,
        segmentQueue: [{ segment: makeSegment("s1") as any, priority: 1 }],
      });

      expect(mockCreateRequest).not.toHaveBeenCalled();

      // Lift the interruption
      interrupted.setValue(false);

      expect(mockCreateRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe("media segment waiting on init metadata", () => {
    it("delays parsedMediaSegment until init timescale is known", () => {
      const queue = new SegmentQueue<unknown>(fetcher, interruptedRef);
      const downloadQueue = queue.resetForContent(makeContent(), true, undefined);

      const parsedMediaHandler = vi.fn();
      queue.addEventListener("parsedMediaSegment", parsedMediaHandler);

      const initSeg = makeSegment("init-1");
      const mediaSeg = makeSegment("media-1");

      // Set up both init and media segment in queue
      downloadQueue.setValue({
        initSegment: { segment: initSeg as any, priority: 0 },
        segmentQueue: [{ segment: mediaSeg as any, priority: 0 }],
      });

      // Two createRequest calls: one for init, one for media
      expect(mockCreateRequest).toHaveBeenCalledTimes(2);

      // The first call's callbacks represent the media segment
      const mediaCbs = captureRequestCallbacks(0);

      // Media chunk arrives BEFORE init has been parsed → handler not called yet
      mediaCbs.onChunk(() => ({ segmentType: "media", chunkData: "x" }) as any);
      expect(parsedMediaHandler).not.toHaveBeenCalled();

      // Now parse the init segment (resolves the SharedReference)
      const initCbs = captureRequestCallbacks(1);
      initCbs.onChunk(() => ({ segmentType: "init", initTimescale: 90000 }) as any);

      // After init timescale is set, the deferred media parse should fire
      expect(parsedMediaHandler).toHaveBeenCalled();
    });
  });
});
