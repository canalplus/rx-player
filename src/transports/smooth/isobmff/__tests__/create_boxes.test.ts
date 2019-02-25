/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe("Smooth - ISOBMFF - boxes creation", () => {
   beforeEach(() => {
    jest.resetModules();
   });

  describe("createVMHDBox", () => {
    it("should create always the same vmhd box", () => {
      const vmhdContent = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createVMHDBox = require("../create_boxes").createVMHDBox;
      expect(createVMHDBox()).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("vmhd", vmhdContent);
    });
  });

  describe("createFreeBox", () => {
    it("should create box full of 0s", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createFreeBox = require("../create_boxes").createFreeBox;
      expect(createFreeBox(8)).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("free", new Uint8Array([]));

      expect(createFreeBox(15)).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(2);
      expect(createBoxSpy).toHaveBeenCalledWith("free", new Uint8Array(7));
    });

    it("should throw when given a length below 8", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createFreeBox = require("../create_boxes").createFreeBox;
      expect(() => createFreeBox(7)).toThrow();
      expect(() => createFreeBox(6)).toThrow();
      expect(() => createFreeBox(5)).toThrow();
      expect(() => createFreeBox(4)).toThrow();
      expect(() => createFreeBox(3)).toThrow();
      expect(() => createFreeBox(2)).toThrow();
      expect(() => createFreeBox(1)).toThrow();
      expect(() => createFreeBox(0)).toThrow();
      expect(createBoxSpy).not.toHaveBeenCalled();
    });

    it("should throw when given a negative length", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createFreeBox = require("../create_boxes").createFreeBox;
      expect(() => createFreeBox(-1)).toThrow();
      expect(createBoxSpy).not.toHaveBeenCalled();
    });

    it("should throw when given a non-finite length", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createFreeBox = require("../create_boxes").createFreeBox;
      expect(() => createFreeBox(-Infinity)).toThrow();
      expect(() => createFreeBox(+Infinity)).toThrow();
      expect(createBoxSpy).not.toHaveBeenCalled();
    });
  });

  describe("createHDLRBox", () => {
    it("should always create the same audio box", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createHDLRBox = require("../create_boxes").createHDLRBox;
      expect(createHDLRBox("audio")).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("hdlr", new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0,
        115, 111, 117, 110, // "soun"
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        83, 111, 117, 110, 100, 72, 97, 110, 100, 108, 101, 114, // "SoundHandler"
        0,
      ]));
    });

    it("should always create the same video box", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createHDLRBox = require("../create_boxes").createHDLRBox;
      expect(createHDLRBox("video")).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("hdlr", new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0,
        118, 105, 100, 101, // "vide"
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        86, 105, 100, 101, 111, 72, 97, 110, 100, 108, 101, 114, // "VideoHandler"
        0,
      ]));
    });

    it("should always create the same hint box", () => {
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createHDLRBox = require("../create_boxes").createHDLRBox;
      expect(createHDLRBox("hint")).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("hdlr", new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0,
        104, 105, 110, 116, // "soun"
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0,
      ]));
    });
  });

  describe("createMDHDBox", () => {
    it("should just integrate the timescale given", () => {
      const translatedTimeScale = new Uint8Array([4, 3, 2, 1]);
      const concatenated = new Uint8Array([9, 10, 11, 12]);
      const box = new Uint8Array([1, 2, 3, 4]);
      const itobe4Spy = jest.fn().mockImplementation(() => translatedTimeScale);
      const concatSpy = jest.fn().mockImplementation(() => concatenated);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../utils/byte_parsing", () => {
        return { itobe4: itobe4Spy, concat: concatSpy };
      });
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createMDHDBox = require("../create_boxes").createMDHDBox;

      expect(createMDHDBox(8)).toBe(box);

      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("mdhd", concatenated);

      expect(itobe4Spy).toHaveBeenCalledTimes(1);
      expect(itobe4Spy).toHaveBeenCalledWith(8);

      expect(concatSpy).toHaveBeenCalledTimes(1);
      expect(concatSpy).toHaveBeenCalledWith(12, translatedTimeScale, 8);

      expect(createMDHDBox(99)).toBe(box);

      expect(createBoxSpy).toHaveBeenCalledTimes(2);
      expect(createBoxSpy).toHaveBeenCalledWith("mdhd", concatenated);

      expect(itobe4Spy).toHaveBeenCalledTimes(2);
      expect(itobe4Spy).toHaveBeenCalledWith(99);

      expect(concatSpy).toHaveBeenCalledTimes(2);
      expect(concatSpy).toHaveBeenCalledWith(12, translatedTimeScale, 8);
    });
  });

  describe("createSMHDBox", () => {
    it("should create always the same smhd box", () => {
      const smhdContent = new Uint8Array(8);
      const box = new Uint8Array([1, 2, 3, 4]);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createSMHDBox = require("../create_boxes").createSMHDBox;
      expect(createSMHDBox()).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("smhd", smhdContent);
    });
  });

  describe("createFRMABox", () => {
    it("should just integrate the data format", () => {
      const dataFormatToBytes = new Uint8Array([4, 3, 2, 1]);
      const box = new Uint8Array([1, 2, 3, 4]);
      const strToBytesSpy = jest.fn().mockImplementation(() => dataFormatToBytes);
      const createBoxSpy = jest.fn().mockImplementation(() => box);
      jest.mock("../../../../utils/byte_parsing", () => {
        return { strToBytes: strToBytesSpy };
      });
      jest.mock("../../../../parsers/containers/isobmff", () => {
        return { createBox: createBoxSpy };
      });
      const createFRMABox = require("../create_boxes").createFRMABox;
      expect(createFRMABox("foo")).toBe(box);
      expect(createBoxSpy).toHaveBeenCalledTimes(1);
      expect(createBoxSpy).toHaveBeenCalledWith("frma", dataFormatToBytes);
      expect(strToBytesSpy).toHaveBeenCalledTimes(1);
      expect(strToBytesSpy).toHaveBeenCalledWith("foo");
    });
  });
});
