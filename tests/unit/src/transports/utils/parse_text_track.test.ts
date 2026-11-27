import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ISegment } from "../../../../../src/manifest/index.ts";
import { getISOBMFFEmbeddedTextTrackData } from "../../../../../src/transports/utils/parse_text_track.ts";
import { strToUtf8 } from "../../../../../src/utils/string_parsing.ts";

const mocks = vi.hoisted(() => {
  return {
    getMDAT: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", () => ({
  getMDAT: mocks.getMDAT,
}));
vi.mock("../../../../../src/log", () => ({
  default: { warn: vi.fn(), debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const segment = { isInit: false, complete: true, duration: 2 } as ISegment;
const data = new Uint8Array([0, 1, 2]);

describe("transports utils - getISOBMFFEmbeddedTextTrackData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  for (const codecs of ["stpp", "wvtt"]) {
    it(`should give the mdat as text (codecs: ${codecs})`, () => {
      mocks.getMDAT.mockReturnValue(strToUtf8("WEBVTT\n"));
      const res = getISOBMFFEmbeddedTextTrackData(
        { segment, codecs, language: undefined },
        data,
        1000,
        { time: 1, duration: 2 },
        false,
      );
      expect(res?.data).toBe("WEBVTT\n");
      expect(mocks.getMDAT).toHaveBeenCalledWith(data);
    });

    for (const thrown of [new Error("ISOBMFF: Size out of range"), "not an error"]) {
      it(`should throw what reading the mdat threw (codecs: ${codecs}, thrown: ${String(thrown)})`, () => {
        mocks.getMDAT.mockImplementation(() => {
          throw thrown;
        });
        let error: unknown = null;
        try {
          getISOBMFFEmbeddedTextTrackData(
            { segment, codecs, language: undefined },
            data,
            1000,
            { time: 1, duration: 2 },
            false,
          );
        } catch (e) {
          error = e;
        }
        expect(error).toBe(thrown);
      });
    }
  }
});
