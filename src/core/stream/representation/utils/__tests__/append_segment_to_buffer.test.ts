import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MediaError, SourceBufferError } from "../../../../../errors";
import { __MANIFEST_CLASSES_MOCKS } from "../../../../../manifest/classes";
import { __PLAYBACK_OBSERVER_MOCKS } from "../../../../../playback_observer";
import SharedReference from "../../../../../utils/reference";
import TaskCanceller, { CancellationError } from "../../../../../utils/task_canceller";
import type {
  IInsertedChunkInfos,
  IPushChunkInfos,
  SegmentSink,
} from "../../../../segment_sinks";
import { DummySegmentSink } from "../../../../segment_sinks/__tests__/mocks";
import type { IRepresentationStreamPlaybackObservation } from "../../types";
import appendSegmentToBuffer from "../append_segment_to_buffer";

vi.mock("../../../../../log", () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));
vi.mock("../../../../../utils/sleep", () => ({
  default: vi.fn(() => Promise.resolve()),
}));

describe("appendSegmentToBuffer", () => {
  const mockedPlaybackObserver =
    __PLAYBACK_OBSERVER_MOCKS.makeReadyOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>(
      {
        position: new __PLAYBACK_OBSERVER_MOCKS.DummyObservationPosition({
          getWanted: vi.fn(() => 10),
        }),
        paused: {
          last: false,
          pending: undefined,
        },
        speed: 1,
        canStream: true,
      },
    );
  let mockDataInfos: IPushChunkInfos<unknown> & { inventoryInfos: IInsertedChunkInfos };
  let mockBufferGoal: SharedReference<number>;
  let mockTaskCanceller: TaskCanceller;
  const mockPushChunk = vi.fn();
  const mockRemoveBuffer = vi.fn();
  let mockSegmentSink: SegmentSink;

  beforeEach(() => {
    mockBufferGoal = new SharedReference(30);
    mockTaskCanceller = new TaskCanceller("test canceller");

    mockPushChunk.mockImplementation(() => Promise.resolve([{ start: 0, end: 10 }]));
    mockRemoveBuffer.mockImplementation(() => Promise.resolve(undefined));
    mockSegmentSink = new DummySegmentSink({
      pushChunk: mockPushChunk,
      removeBuffer: mockRemoveBuffer,
    });

    mockDataInfos = {
      inventoryInfos: {
        adaptation: new __MANIFEST_CLASSES_MOCKS.DummyAdaptation({
          id: "test-adaptation",
          type: "video",
          representations: [],
        }),
        representation: new __MANIFEST_CLASSES_MOCKS.DummyRepresentation(),
        period: new __MANIFEST_CLASSES_MOCKS.DummyPeriod(),
        segment: __MANIFEST_CLASSES_MOCKS.createSegment(),
        chunkSize: 1024,
        start: 0,
        end: 2,
      },
      data: {
        initSegmentUniqueId: "...",
        codec: "...",
        chunk: new Uint8Array([1, 2, 3]),
        timestampOffset: 0,
        appendWindow: [undefined, undefined],
      },
    };
  });

  afterEach(() => {
    mockBufferGoal.finish();
    mockTaskCanceller.cancel("test end");
    mockedPlaybackObserver.reset();
    vi.resetAllMocks();
  });

  describe("successful append", () => {
    it("should push chunk successfully on first try", async () => {
      const result = await appendSegmentToBuffer(
        mockedPlaybackObserver.observer,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      expect(mockPushChunk).toHaveBeenCalledTimes(1);
      expect(mockPushChunk).toHaveBeenCalledWith(mockDataInfos);
      expect(result).toEqual([{ start: 0, end: 10 }]);
    });
  });

  describe("buffer full error handling", () => {
    it("should run garbage collector and retry on buffer full error", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockPushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      const result = await appendSegmentToBuffer(
        mockedPlaybackObserver.observer,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      expect(mockPushChunk).toHaveBeenCalledTimes(2);
      expect(mockRemoveBuffer).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ start: 0, end: 10 }]);
    });

    it("should remove buffer before current position (start)", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockPushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      await appendSegmentToBuffer(
        mockedPlaybackObserver.observer,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      // Should remove from 0 to (currentPos - 5) = 5
      expect(mockRemoveBuffer).toHaveBeenCalledWith(0, 5);
    });

    it("should remove buffer after buffer goal (end)", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockPushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      mockBufferGoal.setValue(30);

      await appendSegmentToBuffer(
        mockedPlaybackObserver.observer,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      // Should remove from (currentPos + bufferGoal + 12) = 52 to MAX_VALUE
      expect(mockRemoveBuffer).toHaveBeenCalledWith(52, Number.MAX_VALUE);
    });

    it("should not remove start buffer when position is < 5", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockPushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      mockedPlaybackObserver.emit({
        position: new __PLAYBACK_OBSERVER_MOCKS.DummyObservationPosition({
          getWanted: vi.fn(() => 3),
        }),
        paused: {
          last: false,
          pending: undefined,
        },
        speed: 1,
        canStream: true,
      });
      await appendSegmentToBuffer(
        mockedPlaybackObserver.observer,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );
      expect(mockRemoveBuffer).toHaveBeenCalledWith(45, Number.MAX_VALUE);

      // Should only be called once for the end buffer
      expect(mockRemoveBuffer).toHaveBeenCalledTimes(1);
    });

    it("should throw BUFFER_FULL_ERROR if retry fails", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      const retryError = new Error("Retry failed");

      mockPushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockRejectedValueOnce(retryError);

      await expect(
        appendSegmentToBuffer(
          mockedPlaybackObserver.observer,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow("BUFFER_FULL_ERROR");
    });
  });

  describe("non-buffer-full errors", () => {
    it("should throw BUFFER_APPEND_ERROR for non-buffer-full SourceBufferError", async () => {
      const error = new SourceBufferError("SOME_ERROR", "Some error", false);
      mockPushChunk.mockRejectedValueOnce(error);
      await expect(
        appendSegmentToBuffer(
          mockedPlaybackObserver.observer,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(
        new MediaError("BUFFER_APPEND_ERROR", "SOME_ERROR: Some error", {
          tracks: [
            {
              type: "video",
              track: {
                id: "test-adaptation",
                representations: [],
              },
            },
          ],
        }),
      );
    });

    it("should throw BUFFER_APPEND_ERROR for generic Error", async () => {
      const error = new Error("Generic error");
      mockPushChunk.mockRejectedValueOnce(error);

      await expect(
        appendSegmentToBuffer(
          mockedPlaybackObserver.observer,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(MediaError);
    });

    it("should throw BUFFER_APPEND_ERROR for unknown error type", async () => {
      mockPushChunk.mockRejectedValueOnce("string error");

      await expect(
        appendSegmentToBuffer(
          mockedPlaybackObserver.observer,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(MediaError);
    });
  });

  describe("cancellation handling", () => {
    it("should throw CancellationError on initial pushChunk if cancelled", async () => {
      const cancellationError = new CancellationError("Test", "test");
      mockTaskCanceller.cancel("test cancellation");
      mockPushChunk.mockRejectedValueOnce(cancellationError);

      await expect(
        appendSegmentToBuffer(
          mockedPlaybackObserver.observer,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(CancellationError);
    });

    it("should throw CancellationError during retry if cancelled", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockPushChunk.mockRejectedValueOnce(bufferFullError);
      mockTaskCanceller.cancel("test 523");

      await expect(
        appendSegmentToBuffer(
          mockedPlaybackObserver.observer,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(CancellationError);
    });

    it("should throw CancellationError if retry pushChunk is cancelled", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      const cancellationError = new CancellationError("Test", "test");

      mockPushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockRejectedValueOnce(cancellationError);

      await expect(
        appendSegmentToBuffer(
          mockedPlaybackObserver.observer,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(CancellationError);
    });
  });
});
