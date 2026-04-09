import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Manifest from "../../../../../manifest/classes";
import {
  type Adaptation,
  type Period,
  type Representation,
  type ISegment,
} from "../../../../../manifest/classes";
import {
  DummyAdaptation,
  DummyPeriod,
  DummyManifest,
  DummyRepresentation,
  createSegment,
} from "../../../../../manifest/classes/__tests__/mocks";
import {
  makeReadyOnlyPlaybackObserver,
  DummyObservationPosition,
} from "../../../../../playback_observer/__tests__/mocks";
import type { IRange } from "../../../../../utils/ranges";
import SharedReference from "../../../../../utils/reference";
import TaskCanceller from "../../../../../utils/task_canceller";
import { type SegmentSink } from "../../../../segment_sinks";
import { DummySegmentSink } from "../../../../segment_sinks/__tests__/mocks";
import type { IRepresentationStreamPlaybackObservation } from "../../types";
import type appendSegmentToBuffer from "../append_segment_to_buffer";
import pushInitSegment from "../push_init_segment";

const mockAppendSegmentToBuffer = vi.hoisted(
  (): Mock<typeof appendSegmentToBuffer> =>
    vi.fn((): Promise<IRange[]> => Promise.resolve([])),
);
vi.mock("../append_segment_to_buffer", () => ({
  default: mockAppendSegmentToBuffer,
}));

describe("pushInitSegment", () => {
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
    mockedPlaybackObserver.reset();
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
        playbackObserver: mockedPlaybackObserver.observer,
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
    expect(callArgs[0]).toBe(mockedPlaybackObserver.observer);
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
        playbackObserver: mockedPlaybackObserver.observer,
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
        playbackObserver: mockedPlaybackObserver.observer,
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
        playbackObserver: mockedPlaybackObserver.observer,
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
        playbackObserver: mockedPlaybackObserver.observer,
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
        playbackObserver: mockedPlaybackObserver.observer,
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
