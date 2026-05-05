import { describe, beforeEach, it, expect, vi } from "vitest";
import {
  createFRMABox,
  createFreeBox,
  createHDLRBox,
  createMDHDBox,
  createSMHDBox,
  createVMHDBox,
} from "../create_boxes.ts";

const mocks = vi.hoisted(() => {
  return {
    isobmff: {
      createBox: vi.fn(),
    },
    byteParsing: {
      itobe2: vi.fn(),
      itobe4: vi.fn(),
      itobe8: vi.fn(),
      le2toi: vi.fn(),
      be2toi: vi.fn(),
      be3toi: vi.fn(),
      be4toi: vi.fn(),
      be8toi: vi.fn(),
      concat: vi.fn(),
      be4toiSigned: vi.fn(),
    },
    stringParsing: {
      strToUtf8: vi.fn(),
      bytesToHex: vi.fn(),
      guidToUuid: vi.fn(),
      utf16LEToStr: vi.fn(),
      hexToBytes: vi.fn(),
      readNullTerminatedString: vi.fn(),
    },
  };
});
vi.mock("../../../../parsers/containers/isobmff", () => ({
  createBox: mocks.isobmff.createBox,
}));
vi.mock("../../../../utils/byte_parsing", () => ({
  itobe2: mocks.byteParsing.itobe2,
  itobe4: mocks.byteParsing.itobe4,
  itobe8: mocks.byteParsing.itobe8,
  le2toi: mocks.byteParsing.le2toi,
  be2toi: mocks.byteParsing.be2toi,
  be3toi: mocks.byteParsing.be3toi,
  be4toi: mocks.byteParsing.be4toi,
  be8toi: mocks.byteParsing.be8toi,
  concat: mocks.byteParsing.concat,
  be4toiSigned: mocks.byteParsing.be4toiSigned,
}));
vi.mock("../../../../utils/string_parsing", () => ({
  strToUtf8: mocks.stringParsing.strToUtf8,
  bytesToHex: mocks.stringParsing.bytesToHex,
  guidToUuid: mocks.stringParsing.guidToUuid,
  utf16LEToStr: mocks.stringParsing.utf16LEToStr,
  hexToBytes: mocks.stringParsing.hexToBytes,
  readNullTerminatedString: mocks.stringParsing.readNullTerminatedString,
}));

describe("Smooth - ISOBMFF - boxes creation", () => {
  beforeEach(async () => {
    vi.resetModules();

    const actualIsobmff = await vi.importActual("../../../../parsers/containers/isobmff");
    const actualByteParsing = await vi.importActual("../../../../utils/byte_parsing");
    const actualStringParsing = await vi.importActual("../../../../utils/string_parsing");

    const isobmffKeys = Object.keys(mocks.isobmff) as Array<keyof typeof mocks.isobmff>;
    isobmffKeys.forEach((key: keyof typeof mocks.isobmff) => {
      mocks.isobmff[key].mockReset();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      mocks.isobmff[key].mockImplementation(actualIsobmff[key] as (...args: any) => any);
    });

    const byteParsingKeys = Object.keys(mocks.byteParsing) as Array<
      keyof typeof mocks.byteParsing
    >;
    byteParsingKeys.forEach((key: keyof typeof mocks.byteParsing) => {
      mocks.byteParsing[key].mockReset();
      mocks.byteParsing[key].mockImplementation(
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        actualByteParsing[key] as (...args: any) => any,
      );
    });

    const stringParsingKeys = Object.keys(mocks.stringParsing) as Array<
      keyof typeof mocks.stringParsing
    >;
    stringParsingKeys.forEach((key: keyof typeof mocks.stringParsing) => {
      mocks.stringParsing[key].mockReset();
      mocks.stringParsing[key].mockImplementation(
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        actualStringParsing[key] as (...args: any) => any,
      );
    });
  });

  describe("createVMHDBox", () => {
    it("should create always the same vmhd box", () => {
      const vmhdContent = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(createVMHDBox()).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith("vmhd", vmhdContent);
    });
  });

  describe("createFreeBox", () => {
    it("should create box full of 0s", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(createFreeBox(8)).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith("free", new Uint8Array([]));

      expect(createFreeBox(15)).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(2);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith("free", new Uint8Array(7));
    });

    it("should throw when given a length below 8", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(() => createFreeBox(7)).toThrow();
      expect(() => createFreeBox(6)).toThrow();
      expect(() => createFreeBox(5)).toThrow();
      expect(() => createFreeBox(4)).toThrow();
      expect(() => createFreeBox(3)).toThrow();
      expect(() => createFreeBox(2)).toThrow();
      expect(() => createFreeBox(1)).toThrow();
      expect(() => createFreeBox(0)).toThrow();
      expect(mocks.isobmff.createBox).not.toHaveBeenCalled();
    });

    it("should throw when given a negative length", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(() => createFreeBox(-1)).toThrow();
      expect(mocks.isobmff.createBox).not.toHaveBeenCalled();
    });

    it("should throw when given a non-finite length", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(() => createFreeBox(-Infinity)).toThrow();
      expect(() => createFreeBox(+Infinity)).toThrow();
      expect(mocks.isobmff.createBox).not.toHaveBeenCalled();
    });
  });

  describe("createHDLRBox", () => {
    it("should always create the same audio box", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(createHDLRBox("audio")).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith(
        "hdlr",
        new Uint8Array([
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          115,
          111,
          117,
          110, // "soun"
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          83,
          111,
          117,
          110,
          100,
          72,
          97,
          110,
          100,
          108,
          101,
          114, // "SoundHandler"
          0,
        ]),
      );
    });

    it("should always create the same video box", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(createHDLRBox("video")).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith(
        "hdlr",
        new Uint8Array([
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          118,
          105,
          100,
          101, // "vide"
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          86,
          105,
          100,
          101,
          111,
          72,
          97,
          110,
          100,
          108,
          101,
          114, // "VideoHandler"
          0,
        ]),
      );
    });

    it("should always create the same hint box", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(createHDLRBox("hint")).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith(
        "hdlr",
        new Uint8Array([
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          104,
          105,
          110,
          116, // "soun"
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ]),
      );
    });
  });

  describe("createMDHDBox", () => {
    it("should just integrate the timescale given", () => {
      const translatedTimeScale = new Uint8Array([4, 3, 2, 1]);
      const concatenated = new Uint8Array([9, 10, 11, 12]);
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.byteParsing.itobe4.mockImplementation(() => translatedTimeScale);
      mocks.byteParsing.concat.mockImplementation(() => concatenated);
      mocks.isobmff.createBox.mockImplementation(() => box);

      expect(createMDHDBox(8)).toBe(box);

      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith("mdhd", concatenated);

      expect(mocks.byteParsing.itobe4).toHaveBeenCalledTimes(1);
      expect(mocks.byteParsing.itobe4).toHaveBeenCalledWith(8);

      expect(mocks.byteParsing.concat).toHaveBeenCalledTimes(1);
      expect(mocks.byteParsing.concat).toHaveBeenCalledWith(12, translatedTimeScale, 8);

      expect(createMDHDBox(99)).toBe(box);

      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(2);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith("mdhd", concatenated);

      expect(mocks.byteParsing.itobe4).toHaveBeenCalledTimes(2);
      expect(mocks.byteParsing.itobe4).toHaveBeenCalledWith(99);

      expect(mocks.byteParsing.concat).toHaveBeenCalledTimes(2);
      expect(mocks.byteParsing.concat).toHaveBeenCalledWith(12, translatedTimeScale, 8);
    });
  });

  describe("createSMHDBox", () => {
    it("should create always the same smhd box", () => {
      const smhdContent = new Uint8Array(8);
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(createSMHDBox()).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith("smhd", smhdContent);
    });
  });

  describe("createFRMABox", () => {
    it("should just integrate the data format", () => {
      const dataFormatToBytes = new Uint8Array([4, 3, 2, 1]);
      const box = new Uint8Array([1, 2, 3, 4]);
      mocks.stringParsing.strToUtf8.mockImplementation(() => dataFormatToBytes);
      mocks.isobmff.createBox.mockImplementation(() => box);
      expect(createFRMABox("foo")).toBe(box);
      expect(mocks.isobmff.createBox).toHaveBeenCalledTimes(1);
      expect(mocks.isobmff.createBox).toHaveBeenCalledWith("frma", dataFormatToBytes);
      expect(mocks.stringParsing.strToUtf8).toHaveBeenCalledTimes(1);
      expect(mocks.stringParsing.strToUtf8).toHaveBeenCalledWith("foo");
    });
  });
});
