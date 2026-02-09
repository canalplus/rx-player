import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MediaError, SourceBufferError } from "../../../../../errors";
import SharedReference from "../../../../../utils/reference";
import TaskCanceller, { CancellationError } from "../../../../../utils/task_canceller";
import appendSegmentToBuffer from "../append_segment_to_buffer";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

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
  let mockPlaybackObserver: any;
  let mockSegmentSink: any;
  let mockDataInfos: any;
  let mockBufferGoal: SharedReference<number>;
  let mockTaskCanceller = new TaskCanceller("test canceller");

  beforeEach(() => {
    mockPlaybackObserver = {
      getReference: vi.fn(
        () =>
          new SharedReference({
            position: {
              getWanted: () => 10,
            },
          }),
      ),
    };
    mockSegmentSink = {
      pushChunk: vi.fn(() => Promise.resolve([{ start: 0, end: 10 }])),
      removeBuffer: vi.fn(() => Promise.resolve(undefined)),
    };
    mockDataInfos = {
      inventoryInfos: {
        adaptation: { id: "test-adaptation", type: "video", representations: [] },
      },
    };
    mockBufferGoal = new SharedReference(30);
    mockTaskCanceller.cancel("test end");
    mockTaskCanceller = new TaskCanceller("test canceller");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("successful append", () => {
    it("should push chunk successfully on first try", async () => {
      const result = await appendSegmentToBuffer(
        mockPlaybackObserver,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      expect(mockSegmentSink.pushChunk).toHaveBeenCalledTimes(1);
      expect(mockSegmentSink.pushChunk).toHaveBeenCalledWith(mockDataInfos);
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

      mockSegmentSink.pushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      const result = await appendSegmentToBuffer(
        mockPlaybackObserver,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      expect(mockSegmentSink.pushChunk).toHaveBeenCalledTimes(2);
      expect(mockSegmentSink.removeBuffer).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ start: 0, end: 10 }]);
    });

    it("should remove buffer before current position (start)", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockSegmentSink.pushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      await appendSegmentToBuffer(
        mockPlaybackObserver,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      // Should remove from 0 to (currentPos - 5) = 5
      expect(mockSegmentSink.removeBuffer).toHaveBeenCalledWith(0, 5);
    });

    it("should remove buffer after buffer goal (end)", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockSegmentSink.pushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      mockBufferGoal.setValue(30);

      await appendSegmentToBuffer(
        mockPlaybackObserver,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );

      // Should remove from (currentPos + bufferGoal + 12) = 52 to MAX_VALUE
      expect(mockSegmentSink.removeBuffer).toHaveBeenCalledWith(52, Number.MAX_VALUE);
    });

    it("should not remove start buffer when position is < 5", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      mockSegmentSink.pushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockResolvedValueOnce([{ start: 0, end: 10 }]);

      mockPlaybackObserver.getReference.mockReturnValue(
        new SharedReference({
          position: {
            getWanted: vi.fn(() => 3),
          },
        }),
      );
      await appendSegmentToBuffer(
        mockPlaybackObserver,
        mockSegmentSink,
        mockDataInfos,
        mockBufferGoal,
        mockTaskCanceller.signal,
      );
      expect(mockSegmentSink.removeBuffer).toHaveBeenCalledWith(45, Number.MAX_VALUE);

      // Should only be called once for the end buffer
      expect(mockSegmentSink.removeBuffer).toHaveBeenCalledTimes(1);
    });

    it("should throw BUFFER_FULL_ERROR if retry fails", async () => {
      const bufferFullError = new SourceBufferError(
        "BUFFER_FULL",
        "Buffer is full",
        true,
      );

      const retryError = new Error("Retry failed");

      mockSegmentSink.pushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockRejectedValueOnce(retryError);

      await expect(
        appendSegmentToBuffer(
          mockPlaybackObserver,
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
      mockSegmentSink.pushChunk.mockRejectedValueOnce(error);
      await expect(
        appendSegmentToBuffer(
          mockPlaybackObserver,
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
      mockSegmentSink.pushChunk.mockRejectedValueOnce(error);

      await expect(
        appendSegmentToBuffer(
          mockPlaybackObserver,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(MediaError);
    });

    it("should throw BUFFER_APPEND_ERROR for unknown error type", async () => {
      mockSegmentSink.pushChunk.mockRejectedValueOnce("string error");

      await expect(
        appendSegmentToBuffer(
          mockPlaybackObserver,
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
      mockSegmentSink.pushChunk.mockRejectedValueOnce(cancellationError);

      await expect(
        appendSegmentToBuffer(
          mockPlaybackObserver,
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

      mockSegmentSink.pushChunk.mockRejectedValueOnce(bufferFullError);
      mockTaskCanceller.cancel("test 523");

      await expect(
        appendSegmentToBuffer(
          mockPlaybackObserver,
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

      mockSegmentSink.pushChunk
        .mockRejectedValueOnce(bufferFullError)
        .mockRejectedValueOnce(cancellationError);

      await expect(
        appendSegmentToBuffer(
          mockPlaybackObserver,
          mockSegmentSink,
          mockDataInfos,
          mockBufferGoal,
          mockTaskCanceller.signal,
        ),
      ).rejects.toThrow(CancellationError);
    });
  });
});
