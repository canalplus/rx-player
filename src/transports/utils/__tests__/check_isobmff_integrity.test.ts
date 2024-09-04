import { describe, beforeEach, it, expect, vi } from "vitest";
import type { OtherError as IOtherError } from "../../../errors";
import type ICheckISOBMFFIntegrity from "../check_isobmff_integrity";

describe("transports utils - checkISOBMFFIntegrity", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should check just ftyp and and moov integrity for init segments", async () => {
    const mockFindCompleteBox = vi.fn(() => 45);
    vi.doMock("../../../parsers/containers/isobmff", () => ({
      findCompleteBox: mockFindCompleteBox,
    }));
    const checkISOBMFFIntegrity = (await vi.importActual("../check_isobmff_integrity"))
      .default as typeof ICheckISOBMFFIntegrity;
    const myUint8Array = new Uint8Array([0, 1, 2]);
    expect(() => checkISOBMFFIntegrity(myUint8Array, true)).not.toThrow();
    expect(mockFindCompleteBox).toHaveBeenCalledTimes(2);
    expect(mockFindCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x66747970);
    expect(mockFindCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x6d6f6f76);
  });

  it("should check just moof and and mdat integrity for regular segments", async () => {
    const mockFindCompleteBox = vi.fn(() => 45);
    vi.doMock("../../../parsers/containers/isobmff", () => ({
      findCompleteBox: mockFindCompleteBox,
    }));
    const checkISOBMFFIntegrity = (await vi.importActual("../check_isobmff_integrity"))
      .default as typeof ICheckISOBMFFIntegrity;
    const myUint8Array = new Uint8Array([0, 1, 2]);
    expect(() => checkISOBMFFIntegrity(myUint8Array, false)).not.toThrow();
    expect(mockFindCompleteBox).toHaveBeenCalledTimes(2);
    expect(mockFindCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x6d6f6f66);
    expect(mockFindCompleteBox).toHaveBeenCalledWith(myUint8Array, 0x6d646174);
  });

  it("should throw an other error if an init segment is missing a complete ftyp", async () => {
    const mockFindCompleteBox = vi.fn((_, box) => (box === 0x66747970 ? -1 : 45));
    vi.doMock("../../../parsers/containers/isobmff", () => ({
      findCompleteBox: mockFindCompleteBox,
    }));
    const OtherError = (await vi.importActual("../../../errors"))
      .OtherError as typeof IOtherError;
    const checkISOBMFFIntegrity = (await vi.importActual("../check_isobmff_integrity"))
      .default as typeof ICheckISOBMFFIntegrity;
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, true);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as IOtherError).name).toEqual("OtherError");
    expect((error as IOtherError).type).toEqual("OTHER_ERROR");
    expect((error as IOtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as IOtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `ftyp` box",
    );
  });

  it("should throw an other error if an init segment is missing a complete moov", async () => {
    const mockFindCompleteBox = vi.fn((_, box) => (box === 0x6d6f6f76 ? -1 : 45));
    vi.doMock("../../../parsers/containers/isobmff", () => ({
      findCompleteBox: mockFindCompleteBox,
    }));
    const OtherError = (await vi.importActual("../../../errors"))
      .OtherError as typeof IOtherError;
    const checkISOBMFFIntegrity = (await vi.importActual("../check_isobmff_integrity"))
      .default as typeof ICheckISOBMFFIntegrity;
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, true);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as IOtherError).name).toEqual("OtherError");
    expect((error as IOtherError).type).toEqual("OTHER_ERROR");
    expect((error as IOtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as IOtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `moov` box",
    );
  });

  it("should throw an other error if a regular segment is missing a complete moof", async () => {
    const mockFindCompleteBox = vi.fn((_, box) => (box === 0x6d6f6f66 ? -1 : 45));
    vi.doMock("../../../parsers/containers/isobmff", () => ({
      findCompleteBox: mockFindCompleteBox,
    }));
    const OtherError = (await vi.importActual("../../../errors"))
      .OtherError as typeof IOtherError;
    const checkISOBMFFIntegrity = (await vi.importActual("../check_isobmff_integrity"))
      .default as typeof ICheckISOBMFFIntegrity;
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, false);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as IOtherError).name).toEqual("OtherError");
    expect((error as IOtherError).type).toEqual("OTHER_ERROR");
    expect((error as IOtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as IOtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `moof` box",
    );
  });

  it("should throw an other error if a regular segment is missing a complete mdat", async () => {
    const mockFindCompleteBox = vi.fn((_, box) => (box === 0x6d646174 ? -1 : 45));
    vi.doMock("../../../parsers/containers/isobmff", () => ({
      findCompleteBox: mockFindCompleteBox,
    }));
    const OtherError = (await vi.importActual("../../../errors"))
      .OtherError as typeof IOtherError;
    const checkISOBMFFIntegrity = (await vi.importActual("../check_isobmff_integrity"))
      .default as typeof ICheckISOBMFFIntegrity;
    const myUint8Array = new Uint8Array([0, 1, 2]);
    let error: unknown = null;
    try {
      checkISOBMFFIntegrity(myUint8Array, false);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(OtherError);
    expect((error as IOtherError).name).toEqual("OtherError");
    expect((error as IOtherError).type).toEqual("OTHER_ERROR");
    expect((error as IOtherError).code).toEqual("INTEGRITY_ERROR");
    expect((error as IOtherError).message).toEqual(
      "INTEGRITY_ERROR: Incomplete `mdat` box",
    );
  });
});
