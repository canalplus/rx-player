import { describe, expect, it } from "vitest";
import getInitData from "../../../../../src/compat/eme/get_init_data.ts";
import { createBox } from "../../../../../src/parsers/containers/isobmff/create_box.ts";
import { concat, itobe4 } from "../../../../../src/utils/byte_parsing.ts";
import objectAssign from "../../../../../src/utils/object_assign.ts";

const pssh = createBox("pssh", concat(4, new Uint8Array(16).fill(0x11), 4));

describe("Compat - getInitData", () => {
  for (const size of [0, 1, 2, 3, 4, 5, 6, 7, 33]) {
    for (const withPrefix of [false, true]) {
      it(`should use original data for PSSH size ${size}, with prefix ${withPrefix}`, () => {
        const invalidPssh = pssh.slice();
        invalidPssh.set(itobe4(size));
        const initData = withPrefix ? concat(pssh, invalidPssh) : invalidPssh;
        const event = objectAssign(new Event("encrypted"), {
          initDataType: "cenc",
          initData: initData.buffer,
        });

        expect(getInitData(event)).toEqual({
          type: "cenc",
          values: [{ systemId: undefined, data: initData }],
          forceSessionRecreation: undefined,
        });
      });
    }
  }

  it("should still split valid concatenated PSSH boxes", () => {
    const secondPssh = createBox("pssh", concat(4, new Uint8Array(16).fill(0x22), 4));
    const event = objectAssign(new Event("encrypted"), {
      initDataType: "cenc",
      initData: concat(pssh, secondPssh).buffer,
    });

    expect(getInitData(event)?.values).toEqual([
      { systemId: "11111111111111111111111111111111", data: pssh },
      { systemId: "22222222222222222222222222222222", data: secondPssh },
    ]);
  });
});
