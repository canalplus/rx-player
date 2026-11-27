import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ISegment } from "../../../../../src/manifest/index.ts";
import generateTextTrackParser from "../../../../../src/transports/dash/text_parser.ts";
import type { ISegmentContext } from "../../../../../src/transports/types.ts";

const mocks = vi.hoisted(() => {
  return {
    getMDHDTimescale: vi.fn(),
    getSegmentsFromSidx: vi.fn(),
    getISOBMFFTimingInfos: vi.fn(),
    getISOBMFFEmbeddedTextTrackData: vi.fn(),
    logWarn: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", () => ({
  getMDHDTimescale: mocks.getMDHDTimescale,
  getSegmentsFromSidx: mocks.getSegmentsFromSidx,
}));
vi.mock("../../../../../src/transports/utils/get_isobmff_timing_infos", () => ({
  default: mocks.getISOBMFFTimingInfos,
}));
vi.mock("../../../../../src/transports/utils/parse_text_track", () => ({
  getISOBMFFEmbeddedTextTrackData: mocks.getISOBMFFEmbeddedTextTrackData,
  getPlainTextTrackData: vi.fn(),
}));
vi.mock("../../../../../src/log", () => ({
  default: { warn: mocks.logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const SEGMENT_LIST = [{ time: 0, duration: 2, timescale: 1, range: [0, 99] }];
const THROWN_VALUES = [new Error("ISOBMFF: Size out of range"), "not an error"];

function throwing(err: unknown): () => never {
  return () => {
    throw err;
  };
}

function createContext(segment: Partial<ISegment>): ISegmentContext {
  return {
    segment: segment as ISegment,
    type: "text",
    mimeType: "application/mp4",
    isLive: false,
    periodStart: 0,
    periodEnd: undefined,
    baseCodecs: [],
    chosenCodec: "stpp",
  };
}

const parser = generateTextTrackParser({});

function parseInit(indexRange: [number, number] | undefined) {
  const res = parser(
    { data: new Uint8Array([0, 1, 2]), isChunked: false },
    createContext({ isInit: true, indexRange }),
    undefined,
  );
  if (res.segmentType !== "init") {
    throw new Error("Expected an init segment");
  }
  return res;
}

describe("DASH - text track parser - ISOBMFF init segments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getMDHDTimescale.mockReturnValue(1000);
    mocks.getSegmentsFromSidx.mockReturnValue(SEGMENT_LIST);
  });

  for (const indexRange of [[0, 100] as [number, number], undefined]) {
    it(`should give timescale and segment list (indexRange: ${String(indexRange)})`, () => {
      const res = parseInit(indexRange);
      expect(res.initTimescale).toBe(1000);
      expect(res.segmentList).toBe(SEGMENT_LIST);
      expect(mocks.logWarn).not.toHaveBeenCalled();
    });
  }

  for (const thrown of THROWN_VALUES) {
    const loggedErr = thrown instanceof Error ? thrown : "";

    it(`should throw what reading the sidx threw if a sidx is announced (thrown: ${String(thrown)})`, () => {
      mocks.getSegmentsFromSidx.mockImplementation(throwing(thrown));
      let error: unknown = null;
      try {
        parseInit([0, 100]);
      } catch (e) {
        error = e;
      }
      expect(error).toBe(thrown);
    });

    it(`should give no segment list if the sidx cannot be read and none is announced (thrown: ${String(thrown)})`, () => {
      mocks.getSegmentsFromSidx.mockImplementation(throwing(thrown));
      const res = parseInit(undefined);
      expect(res.segmentList).toBe(undefined);
      expect(res.initTimescale).toBe(1000);
      expect(mocks.logWarn).toHaveBeenCalledWith(
        "dash",
        "Could not read sidx from text segment",
        loggedErr,
      );
    });

    for (const indexRange of [[0, 100] as [number, number], undefined]) {
      it(`should give no timescale if it cannot be read (indexRange: ${String(indexRange)}, thrown: ${String(thrown)})`, () => {
        mocks.getMDHDTimescale.mockImplementation(throwing(thrown));
        const res = parseInit(indexRange);
        expect(res.initTimescale).toBe(undefined);
        expect(res.segmentList).toBe(SEGMENT_LIST);
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "dash",
          "Could not read mdhd timescale from text segment",
          loggedErr,
        );
      });
    }

    it(`should not throw if nothing can be read and no sidx is announced (thrown: ${String(thrown)})`, () => {
      mocks.getMDHDTimescale.mockImplementation(throwing(thrown));
      mocks.getSegmentsFromSidx.mockImplementation(throwing(thrown));
      const res = parseInit(undefined);
      expect(res.initTimescale).toBe(undefined);
      expect(res.segmentList).toBe(undefined);
      expect(mocks.logWarn).toHaveBeenCalledTimes(2);
    });
  }
});

describe("DASH - text track parser - ISOBMFF media segments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getISOBMFFTimingInfos.mockReturnValue({ time: 1, duration: 2 });
  });

  it("should give the text data", () => {
    const textData = { data: "", type: "ttml" };
    mocks.getISOBMFFEmbeddedTextTrackData.mockReturnValue(textData);
    const res = parser(
      { data: new Uint8Array([0, 1, 2]), isChunked: false },
      createContext({ isInit: false }),
      1000,
    );
    expect(res.segmentType).toBe("media");
    expect(res.segmentType === "media" && res.chunkData).toBe(textData);
  });

  for (const thrown of THROWN_VALUES) {
    it(`should throw what reading the text data threw (thrown: ${String(thrown)})`, () => {
      mocks.getISOBMFFEmbeddedTextTrackData.mockImplementation(throwing(thrown));
      let error: unknown = null;
      try {
        parser(
          { data: new Uint8Array([0, 1, 2]), isChunked: false },
          createContext({ isInit: false }),
          1000,
        );
      } catch (e) {
        error = e;
      }
      expect(error).toBe(thrown);
    });
  }
});
