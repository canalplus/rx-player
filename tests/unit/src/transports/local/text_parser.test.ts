import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ISegment } from "../../../../../src/manifest/index.ts";
import textTrackParser from "../../../../../src/transports/local/text_parser.ts";
import type { ISegmentContext } from "../../../../../src/transports/types.ts";

const mocks = vi.hoisted(() => {
  return {
    getMDHDTimescale: vi.fn(),
    getISOBMFFTimingInfos: vi.fn(),
    getISOBMFFEmbeddedTextTrackData: vi.fn(),
    logWarn: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", () => ({
  getMDHDTimescale: mocks.getMDHDTimescale,
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

describe("local - text track parser - ISOBMFF segments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getMDHDTimescale.mockReturnValue(1000);
    mocks.getISOBMFFTimingInfos.mockReturnValue({ time: 1, duration: 2 });
  });

  it("should give the timescale of an init segment", () => {
    const res = textTrackParser(
      { data: new Uint8Array([0, 1, 2]), isChunked: false },
      createContext({ isInit: true }),
      undefined,
    );
    expect(res.segmentType === "init" && res.initTimescale).toBe(1000);
  });

  for (const thrown of THROWN_VALUES) {
    it(`should give no timescale if it cannot be read (thrown: ${String(thrown)})`, () => {
      mocks.getMDHDTimescale.mockImplementation(throwing(thrown));
      const res = textTrackParser(
        { data: new Uint8Array([0, 1, 2]), isChunked: false },
        createContext({ isInit: true }),
        undefined,
      );
      expect(res.segmentType).toBe("init");
      expect(res.segmentType === "init" && res.initTimescale).toBe(undefined);
      expect(mocks.logWarn).toHaveBeenCalledWith(
        "isobmff",
        "Could not read mdhd timescale from text segment",
        thrown instanceof Error ? thrown : "",
      );
    });

    it(`should throw what reading the text data threw (thrown: ${String(thrown)})`, () => {
      mocks.getISOBMFFEmbeddedTextTrackData.mockImplementation(throwing(thrown));
      let error: unknown = null;
      try {
        textTrackParser(
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
