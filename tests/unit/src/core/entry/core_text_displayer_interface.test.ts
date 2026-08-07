import { describe, it, expect, vi, beforeEach } from "vitest";
import CoreTextDisplayerInterface from "../../../../../src/core/entry/core_text_displayer_interface.ts";
import { CoreMessageType } from "../../../../../src/core/types.ts";
import noop from "../../../../../src/utils/noop.ts";
import { CancellationError } from "../../../../../src/utils/task_canceller.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */

const mockLogError = vi.hoisted(() => {
  return vi.fn();
});

vi.mock("../../../../../src/log", () => ({
  default: {
    error: mockLogError,
  },
}));

vi.mock("../../../../../src/utils/task_canceller", () => ({
  CancellationError: class MockCancellationError extends Error {
    constructor(name: string, reason: string) {
      super(reason);
      this.name = name;
    }
  },
}));

describe("CoreTextDisplayerInterface", () => {
  let messageSender: any;
  let cdi: CoreTextDisplayerInterface;
  const CONTENT_ID = "test-content-id";

  beforeEach(() => {
    messageSender = vi.fn();
    mockLogError.mockReset();
    cdi = new CoreTextDisplayerInterface(CONTENT_ID, messageSender);
  });

  describe("constructor", () => {
    it("should initialize with empty queues", () => {
      expect(cdi._queues.pushTextData).toHaveLength(0);
      expect(cdi._queues.remove).toHaveLength(0);
    });
  });

  describe("pushTextData", () => {
    it("should send a PushTextData message with contentId and infos", () => {
      const infos = { data: "subtitle data" } as any;
      cdi.pushTextData(infos);
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.PushTextData,
        contentId: CONTENT_ID,
        value: infos,
      });
    });

    it("should push a resolve/reject pair into pushTextData queue", () => {
      cdi.pushTextData({} as any);
      expect(cdi._queues.pushTextData).toHaveLength(1);
      expect(cdi._queues.remove).toHaveLength(0);
    });

    it("should return a promise that resolves via onPushedTrackSuccess", async () => {
      const ranges = [{ start: 0, end: 10 }];
      const promise = cdi.pushTextData({} as any);
      cdi.onPushedTrackSuccess(ranges);
      await expect(promise).resolves.toEqual(ranges);
    });

    it("should return a promise that rejects via onPushedTrackError", async () => {
      const error = new Error("push failed");
      const promise = cdi.pushTextData({} as any);
      cdi.onPushedTrackError(error);
      await expect(promise).rejects.toThrow("push failed");
    });

    it("should resolve even if the sender synchronously responds", async () => {
      const ranges = [{ start: 0, end: 10 }];
      messageSender = vi.fn(() => {
        cdi.onPushedTrackSuccess(ranges);
      });
      cdi = new CoreTextDisplayerInterface(CONTENT_ID, messageSender);

      await expect(cdi.pushTextData({} as any)).resolves.toEqual(ranges);
    });
  });

  describe("remove", () => {
    it("should send a RemoveTextData message with contentId, start, and end", () => {
      cdi.remove(5, 20);
      expect(messageSender).toHaveBeenCalledOnce();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.RemoveTextData,
        contentId: CONTENT_ID,
        value: { start: 5, end: 20 },
      });
    });

    it("should push a resolve/reject pair into remove queue", () => {
      cdi.remove(0, 10);
      expect(cdi._queues.remove).toHaveLength(1);
      expect(cdi._queues.pushTextData).toHaveLength(0);
    });

    it("should return a promise that resolves via onRemoveSuccess", async () => {
      const ranges = [{ start: 5, end: 20 }];
      const promise = cdi.remove(5, 20);
      cdi.onRemoveSuccess(ranges);
      await expect(promise).resolves.toEqual(ranges);
    });
    it("should return a promise that rejects via onPushedTrackError", async () => {
      const error = new Error("remove failed");
      const promise = cdi.remove(5, 20);
      cdi.onRemoveError(error);
      await expect(promise).rejects.toThrow("remove failed");
    });

    it("should resolve even if the sender synchronously responds", async () => {
      const ranges = [{ start: 5, end: 20 }];
      messageSender = vi.fn(() => {
        cdi.onRemoveSuccess(ranges);
      });
      cdi = new CoreTextDisplayerInterface(CONTENT_ID, messageSender);

      await expect(cdi.remove(5, 20)).resolves.toEqual(ranges);
    });
  });

  describe("reset", () => {
    it("should send a ResetTextDisplayer message", () => {
      cdi.reset();
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.ResetTextDisplayer,
        contentId: CONTENT_ID,
        value: null,
      });
    });

    it("should reject all pending pushTextData and remove promises", async () => {
      const pushPromise = cdi.pushTextData({} as any);
      const removePromise = cdi.remove(0, 10);
      cdi.reset();
      await expect(pushPromise).rejects.toBeInstanceOf(CancellationError);
      await expect(removePromise).rejects.toBeInstanceOf(CancellationError);
    });

    it("should clear both queues after reset", () => {
      cdi.pushTextData({} as any).catch(noop);
      cdi.remove(0, 10).catch(noop);
      cdi.reset();
      expect(cdi._queues.pushTextData).toHaveLength(0);
      expect(cdi._queues.remove).toHaveLength(0);
    });
  });

  describe("stop", () => {
    it("should send a StopTextDisplayer message", () => {
      cdi.stop("user stopped");
      expect(messageSender).toHaveBeenCalledWith({
        type: CoreMessageType.StopTextDisplayer,
        contentId: CONTENT_ID,
        value: null,
      });
    });

    it("should reject all pending promises with a CancellationError", async () => {
      const pushPromise = cdi.pushTextData({} as any);
      const removePromise = cdi.remove(0, 10);
      cdi.stop("stopped for test");
      await expect(pushPromise).rejects.toBeInstanceOf(CancellationError);
      await expect(removePromise).rejects.toBeInstanceOf(CancellationError);
    });

    it("should use 'reset' as fallback reason when undefined is passed", async () => {
      const pushPromise = cdi.pushTextData({} as any);
      cdi.stop(undefined);
      const err = await pushPromise.catch((e) => e);
      expect(err.message).toBe("reset");
    });
  });

  describe("onPushedTrackSuccess", () => {
    it("should log an error and not throw when queue is empty", () => {
      expect(() => cdi.onPushedTrackSuccess([])).not.toThrow();
      expect(mockLogError).toHaveBeenCalled();
    });

    it("should resolve operations in FIFO order", async () => {
      const ranges1 = [{ start: 0, end: 1 }];
      const ranges2 = [{ start: 2, end: 3 }];
      const p1 = cdi.pushTextData({} as any);
      const p2 = cdi.pushTextData({} as any);
      cdi.onPushedTrackSuccess(ranges1);
      cdi.onPushedTrackSuccess(ranges2);
      await expect(p1).resolves.toEqual(ranges1);
      await expect(p2).resolves.toEqual(ranges2);
    });
  });

  describe("onPushedTrackError", () => {
    it("should log an error and not throw when queue is empty", () => {
      expect(() => cdi.onPushedTrackError(new Error())).not.toThrow();
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe("onRemoveSuccess", () => {
    it("should log an error and not throw when queue is empty", () => {
      expect(() => cdi.onRemoveSuccess([])).not.toThrow();
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe("onRemoveError", () => {
    it("should log an error and not throw when queue is empty", () => {
      expect(() => cdi.onRemoveError(new Error())).not.toThrow();
      expect(mockLogError).toHaveBeenCalled();
    });
  });
});
