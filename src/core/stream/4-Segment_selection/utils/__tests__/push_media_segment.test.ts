import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CancellationSignal } from "../../../../../utils/task_canceller";
import pushMediaSegment from "../push_media_segment";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Mock dependencies with vi.hoisted
const mockGetCurrent = vi.hoisted(() => vi.fn());
const mockObjectAssign = vi.hoisted(() => vi.fn());
const mockAppendSegmentToBuffer = vi.hoisted(() => vi.fn());

vi.mock("../../../../../config", () => ({
  default: {
    getCurrent: mockGetCurrent,
  },
}));

vi.mock("../../../../../utils/object_assign", () => ({
  default: mockObjectAssign,
}));

vi.mock("../append_segment_to_buffer.ts", () => ({
  default: mockAppendSegmentToBuffer,
}));

describe("pushMediaSegment", () => {
  const mockPlaybackObserver = {} as any;
  const mockBufferGoal = { getValue: () => 30 } as any;
  const mockCancelSignal = {} as CancellationSignal;
  const mockSegmentSink = {} as any;

  const mockContent = {
    adaptation: {} as any,
    manifest: {} as any,
    period: {} as any,
    representation: {
      getMimeTypeString: vi.fn(() => 'video/mp4; codecs="avc1.42E01E"'),
    } as any,
  };

  const mockSegment = {
    time: 10,
    duration: 5,
  } as any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetCurrent.mockReturnValue({
      APPEND_WINDOW_SECURITIES: {
        START: 0.1,
        END: 0.2,
      },
    });
    mockObjectAssign.mockImplementation((target, ...sources) =>
      // eslint-disable-next-line no-restricted-properties
      Object.assign(target, ...sources),
    );
  });

  it("should return null when chunkData is null", async () => {
    const parsedSegment: any = {
      chunkData: null,
      chunkInfos: null,
      chunkOffset: 0,
      chunkSize: 0,
      appendWindow: [undefined, undefined] as [number | undefined, number | undefined],
    };

    const result = await pushMediaSegment(
      {
        playbackObserver: mockPlaybackObserver,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCancelSignal,
    );

    expect(result).toBeNull();
    expect(mockAppendSegmentToBuffer).not.toHaveBeenCalled();
  });

  it("should append segment with basic data when chunkData is present", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    const parsedSegment: any = {
      chunkData: mockChunkData,
      chunkInfos: null,
      chunkOffset: 2.5,
      chunkSize: 1024,
      appendWindow: [undefined, undefined] as [number | undefined, number | undefined],
    };

    const mockBuffered = [{ start: 10, end: 15 }];
    mockAppendSegmentToBuffer.mockResolvedValue(mockBuffered);

    const result = await pushMediaSegment(
      {
        playbackObserver: mockPlaybackObserver,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCancelSignal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      mockPlaybackObserver,
      mockSegmentSink,
      {
        data: {
          initSegmentUniqueId: "init-123",
          chunk: mockChunkData,
          timestampOffset: 2.5,
          appendWindow: [undefined, undefined],
          codec: 'video/mp4; codecs="avc1.42E01E"',
        },
        inventoryInfos: expect.objectContaining({
          segment: mockSegment,
          chunkSize: 1024,
          start: 10,
          end: 15,
        }),
      },
      mockBufferGoal,
      mockCancelSignal,
    );

    expect(result).toEqual({
      content: mockContent,
      segment: mockSegment,
      buffered: mockBuffered,
    });
  });

  it("should use chunkInfos for time calculations when available", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    const parsedSegment: any = {
      chunkData: mockChunkData,
      chunkInfos: { time: 20, duration: 8 },
      chunkOffset: 0,
      chunkSize: 2048,
      appendWindow: [undefined, undefined] as [number | undefined, number | undefined],
    };

    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockPlaybackObserver,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: null,
        parsedSegment,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCancelSignal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        inventoryInfos: expect.objectContaining({
          start: 20,
          end: 28,
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("should apply append window securities to start window", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    const parsedSegment: any = {
      chunkData: mockChunkData,
      chunkInfos: null,
      chunkOffset: 0,
      chunkSize: 1024,
      appendWindow: [5, undefined] as [number | undefined, number | undefined],
    };

    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockPlaybackObserver,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCancelSignal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          appendWindow: [4.9, undefined], // 5 - 0.1
        }),
        inventoryInfos: expect.objectContaining({
          start: 10, // max(10, 4.9)
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("should apply append window securities to end window", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    const parsedSegment: any = {
      chunkData: mockChunkData,
      chunkInfos: null,
      chunkOffset: 0,
      chunkSize: 1024,
      appendWindow: [undefined, 20] as [number | undefined, number | undefined],
    };

    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockPlaybackObserver,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCancelSignal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          appendWindow: [undefined, 20.2], // 20 + 0.2
        }),
        inventoryInfos: expect.objectContaining({
          end: 15, // min(15, 20.2)
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("should apply both start and end append windows", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    const parsedSegment: any = {
      chunkData: mockChunkData,
      chunkInfos: { time: 8, duration: 4 },
      chunkOffset: 0,
      chunkSize: 1024,
      appendWindow: [9, 11] as [number | undefined, number | undefined],
    };

    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockPlaybackObserver,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCancelSignal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          appendWindow: [8.9, 11.2], // [9 - 0.1, 11 + 0.2]
        }),
        inventoryInfos: expect.objectContaining({
          start: 8.9, // max(8, 8.9)
          end: 11.2, // min(12, 11.2)
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("should not go below 0 for start append window", async () => {
    const mockChunkData = new Uint8Array([1, 2, 3]);
    const parsedSegment: any = {
      chunkData: mockChunkData,
      chunkInfos: null,
      chunkOffset: 0,
      chunkSize: 1024,
      appendWindow: [0.05, undefined] as [number | undefined, number | undefined],
    };

    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushMediaSegment(
      {
        playbackObserver: mockPlaybackObserver,
        bufferGoal: mockBufferGoal,
        content: mockContent,
        initSegmentUniqueId: "init-123",
        parsedSegment,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
      },
      mockCancelSignal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          appendWindow: [0, undefined], // max(0, 0.05 - 0.1)
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });
});
