import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  IMediaSource,
  ISourceBuffer,
  ISourceBufferList,
} from "../../compat/browser_compatibility_types.ts";
import { SourceBufferError } from "../../errors/index.ts";
import noop from "../../utils/noop.ts";
import MainMediaSourceInterface, {
  MainSourceBufferInterface,
} from "../main_media_source_interface.ts";
import { SourceBufferType } from "../types.ts";
import MediaSourceDurationUpdater from "../utils/media_source_duration_updater.ts";

const {
  MockMediaSource,
  MockSourceBuffer,
  getLastMediaSourceMock,
  mediaSourceProps,
  makeMockSourceBufferList,
  mockMaintainEndOfStream,
  mockOnSourceClose,
  mockOnSourceEnded,
  mockOnSourceOpen,
  mockTryToChangeSourceBufferType,
} = vi.hoisted(() => {
  /** Creates a minimal mock SourceBuffer with controllable event dispatching */
  class InnerMockSourceBuffer implements ISourceBuffer {
    private _listeners: Record<string, Array<(e?: unknown) => void>> = {};
    updating: boolean = false;
    buffered: TimeRanges = {
      length: 0,
      start: vi.fn().mockReturnValue(0),
      end: vi.fn().mockReturnValue(0),
    };
    timestampOffset: number = 0;
    appendWindowStart: number = 0;
    appendWindowEnd: number = Infinity;
    onabort = null;
    onerror = null;
    onupdate = null;
    onupdateend = null;
    onupdatestart = null;
    changeType(): void {
      // noop
    }
    appendBuffer(): void {
      // noop
    }
    remove(): void {
      // noop
    }
    abort(): void {
      // noop
    }
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
    addEventListener(event: any, cb: (e?: any) => void) {
      this._listeners[event] = this._listeners[event] ?? [];
      this._listeners[event].push(cb);
    }
    removeEventListener(event?: any, cb?: ((e?: any) => void) | undefined) {
      if (event === undefined) {
        this._listeners = {};
        return;
      }
      this._listeners[event] = (this._listeners[event] ?? []).filter((fn) =>
        cb === undefined ? false : fn !== cb,
      );
    }

    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
    _emit(event: string, arg?: unknown) {
      for (const cb of this._listeners[event] ?? []) {
        cb(arg);
      }
    }
  }

  /**
   * Creates a minimal ISourceBufferList-compatible object from an array of
   * ISourceBuffer instances.
   */
  function makeMockSourceBufferListInner(buffers: ISourceBuffer[]): ISourceBufferList {
    return {
      onaddsourcebuffer: null,
      onremovesourcebuffer: null,
      get length() {
        return buffers.length;
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      ...Object.fromEntries(buffers.map((buf, i) => [i, buf])),
    };
  }

  const mediaSourcePropsObj: {
    handle: MediaProvider | undefined;
    streaming: boolean | undefined;
  } = { handle: undefined, streaming: undefined };

  let lastCreatedMockMS: InnerMockMediaSource | null = null;
  class InnerMockMediaSource implements IMediaSource {
    private _mediaSourceListeners: Record<string, Array<() => void>>;
    readyState: ReadyState = "open";
    duration: number = 0;
    onsourceclose = null;
    onsourceended = null;
    onsourceopen = null;
    constructor() {
      this._mediaSourceListeners = {};
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastCreatedMockMS = this;
    }
    clearLiveSeekableRange(): never {
      throw new Error("not implemented");
    }
    setLiveSeekableRange(): never {
      throw new Error("not implemented");
    }
    sourceBuffers = makeMockSourceBufferListInner([]);
    addSourceBuffer(): ISourceBuffer {
      throw new Error("not implemented");
    }
    removeSourceBuffer(): never {
      throw new Error("not implemented");
    }
    endOfStream(): void {
      // noop
    }
    get handle(): MediaProvider | undefined {
      return mediaSourcePropsObj.handle;
    }
    get streaming(): boolean | undefined {
      return mediaSourcePropsObj.streaming;
    }
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
    addEventListener(event: any, cb: (e?: any) => void) {
      this._mediaSourceListeners[event] = this._mediaSourceListeners[event] ?? [];
      this._mediaSourceListeners[event].push(cb);
    }
    removeEventListener(event?: any, cb?: ((e?: any) => void) | undefined) {
      if (event === undefined) {
        this._mediaSourceListeners = {};
        return;
      }
      this._mediaSourceListeners[event] = (
        this._mediaSourceListeners[event] ?? []
      ).filter((fn) => (cb === undefined ? false : fn !== cb));
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

    _emit(event: string) {
      for (const cb of this._mediaSourceListeners[event] ?? []) {
        cb();
      }
    }
  }

  return {
    mockTryToChangeSourceBufferType: vi.fn().mockReturnValue(true),
    mockOnSourceOpen: vi.fn(),
    mockOnSourceEnded: vi.fn(),
    mockOnSourceClose: vi.fn(),
    mockMaintainEndOfStream: vi.fn(),
    MockMediaSource: InnerMockMediaSource,
    MockSourceBuffer: InnerMockSourceBuffer,
    makeMockSourceBufferList: makeMockSourceBufferListInner,
    mediaSourceProps: mediaSourcePropsObj,
    getLastMediaSourceMock: (): InnerMockMediaSource => {
      if (lastCreatedMockMS === null) {
        throw new Error("No MockMediaSource has been instantiated yet");
      }
      return lastCreatedMockMS;
    },
  };
});

vi.mock("../../compat/browser_compatibility_types", () => {
  return {
    default: {
      MediaSource_: MockMediaSource,
    },
  };
});

vi.mock("../../compat/change_source_buffer_type", () => ({
  default: mockTryToChangeSourceBufferType,
}));

vi.mock("../../compat/event_listeners", () => ({
  onSourceOpen: mockOnSourceOpen,
  onSourceEnded: mockOnSourceEnded,
  onSourceClose: mockOnSourceClose,
}));

vi.mock("../../log", () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../utils/end_of_stream", () => ({
  maintainEndOfStream: mockMaintainEndOfStream,
}));

describe("MainMediaSourceInterface", () => {
  const mockUpdateDuration = vi.spyOn(
    MediaSourceDurationUpdater.prototype,
    "updateDuration",
  );
  const mockStopUpdating = vi.spyOn(MediaSourceDurationUpdater.prototype, "stopUpdating");

  let mockMS: InstanceType<typeof MockMediaSource>;

  beforeEach(() => {
    mockOnSourceOpen.mockReset();
    mockOnSourceEnded.mockReset();
    mockOnSourceClose.mockReset();
    mockUpdateDuration.mockReset();
    mockStopUpdating.mockReset();
    mockMaintainEndOfStream.mockReset();
  });

  afterEach(() => {
    mediaSourceProps.handle = undefined;
    mediaSourceProps.streaming = undefined;
    vi.resetAllMocks();
  });

  it("constructs correctly and registers event listeners", () => {
    const iface = new MainMediaSourceInterface("test-id");
    expect(iface.id).toBe("test-id");
    expect(iface.sourceBuffers).toEqual([]);
    expect(iface.readyState).toBe("open");
    expect(mockOnSourceOpen).toHaveBeenCalledOnce();
    expect(mockOnSourceEnded).toHaveBeenCalledOnce();
    expect(mockOnSourceClose).toHaveBeenCalledOnce();
  });

  it("uses forcedMediaSource when provided", () => {
    const error = new Error("toto");
    class ExtentedMediaSource extends MockMediaSource {
      addSourceBuffer(): ISourceBuffer {
        throw error;
      }
    }
    const ForcedConstructor = ExtentedMediaSource;
    const iface = new MainMediaSourceInterface("forced-id", ForcedConstructor);
    expect(() => iface.addSourceBuffer(SourceBufferType.Video, "test")).toThrow(error);
  });

  it("sets handle to media-source type when mediaSource.handle is nullish", () => {
    mediaSourceProps.handle = undefined;
    const iface = new MainMediaSourceInterface("h-id");
    expect(iface.handle).toMatchObject({ type: "media-source" });
  });

  it("sets handle to 'handle' type when mediaSource.handle is defined", () => {
    const fakeHandle = new Blob();
    mediaSourceProps.handle = fakeHandle;
    const iface = new MainMediaSourceInterface("h-id");
    expect(iface.handle).toMatchObject({ type: "handle", value: fakeHandle });
  });

  it("tracks streaming from the MediaSource when it is defined", () => {
    mediaSourceProps.streaming = true;
    const iface1 = new MainMediaSourceInterface("stream-id");
    expect(iface1.streaming).toBe(true);
    mediaSourceProps.streaming = false;
    const iface2 = new MainMediaSourceInterface("stream-id");
    expect(iface2.streaming).toBe(false);
  });

  it("updates streaming to true when 'startstreaming' fires", () => {
    mediaSourceProps.streaming = false;
    const iface = new MainMediaSourceInterface("stream-id");
    mockMS = getLastMediaSourceMock();
    mockMS._emit("startstreaming");
    expect(iface.streaming).toBe(true);
  });

  it("updates streaming to false when 'endstreaming' fires", () => {
    mediaSourceProps.streaming = true;
    const iface = new MainMediaSourceInterface("stream-id");
    mockMS = getLastMediaSourceMock();
    mockMS._emit("endstreaming");
    expect(iface.streaming).toBe(false);
  });

  it("triggers mediaSourceOpen when onSourceOpen callback fires", () => {
    const iface = new MainMediaSourceInterface("open-id");
    const listener = vi.fn();
    iface.addEventListener("mediaSourceOpen", listener);
    const [[, cb]] = mockOnSourceOpen.mock.calls;
    cb();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("triggers mediaSourceEnded when onSourceEnded callback fires", () => {
    const iface = new MainMediaSourceInterface("ended-id");
    const listener = vi.fn();
    iface.addEventListener("mediaSourceEnded", listener);
    const [[, cb]] = mockOnSourceEnded.mock.calls;
    cb();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("triggers mediaSourceClose when onSourceClose callback fires", () => {
    const iface = new MainMediaSourceInterface("close-id");
    const listener = vi.fn();
    iface.addEventListener("mediaSourceClose", listener);
    const [[, cb]] = mockOnSourceClose.mock.calls;
    cb();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("addSourceBuffer creates and stores a MainSourceBufferInterface", () => {
    const sb = new MockSourceBuffer();
    vi.spyOn(MockMediaSource.prototype, "addSourceBuffer").mockReturnValue(sb);
    const iface = new MainMediaSourceInterface("sb-id");
    const result = iface.addSourceBuffer(
      SourceBufferType.Video,
      "video/mp4; codecs=avc1",
    );
    expect(result).toBeInstanceOf(MainSourceBufferInterface);
    expect(iface.sourceBuffers).toHaveLength(1);
    expect(iface.sourceBuffers[0]).toBe(result);
  });

  it("setDuration delegates to durationUpdater", () => {
    const iface = new MainMediaSourceInterface("dur-id");
    iface.setDuration(120, true);
    expect(mockUpdateDuration).toHaveBeenCalledWith(120, true);
  });

  it("interruptDurationSetting delegates to durationUpdater", () => {
    const iface = new MainMediaSourceInterface("dur-id");
    iface.interruptDurationSetting("test-reason");
    expect(mockStopUpdating).toHaveBeenCalledWith("test-reason");
  });

  it("maintainEndOfStream calls maintainEndOfStream util only once", () => {
    const iface = new MainMediaSourceInterface("eos-id");
    iface.maintainEndOfStream();
    iface.maintainEndOfStream(); // second call should not create another canceller
    expect(mockMaintainEndOfStream).toHaveBeenCalledOnce();
  });

  it("stopEndOfStream cancels active end-of-stream", () => {
    const iface = new MainMediaSourceInterface("eos-id");
    iface.maintainEndOfStream();
    expect(mockMaintainEndOfStream).toHaveBeenCalledOnce();
    iface.stopEndOfStream();
    // Calling again should be a no-op (no second cancel call means no throw)
    iface.stopEndOfStream();
  });

  it("dispose cleans up sourceBuffers and resets media source", () => {
    const sb = new MockSourceBuffer();
    const mockAbort = vi.spyOn(sb, "abort");
    vi.spyOn(MockMediaSource.prototype, "addSourceBuffer").mockReturnValue(sb);
    const iface = new MainMediaSourceInterface("dispose-id");
    mockMS = getLastMediaSourceMock();
    mockMS.sourceBuffers = makeMockSourceBufferList([sb]);
    iface.addSourceBuffer(SourceBufferType.Audio, "audio/mp4; codecs=mp4a");
    iface.dispose("test-dispose");
    expect(mockAbort).toHaveBeenCalled();
  });
});

describe("MainSourceBufferInterface", () => {
  let sb: ISourceBuffer & {
    _emit(event: string, arg?: unknown): void;
  };

  beforeEach(() => {
    sb = new MockSourceBuffer();
    mockTryToChangeSourceBufferType.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createMainSourceBufferInterface(
    type = SourceBufferType.Video,
    codec = "video/mp4",
  ) {
    return new MainSourceBufferInterface(type, codec, sb);
  }

  it("appendBuffer returns a promise that resolves on updateend", async () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1, 2, 3]);
    const promise = iface.appendBuffer(data, { codec: "video/mp4" });
    sb._emit("updateend");
    const result = await promise;
    expect(Array.isArray(result)).toBe(true);
    expect(mockAppendBuffer).toHaveBeenCalledWith(data);
  });

  it("appendBuffer rejects on SourceBuffer error event", async () => {
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/mp4" });
    const err = new Error("Some Message");
    err.name = "SomeError";
    sb._emit("error", err);
    const thrownError = new SourceBufferError("SomeError", "Some Message", false);
    await expect(promise).rejects.toMatchObject(thrownError);
  });

  it("appendBuffer rejects with QuotaExceededError flagged correctly", async () => {
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/mp4" });
    const err = new Error("QuotaExceeded");
    err.name = "QuotaExceededError";
    sb._emit("error", err);
    const thrownError = new SourceBufferError(
      "QuotaExceededError",
      "QuotaExceeded",
      true,
    );
    await expect(promise).rejects.toMatchObject(thrownError);
  });

  it("updates codec via tryToChangeSourceBufferType when a different codec is passed", async () => {
    const iface = createMainSourceBufferInterface(SourceBufferType.Video, "video/mp4");
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/webm" });
    sb._emit("updateend");
    await promise;
    expect(mockTryToChangeSourceBufferType).toHaveBeenCalledWith(sb, "video/webm");
    expect(iface.codec).toBe("video/webm");
  });

  it("does not update codec when tryToChangeSourceBufferType returns false", async () => {
    mockTryToChangeSourceBufferType.mockReturnValue(false);
    const iface = createMainSourceBufferInterface(SourceBufferType.Video, "video/mp4");
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/webm" });
    sb._emit("updateend");
    await promise;
    expect(iface.codec).toBe("video/mp4");
  });

  it("sets timestampOffset when it differs from current value", async () => {
    const iface = createMainSourceBufferInterface();
    sb.timestampOffset = 0;
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/mp4", timestampOffset: 5 });
    sb._emit("updateend");
    await promise;
    expect(sb.timestampOffset).toBe(5);
  });

  it("does not set timestampOffset when it matches current value", async () => {
    const iface = createMainSourceBufferInterface();
    sb.timestampOffset = 5;
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/mp4", timestampOffset: 5 });
    sb._emit("updateend");
    await promise;
    expect(sb.timestampOffset).toBe(5);
  });

  it("resets appendWindowStart to 0 when appendWindow[0] is undefined and was > 0", async () => {
    const iface = createMainSourceBufferInterface();
    sb.appendWindowStart = 2;
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, {
      codec: "video/mp4",
      appendWindow: [undefined, undefined],
    });
    sb._emit("updateend");
    await promise;
    expect(sb.appendWindowStart).toBe(0);
  });

  it("sets appendWindowStart when it differs", async () => {
    const iface = createMainSourceBufferInterface();
    sb.appendWindowStart = 0;
    sb.appendWindowEnd = Infinity;
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, {
      codec: "video/mp4",
      appendWindow: [3, 10],
    });
    sb._emit("updateend");
    await promise;
    expect(sb.appendWindowStart).toBe(3);
    expect(sb.appendWindowEnd).toBe(10);
  });

  it("pre-updates appendWindowEnd before setting appendWindowStart when needed", async () => {
    const iface = createMainSourceBufferInterface();
    sb.appendWindowStart = 0;
    sb.appendWindowEnd = 5; // new start (8) >= current end (5) → must bump end first
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, {
      codec: "video/mp4",
      appendWindow: [8, 20],
    });
    sb._emit("updateend");
    await promise;
    expect(sb.appendWindowStart).toBe(8);
    expect(sb.appendWindowEnd).toBe(20);
  });

  it("resets appendWindowEnd to Infinity when appendWindow[1] is undefined and was not Infinity", async () => {
    const iface = createMainSourceBufferInterface();
    sb.appendWindowEnd = 30;
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, {
      codec: "video/mp4",
      appendWindow: [undefined, undefined],
    });
    sb._emit("updateend");
    await promise;
    expect(sb.appendWindowEnd).toBe(Infinity);
  });

  it("merges consecutive Push operations with identical parameters", async () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const iface = createMainSourceBufferInterface();
    const data1 = new Uint8Array([1, 2]);
    const data2 = new Uint8Array([3, 4]);

    // First block all appendBuffer operation by implying that the sourcebuffer is updating
    sb.updating = true;
    const p1 = iface.appendBuffer(data1, { codec: "video/mp4", timestampOffset: 0 });
    const p2 = iface.appendBuffer(data2, { codec: "video/mp4", timestampOffset: 0 });

    expect(mockAppendBuffer).not.toHaveBeenCalled();

    // Remove lock
    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;

    // Both segments are merged into a single appendBuffer call
    expect(mockAppendBuffer).toHaveBeenCalledOnce();

    // One updateend resolves both promises
    sb.updating = false;
    sb._emit("updateend");
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
  });

  it("does NOT merge consecutive Push operations with different codecs", async () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const iface = createMainSourceBufferInterface(SourceBufferType.Video, "video/mp4");
    const data1 = new Uint8Array([1]);
    const data2 = new Uint8Array([2]);

    // First block all appendBuffer operation by implying that the sourcebuffer is updating
    sb.updating = true;

    const p1 = iface.appendBuffer(data1, { codec: "video/mp4" });
    const p2 = iface.appendBuffer(data2, { codec: "video/webm" });

    expect(mockAppendBuffer).not.toHaveBeenCalled();

    // Remove lock
    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;

    // First push executed immediately
    expect(mockAppendBuffer).toHaveBeenCalledOnce();

    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;
    await p1;

    // Second push should start now
    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;
    await p2;

    expect(mockAppendBuffer).toHaveBeenCalledTimes(2);
  });

  it("does NOT merge consecutive Push operations with different timestampOffsets", async () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const iface = createMainSourceBufferInterface();
    const data1 = new Uint8Array([1]);
    const data2 = new Uint8Array([2]);

    // First block all appendBuffer operation by implying that the sourcebuffer is updating
    sb.updating = true;

    const p1 = iface.appendBuffer(data1, { codec: "video/mp4", timestampOffset: 0 });
    const p2 = iface.appendBuffer(data2, { codec: "video/mp4", timestampOffset: 5 });

    expect(mockAppendBuffer).not.toHaveBeenCalled();

    // Remove lock
    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;

    expect(mockAppendBuffer).toHaveBeenCalledOnce();

    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;
    await p1;

    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;
    await p2;

    expect(mockAppendBuffer).toHaveBeenCalledTimes(2);
  });

  it("handles ArrayBuffer input in merge path", async () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const iface = createMainSourceBufferInterface();
    const buf1 = new ArrayBuffer(2);
    new Uint8Array(buf1).set([1, 2]);
    const buf2 = new ArrayBuffer(2);
    new Uint8Array(buf2).set([3, 4]);

    // First block all appendBuffer operation by implying that the sourcebuffer is updating
    sb.updating = true;

    const p1 = iface.appendBuffer(buf1, { codec: "video/mp4" });
    const p2 = iface.appendBuffer(buf2, { codec: "video/mp4" });

    expect(mockAppendBuffer).not.toHaveBeenCalled();

    // Remove lock
    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;

    expect(mockAppendBuffer).toHaveBeenCalledOnce();
    sb.updating = false;
    sb._emit("updateend");
    await Promise.all([p1, p2]);
  });

  it("handles DataView input in merge path", async () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const iface = createMainSourceBufferInterface();
    const buf = new ArrayBuffer(4);
    const dv1 = new DataView(buf, 0, 2);
    const dv2 = new DataView(buf, 2, 2);

    // First block all appendBuffer operation by implying that the sourcebuffer is updating
    sb.updating = true;

    const p1 = iface.appendBuffer(dv1, { codec: "video/mp4" });
    const p2 = iface.appendBuffer(dv2, { codec: "video/mp4" });

    // Remove lock
    sb.updating = false;
    sb._emit("updateend");
    sb.updating = true;

    expect(mockAppendBuffer).toHaveBeenCalledOnce();
    sb.updating = false;
    sb._emit("updateend");
    await Promise.all([p1, p2]);
  });

  it("rejects and continues queue when appendBuffer throws synchronously", async () => {
    const iface = createMainSourceBufferInterface();
    vi.spyOn(sb, "appendBuffer").mockImplementationOnce(() => {
      throw new Error("random error");
    });

    const data1 = new Uint8Array([1]);
    const data2 = new Uint8Array([2]);

    const p1 = iface.appendBuffer(data1, { codec: "video/mp4" });
    const p2 = iface.appendBuffer(data2, { codec: "video/mp4" });

    const error = new SourceBufferError("Error", "random error", false);
    await expect(p1).rejects.toMatchObject(error);

    // Queue should move on – second push should now run
    // TODO: For a synchronous error, maybe we shouldn't await an updateend?
    sb._emit("updateend");
    await expect(p2).resolves.toBeDefined();
  });

  it("remove returns a promise that resolves on updateend", async () => {
    const mockRemove = vi.spyOn(MockSourceBuffer.prototype, "remove");
    const iface = createMainSourceBufferInterface();
    const promise = iface.remove(0, 10);
    expect(mockRemove).toHaveBeenCalledWith(0, 10);
    sb._emit("updateend");
    await expect(promise).resolves.toEqual([]);
  });

  it("remove rejects when SourceBuffer.remove throws synchronously", async () => {
    const iface = createMainSourceBufferInterface();
    vi.spyOn(sb, "remove").mockImplementationOnce(() => {
      throw new Error("some remove error");
    });
    const promise = iface.remove(0, 5);
    const error = new SourceBufferError("Error", "some remove error", false);
    await expect(promise).rejects.toMatchObject(error);
  });

  it("queues a remove after a pending push", async () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const mockRemove = vi.spyOn(MockSourceBuffer.prototype, "remove");
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1]);

    const pushPromise = iface.appendBuffer(data, { codec: "video/mp4" });
    const removePromise = iface.remove(0, 5);

    // Only the push should have started
    expect(mockAppendBuffer).toHaveBeenCalledOnce();
    expect(mockRemove).not.toHaveBeenCalled();

    sb._emit("updateend");
    await pushPromise;

    expect(mockRemove).toHaveBeenCalledWith(0, 5);
    sb._emit("updateend");
    await expect(removePromise).resolves.toBeDefined();
  });

  it("getBuffered returns ranges from the underlying SourceBuffer", () => {
    const iface = createMainSourceBufferInterface();
    const result = iface.getBuffered();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getBuffered returns empty array when accessing buffered throws", () => {
    const iface = createMainSourceBufferInterface();
    Object.defineProperty(sb, "buffered", {
      get() {
        throw new Error("buffered unavailable");
      },
      configurable: true,
    });
    const result = iface.getBuffered();
    expect(result).toEqual([]);
  });

  it("abort calls sourceBuffer.abort and rejects pending operations", async () => {
    const mockAbort = vi.spyOn(MockSourceBuffer.prototype, "abort");
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1]);

    const p1 = iface.appendBuffer(data, { codec: "video/mp4" });
    const p2 = iface.appendBuffer(data, { codec: "video/mp4" });

    iface.abort("test-abort");

    await expect(p1).rejects.toBeDefined();
    await expect(p2).rejects.toBeDefined();
    expect(mockAbort).toHaveBeenCalled();
  });

  it("dispose calls sourceBuffer.abort and rejects pending operations", async () => {
    const mockAbort = vi.spyOn(MockSourceBuffer.prototype, "abort");
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1]);
    const p1 = iface.appendBuffer(data, { codec: "video/mp4" });

    iface.dispose("test-dispose");

    await expect(p1).rejects.toBeDefined();
    expect(mockAbort).toHaveBeenCalled();
  });

  it("abort does not throw even if sourceBuffer.abort throws", () => {
    const iface = createMainSourceBufferInterface();
    vi.spyOn(sb, "abort").mockImplementation(() => {
      throw new Error("abort threw");
    });
    expect(() => iface.abort("safe")).not.toThrow();
  });

  it("resolves with empty array when buffered throws InvalidStateError on updateend", async () => {
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/mp4" });

    let callCount = 0;
    Object.defineProperty(sb, "buffered", {
      get() {
        callCount++;
        if (callCount > 1) {
          const e = new Error("InvalidStateError");
          e.name = "InvalidStateError";
          throw e;
        }
        return { length: 0, start: () => 0, end: () => 0 };
      },
      configurable: true,
    });

    sb._emit("updateend");
    await expect(promise).resolves.toEqual([]);
  });

  it("rejects with non-InvalidStateError thrown from buffered on updateend", async () => {
    const iface = createMainSourceBufferInterface();
    const data = new Uint8Array([1]);
    const promise = iface.appendBuffer(data, { codec: "video/mp4" });

    const e = new Error("some buffered error");
    e.name = "SomeOtherError";
    Object.defineProperty(sb, "buffered", {
      get() {
        throw e;
      },
      configurable: true,
    });

    sb._emit("updateend");
    await expect(promise).rejects.toMatchObject(e);
  });

  it("logs error when error event fires with no current operations", () => {
    createMainSourceBufferInterface();
    // No pending operation – just fire error; should not throw
    expect(() => sb._emit("error", new Error("orphan error"))).not.toThrow();
    // TODO: check logs?
  });

  it("does not call appendBuffer again if sourceBuffer.updating is true", () => {
    const mockAppendBuffer = vi.spyOn(MockSourceBuffer.prototype, "appendBuffer");
    const iface = createMainSourceBufferInterface();
    sb.updating = true;
    const data = new Uint8Array([1]);
    iface.appendBuffer(data, { codec: "video/mp4" }).catch(noop);
    // Because updating=true _performNextOperation bails out
    expect(mockAppendBuffer).not.toHaveBeenCalled();
  });
});
