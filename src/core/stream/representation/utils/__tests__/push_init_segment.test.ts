import { describe, it, expect, vi, beforeEach } from "vitest";
import pushInitSegment from "../push_init_segment";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const mockAppendSegmentToBuffer = vi.hoisted(() => vi.fn());

vi.mock("../append_segment_to_buffer", () => ({
  default: mockAppendSegmentToBuffer,
}));

describe("pushInitSegment", () => {
  let mockPlaybackObserver: any;
  let mockSegmentSink: any;
  let mockBufferGoal: any;
  let mockCancelSignal: any;
  let mockContent: any;
  let mockSegment: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPlaybackObserver = {};

    mockSegmentSink = {};

    mockBufferGoal = {
      getValue: vi.fn().mockReturnValue(30),
    };

    mockCancelSignal = {
      signal: { aborted: false },
      cancellationError: null,
    };

    mockContent = {
      adaptation: { id: "adaptation-1" },
      manifest: { id: "manifest-1" },
      period: { id: "period-1" },
      representation: {
        id: "rep-1",
        getMimeTypeString: vi.fn().mockReturnValue('video/mp4; codecs="avc1.42E01E"'),
      },
    };

    mockSegment = {
      id: "init-segment",
      isInit: true,
      time: 0,
      duration: 0,
    };
  });

  it("should call appendSegmentToBuffer with correct data structure", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue({
      start: 0,
      end: 10,
    });

    const initSegmentUniqueId = "unique-init-123";

    await pushInitSegment(
      {
        playbackObserver: mockPlaybackObserver,
        content: mockContent,
        initSegmentUniqueId,
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCancelSignal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledTimes(1);

    const callArgs = mockAppendSegmentToBuffer.mock.calls[0];
    expect(callArgs[0]).toBe(mockPlaybackObserver);
    expect(callArgs[1]).toBe(mockSegmentSink);
    expect(callArgs[3]).toBe(mockBufferGoal);
    expect(callArgs[4]).toBe(mockCancelSignal);

    const { data, inventoryInfos } = callArgs[2];
    expect(data).toEqual({
      initSegmentUniqueId,
      chunk: null,
      timestampOffset: 0,
      appendWindow: [undefined, undefined],
      codec: 'video/mp4; codecs="avc1.42E01E"',
    });

    expect(inventoryInfos).toMatchObject({
      segment: mockSegment,
      chunkSize: undefined,
      start: 0,
      end: 0,
      adaptation: mockContent.adaptation,
      manifest: mockContent.manifest,
      period: mockContent.period,
      representation: mockContent.representation,
    });
  });

  it("should return correct payload with buffered result", async () => {
    const mockBuffered = { start: 0, end: 10 };
    mockAppendSegmentToBuffer.mockResolvedValue(mockBuffered);

    const result = await pushInitSegment(
      {
        playbackObserver: mockPlaybackObserver,
        content: mockContent,
        initSegmentUniqueId: "init-456",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCancelSignal,
    );

    expect(result).toEqual({
      content: mockContent,
      segment: mockSegment,
      buffered: mockBuffered,
    });
  });

  it("should call getMimeTypeString on representation", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue({ start: 0, end: 0 });

    await pushInitSegment(
      {
        playbackObserver: mockPlaybackObserver,
        content: mockContent,
        initSegmentUniqueId: "init-789",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCancelSignal,
    );

    expect(mockContent.representation.getMimeTypeString).toHaveBeenCalledTimes(1);
  });

  it("should set chunk to null for init segments", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue({});

    await pushInitSegment(
      {
        playbackObserver: mockPlaybackObserver,
        content: mockContent,
        initSegmentUniqueId: "init-abc",
        segmentData: { someData: "value" },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCancelSignal,
    );

    const { data } = mockAppendSegmentToBuffer.mock.calls[0][2];
    expect(data.chunk).toBeNull();
  });

  it("should set timestampOffset to 0", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue({});

    await pushInitSegment(
      {
        playbackObserver: mockPlaybackObserver,
        content: mockContent,
        initSegmentUniqueId: "init-def",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCancelSignal,
    );

    const { data } = mockAppendSegmentToBuffer.mock.calls[0][2];
    expect(data.timestampOffset).toBe(0);
  });

  it("should set appendWindow to [undefined, undefined]", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue({});

    await pushInitSegment(
      {
        playbackObserver: mockPlaybackObserver,
        content: mockContent,
        initSegmentUniqueId: "init-ghi",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCancelSignal,
    );

    const { data } = mockAppendSegmentToBuffer.mock.calls[0][2];
    expect(data.appendWindow).toEqual([undefined, undefined]);
  });
});
