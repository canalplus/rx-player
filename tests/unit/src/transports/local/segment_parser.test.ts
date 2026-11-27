import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ISegment } from "../../../../../src/manifest/index.ts";
import segmentParser from "../../../../../src/transports/local/segment_parser.ts";
import type { ISegmentContext } from "../../../../../src/transports/types.ts";

const mocks = vi.hoisted(() => {
  return {
    getMDHDTimescale: vi.fn(),
    extractPssh: vi.fn(),
    getKeyIdFromInitSegment: vi.fn(),
    getISOBMFFTimingInfos: vi.fn(),
    logWarn: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", () => ({
  getMDHDTimescale: mocks.getMDHDTimescale,
  extractPssh: mocks.extractPssh,
}));
vi.mock("../../../../../src/parsers/containers/isobmff/utils", () => ({
  getKeyIdFromInitSegment: mocks.getKeyIdFromInitSegment,
}));
vi.mock("../../../../../src/transports/utils/get_isobmff_timing_infos", () => ({
  default: mocks.getISOBMFFTimingInfos,
}));
vi.mock("../../../../../src/log", () => ({
  default: { warn: mocks.logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const KEY_ID = new Uint8Array(16).fill(0x42);
const THROWN_VALUES = [new Error("ISOBMFF: Size out of range"), "not an error"];

function throwing(err: unknown): () => never {
  return () => {
    throw err;
  };
}

function parseInit(mimeType: string | undefined) {
  const context: ISegmentContext = {
    segment: { isInit: true } as ISegment,
    type: "video",
    mimeType,
    isLive: false,
    periodStart: 0,
    periodEnd: undefined,
    baseCodecs: [],
    chosenCodec: undefined,
  };
  const res = segmentParser(
    { data: new Uint8Array([0, 1, 2]), isChunked: false },
    context,
    undefined,
  );
  if (res.segmentType !== "init") {
    throw new Error("Expected an init segment");
  }
  return res;
}

describe("local - segment parser - init segments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.extractPssh.mockReturnValue([]);
    mocks.getKeyIdFromInitSegment.mockReturnValue(KEY_ID);
    mocks.getMDHDTimescale.mockReturnValue(90000);
  });

  for (const mimeType of ["video/mp4", undefined]) {
    it(`should give key id and timescale (mimeType: ${String(mimeType)})`, () => {
      const res = parseInit(mimeType);
      expect(res.protectionData).toEqual([
        { initDataType: "cenc", keyId: KEY_ID, initData: [] },
      ]);
      expect(res.initTimescale).toBe(90000);
      expect(mocks.logWarn).not.toHaveBeenCalled();
    });

    for (const thrown of THROWN_VALUES) {
      const desc = `mimeType: ${String(mimeType)}, thrown: ${String(thrown)}`;
      const loggedErr = thrown instanceof Error ? thrown : "";

      it(`should give no key id if it cannot be read (${desc})`, () => {
        mocks.getKeyIdFromInitSegment.mockImplementation(throwing(thrown));
        const res = parseInit(mimeType);
        expect(res.protectionData).toEqual([]);
        expect(res.initTimescale).toBe(90000);
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "isobmff",
          "Could not read key id from init segment",
          loggedErr,
        );
      });

      it(`should keep PSSH if the key id cannot be read (${desc})`, () => {
        const pssh = [{ systemId: "1077efecc0b24d02ace33c1e52e2fb4b", data: KEY_ID }];
        mocks.extractPssh.mockReturnValue(pssh);
        mocks.getKeyIdFromInitSegment.mockImplementation(throwing(thrown));
        const res = parseInit(mimeType);
        expect(res.protectionData).toEqual([
          { initDataType: "cenc", keyId: undefined, initData: pssh },
        ]);
      });

      it(`should give no timescale if it cannot be read (${desc})`, () => {
        mocks.getMDHDTimescale.mockImplementation(throwing(thrown));
        const res = parseInit(mimeType);
        expect(res.initTimescale).toBe(undefined);
        expect(res.protectionData).toEqual([
          { initDataType: "cenc", keyId: KEY_ID, initData: [] },
        ]);
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "isobmff",
          "Could not read mdhd timescale from segment",
          loggedErr,
        );
      });

      it(`should not throw if nothing can be read (${desc})`, () => {
        mocks.getKeyIdFromInitSegment.mockImplementation(throwing(thrown));
        mocks.getMDHDTimescale.mockImplementation(throwing(thrown));
        const res = parseInit(mimeType);
        expect(res.protectionData).toEqual([]);
        expect(res.initTimescale).toBe(undefined);
        expect(mocks.logWarn).toHaveBeenCalledTimes(2);
      });
    }
  }
});
