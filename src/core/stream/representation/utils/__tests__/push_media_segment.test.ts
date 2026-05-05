import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import configHandler from "../../../../../config.ts";
import {
  DummyRepresentation,
  DummyManifest,
  DummyPeriod,
  DummyAdaptation,
  createSegment,
} from "../../../../../manifest/classes/__tests__/mocks.ts";
import {
  DummyObservationPosition,
  makeReadyOnlyPlaybackObserver,
} from "../../../../../playback_observer/__tests__/mocks.ts";
import type { IRange } from "../../../../../utils/ranges.ts";
import SharedReference from "../../../../../utils/reference.ts";
import TaskCanceller from "../../../../../utils/task_canceller.ts";
import { DummySegmentSink } from "../../../../segment_sinks/__tests__/mocks.ts";
import type { IRepresentationStreamPlaybackObservation } from "../../types.ts";
import pushMediaSegment from "../push_media_segment.ts";

const mockAppendSegmentToBuffer = vi.hoisted(() =>
  vi.fn((): Promise<IRange[]> => Promise.resolve([])),
);
vi.mock("../append_segment_to_buffer.ts", () => ({
  default: mockAppendSegmentToBuffer,
}));

describe("pushMediaSegment", () => {
  const mockedPlaybackObserver =
    makeReadyOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>({
      position: new DummyObservationPosition({
        getWanted: vi.fn(() => 10),
      }),
      paused: {
        last: false,
        pending: undefined,
      },
      speed: 1,
      canStream: true,
    });
  const mockGetCurrent = vi.spyOn(configHandler, "getCurrent");

  let mockBufferGoal: SharedReference<number>;
  let mockCanceller: TaskCanceller;
  const mockSegmentSink = new DummySegmentSink();

  const mockContent = {
    adaptation: new DummyAdaptation(),
    manifest: new DummyManifest(),
    period: new DummyPeriod(),
    representation: new DummyRepresentation({
      getMimeTypeString: vi.fn(() => 'video/mp4; codecs="avc1.42E01E"'),
    }),
  };

  const mockSegment = createSegment({
    time: 10,
    duration: 5,
    end: 15,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mockBufferGoal = new SharedReference<number>(30);
    mockCanceller = new TaskCanceller("pushInitSegment tests");
    mockGetCurrent.mockReturnValue({
      ...configHandler.getCurrent(),
      APPEND_WINDOW_SECURITIES: {
        START: 0.1,
        END: 0.2,
      },
    });
  });

  afterEach(() => {
    mockedPlaybackObserver.reset();
    mockBufferGoal.finish();
    mockCanceller.cancel("test end");
    vi.resetModules();
  });

  it("should return null when chunkData is null", async () => {
    const result = await pushMediaSegment(
      {
        playbackObserver: mockedPlaybackObserver.observer,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment: {
          chunkData: null,
          chunkInfos: null,
          chunkOffset: 0,
          chunkSize: 0,
          appendWindow: [undefined, undefined],
          segmentType: "media",
          protectionData: [],
        },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCanceller.signal,
    );

    expect(result).toBeNull();
    expect(mockAppendSegmentToBuffer).not.toHaveBeenCalled();
  });

  it("should append segment with basic data when chunkData is present", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);

    const mockBuffered = [{ start: 10, end: 15 }];
    mockAppendSegmentToBuffer.mockResolvedValue(mockBuffered);

    const result = await pushMediaSegment(
      {
        playbackObserver: mockedPlaybackObserver.observer,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment: {
          chunkData: mockChunkData,
          chunkInfos: null,
          chunkOffset: 2.5,
          chunkSize: 1024,
          appendWindow: [undefined, undefined],
          segmentType: "media",
          protectionData: [],
        },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCanceller.signal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      mockedPlaybackObserver.observer,
      mockSegmentSink,
      {
        data: {
          initSegmentUniqueId: "init-123",
          chunk: mockChunkData,
          timestampOffset: 2.5,
          appendWindow: [undefined, undefined],
          codec: 'video/mp4; codecs="avc1.42E01E"',
        },
        inventoryInfos: {
          ...mockContent,
          segment: mockSegment,
          chunkSize: 1024,
          start: mockSegment.time,
          end: mockSegment.end,
        },
      },
      mockBufferGoal,
      mockCanceller.signal,
    );

    expect(result).toEqual({
      content: mockContent,
      segment: mockSegment,
      buffered: mockBuffered,
    });
  });

  it("should use chunkInfos for time calculations when available", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockedPlaybackObserver.observer,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: null,
        parsedSegment: {
          chunkData: mockChunkData,
          chunkInfos: { time: 20, duration: 8 },
          chunkOffset: 0,
          chunkSize: 2048,
          appendWindow: [undefined, undefined],
          segmentType: "media",
          protectionData: [],
        },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCanceller.signal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      mockedPlaybackObserver.observer,
      mockSegmentSink,
      {
        data: {
          appendWindow: [undefined, undefined],
          chunk: mockChunkData,
          codec: 'video/mp4; codecs="avc1.42E01E"',
          initSegmentUniqueId: null,
          timestampOffset: 0,
        },
        inventoryInfos: {
          ...mockContent,
          segment: mockSegment,
          start: 20,
          end: 28,
          chunkSize: 2048,
        },
      },
      mockBufferGoal,
      mockCanceller.signal,
    );
  });

  it("should apply append window securities to start window", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    mockAppendSegmentToBuffer.mockResolvedValue([]);
    await pushMediaSegment(
      {
        playbackObserver: mockedPlaybackObserver.observer,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment: {
          chunkData: mockChunkData,
          chunkInfos: null,
          chunkOffset: 0,
          chunkSize: 1024,
          appendWindow: [5, undefined],
          segmentType: "media",
          protectionData: [],
        },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCanceller.signal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      {},
      mockSegmentSink,
      {
        data: {
          chunk: mockChunkData,
          initSegmentUniqueId: "init-123",
          timestampOffset: 0,
          appendWindow: [4.9, undefined], // 5 - 0.1
          codec: 'video/mp4; codecs="avc1.42E01E"',
        },
        inventoryInfos: {
          ...mockContent,
          start: 10, // max(10, 4.9)
          end: mockSegment.end,
          chunkSize: 1024,
          segment: mockSegment,
        },
      },
      mockBufferGoal,
      mockCanceller.signal,
    );
  });

  it("should apply append window securities to end window", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockedPlaybackObserver.observer,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment: {
          chunkData: mockChunkData,
          chunkInfos: null,
          chunkOffset: 0,
          chunkSize: 1024,
          appendWindow: [undefined, 20],
          segmentType: "media",
          protectionData: [],
        },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCanceller.signal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      mockedPlaybackObserver.observer,
      mockSegmentSink,
      {
        data: {
          initSegmentUniqueId: "init-123",
          chunk: mockChunkData,
          timestampOffset: 0,
          codec: 'video/mp4; codecs="avc1.42E01E"',
          appendWindow: [undefined, 20.2], // 20 + 0.2
        },
        inventoryInfos: {
          ...mockContent,
          segment: mockSegment,
          end: 15, // min(15, 20.2)
          chunkSize: 1024,
          start: mockSegment.time,
        },
      },
      mockBufferGoal,
      mockCanceller.signal,
    );
  });

  it("should apply both start and end append windows", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockedPlaybackObserver.observer,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment: {
          chunkData: mockChunkData,
          chunkInfos: { time: 8, duration: 4 },
          chunkOffset: 0,
          chunkSize: 1024,
          appendWindow: [9, 11],
          segmentType: "media",
          protectionData: [],
        },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCanceller.signal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      mockedPlaybackObserver.observer,
      mockSegmentSink,
      {
        data: {
          appendWindow: [8.9, 11.2], // [9 - 0.1, 11 + 0.2]
          initSegmentUniqueId: "init-123",
          chunk: mockChunkData,
          timestampOffset: 0,
          codec: 'video/mp4; codecs="avc1.42E01E"',
        },
        inventoryInfos: {
          start: 8.9, // max(8, 8.9)
          end: 11.2, // min(12, 11.2)
          ...mockContent,
          segment: mockSegment,
          chunkSize: 1024,
        },
      },
      mockBufferGoal,
      mockCanceller.signal,
    );
  });

  it("should not go below 0 for start append window", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockedPlaybackObserver.observer,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment: {
          chunkData: mockChunkData,
          chunkInfos: null,
          chunkOffset: 0,
          chunkSize: 1024,
          appendWindow: [0.05, undefined],
          segmentType: "media",
          protectionData: [],
        },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCanceller.signal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      mockedPlaybackObserver.observer,
      mockSegmentSink,
      {
        data: {
          appendWindow: [0, undefined], // max(0, 0.05 - 0.1)

          initSegmentUniqueId: "init-123",
          chunk: mockChunkData,
          timestampOffset: 0,
          codec: 'video/mp4; codecs="avc1.42E01E"',
        },
        inventoryInfos: {
          ...mockContent,
          segment: mockSegment,
          chunkSize: 1024,
          start: mockSegment.time,
          end: mockSegment.end,
        },
      },
      mockBufferGoal,
      mockCanceller.signal,
    );
  });
});
