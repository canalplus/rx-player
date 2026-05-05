import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourceBufferType } from "../../../mse/index.ts";

const mockArrayFind = vi.hoisted(() => vi.fn());

vi.mock("../../../utils/array_find", () => ({
  default: mockArrayFind,
}));

import getBufferedDataPerMediaBuffer from "../get_buffered_data_per_media_buffer.ts";

describe("getBufferedDataPerMediaBuffer", () => {
  beforeEach(() => {
    mockArrayFind.mockReset();
    // Default: mimic real arrayFind behavior
    mockArrayFind.mockImplementation(
      // eslint-disable-next-line no-restricted-properties
      (arr: unknown[], predicate: (item: unknown) => boolean) => arr.find(predicate),
    );
  });

  it("should return all nulls when both arguments are null", () => {
    const result = getBufferedDataPerMediaBuffer(null, null);
    expect(result).toEqual({ audio: null, video: null, text: null });
  });

  it("should return text ranges from textDisplayer when provided", () => {
    const textRanges = [{ start: 0, end: 10 }];
    const textDisplayer = { getBufferedRanges: vi.fn(() => textRanges) };
    const result = getBufferedDataPerMediaBuffer(null, textDisplayer as never);
    expect(result.text).toBe(textRanges);
    expect(result.audio).toBeNull();
    expect(result.video).toBeNull();
  });

  it("should return audio and video ranges from mediaSourceInterface", () => {
    const audioRanges = [{ start: 0, end: 5 }];
    const videoRanges = [{ start: 0, end: 8 }];

    const audioSourceBuffer = {
      type: SourceBufferType.Audio,
      getBuffered: vi.fn(() => audioRanges),
    };
    const videoSourceBuffer = {
      type: SourceBufferType.Video,
      getBuffered: vi.fn(() => videoRanges),
    };

    mockArrayFind
      .mockImplementationOnce(() => audioSourceBuffer)
      .mockImplementationOnce(() => videoSourceBuffer);

    const mediaSourceInterface = {
      sourceBuffers: [audioSourceBuffer, videoSourceBuffer],
    };
    const result = getBufferedDataPerMediaBuffer(mediaSourceInterface as never, null);

    expect(result.audio).toBe(audioRanges);
    expect(result.video).toBe(videoRanges);
    expect(result.text).toBeNull();
  });

  it("should keep audio/video as null if source buffers are not found", () => {
    mockArrayFind.mockReturnValue(undefined);
    const mediaSourceInterface = { sourceBuffers: [] };
    const result = getBufferedDataPerMediaBuffer(mediaSourceInterface as never, null);
    expect(result.audio).toBeNull();
    expect(result.video).toBeNull();
  });

  it("should combine text displayer and mediaSourceInterface results", () => {
    const textRanges = [{ start: 1, end: 3 }];
    const audioRanges = [{ start: 0, end: 10 }];
    const textDisplayer = { getBufferedRanges: vi.fn(() => textRanges) };

    const audioSourceBuffer = {
      type: SourceBufferType.Audio,
      getBuffered: vi.fn(() => audioRanges),
    };

    mockArrayFind
      .mockImplementationOnce(() => audioSourceBuffer)
      .mockImplementationOnce(() => undefined);

    const mediaSourceInterface = { sourceBuffers: [audioSourceBuffer] };
    const result = getBufferedDataPerMediaBuffer(
      mediaSourceInterface as never,
      textDisplayer as never,
    );

    expect(result.text).toBe(textRanges);
    expect(result.audio).toBe(audioRanges);
    expect(result.video).toBeNull();
  });
});
