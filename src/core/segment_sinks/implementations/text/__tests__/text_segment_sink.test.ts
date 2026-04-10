import { describe, it, expect, vi } from "vitest";
import type { ITextDisplayerData } from "../../../../../main_thread/text_displayer/types";
import {
  DummyAdaptation,
  DummyPeriod,
  DummyRepresentation,
  createSegment,
} from "../../../../../manifest/classes/__tests__/mocks";
import type { IRange } from "../../../../../utils/ranges";
import SegmentInventory from "../../../inventory";
import type { IPushChunkInfos } from "../../types";
import { SegmentSinkOperation } from "../../types";
import TextSegmentSink, { type ITextDisplayerInterface } from "../text_segment_sink";

function createSender() {
  const pushTextData = vi.fn<(infos: ITextDisplayerData) => Promise<IRange[]>>();
  const remove = vi.fn<(start: number, end: number) => Promise<IRange[]>>();
  const reset = vi.fn<() => void>();
  const stop = vi.fn<(reason: string | undefined) => void>();
  return {
    pushTextData,
    remove,
    reset,
    stop,
  };
}

function createChunkInfos(): IPushChunkInfos<unknown> {
  return {
    data: {
      chunk: {
        data: "WEBVTT",
        type: "vtt",
        initTimescale: null,
        start: 0,
        end: 2,
      },
      timestampOffset: 0,
      appendWindow: [undefined, undefined],
      codec: undefined,
      initSegmentUniqueId: null,
    },
    inventoryInfos: {
      adaptation: new DummyAdaptation({ type: "text" }),
      period: new DummyPeriod(),
      representation: new DummyRepresentation({ trackType: "text" }),
      segment: createSegment({ id: "seg-1", isInit: false, complete: true }),
      chunkSize: 12,
      start: 0,
      end: 2,
    },
  };
}

function createCompleteSegmentInfo() {
  return {
    adaptation: new DummyAdaptation({ type: "text" }),
    period: new DummyPeriod(),
    representation: new DummyRepresentation({ trackType: "text" }),
    segment: createSegment({ id: "seg-1", isInit: false, complete: true }),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class TestTextSegmentSink extends TextSegmentSink {
  public constructor(sender: ITextDisplayerInterface, inventory: SegmentInventory) {
    super(sender);
    this._segmentInventory = inventory;
  }
}

describe("TextSegmentSink", () => {
  it("resets the text displayer on construction", () => {
    const sender = createSender();
    new TextSegmentSink(sender);

    expect(sender.reset).toHaveBeenCalledTimes(1);
  });

  it("forwards dispose to the text displayer stop method", () => {
    const sender = createSender();

    const sink = new TextSegmentSink(sender);
    sink.dispose("test reason");

    expect(sender.reset).toHaveBeenCalledTimes(1);
    expect(sender.stop).toHaveBeenCalledTimes(1);
    expect(sender.stop).toHaveBeenCalledWith("test reason");
  });

  it("pushes text data, tracks the pending operation, and updates inventory", async () => {
    const sender = createSender();
    const deferred = createDeferred<IRange[]>();
    sender.pushTextData.mockReturnValue(deferred.promise);
    const inventory = new SegmentInventory();
    const sink = new TestTextSegmentSink(sender, inventory);
    const infos = createChunkInfos();
    const insertChunk = vi.spyOn(inventory, "insertChunk");
    const synchronizeBuffered = vi.spyOn(inventory, "synchronizeBuffered");

    const pushPromise = sink.pushChunk(infos);

    expect(sender.pushTextData).toHaveBeenCalledWith(infos.data);
    expect(sink.getPendingOperations()).toEqual([
      { type: SegmentSinkOperation.Push, value: infos },
    ]);

    deferred.resolve([{ start: 0, end: 2 }]);
    await expect(pushPromise).resolves.toEqual([{ start: 0, end: 2 }]);
    expect(insertChunk).toHaveBeenCalledTimes(1);
    expect(insertChunk).toHaveBeenCalledWith(
      infos.inventoryInfos,
      true,
      expect.any(Number),
    );
    expect(synchronizeBuffered).toHaveBeenCalledWith([{ start: 0, end: 2 }]);
    expect(sink.getPendingOperations()).toEqual([]);
  });

  it("removes text data, tracks the pending operation, and synchronizes inventory", async () => {
    const sender = createSender();
    const deferred = createDeferred<IRange[]>();
    sender.remove.mockReturnValue(deferred.promise);
    const inventory = new SegmentInventory();
    const sink = new TestTextSegmentSink(sender, inventory);
    const synchronizeBuffered = vi.spyOn(inventory, "synchronizeBuffered");

    const removePromise = sink.removeBuffer(10, 20);

    expect(sender.remove).toHaveBeenCalledWith(10, 20);
    expect(sink.getPendingOperations()).toEqual([
      { type: SegmentSinkOperation.Remove, value: { start: 10, end: 20 } },
    ]);

    deferred.resolve([{ start: 10, end: 20 }]);
    await expect(removePromise).resolves.toEqual([{ start: 10, end: 20 }]);
    expect(synchronizeBuffered).toHaveBeenCalledWith([{ start: 10, end: 20 }]);
    expect(sink.getPendingOperations()).toEqual([]);
  });

  it("waits for the previous operation before completing a segment", async () => {
    const sender = createSender();
    const deferred = createDeferred<IRange[]>();
    sender.pushTextData.mockReturnValue(deferred.promise);
    const inventory = new SegmentInventory();
    const sink = new TestTextSegmentSink(sender, inventory);
    const completeSegment = vi.spyOn(inventory, "completeSegment");
    const pushInfos = createChunkInfos();
    const completionInfos = createCompleteSegmentInfo();

    const pushPromise = sink.pushChunk(pushInfos);
    const signalPromise = sink.signalSegmentComplete(completionInfos);

    expect(sink.getPendingOperations()).toEqual([
      { type: SegmentSinkOperation.Push, value: pushInfos },
      { type: SegmentSinkOperation.SignalSegmentComplete, value: completionInfos },
    ]);
    expect(completeSegment).not.toHaveBeenCalled();

    deferred.resolve([{ start: 0, end: 2 }]);
    await pushPromise;
    await signalPromise;

    expect(completeSegment).toHaveBeenCalledTimes(1);
    expect(completeSegment).toHaveBeenCalledWith(completionInfos);
    expect(sink.getPendingOperations()).toEqual([]);
  });
});
