import { describe, beforeEach, it, expect, vi } from "vitest";
import type * as IsobmffModule from "../../../../../../src/parsers/containers/isobmff/index.ts";
import patchSegment from "../../../../../../src/transports/smooth/isobmff/patch_segment.ts";
import { concat, itobe4 } from "../../../../../../src/utils/byte_parsing.ts";
import { strToUtf8 } from "../../../../../../src/utils/string_parsing.ts";

const mocks = vi.hoisted(() => {
  return {
    getBox: vi.fn(),
    getBoxContent: vi.fn(),
    getBoxOffsets: vi.fn(),
    getUuidContent: vi.fn(),
    logWarn: vi.fn(),
  };
});
vi.mock("../../../../../../src/parsers/containers/isobmff", async (importOriginal) => ({
  ...(await importOriginal()),
  getBox: mocks.getBox,
  getBoxContent: mocks.getBoxContent,
  getBoxOffsets: mocks.getBoxOffsets,
  getUuidContent: mocks.getUuidContent,
}));
vi.mock("../../../../../../src/log", () => ({
  default: { warn: mocks.logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

type IIsobmffModule = typeof IsobmffModule;
let actual: IIsobmffModule;

const THROWN_VALUES = [new Error("ISOBMFF: Size out of range"), "not an error"];

function throwing(err: unknown): () => never {
  return () => {
    throw err;
  };
}

function createBox(name: string, ...content: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const c = concat(...content);
  return concat(itobe4(8 + c.length), strToUtf8(name), c);
}

const SENC_UUID = concat(
  itobe4(0xa2394f52),
  itobe4(0x5a9b4f14),
  itobe4(0xa2446c42),
  itobe4(0x7c648df4),
);

/** Creates a new Smooth media segment, with a senc box. */
function createSegment(): Uint8Array<ArrayBuffer> {
  const mfhd = createBox("mfhd", new Uint8Array(4), itobe4(1));
  const tfhd = createBox("tfhd", new Uint8Array(4), itobe4(7));
  const trun = createBox(
    "trun",
    new Uint8Array([0, 0, 0x02, 0x01]), // data offset + sample size
    itobe4(1),
    itobe4(0),
    itobe4(4),
  );
  const senc = createBox("uuid", SENC_UUID, new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]));
  const moof = createBox("moof", mfhd, createBox("traf", tfhd, trun, senc));
  return concat(moof, createBox("mdat", new Uint8Array([1, 2, 3, 4])));
}

describe("Smooth - patchSegment", () => {
  beforeEach(async () => {
    actual = await vi.importActual<IIsobmffModule>(
      "../../../../../../src/parsers/containers/isobmff/index.ts",
    );
    vi.resetAllMocks();
    mocks.getBox.mockImplementation(actual.getBox);
    mocks.getBoxContent.mockImplementation(actual.getBoxContent);
    mocks.getBoxOffsets.mockImplementation(actual.getBoxOffsets);
    mocks.getUuidContent.mockImplementation(actual.getUuidContent);
  });

  it("should keep the senc box", () => {
    const withSenc = patchSegment(createSegment(), 1000);
    mocks.getUuidContent.mockReturnValue(undefined);
    const withoutSenc = patchSegment(createSegment(), 1000);
    expect(withSenc).not.toEqual(withoutSenc);
    expect(mocks.logWarn).not.toHaveBeenCalled();
  });

  for (const thrown of THROWN_VALUES) {
    const desc = `thrown: ${String(thrown)}`;

    it(`should patch as if there was no senc if it cannot be read (${desc})`, () => {
      mocks.getUuidContent.mockReturnValue(undefined);
      const withoutSenc = patchSegment(createSegment(), 1000);
      mocks.getUuidContent.mockImplementation(throwing(thrown));
      expect(patchSegment(createSegment(), 1000)).toEqual(withoutSenc);
      expect(mocks.logWarn).toHaveBeenCalledWith(
        "smooth",
        "could not read senc box",
        thrown instanceof Error ? thrown : "",
      );
    });

    for (const fnName of ["getBox", "getBoxContent", "getBoxOffsets"] as const) {
      it(`should throw what ${fnName} threw (${desc})`, () => {
        mocks[fnName].mockImplementation(throwing(thrown));
        let error: unknown = null;
        try {
          patchSegment(createSegment(), 1000);
        } catch (e) {
          error = e;
        }
        expect(error).toBe(thrown);
      });
    }
  }
});
