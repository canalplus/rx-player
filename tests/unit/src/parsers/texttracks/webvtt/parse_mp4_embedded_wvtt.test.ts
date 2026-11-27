import { describe, it, expect, vi, afterEach } from "vitest";
import { createBox } from "../../../../../../src/parsers/containers/isobmff/create_box.ts";
import parseMp4EmbeddedWebVtt from "../../../../../../src/parsers/texttracks/webvtt/parse_mp4_embedded_wvtt.ts";
import { concat, itobe4 } from "../../../../../../src/utils/byte_parsing.ts";
import { strToUtf8 } from "../../../../../../src/utils/string_parsing.ts";

const logWarn = vi.hoisted(() => vi.fn());
vi.mock("../../../../../../src/log", () => ({
  default: { warn: logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

/** A `free` box announcing a size of 5, smaller than its header. */
const BAD_BOX = concat(itobe4(5), strToUtf8("free"));

/**
 * Build a `vttc` box with the given text.
 * @param {string} text
 * @returns {Uint8Array}
 */
function createVttc(text: string): Uint8Array {
  return createBox("vttc", createBox("payl", strToUtf8(text)));
}

/**
 * Build a `moof` box whose `traf` has one sample per given sample.
 * @param {number} decodeTime
 * @param {Array.<Object>} samples
 * @param {Uint8Array} [beforeTraf] - Data put in `moof` before its `traf`.
 * @returns {Uint8Array}
 */
function createMoof(
  decodeTime: number,
  samples: Array<{ duration: number; size: number }>,
  beforeTraf: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const tfdt = createBox("tfdt", concat([0, 0, 0, 0], itobe4(decodeTime)));
  const trun = createBox(
    "trun",
    concat(
      [0, 0, 0x03, 0x00], // version 0, sample duration and sample size present
      itobe4(samples.length),
      ...samples.map((s) => concat(itobe4(s.duration), itobe4(s.size))),
    ),
  );
  return createBox("moof", concat(beforeTraf, createBox("traf", concat(tfdt, trun))));
}

function cueProducer(cue: { start: number; end: number; payload: string[] }) {
  return { start: cue.start, end: cue.end, payload: cue.payload };
}

describe("parseMp4EmbeddedWebVtt", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const vttc1 = createVttc("first");
  const vttc2 = createVttc("second");
  const firstSegment = concat(
    createMoof(1000, [{ duration: 500, size: vttc1.length }]),
    createBox("mdat", vttc1),
  );
  const firstCue = { start: 1, end: 1.5, payload: ["first"] };

  it("should parse cues", () => {
    const data = createBox("mdat", concat(vttc1, vttc2));
    const moof = createMoof(1000, [
      { duration: 500, size: vttc1.length },
      { duration: 250, size: vttc2.length },
    ]);
    expect(parseMp4EmbeddedWebVtt(concat(moof, data), 1000, 0, cueProducer)).toEqual([
      firstCue,
      { start: 1.5, end: 1.75, payload: ["second"] },
    ]);
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should keep cues read before a later moof with a size smaller than its header", () => {
    const data = concat(
      firstSegment,
      createMoof(1500, [{ duration: 500, size: vttc2.length }], BAD_BOX),
      createBox("mdat", vttc2),
    );
    expect(parseMp4EmbeddedWebVtt(data, 1000, 0, cueProducer)).toEqual([firstCue]);
    expect(logWarn).toHaveBeenCalledWith(
      "vtt",
      "Could not read further trun samples",
      new Error("ISOBMFF: Size out of range"),
    );
  });

  it("should keep cues read before a later box with a size smaller than its header", () => {
    const data = concat(
      firstSegment,
      BAD_BOX,
      createMoof(1500, [{ duration: 500, size: vttc2.length }]),
    );
    expect(parseMp4EmbeddedWebVtt(data, 1000, 0, cueProducer)).toEqual([firstCue]);
    expect(logWarn).toHaveBeenCalledWith(
      "vtt",
      "Could not read further trun samples",
      new Error("ISOBMFF: Size out of range"),
    );
  });

  it("should throw when the first moof has a box with a size smaller than its header", () => {
    const data = concat(
      createMoof(1000, [{ duration: 500, size: vttc1.length }], BAD_BOX),
      createBox("mdat", vttc1),
    );
    expect(() => parseMp4EmbeddedWebVtt(data, 1000, 0, cueProducer)).toThrow(
      "ISOBMFF: Size out of range",
    );
  });
});
