import { describe, it, expect, vi, afterEach } from "vitest";
import { CoreMessageType } from "../../../../src/core/types.ts";
import { SourceBufferError } from "../../../../src/errors/index.ts";
import { SourceBufferType } from "../../../../src/mse/types.ts";
import WorkerMediaSourceInterface, {
  WorkerSourceBufferInterface,
} from "../../../../src/mse/worker_media_source_interface.ts";
import { CancellationError } from "../../../../src/utils/task_canceller.ts";

const { mockLog } = vi.hoisted(() => {
  return {
    mockLog: {
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("../../../../src/log", () => ({ default: mockLog }));

function makeMessageSender() {
  return vi.fn();
}

function makeWmsi(messageSender = makeMessageSender()) {
  return {
    wmsi: new WorkerMediaSourceInterface("ms-id-1", "content-1", messageSender),
    messageSender,
  };
}

function makeWsbi(messageSender = makeMessageSender()) {
  const wsbi = new WorkerSourceBufferInterface(
    SourceBufferType.Video,
    "video/mp4; codecs=avc1",
    "ms-id-1",
    messageSender,
  );
  return { wsbi, messageSender };
}

/**
 * Returns the first argument of the mock's most recent call, cast to T.
 * Throws if the mock was never called, so tests fail clearly rather than
 * silently receiving `undefined`.
 */
function getLastCallFirstArg<T>(fn: ReturnType<typeof vi.fn>): T {
  if (fn.mock.lastCall === undefined) {
    throw new Error("Mock was never called");
  }
  return fn.mock.lastCall[0] as T;
}

describe("WorkerMediaSourceInterface", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("sends a CreateMediaSource message on construction", () => {
    const messageSender = makeMessageSender();
    new WorkerMediaSourceInterface("ms-id-1", "content-1", messageSender);
    expect(messageSender).toHaveBeenCalledOnce();
    expect(messageSender).toHaveBeenCalledWith({
      contentId: "content-1",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mediaSourceId: expect.stringMatching(/\d+/),
      type: CoreMessageType.CreateMediaSource,
    });
  });

  it("initialises readyState as 'closed' and sourceBuffers as []", () => {
    const { wmsi } = makeWmsi();
    expect(wmsi.readyState).toBe("closed");
    expect(wmsi.sourceBuffers).toEqual([]);
  });

  describe("onMediaSourceReadyStateChanged", () => {
    it("sets readyState to 'open' and triggers mediaSourceOpen", async () => {
      const { wmsi } = makeWmsi();
      const prom = new Promise<void>((res, rej) => {
        wmsi.addEventListener("mediaSourceOpen", () => {
          wmsi.dispose("testend");
          res();
        });
        wmsi.addEventListener("mediaSourceEnded", () => {
          rej();
        });
        wmsi.addEventListener("mediaSourceClose", () => {
          rej();
        });
      });
      wmsi.onMediaSourceReadyStateChanged("open");
      expect(wmsi.readyState).toBe("open");
      await prom;
    });

    it("sets readyState to 'ended' and triggers mediaSourceEnded", async () => {
      const { wmsi } = makeWmsi();
      const prom = new Promise<void>((res, rej) => {
        wmsi.addEventListener("mediaSourceOpen", () => {
          rej();
        });
        wmsi.addEventListener("mediaSourceEnded", () => {
          wmsi.dispose("testend");
          res();
        });
        wmsi.addEventListener("mediaSourceClose", () => {
          rej();
        });
      });
      wmsi.onMediaSourceReadyStateChanged("ended");
      expect(wmsi.readyState).toBe("ended");
      await prom;
    });

    it("sets readyState to 'closed' and triggers mediaSourceClose", async () => {
      const { wmsi } = makeWmsi();
      const prom = new Promise<void>((res, rej) => {
        let hasReceivedOpen = false;
        wmsi.addEventListener("mediaSourceOpen", () => {
          hasReceivedOpen = true;
        });
        wmsi.addEventListener("mediaSourceEnded", () => {
          rej();
        });
        wmsi.addEventListener("mediaSourceClose", () => {
          expect(hasReceivedOpen).toEqual(true);
          wmsi.dispose("testend");
          res();
        });
      });
      wmsi.onMediaSourceReadyStateChanged("open");
      wmsi.onMediaSourceReadyStateChanged("closed");
      expect(wmsi.readyState).toBe("closed");
      await prom;
    });
  });

  describe("addSourceBuffer", () => {
    it("sends an AddSourceBuffer message with correct fields", () => {
      const { wmsi, messageSender } = makeWmsi();
      messageSender.mockClear();
      wmsi.addSourceBuffer(SourceBufferType.Video, "video/mp4; codecs=avc1");
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.AddSourceBuffer,
        mediaSourceId: "ms-id-1",
        value: {
          sourceBufferType: SourceBufferType.Video,
          codec: "video/mp4; codecs=avc1",
        },
      });
    });

    it("pushes a WorkerSourceBufferInterface into sourceBuffers and returns it", () => {
      const { wmsi } = makeWmsi();
      const sb = wmsi.addSourceBuffer(
        SourceBufferType.Audio,
        "audio/mp4; codecs=mp4a.40.2",
      );
      expect(wmsi.sourceBuffers).toHaveLength(1);
      expect(wmsi.sourceBuffers[0]).toBe(sb);
      expect(sb).toBeInstanceOf(WorkerSourceBufferInterface);
    });
  });

  describe("setDuration", () => {
    it("sends an UpdateMediaSourceDuration message", () => {
      const { wmsi, messageSender } = makeWmsi();
      messageSender.mockClear();
      wmsi.setDuration(120.5, true);
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.UpdateMediaSourceDuration,
        mediaSourceId: "ms-id-1",
        value: {
          duration: 120.5,
          isRealEndKnown: true,
        },
      });
    });
  });

  describe("interruptDurationSetting", () => {
    it("sends an InterruptMediaSourceDurationUpdate message", () => {
      const { wmsi, messageSender } = makeWmsi();
      messageSender.mockClear();
      wmsi.interruptDurationSetting();
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.InterruptMediaSourceDurationUpdate,
        mediaSourceId: "ms-id-1",
        value: null,
      });
    });
  });

  describe("maintainEndOfStream", () => {
    it("sends an EndOfStream message", () => {
      const { wmsi, messageSender } = makeWmsi();
      messageSender.mockClear();
      wmsi.maintainEndOfStream();
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.EndOfStream,
        mediaSourceId: "ms-id-1",
        value: null,
      });
    });
  });

  describe("stopEndOfStream", () => {
    it("sends an InterruptEndOfStream message", () => {
      const { wmsi, messageSender } = makeWmsi();
      messageSender.mockClear();
      wmsi.stopEndOfStream();
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.InterruptEndOfStream,
        mediaSourceId: "ms-id-1",
        value: null,
      });
    });
  });

  describe("dispose", () => {
    it("sends a DisposeMediaSource message", () => {
      const { wmsi, messageSender } = makeWmsi();
      messageSender.mockClear();
      wmsi.dispose("test reason");
      expect(messageSender).toHaveBeenCalledWith({
        mediaSourceId: "ms-id-1",
        type: CoreMessageType.DisposeMediaSource,
        value: null,
      });
    });

    it("calls dispose on every child source buffer", () => {
      const { wmsi, messageSender } = makeWmsi();
      wmsi.addSourceBuffer(SourceBufferType.Video, "video/mp4");
      wmsi.addSourceBuffer(SourceBufferType.Audio, "audio/mp4");
      messageSender.mockClear();
      wmsi.dispose("cleanup");
      expect(messageSender).toHaveBeenCalledWith({
        mediaSourceId: "ms-id-1",
        type: CoreMessageType.AbortSourceBuffer,
        sourceBufferType: SourceBufferType.Video,
        value: null,
      });
      expect(messageSender).toHaveBeenCalledWith({
        mediaSourceId: "ms-id-1",
        type: CoreMessageType.AbortSourceBuffer,
        sourceBufferType: SourceBufferType.Audio,
        value: null,
      });
    });
  });
});

describe("WorkerSourceBufferInterface", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("initialises with correct type, codec, empty queues", () => {
    const { wsbi } = makeWsbi();
    expect(wsbi.type).toBe(SourceBufferType.Video);
    expect(wsbi.codec).toBe("video/mp4; codecs=avc1");
    expect(wsbi._queuedOperations).toHaveLength(0);
    expect(wsbi._pendingOperations.size).toBe(0);
  });

  describe("appendBuffer", () => {
    it("sends a SourceBufferAppend message with transferable ArrayBuffer", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buffer = new ArrayBuffer(8);
      const promise = wsbi.appendBuffer(buffer, { codec: "video/mp4" });

      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith(
        {
          type: CoreMessageType.SourceBufferAppend,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          operationId: expect.stringMatching(/\d+/),
          mediaSourceId: "ms-id-1",
          sourceBufferType: SourceBufferType.Video,
          value: { data: buffer, params: { codec: "video/mp4" } },
        },
        [buffer],
      );

      const { operationId } = getLastCallFirstArg<{ operationId: string }>(messageSender);
      const ranges = [{ start: 0, end: 10 }];
      wsbi.onOperationSuccess(operationId, ranges);
      await expect(promise).resolves.toEqual(ranges);
    });

    it("handles a TypedArray whose buffer is larger (slices correctly)", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const bigBuffer = new ArrayBuffer(16);
      // byteOffset=4, byteLength=4 → buffer.byteLength(16) !== byteLength(4)
      const view = new Uint8Array(bigBuffer, 4, 4);
      const promise = wsbi.appendBuffer(view, { codec: "video/mp4" });

      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith(
        {
          mediaSourceId: "ms-id-1",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          operationId: expect.stringMatching(/\d+/),
          sourceBufferType: SourceBufferType.Video,
          type: CoreMessageType.SourceBufferAppend,
          value: { data: bigBuffer, params: { codec: "video/mp4" } },
        },
        [bigBuffer],
      );

      const { operationId } = getLastCallFirstArg<{ operationId: string }>(messageSender);
      wsbi.onOperationSuccess(operationId, []);
      await expect(promise).resolves.toEqual([]);
    });

    it("handles a TypedArray whose byteLength equals buffer.byteLength", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buffer = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer;
      const view = new Uint8Array(buffer); // byteLength === buffer.byteLength
      const promise = wsbi.appendBuffer(view, { codec: "video/mp4" });

      expect(messageSender).toHaveBeenCalledWith(
        {
          mediaSourceId: "ms-id-1",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          operationId: expect.stringMatching(/\d+/),
          sourceBufferType: SourceBufferType.Video,
          type: CoreMessageType.SourceBufferAppend,
          value: { data: buffer, params: { codec: "video/mp4" } },
        },
        [buffer],
      );

      const { operationId } = getLastCallFirstArg<{ operationId: string }>(messageSender);
      wsbi.onOperationSuccess(operationId, []);
      await promise;
    });

    it("queues a second appendBuffer call while one is pending (MAX_QUEUE not reached)", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buf1 = new ArrayBuffer(4);
      const buf2 = new ArrayBuffer(4);

      const promise1 = wsbi.appendBuffer(buf1, { codec: "video/mp4" });
      expect(messageSender).toHaveBeenCalledTimes(1);

      const promise2 = wsbi.appendBuffer(buf2, { codec: "video/mp4" });
      // With MAX = Infinity and no prior queued operations, both calls go through directly.
      expect(messageSender).toHaveBeenCalledTimes(2);

      // Two distinct calls happened: extract both operationIds in one typed cast.
      const calls = messageSender.mock.calls as Array<[{ operationId: string }]>;
      const op1 = calls[0][0].operationId;
      const op2 = calls[1][0].operationId;
      wsbi.onOperationSuccess(op1, []);
      wsbi.onOperationSuccess(op2, []);
      await promise1;
      await promise2;
    });
  });

  describe("remove", () => {
    it("sends a SourceBufferRemove message and resolves with ranges", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const promise = wsbi.remove(5, 10);

      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        operationId: expect.stringMatching(/\d+/),
        type: CoreMessageType.SourceBufferRemove,
        mediaSourceId: "ms-id-1",
        sourceBufferType: SourceBufferType.Video,
        value: { start: 5, end: 10 },
      });

      const { operationId } = getLastCallFirstArg<{ operationId: string }>(messageSender);
      const ranges = [{ start: 0, end: 5 }];
      wsbi.onOperationSuccess(operationId, ranges);
      await expect(promise).resolves.toEqual(ranges);
    });
  });

  describe("abort", () => {
    it("sends an AbortSourceBuffer message", () => {
      const { wsbi, messageSender } = makeWsbi();
      wsbi.abort();
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.AbortSourceBuffer,
        mediaSourceId: "ms-id-1",
        sourceBufferType: SourceBufferType.Video,
        value: null,
      });
    });
  });

  describe("dispose", () => {
    it("calls abort (sends AbortSourceBuffer)", () => {
      const { wsbi, messageSender } = makeWsbi();
      wsbi.dispose("test reason");
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        mediaSourceId: "ms-id-1",
        sourceBufferType: SourceBufferType.Video,
        type: CoreMessageType.AbortSourceBuffer,
        value: null,
      });
    });

    it("rejects all pending operations with a CancellationError on dispose", async () => {
      const { wsbi } = makeWsbi();
      const buf1 = new ArrayBuffer(4);
      const buf2 = new ArrayBuffer(4);
      const promise1 = wsbi.appendBuffer(buf1, { codec: "video/mp4" });
      const promise2 = wsbi.remove(0, 10);

      // buf2 sits in the queue behind the two already-pending operations
      wsbi._queuedOperations.push({
        operationName: 0 /* SbiOperationName.Push */,
        params: [buf2, { codec: "video/mp4" }],
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      wsbi.dispose("cleanup");

      await expect(promise1).rejects.toBeInstanceOf(CancellationError);
      await expect(promise2).rejects.toBeInstanceOf(CancellationError);
    });
  });

  describe("getBuffered", () => {
    it("returns undefined", () => {
      const { wsbi } = makeWsbi();
      expect(wsbi.getBuffered()).toBeUndefined();
    });
  });

  describe("onOperationSuccess", () => {
    it("resolves the matching pending operation and removes it from the map", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buf = new ArrayBuffer(4);
      const promise = wsbi.appendBuffer(buf, { codec: "video/mp4" });

      const { operationId } = getLastCallFirstArg<{ operationId: string }>(messageSender);
      expect(wsbi._pendingOperations.size).toBe(1);
      wsbi.onOperationSuccess(operationId, [{ start: 0, end: 4 }]);
      await expect(promise).resolves.toEqual([{ start: 0, end: 4 }]);
      expect(wsbi._pendingOperations.size).toBe(0);
    });

    it("logs a warning when the operationId is unknown", () => {
      const { wsbi } = makeWsbi();
      wsbi.onOperationSuccess("unknown-op-id", []);
      expect(mockLog.warn).toHaveBeenCalledWith(
        "mse",
        "unknown SourceBuffer operation succeeded",
        { type: "video" },
      );
    });

    it("dequeues and sends the next queued push operation after success", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buf1 = new Uint8Array([0, 1, 2, 3]).buffer;
      const buf2 = new Uint8Array([9, 8, 7, 6]).buffer;

      const promise1 = wsbi.appendBuffer(buf1, { codec: "video/mp4" });
      const { operationId: firstOpId } = getLastCallFirstArg<{ operationId: string }>(
        messageSender,
      );

      wsbi._queuedOperations.push({
        operationName: 0 /* SbiOperationName.Push */,
        params: [buf2, { codec: "video/mp4" }],
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      messageSender.mockClear();
      wsbi.onOperationSuccess(firstOpId, []);
      await promise1;

      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith(
        {
          mediaSourceId: "ms-id-1",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          operationId: expect.stringMatching(/\d+/),
          sourceBufferType: SourceBufferType.Video,
          type: CoreMessageType.SourceBufferAppend,
          value: { data: buf2, params: { codec: "video/mp4" } },
        },
        [buf2],
      );
    });

    it("dequeues and sends the next queued remove operation after success", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buf = new ArrayBuffer(4);

      const promise1 = wsbi.appendBuffer(buf, { codec: "video/mp4" });
      const { operationId: firstOpId } = getLastCallFirstArg<{ operationId: string }>(
        messageSender,
      );

      wsbi._queuedOperations.push({
        operationName: 1 /* SbiOperationName.Remove */,
        params: [0, 10],
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      messageSender.mockClear();
      wsbi.onOperationSuccess(firstOpId, []);
      await promise1;

      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.SourceBufferRemove,
        mediaSourceId: "ms-id-1",
        sourceBufferType: SourceBufferType.Video,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        operationId: expect.stringMatching(/\d+/),
        value: { start: 0, end: 10 },
      });
    });
  });

  describe("onOperationFailure", () => {
    it("rejects the matching pending operation with a SourceBufferError", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buf = new ArrayBuffer(4);
      const promise = wsbi.appendBuffer(buf, { codec: "video/mp4" });
      const { operationId } = getLastCallFirstArg<{ operationId: string }>(messageSender);

      wsbi.onOperationFailure(operationId, {
        errorName: "SourceBufferError",
        message: "Buffer full",
        isBufferFull: true,
      });

      await expect(promise).rejects.toBeInstanceOf(SourceBufferError);
    });

    it("rejects the matching pending operation with a CancellationError", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buf = new ArrayBuffer(4);
      const promise = wsbi.appendBuffer(buf, { codec: "video/mp4" });
      const { operationId } = getLastCallFirstArg<{ operationId: string }>(messageSender);

      wsbi.onOperationFailure(operationId, { errorName: "CancellationError" });

      await expect(promise).rejects.toBeInstanceOf(CancellationError);
    });

    it("logs info when the operationId is unknown", () => {
      const { wsbi } = makeWsbi();
      wsbi.onOperationFailure("unknown-op-id", {
        errorName: "SourceBufferError",
        message: "Buffer full",
        isBufferFull: true,
      });
      expect(mockLog.info).toHaveBeenCalledWith(
        "mse",
        "unknown SourceBuffer operation failed",
        { type: "video" },
        new SourceBufferError("SourceBufferError", "Buffer full", true),
      );
    });

    it("clears the queue and rejects all queued operations on failure", async () => {
      const { wsbi, messageSender } = makeWsbi();
      const buf = new ArrayBuffer(4);
      const promise1 = wsbi.appendBuffer(buf, { codec: "video/mp4" });
      const { operationId: firstOpId } = getLastCallFirstArg<{ operationId: string }>(
        messageSender,
      );

      const reject2 = vi.fn();
      wsbi._queuedOperations.push({
        operationName: 0 /* Push */,
        params: [new ArrayBuffer(4), { codec: "video/mp4" }],
        resolve: vi.fn(),
        reject: reject2,
      });

      wsbi.onOperationFailure(firstOpId, {
        errorName: "SourceBufferError",
        message: "full",
        isBufferFull: true,
      });

      await expect(promise1).rejects.toBeInstanceOf(SourceBufferError);
      expect(reject2).toHaveBeenCalledOnce();
      expect(wsbi._queuedOperations).toHaveLength(0);
    });
  });
});
