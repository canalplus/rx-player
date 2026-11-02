import { describe, it, expect, vi } from "vitest";
import AudioVideoSegmentSink from "../../../../../../../src/core/segment_sinks/implementations/audio_video/audio_video_segment_sink.ts";
import type {
  IMediaSourceInterface,
  ISourceBufferInterface,
} from "../../../../../../../src/mse/index.ts";
import { SourceBufferType } from "../../../../../../../src/mse/index.ts";
import {
  DummyAdaptation,
  DummyPeriod,
  DummyRepresentation,
  createSegment,
} from "../../../../../mocks/manifest.ts";

describe("AudioVideoSegmentSink", () => {
  it.each([
    {
      name: "ArrayBuffer",
      createData: () => new Uint8Array([1, 2, 3, 4]).buffer,
    },
    {
      name: "Uint8Array subarray",
      createData: () => new Uint8Array([99, 1, 2, 3, 4, 99]).subarray(1, 5),
    },
    {
      name: "Uint16Array view",
      createData: () =>
        new Uint16Array(new Uint8Array([99, 99, 1, 2, 3, 4, 99, 99]).buffer, 2, 2),
    },
    {
      name: "DataView",
      createData: () => new DataView(new Uint8Array([99, 1, 2, 3, 4, 99]).buffer, 1, 4),
    },
  ])(
    "clones an init segment given as a $name before appending it",
    async ({ createData }) => {
      const appendBuffer = vi
        .fn<ISourceBufferInterface["appendBuffer"]>()
        .mockResolvedValue([]);
      const sourceBuffer = { appendBuffer } as unknown as ISourceBufferInterface;
      const mediaSource = {
        addSourceBuffer: () => sourceBuffer,
      } as unknown as IMediaSourceInterface;
      const sink = new AudioVideoSegmentSink(
        SourceBufferType.Video,
        "video/mp4",
        mediaSource,
      );
      const initData = createData();
      sink.declareInitSegment("init", initData);

      await sink.pushChunk({
        data: {
          initSegmentUniqueId: "init",
          chunk: null,
          codec: "video/mp4",
          timestampOffset: 0,
          appendWindow: [0, undefined],
        },
        inventoryInfos: {
          adaptation: new DummyAdaptation({ type: "video" }),
          period: new DummyPeriod(),
          representation: new DummyRepresentation({ trackType: "video" }),
          segment: createSegment({ isInit: true }),
          chunkSize: initData.byteLength,
          start: 0,
          end: 0,
        },
      });

      const originalBuffer = initData instanceof ArrayBuffer ? initData : initData.buffer;
      new Uint8Array(originalBuffer).fill(0);
      expect(appendBuffer).toHaveBeenCalledTimes(1);
      expect(appendBuffer).toHaveBeenCalledWith(new Uint8Array([1, 2, 3, 4]), {
        codec: "video/mp4",
        timestampOffset: 0,
        appendWindow: [0, undefined],
      });
    },
  );
});
