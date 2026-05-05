import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  makeReadyOnlyPlaybackObserver,
  DummyObservationPosition,
} from "../../../playback_observer/__tests__/mocks.ts";
import type { IRange } from "../../../utils/ranges.ts";
import SharedReference from "../../../utils/reference.ts";
import TaskCanceller from "../../../utils/task_canceller.ts";
import type { IStreamOrchestratorPlaybackObservation } from "../../stream/index.ts";
import BufferGarbageCollector from "../garbage_collector.ts";
import { DummySegmentSink } from "./mocks.ts";

const mockLog = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("../../../log", () => ({ default: mockLog }));

describe("BufferGarbageCollector", () => {
  const mockedPlaybackObserver = makeReadyOnlyPlaybackObserver<
    Pick<IStreamOrchestratorPlaybackObservation, "position" | "buffered">
  >({
    position: new DummyObservationPosition({
      getWanted: vi.fn(() => 0),
    }),
    buffered: { video: null, audio: null, text: null },
  });
  const mockRemoveBuffer = vi.spyOn(DummySegmentSink.prototype, "removeBuffer");

  function emitObservation(position: number, videoBuffered: IRange[] | null) {
    mockedPlaybackObserver.emit({
      position: new DummyObservationPosition({
        getWanted: () => position,
      }),
      buffered: { video: videoBuffered, audio: null, text: null },
    });
  }
  beforeEach(() => {
    mockRemoveBuffer.mockReturnValue(Promise.resolve(undefined));
  });

  afterEach(() => {
    mockedPlaybackObserver.reset();
    vi.resetAllMocks();
  });

  it("calls removeBuffer for data behind maxBufferBehind (outer range fully behind)", async () => {
    emitObservation(100, [{ start: 0, end: 80 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    // Wait for async operations
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).toHaveBeenCalledWith(0, 80);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("calls removeBuffer for partial range behind maxBufferBehind (outer range partially behind)", async () => {
    emitObservation(100, [{ start: 85, end: 95 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).toHaveBeenCalledWith(85, 90);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("calls removeBuffer for data inside innerRange when behind maxBufferBehind", async () => {
    emitObservation(100, [{ start: 80, end: 110 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(5);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).toHaveBeenCalledWith(80, 95);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("calls removeBuffer for data ahead maxBufferAhead (outer range fully ahead)", async () => {
    emitObservation(100, [{ start: 120, end: 150 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(Infinity);
    const maxBufferAhead = new SharedReference<number>(10);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).toHaveBeenCalledWith(120, 150);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("calls removeBuffer for partial range ahead maxBufferAhead (outer range partially ahead)", async () => {
    emitObservation(100, [{ start: 105, end: 120 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(Infinity);
    const maxBufferAhead = new SharedReference<number>(10);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).toHaveBeenCalledWith(110, 120);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("calls removeBuffer for data inside innerRange when ahead maxBufferAhead", async () => {
    emitObservation(100, [{ start: 80, end: 120 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(Infinity);
    const maxBufferAhead = new SharedReference<number>(5);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).toHaveBeenCalledWith(105, 120);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("does not call removeBuffer when both maxBufferBehind and maxBufferAhead are Infinity", async () => {
    emitObservation(100, [{ start: 0, end: 200 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(Infinity);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).not.toHaveBeenCalled();
  });

  it("does not call removeBuffer when buffered is null", async () => {
    emitObservation(100, null);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(10);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveBuffer).not.toHaveBeenCalled();
  });

  it("registers listeners on maxBufferBehind and maxBufferAhead", () => {
    emitObservation(100, []);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(10);
    const mbbUpdate = vi.spyOn(maxBufferBehind, "onUpdate");
    const mbaUpdate = vi.spyOn(maxBufferAhead, "onUpdate");

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    expect(mbbUpdate).toHaveBeenCalledTimes(1);
    expect(mbaUpdate).toHaveBeenCalledTimes(1);
  });

  it("re-runs clean when maxBufferBehind changes", async () => {
    emitObservation(100, [{ start: 0, end: 80 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(Infinity);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(mockRemoveBuffer).not.toHaveBeenCalled();

    maxBufferBehind.setValue(10);

    await Promise.resolve();
    await Promise.resolve();
    expect(mockRemoveBuffer).toHaveBeenCalledWith(0, 80);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("re-runs clean when maxBufferAhead changes", async () => {
    emitObservation(100, [{ start: 120, end: 150 }]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(Infinity);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(mockRemoveBuffer).not.toHaveBeenCalled();

    maxBufferAhead.setValue(10);

    await Promise.resolve();
    await Promise.resolve();
    expect(mockRemoveBuffer).toHaveBeenCalledWith(120, 150);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
  });

  it("re-runs clean on new playback observation", async () => {
    // Initially empty buffer, then buffered grows behind position
    emitObservation(100, []);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(mockRemoveBuffer).not.toHaveBeenCalled();

    // Simulate new observation: position=200, buffer=[0-180] (fully behind 200-10=190)
    emitObservation(200, [{ start: 0, end: 180 }]);

    await Promise.resolve();
    await Promise.resolve();
    expect(mockRemoveBuffer).toHaveBeenCalledWith(0, 180);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);

    emitObservation(500, [{ start: 180, end: 300 }]);

    await Promise.resolve();
    await Promise.resolve();
    expect(mockRemoveBuffer).toHaveBeenCalledWith(180, 300);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(2);
  });

  it("logs error when removeBuffer rejects (non-cancellation error)", async () => {
    emitObservation(100, [{ start: 0, end: 80 }]);
    const error = new Error("removeBuffer failed");
    mockRemoveBuffer.mockReturnValueOnce(Promise.reject(error));

    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    // Wait for rejection to propagate
    await new Promise((r) => setTimeout(r, 0));

    expect(mockLog.error).toHaveBeenCalledWith(
      "Stream",
      "Could not run BufferGarbageCollector:",
      "removeBuffer failed",
    );
  });

  it("does not log error when removeBuffer rejects with a cancellation error and signal is cancelled", async () => {
    emitObservation(100, [{ start: 0, end: 80 }]);
    const canceller = new TaskCanceller("test removeBuffer");
    mockRemoveBuffer.mockImplementation(() => {
      return new Promise((_res, rej) => {
        canceller.signal.register((err) => rej(err));
      });
    });

    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(Infinity);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      canceller.signal,
    );

    await new Promise((r) =>
      setTimeout(() => {
        canceller.cancel("cancelling remove");
        r(undefined);
      }, 0),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it("handles both behind and ahead cleanup simultaneously", async () => {
    emitObservation(100, [
      { start: 0, end: 80 },
      { start: 120, end: 150 },
    ]);
    const segmentSink = new DummySegmentSink({ bufferType: "video" });
    const maxBufferBehind = new SharedReference<number>(10);
    const maxBufferAhead = new SharedReference<number>(10);

    BufferGarbageCollector(
      {
        segmentSink,
        playbackObserver: mockedPlaybackObserver.observer,
        maxBufferBehind,
        maxBufferAhead,
      },
      new TaskCanceller("test BufferGarbageCollector").signal,
    );

    await new Promise((r) => setTimeout(r, 0));

    expect(mockRemoveBuffer).toHaveBeenCalledWith(0, 80);
    expect(mockRemoveBuffer).toHaveBeenCalledWith(120, 150);
    expect(mockRemoveBuffer).toHaveBeenCalledTimes(2);
  });
});
