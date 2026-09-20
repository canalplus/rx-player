import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { type SegmentSink } from "../../../../../../../src/core/segment_sinks/index.ts";
import type { IRepresentationStreamMediaObservation } from "../../../../../../../src/core/stream/representation/types.ts";
import type appendSegmentToBuffer from "../../../../../../../src/core/stream/representation/utils/append_segment_to_buffer.ts";
import pushInitSegment from "../../../../../../../src/core/stream/representation/utils/push_init_segment.ts";
import {
  type Adaptation,
  type Period,
  type Representation,
  type ISegment,
} from "../../../../../../../src/manifest/classes/index.ts";
import type Manifest from "../../../../../../../src/manifest/classes/index.ts";
import type { IRange } from "../../../../../../../src/utils/ranges.ts";
import SharedReference from "../../../../../../../src/utils/reference.ts";
import TaskCanceller from "../../../../../../../src/utils/task_canceller.ts";
import {
  DummyAdaptation,
  DummyPeriod,
  DummyManifest,
  DummyRepresentation,
  createSegment,
} from "../../../../../mocks/manifest.ts";
import {
  makeReadyOnlyMediaElementMonitor,
  DummyObservationPosition,
} from "../../../../../mocks/media_element_monitor.ts";
import { DummySegmentSink } from "../../../../../mocks/segment_sinks.ts";

const mockAppendSegmentToBuffer = vi.hoisted((): Mock<typeof appendSegmentToBuffer> =>
  vi.fn((): Promise<IRange[]> => Promise.resolve([])),
);
vi.mock(
  "../../../../../../../src/core/stream/representation/utils/append_segment_to_buffer",
  () => ({
    default: mockAppendSegmentToBuffer,
  }),
);

describe("pushInitSegment", () => {
  const mockedMediaElementMonitor =
    makeReadyOnlyMediaElementMonitor<IRepresentationStreamMediaObservation>({
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
  let mockSegmentSink: SegmentSink;
  let mockBufferGoal: SharedReference<number>;
  let mockCanceller: TaskCanceller;
  let mockContent: {
    adaptation: Adaptation;
    manifest: Manifest;
    period: Period;
    representation: Representation;
  };
  let mockSegment: ISegment;

  beforeEach(() => {
    vi.resetAllMocks();

    mockSegmentSink = new DummySegmentSink();
    mockBufferGoal = new SharedReference<number>(30);
    mockCanceller = new TaskCanceller("pushInitSegment tests");
    mockContent = {
      adaptation: new DummyAdaptation({ id: "adaptation-1" }),
      manifest: new DummyManifest({ id: "manifest-1" }),
      period: new DummyPeriod({ id: "period-1" }),
      representation: new DummyRepresentation({
        id: "rep-1",
      }),
    };
    mockContent.representation.getMimeTypeString = vi
      .fn()
      .mockReturnValue('video/mp4; codecs="avc1.42E01E"');
    mockSegment = createSegment({
      id: "init-segment",
      isInit: true,
      time: 0,
      duration: 0,
    });
  });

  afterEach(() => {
    mockBufferGoal.finish();
    mockCanceller.cancel("test end");
    mockedMediaElementMonitor.reset();
    vi.resetModules();
  });

  it("should call appendSegmentToBuffer with correct data structure", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue([
      {
        start: 0,
        end: 10,
      },
    ]);

    const initSegmentUniqueId = "unique-init-123";

    await pushInitSegment(
      {
        mediaElementMonitor: mockedMediaElementMonitor.observer,
        content: mockContent,
        initSegmentUniqueId,
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCanceller.signal,
    );

    expect(mockAppendSegmentToBuffer).toHaveBeenCalledTimes(1);

    const callArgs = mockAppendSegmentToBuffer.mock.calls[0];
    expect(callArgs[0]).toBe(mockedMediaElementMonitor.observer);
    expect(callArgs[1]).toBe(mockSegmentSink);
    expect(callArgs[3]).toBe(mockBufferGoal);
    expect(callArgs[4]).toBe(mockCanceller.signal);

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
    const mockBuffered = [{ start: 0, end: 10 }];
    mockAppendSegmentToBuffer.mockResolvedValue(mockBuffered);

    const result = await pushInitSegment(
      {
        mediaElementMonitor: mockedMediaElementMonitor.observer,
        content: mockContent,
        initSegmentUniqueId: "init-456",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCanceller.signal,
    );

    expect(result).toEqual({
      content: mockContent,
      segment: mockSegment,
      buffered: mockBuffered,
    });
  });

  it("should call getMimeTypeString on representation", async () => {
    const mockGetMimeTypeString = vi.spyOn(
      mockContent.representation,
      "getMimeTypeString",
    );
    mockAppendSegmentToBuffer.mockResolvedValue([{ start: 0, end: 0 }]);

    await pushInitSegment(
      {
        mediaElementMonitor: mockedMediaElementMonitor.observer,
        content: mockContent,
        initSegmentUniqueId: "init-789",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCanceller.signal,
    );

    expect(mockGetMimeTypeString).toHaveBeenCalledTimes(1);
  });

  it("should set chunk to null for init segments", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushInitSegment(
      {
        mediaElementMonitor: mockedMediaElementMonitor.observer,
        content: mockContent,
        initSegmentUniqueId: "init-abc",
        segmentData: { someData: "value" },
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCanceller.signal,
    );

    const { data } = mockAppendSegmentToBuffer.mock.calls[0][2];
    expect(data.chunk).toBeNull();
  });

  it("should set timestampOffset to 0", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushInitSegment(
      {
        mediaElementMonitor: mockedMediaElementMonitor.observer,
        content: mockContent,
        initSegmentUniqueId: "init-def",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCanceller.signal,
    );

    const { data } = mockAppendSegmentToBuffer.mock.calls[0][2];
    expect(data.timestampOffset).toBe(0);
  });

  it("should set appendWindow to [undefined, undefined]", async () => {
    mockAppendSegmentToBuffer.mockResolvedValue([]);

    await pushInitSegment(
      {
        mediaElementMonitor: mockedMediaElementMonitor.observer,
        content: mockContent,
        initSegmentUniqueId: "init-ghi",
        segmentData: null,
        segment: mockSegment,
        segmentSink: mockSegmentSink,
        bufferGoal: mockBufferGoal,
      },
      mockCanceller.signal,
    );

    const { data } = mockAppendSegmentToBuffer.mock.calls[0][2];
    expect(data.appendWindow).toEqual([undefined, undefined]);
  });
});
