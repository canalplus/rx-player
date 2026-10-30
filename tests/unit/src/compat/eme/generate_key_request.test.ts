import { describe, expect, it, vi } from "vitest";
import type { IMediaKeySession } from "../../../../../src/compat/browser_compatibility_types.ts";
import generateKeyRequest, {
  patchInitData,
} from "../../../../../src/compat/eme/generate_key_request.ts";
import { createBox } from "../../../../../src/parsers/containers/isobmff/create_box.ts";
import { concat, itobe4 } from "../../../../../src/utils/byte_parsing.ts";

const pssh = createBox("pssh", concat(4, new Uint8Array(16).fill(0x11), 4));

describe("Compat - generateKeyRequest", () => {
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
