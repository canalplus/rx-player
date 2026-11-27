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

  for (const size of [1, 2, 3, 4, 5, 6, 7, 33]) {
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

  for (const size of [8, 12, 27]) {
    it(`should drop a PSSH too small for a system ID (${size} bytes)`, () => {
      const smallPssh = createBox("pssh", new Uint8Array(size - 8));
      expect(patchInitData(concat(pssh, smallPssh))).toEqual(pssh);
      expect(patchInitData(concat(smallPssh, pssh, smallPssh))).toEqual(pssh);
    });

    it(`should use original data if only PSSH too small for a system ID are left (${size} bytes)`, async () => {
      const smallPssh = createBox("pssh", new Uint8Array(size - 8));
      const initData = concat(smallPssh, smallPssh);
      const generateRequest = vi.fn().mockResolvedValue(undefined);
      const session = { generateRequest } as unknown as IMediaKeySession;

      expect(() => patchInitData(initData)).toThrow(
        "Compat: unrecognized initialization data. Cannot patch it.",
      );
      await generateKeyRequest(session, "cenc", initData);
      expect(generateRequest).toHaveBeenCalledTimes(1);
      expect(generateRequest.mock.calls[0][1]).toBe(initData);
    });
  }

  it("should accept a PSSH with only a system ID", () => {
    const smallestPssh = createBox("pssh", concat(4, new Uint8Array(16).fill(0x22)));
    expect(smallestPssh.length).toBe(28);
    expect(patchInitData(concat(pssh, smallestPssh))).toEqual(concat(pssh, smallestPssh));
  });

  describe("incomplete CENC PSSH v1", () => {
    const cencSystemId = new Uint8Array([
      0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
      0xfb, 0x4b,
    ]);
    const cencPsshV0 = createBox("pssh", concat([0, 0, 0, 0], cencSystemId, 4));
    const cencPsshV1 = createBox(
      "pssh",
      concat([1, 0, 0, 0], cencSystemId, itobe4(1), new Uint8Array(16).fill(0x22), 4),
    );
    const incompleteV1s = [
      // Only a system ID
      createBox("pssh", concat([1, 0, 0, 0], cencSystemId)),
      // More key IDs announced than present
      createBox(
        "pssh",
        concat([1, 0, 0, 0], cencSystemId, itobe4(2), new Uint8Array(20)),
      ),
      // More data announced than present
      createBox("pssh", concat([1, 0, 0, 0], cencSystemId, itobe4(0), itobe4(10), 4)),
    ];

    for (const [i, incompleteV1] of incompleteV1s.entries()) {
      it(`should not let an incomplete CENC PSSH v1 replace a v0 one (${i})`, () => {
        expect(patchInitData(concat(cencPsshV0, pssh, incompleteV1))).toEqual(
          concat(pssh, cencPsshV0, incompleteV1),
        );
      });

      it(`should still let a complete CENC PSSH v1 replace an incomplete one (${i})`, () => {
        expect(patchInitData(concat(cencPsshV0, incompleteV1, pssh, cencPsshV1))).toEqual(
          concat(pssh, cencPsshV1),
        );
      });
    }

    it("should let a complete CENC PSSH v1 replace a v0 one", () => {
      expect(patchInitData(concat(cencPsshV0, pssh, cencPsshV1))).toEqual(
        concat(pssh, cencPsshV1),
      );
    });
  });

  describe("PSSH with a 64-bit size", () => {
    const cencSystemId = new Uint8Array([
      0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
      0xfb, 0x4b,
    ]);
    const cencPsshV1 = createBox("pssh", concat([1, 0, 0, 0], cencSystemId, 8));

    /**
     * Returns the given box rewritten with a 64-bit size.
     * @param {Uint8Array} box
     * @param {number} [size] - Size to announce. Defaults to its actual size.
     * @returns {Uint8Array}
     */
    function to64Bits(box: Uint8Array, size?: number): Uint8Array<ArrayBuffer> {
      const content = box.subarray(8);
      return concat(
        itobe4(1),
        box.subarray(4, 8),
        itobe4(0),
        itobe4(size ?? content.length + 16),
        content,
      );
    }

    it("should keep a lone PSSH with a 64-bit size as is", () => {
      expect(patchInitData(to64Bits(pssh))).toEqual(to64Bits(pssh));
    });

    it("should move CENC PSSH after a PSSH with a 64-bit size", () => {
      expect(patchInitData(concat(cencPsshV1, to64Bits(pssh)))).toEqual(
        concat(to64Bits(pssh), cencPsshV1),
      );
    });

    it("should recognize a CENC PSSH with a 64-bit size", () => {
      expect(patchInitData(concat(to64Bits(cencPsshV1), pssh))).toEqual(
        concat(pssh, to64Bits(cencPsshV1)),
      );
    });

    it("should not let an incomplete CENC PSSH v1 with a 64-bit size replace a v0 one", () => {
      const cencPsshV0 = createBox("pssh", concat([0, 0, 0, 0], cencSystemId, 4));
      const incompleteV1 = to64Bits(
        createBox("pssh", concat([1, 0, 0, 0], cencSystemId)),
      );
      expect(incompleteV1.length).toBe(36);
      expect(patchInitData(concat(cencPsshV0, incompleteV1))).toEqual(
        concat(cencPsshV0, incompleteV1),
      );
    });

    it("should drop a PSSH with a 64-bit size too small for a system ID", () => {
      const small = to64Bits(createBox("pssh", new Uint8Array(19)));
      expect(small.length).toBe(35);
      expect(patchInitData(concat(pssh, small))).toEqual(pssh);
    });

    for (const size of [0, 1, 8, 15]) {
      it(`should use original data for a 64-bit size of ${size}`, () => {
        expect(() => patchInitData(concat(pssh, to64Bits(pssh, size)))).toThrow(
          "Compat: unrecognized initialization data. Cannot patch it.",
        );
      });
    }

    it("should use original data for a 64-bit size going past the end", () => {
      const box = to64Bits(pssh);
      expect(() => patchInitData(to64Bits(pssh, box.length + 1))).toThrow(
        "Compat: unrecognized initialization data. Cannot patch it.",
      );
    });

    it("should use original data if the 64-bit size cannot be read", () => {
      expect(() => patchInitData(concat(pssh, to64Bits(pssh).subarray(0, 12)))).toThrow(
        "Compat: unrecognized initialization data. Cannot patch it.",
      );
    });
  });

  describe("PSSH with a size of 0", () => {
    const cencSystemId = new Uint8Array([
      0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
      0xfb, 0x4b,
    ]);
    const cencPsshV0 = createBox("pssh", concat([0, 0, 0, 0], cencSystemId, 8));
    const cencPsshV1 = createBox("pssh", concat([1, 0, 0, 0], cencSystemId, 8));

    /** Returns a copy of the given box with its size set to `0`. */
    function toEnd(box: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
      const copy = box.slice();
      copy.set(itobe4(0));
      return copy;
    }

    it("should keep a PSSH with a size of 0 as is", () => {
      expect(patchInitData(toEnd(pssh))).toEqual(toEnd(pssh));
      expect(patchInitData(concat(pssh, toEnd(pssh)))).toEqual(concat(pssh, toEnd(pssh)));
    });

    it("should move CENC PSSH just before a non-CENC PSSH with a size of 0", () => {
      expect(patchInitData(concat(cencPsshV1, pssh, toEnd(pssh)))).toEqual(
        concat(pssh, cencPsshV1, toEnd(pssh)),
      );
    });

    it("should keep a CENC PSSH with a size of 0 last", () => {
      expect(patchInitData(concat(cencPsshV1, pssh, toEnd(cencPsshV1)))).toEqual(
        concat(pssh, cencPsshV1, toEnd(cencPsshV1)),
      );
    });

    it("should still filter a CENC PSSH with a size of 0 on its version", () => {
      expect(patchInitData(concat(cencPsshV1, pssh, toEnd(cencPsshV0)))).toEqual(
        concat(pssh, cencPsshV1),
      );
    });
  });

  it("should still move CENC PSSH after other PSSH boxes", () => {
    const cencSystemId = new Uint8Array([
      0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
      0xfb, 0x4b,
    ]);
    const cencPssh = createBox("pssh", concat([1, 0, 0, 0], cencSystemId, 8));

    expect(patchInitData(concat(cencPssh, pssh))).toEqual(concat(pssh, cencPssh));
  });
});

describe("Compat - patchInitData - unreadable box", () => {
  const cencSystemId = new Uint8Array([
    0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
    0xfb, 0x4b,
  ]);
  const cencPsshV1 = createBox("pssh", concat([1, 0, 0, 0], cencSystemId, 8));

  beforeEach(async () => {
    actual = await vi.importActual<IIsobmffModule>(
      "../../../../../src/parsers/containers/isobmff/index.ts",
    );
    vi.resetAllMocks();
    mocks.getNextBoxOffsets.mockImplementation(actual.getNextBoxOffsets);
  });

  for (const thrown of [new Error("ISOBMFF: Size out of range"), "not an error"]) {
    for (const [desc, unreadableBoxIndex] of [
      ["first box", 0],
      ["second box", 1],
    ] as const) {
      it(`should use original data when a box cannot be read (${desc}, thrown: ${String(thrown)})`, () => {
        if (unreadableBoxIndex === 1) {
          mocks.getNextBoxOffsets.mockImplementationOnce(actual.getNextBoxOffsets);
        }
        mocks.getNextBoxOffsets.mockImplementationOnce(() => {
          throw thrown;
        });
        expect(() => patchInitData(concat(cencPsshV1, pssh))).toThrow(
          "Compat: unrecognized initialization data. Cannot patch it.",
        );
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "DRM",
          "unrecognized initialization data. Cannot patch it.",
          thrown instanceof Error ? thrown : "",
        );
      });
    }
  }
});
