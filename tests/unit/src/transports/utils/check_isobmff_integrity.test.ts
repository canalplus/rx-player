import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import { OtherError } from "../../../../../src/errors/index.ts";
import checkISOBMFFIntegrity from "../../../../../src/transports/utils/check_isobmff_integrity.ts";

const mocks = vi.hoisted(() => {
  return {
    findCompleteBox: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", () => ({
  findCompleteBox: mocks.findCompleteBox,
}));

describe("transports utils - checkISOBMFFIntegrity", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.findCompleteBox.mockReset();
  });

  it("should check just ftyp and and moov integrity for init segments", () => {
    mocks.findCompleteBox.mockImplementation(() => 45);
    const myUint8Array = new Uint8Array([0, 1, 2]);
    expect(() => checkISOBMFFIntegrity(myUint8Array, true)).not.toThrow();
    expect(mocks.findCompleteBox).toHaveBeenCalledTimes(2);
    expect(mocks.findCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x66747970);
    expect(mocks.findCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x6d6f6f76);
  });

  it("should check just moof and and mdat integrity for regular segments", () => {
    mocks.findCompleteBox.mockImplementation(() => 45);
    const myUint8Array = new Uint8Array([0, 1, 2]);
    expect(() => checkISOBMFFIntegrity(myUint8Array, false)).not.toThrow();
    expect(mocks.findCompleteBox).toHaveBeenCalledTimes(2);
    expect(mocks.findCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x6d6f6f66);
    expect(mocks.findCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x6d646174);
  });

  it("should throw an other error if an init segment is missing a complete ftyp", () => {
    mocks.findCompleteBox.mockImplementation((_, box) => (box === 0x66747970 ? -1 : 45));
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, true);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as OtherError).name).toEqual("OtherError");
    expect((error as OtherError).type).toEqual("OTHER_ERROR");
    expect((error as OtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as OtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `ftyp` box",
    );
  });

  it("should throw an other error if an init segment is missing a complete moov", () => {
    mocks.findCompleteBox.mockImplementation((_, box) => (box === 0x6d6f6f76 ? -1 : 45));
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, true);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as OtherError).name).toEqual("OtherError");
    expect((error as OtherError).type).toEqual("OTHER_ERROR");
    expect((error as OtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as OtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `moov` box",
    );
  });

  it("should throw an other error if a regular segment is missing a complete moof", () => {
    mocks.findCompleteBox.mockImplementation((_, box) => (box === 0x6d6f6f66 ? -1 : 45));
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, false);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as OtherError).name).toEqual("OtherError");
    expect((error as OtherError).type).toEqual("OTHER_ERROR");
    expect((error as OtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as OtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `moof` box",
    );
  });

  it("should throw an other error if a regular segment is missing a complete mdat", () => {
    mocks.findCompleteBox.mockImplementation((_, box) => (box === 0x6d646174 ? -1 : 45));
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, false);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as OtherError).name).toEqual("OtherError");
    expect((error as OtherError).type).toEqual("OTHER_ERROR");
    expect((error as OtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as OtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `mdat` box",
    );
  });
});
