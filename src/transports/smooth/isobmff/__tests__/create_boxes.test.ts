import { describe, beforeEach, it, expect, vi } from "vitest";
import type {
  createFRMABox as ICreateFRMABox,
  createFreeBox as ICreateFreeBox,
  createHDLRBox as ICreateHDLRBox,
  createMDHDBox as ICreateMDHDBox,
  createSMHDBox as ICreateSMHDBox,
  createVMHDBox as ICreateVMHDBox,
} from "../create_boxes";

describe("Smooth - ISOBMFF - boxes creation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("createVMHDBox", () => {
    it("should create always the same vmhd box", async () => {
      const vmhdContent = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createVMHDBox = (await vi.importActual("../create_boxes"))
        .createVMHDBox as typeof ICreateVMHDBox;
      expect(createVMHDBox()).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith("vmhd", vmhdContent);
    });
  });

  describe("createFreeBox", () => {
    it("should create box full of 0s", async () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createFreeBox = (await vi.importActual("../create_boxes"))
        .createFreeBox as typeof ICreateFreeBox;
      expect(createFreeBox(8)).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith("free", new Uint8Array([]));

      expect(createFreeBox(15)).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(2);
      expect(mockCreateBox).toHaveBeenCalledWith("free", new Uint8Array(7));
    });

    it("should throw when given a length below 8", async () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createFreeBox = (await vi.importActual("../create_boxes"))
        .createFreeBox as typeof ICreateFreeBox;
      expect(() => createFreeBox(7)).toThrow();
      expect(() => createFreeBox(6)).toThrow();
      expect(() => createFreeBox(5)).toThrow();
      expect(() => createFreeBox(4)).toThrow();
      expect(() => createFreeBox(3)).toThrow();
      expect(() => createFreeBox(2)).toThrow();
      expect(() => createFreeBox(1)).toThrow();
      expect(() => createFreeBox(0)).toThrow();
      expect(mockCreateBox).not.toHaveBeenCalled();
    });

    it("should throw when given a negative length", async () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createFreeBox = (await vi.importActual("../create_boxes"))
        .createFreeBox as typeof ICreateFreeBox;
      expect(() => createFreeBox(-1)).toThrow();
      expect(mockCreateBox).not.toHaveBeenCalled();
    });

    it("should throw when given a non-finite length", async () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createFreeBox = (await vi.importActual("../create_boxes"))
        .createFreeBox as typeof ICreateFreeBox;
      expect(() => createFreeBox(-Infinity)).toThrow();
      expect(() => createFreeBox(+Infinity)).toThrow();
      expect(mockCreateBox).not.toHaveBeenCalled();
    });
  });

  describe("createHDLRBox", () => {
    it("should always create the same audio box", async () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createHDLRBox = (await vi.importActual("../create_boxes"))
        .createHDLRBox as typeof ICreateHDLRBox;
      expect(createHDLRBox("audio")).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith(
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

    it("should always create the same video box", async () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createHDLRBox = (await vi.importActual("../create_boxes"))
        .createHDLRBox as typeof ICreateHDLRBox;
      expect(createHDLRBox("video")).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith(
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

    it("should always create the same hint box", async () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createHDLRBox = (await vi.importActual("../create_boxes"))
        .createHDLRBox as typeof ICreateHDLRBox;
      expect(createHDLRBox("hint")).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith(
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
    it("should just integrate the timescale given", async () => {
      const translatedTimeScale = new Uint8Array([4, 3, 2, 1]);
      const concatenated = new Uint8Array([9, 10, 11, 12]);
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockItobe4 = vi.fn().mockImplementation(() => translatedTimeScale);
      const mockConcat = vi.fn().mockImplementation(() => concatenated);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../utils/byte_parsing", () => {
        return { itobe4: mockItobe4, concat: mockConcat };
      });
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createMDHDBox = (await vi.importActual("../create_boxes"))
        .createMDHDBox as typeof ICreateMDHDBox;

      expect(createMDHDBox(8)).toBe(box);

      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith("mdhd", concatenated);

      expect(mockItobe4).toHaveBeenCalledTimes(1);
      expect(mockItobe4).toHaveBeenCalledWith(8);

      expect(mockConcat).toHaveBeenCalledTimes(1);
      expect(mockConcat).toHaveBeenCalledWith(12, translatedTimeScale, 8);

      expect(createMDHDBox(99)).toBe(box);

      expect(mockCreateBox).toHaveBeenCalledTimes(2);
      expect(mockCreateBox).toHaveBeenCalledWith("mdhd", concatenated);

      expect(mockItobe4).toHaveBeenCalledTimes(2);
      expect(mockItobe4).toHaveBeenCalledWith(99);

      expect(mockConcat).toHaveBeenCalledTimes(2);
      expect(mockConcat).toHaveBeenCalledWith(12, translatedTimeScale, 8);
    });
  });

  describe("createSMHDBox", () => {
    it("should create always the same smhd box", async () => {
      const smhdContent = new Uint8Array(8);
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createSMHDBox = (await vi.importActual("../create_boxes"))
        .createSMHDBox as typeof ICreateSMHDBox;
      expect(createSMHDBox()).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith("smhd", smhdContent);
    });
  });

  describe("createFRMABox", () => {
    it("should just integrate the data format", async () => {
      const dataFormatToBytes = new Uint8Array([4, 3, 2, 1]);
      const box = new Uint8Array([1, 2, 3, 4]);
      const mockStrToUtf8 = vi.fn().mockImplementation(() => dataFormatToBytes);
      const mockCreateBox = vi.fn().mockImplementation(() => box);
      vi.doMock("../../../../utils/string_parsing", () => {
        return { strToUtf8: mockStrToUtf8 };
      });
      vi.doMock("../../../../parsers/containers/isobmff", () => {
        return { createBox: mockCreateBox };
      });
      const createFRMABox = (await vi.importActual("../create_boxes"))
        .createFRMABox as typeof ICreateFRMABox;
      expect(createFRMABox("foo")).toBe(box);
      expect(mockCreateBox).toHaveBeenCalledTimes(1);
      expect(mockCreateBox).toHaveBeenCalledWith("frma", dataFormatToBytes);
      expect(mockStrToUtf8).toHaveBeenCalledTimes(1);
      expect(mockStrToUtf8).toHaveBeenCalledWith("foo");
    });
  });
});
