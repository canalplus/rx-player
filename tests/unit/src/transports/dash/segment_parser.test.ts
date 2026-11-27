import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ISegment } from "../../../../../src/manifest/index.ts";
import generateAudioVideoSegmentParser from "../../../../../src/transports/dash/segment_parser.ts";
import type { ISegmentContext } from "../../../../../src/transports/types.ts";

const mocks = vi.hoisted(() => {
  return {
    getMDHDTimescale: vi.fn(),
    getSegmentsFromSidx: vi.fn(),
    extractPssh: vi.fn(),
    removeDolbyVisionConfigData: vi.fn(),
    getKeyIdFromInitSegment: vi.fn(),
    parseEmsgBoxes: vi.fn(),
    getISOBMFFTimingInfos: vi.fn(),
    logWarn: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", () => ({
  getMDHDTimescale: mocks.getMDHDTimescale,
  getSegmentsFromSidx: mocks.getSegmentsFromSidx,
  extractPssh: mocks.extractPssh,
  removeDolbyVisionConfigData: mocks.removeDolbyVisionConfigData,
}));
vi.mock("../../../../../src/parsers/containers/isobmff/utils", () => ({
  getKeyIdFromInitSegment: mocks.getKeyIdFromInitSegment,
  parseEmsgBoxes: mocks.parseEmsgBoxes,
}));
vi.mock("../../../../../src/transports/utils/get_isobmff_timing_infos", () => ({
  default: mocks.getISOBMFFTimingInfos,
}));
vi.mock("../../../../../src/log", () => ({
  default: { warn: mocks.logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const KEY_ID = new Uint8Array(16).fill(0x42);
const SEGMENT_LIST = [{ time: 0, duration: 2, timescale: 1, range: [0, 99] }];

function createContext(
  segment: Partial<ISegment>,
  mimeType: string | undefined,
): ISegmentContext {
  return {
    segment: segment as ISegment,
    type: "video",
    mimeType,
    isLive: false,
    periodStart: 0,
    periodEnd: undefined,
    baseCodecs: [],
    chosenCodec: undefined,
  };
}

function throwing(err: unknown): () => never {
  return () => {
    throw err;
  };
}

const parser = generateAudioVideoSegmentParser({});

function parseInit(
  mimeType: string | undefined,
  indexRange: [number, number] | undefined,
) {
  const res = parser(
    { data: new Uint8Array([0, 1, 2]), isChunked: false },
    createContext({ isInit: true, indexRange }, mimeType),
    undefined,
  );
  if (res.segmentType !== "init") {
    throw new Error("Expected an init segment");
  }
  return res;
}

/**
 * Every way of announcing the container and a `sidx`, with whether we know
 * for sure that a `sidx` should be read.
 */
const INIT_CONTEXTS = [
  { mimeType: "video/mp4", indexRange: [0, 100] as [number, number], sidxRequired: true },
  { mimeType: "audio/mp4", indexRange: [0, 100] as [number, number], sidxRequired: true },
  { mimeType: "video/mp4", indexRange: undefined, sidxRequired: false },
  { mimeType: undefined, indexRange: [0, 100] as [number, number], sidxRequired: false },
  { mimeType: undefined, indexRange: undefined, sidxRequired: false },
];

const THROWN_VALUES = [new Error("ISOBMFF: Size out of range"), "not an error"];

describe("DASH - audio/video segment parser - init segments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.extractPssh.mockReturnValue([]);
    mocks.getKeyIdFromInitSegment.mockReturnValue(KEY_ID);
    mocks.getMDHDTimescale.mockReturnValue(90000);
    mocks.getSegmentsFromSidx.mockReturnValue(SEGMENT_LIST);
  });

  for (const { mimeType, indexRange, sidxRequired } of INIT_CONTEXTS) {
    const ctxDesc = `mimeType: ${String(mimeType)}, indexRange: ${String(indexRange)}`;

    it(`should give key id, timescale and segment list (${ctxDesc})`, () => {
      const res = parseInit(mimeType, indexRange);
      expect(res.protectionData).toEqual([
        { initDataType: "cenc", keyId: KEY_ID, initData: [] },
      ]);
      expect(res.initTimescale).toBe(90000);
      expect(res.segmentList).toBe(SEGMENT_LIST);
      expect(mocks.logWarn).not.toHaveBeenCalled();
    });

    for (const thrown of THROWN_VALUES) {
      const errDesc = `${ctxDesc}, thrown: ${String(thrown)}`;
      const loggedErr = thrown instanceof Error ? thrown : "";

      if (sidxRequired) {
        it(`should throw what reading the sidx threw (${errDesc})`, () => {
          mocks.getSegmentsFromSidx.mockImplementation(throwing(thrown));
          let error: unknown = null;
          try {
            parseInit(mimeType, indexRange);
          } catch (e) {
            error = e;
          }
          expect(error).toBe(thrown);
        });
      } else {
        it(`should give no segment list if the sidx cannot be read (${errDesc})`, () => {
          mocks.getSegmentsFromSidx.mockImplementation(throwing(thrown));
          const res = parseInit(mimeType, indexRange);
          expect(res.segmentList).toBe(undefined);
          expect(res.initTimescale).toBe(90000);
          expect(res.protectionData).toEqual([
            { initDataType: "cenc", keyId: KEY_ID, initData: [] },
          ]);
          expect(mocks.logWarn).toHaveBeenCalledWith(
            "dash",
            "Could not read sidx from segment",
            loggedErr,
          );
        });
      }

      it(`should give no key id if it cannot be read (${errDesc})`, () => {
        mocks.getKeyIdFromInitSegment.mockImplementation(throwing(thrown));
        const res = parseInit(mimeType, indexRange);
        expect(res.protectionData).toEqual([]);
        expect(res.initTimescale).toBe(90000);
        expect(res.segmentList).toBe(SEGMENT_LIST);
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "dash",
          "Could not read key id from init segment",
          loggedErr,
        );
      });

      it(`should keep PSSH if the key id cannot be read (${errDesc})`, () => {
        const pssh = [{ systemId: "1077efecc0b24d02ace33c1e52e2fb4b", data: KEY_ID }];
        mocks.extractPssh.mockReturnValue(pssh);
        mocks.getKeyIdFromInitSegment.mockImplementation(throwing(thrown));
        const res = parseInit(mimeType, indexRange);
        expect(res.protectionData).toEqual([
          { initDataType: "cenc", keyId: undefined, initData: pssh },
        ]);
      });

      it(`should give no timescale if it cannot be read (${errDesc})`, () => {
        mocks.getMDHDTimescale.mockImplementation(throwing(thrown));
        const res = parseInit(mimeType, indexRange);
        expect(res.initTimescale).toBe(undefined);
        expect(res.protectionData).toEqual([
          { initDataType: "cenc", keyId: KEY_ID, initData: [] },
        ]);
        expect(res.segmentList).toBe(SEGMENT_LIST);
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "dash",
          "Could not read mdhd timescale from segment",
          loggedErr,
        );
      });

      if (!sidxRequired) {
        it(`should not throw if nothing can be read (${errDesc})`, () => {
          mocks.getKeyIdFromInitSegment.mockImplementation(throwing(thrown));
          mocks.getMDHDTimescale.mockImplementation(throwing(thrown));
          mocks.getSegmentsFromSidx.mockImplementation(throwing(thrown));
          const res = parseInit(mimeType, indexRange);
          expect(res.protectionData).toEqual([]);
          expect(res.initTimescale).toBe(undefined);
          expect(res.segmentList).toBe(undefined);
          expect(mocks.logWarn).toHaveBeenCalledTimes(3);
        });
      }
    }
  }

  it("should not read the sidx with a webm container", () => {
    const res = parseInit("video/webm", [0, 100]);
    expect(mocks.getSegmentsFromSidx).not.toHaveBeenCalled();
    expect(mocks.getMDHDTimescale).not.toHaveBeenCalled();
    expect(res.segmentList).toBe(undefined);
  });
});

describe("DASH - audio/video segment parser - media segments", () => {
  const timingInfos = { time: 1, duration: 2 };
  const emsg = {
    schemeIdUri: "urn:test",
    value: "1",
    timescale: 1000,
    presentationTimeDelta: 0,
    eventDuration: 1000,
    id: 1,
    messageData: new Uint8Array(0),
  };

  function parseMedia() {
    const res = parser(
      { data: new Uint8Array([0, 1, 2]), isChunked: false },
      createContext(
        { isInit: false, privateInfos: { isEMSGWhitelisted: () => true } },
        "video/mp4",
      ),
      90000,
    );
    if (res.segmentType !== "media") {
      throw new Error("Expected a media segment");
    }
    return res;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.extractPssh.mockReturnValue([]);
    mocks.getISOBMFFTimingInfos.mockReturnValue(timingInfos);
    mocks.parseEmsgBoxes.mockReturnValue([emsg]);
  });

  it("should give events and timing information", () => {
    const res = parseMedia();
    expect(res.inbandEvents).toEqual([{ type: "emsg", value: emsg }]);
    expect(res.chunkInfos).toBe(timingInfos);
    expect(mocks.getKeyIdFromInitSegment).not.toHaveBeenCalled();
  });

  for (const thrown of THROWN_VALUES) {
    it(`should give no event but timing information if emsg cannot be read (thrown: ${String(thrown)})`, () => {
      mocks.parseEmsgBoxes.mockImplementation(throwing(thrown));
      const res = parseMedia();
      expect(res.inbandEvents).toBe(undefined);
      expect(res.chunkInfos).toBe(timingInfos);
      expect(mocks.logWarn).toHaveBeenCalledWith(
        "dash",
        "Could not read emsg boxes from segment",
        thrown instanceof Error ? thrown : "",
      );
    });
  }
});
