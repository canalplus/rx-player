import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IMediaKeySession } from "../../../../../src/compat/browser_compatibility_types.ts";
import generateKeyRequest, {
  patchInitData,
} from "../../../../../src/compat/eme/generate_key_request.ts";
import { createBox } from "../../../../../src/parsers/containers/isobmff/create_box.ts";
import type * as IsobmffModule from "../../../../../src/parsers/containers/isobmff/index.ts";
import { concat, itobe4 } from "../../../../../src/utils/byte_parsing.ts";

const mocks = vi.hoisted(() => {
  return {
    getNextBoxOffsets: vi.fn(),
    logWarn: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", async (importOriginal) => ({
  ...(await importOriginal()),
  getNextBoxOffsets: mocks.getNextBoxOffsets,
}));
vi.mock("../../../../../src/log", () => ({
  default: { warn: mocks.logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

type IIsobmffModule = typeof IsobmffModule;
let actual: IIsobmffModule;

const pssh = createBox("pssh", concat(4, new Uint8Array(16).fill(0x11), 4));

describe("Compat - generateKeyRequest", () => {
  beforeEach(async () => {
    actual = await vi.importActual<IIsobmffModule>(
      "../../../../../src/parsers/containers/isobmff/index.ts",
    );
    vi.resetAllMocks();
    mocks.getNextBoxOffsets.mockImplementation(actual.getNextBoxOffsets);
  });

  for (const size of [0, 1, 2, 3, 4, 5, 6, 7, 33]) {
    for (const withPrefix of [false, true]) {
      it(`should use original data for PSSH size ${size}, with prefix ${withPrefix}`, async () => {
        const invalidPssh = pssh.slice();
        invalidPssh.set(itobe4(size));
        const initData = withPrefix ? concat(pssh, invalidPssh) : invalidPssh;
        const generateRequest = vi.fn().mockResolvedValue(undefined);
        const session = { generateRequest } as unknown as IMediaKeySession;

        expect(() => patchInitData(initData)).toThrow(
          "Compat: unrecognized initialization data. Cannot patch it.",
        );
        await generateKeyRequest(session, "cenc", initData);

        expect(generateRequest).toHaveBeenCalledTimes(1);
        expect(generateRequest).toHaveBeenCalledWith("cenc", initData);
        expect(generateRequest.mock.calls[0][1]).toBe(initData);
      });
    }
  }

  it("should still move CENC PSSH after other PSSH boxes", () => {
    const cencSystemId = new Uint8Array([
      0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
      0xfb, 0x4b,
    ]);
    const cencPssh = createBox("pssh", concat([1, 0, 0, 0], cencSystemId, 8));

    expect(patchInitData(concat(cencPssh, pssh))).toEqual(concat(pssh, cencPssh));
  });
});

describe("Compat - patchInitData - unreadable CENC PSSH", () => {
  const cencSystemId = new Uint8Array([
    0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
    0xfb, 0x4b,
  ]);
  const cencPsshV0 = createBox("pssh", concat([0, 0, 0, 0], cencSystemId, 8));
  const cencPsshV1 = createBox("pssh", concat([1, 0, 0, 0], cencSystemId, 8));

  beforeEach(async () => {
    actual = await vi.importActual<IIsobmffModule>(
      "../../../../../src/parsers/containers/isobmff/index.ts",
    );
    vi.resetAllMocks();
    mocks.getNextBoxOffsets.mockImplementation(actual.getNextBoxOffsets);
  });

  for (const thrown of [new Error("ISOBMFF: Size out of range"), "not an error"]) {
    const desc = `thrown: ${String(thrown)}`;

    for (const initData of [
      concat(cencPsshV1),
      concat(pssh, cencPsshV1),
      concat(cencPsshV1, pssh),
      concat(cencPsshV0, pssh, cencPsshV1),
    ]) {
      it(`should use original data when a CENC PSSH cannot be read (${desc}, length: ${initData.length})`, async () => {
        mocks.getNextBoxOffsets.mockImplementation(() => {
          throw thrown;
        });
        const generateRequest = vi.fn().mockResolvedValue(undefined);
        const session = { generateRequest } as unknown as IMediaKeySession;

        expect(() => patchInitData(initData)).toThrow(
          "Compat: unrecognized initialization data. Cannot patch it.",
        );
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "DRM",
          "could not read CENC PSSH box",
          thrown instanceof Error ? thrown : "",
        );
        await generateKeyRequest(session, "cenc", initData);
        expect(generateRequest).toHaveBeenCalledTimes(1);
        expect(generateRequest.mock.calls[0][1]).toBe(initData);
      });
    }

    it(`should use original data when only a later CENC PSSH cannot be read (${desc})`, () => {
      mocks.getNextBoxOffsets
        .mockImplementationOnce(actual.getNextBoxOffsets)
        .mockImplementationOnce(() => {
          throw thrown;
        });
      expect(() => patchInitData(concat(cencPsshV1, pssh, cencPsshV0))).toThrow(
        "Compat: unrecognized initialization data. Cannot patch it.",
      );
    });
  }

  it("should not call getNextBoxOffsets on non-CENC PSSH", () => {
    patchInitData(pssh);
    expect(mocks.getNextBoxOffsets).not.toHaveBeenCalled();
  });
});
