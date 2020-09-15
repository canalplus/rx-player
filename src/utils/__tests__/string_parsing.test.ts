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

import * as strUtils from "../string_parsing";

describe("utils - string parsing", () => {
  describe("strToUtf8", () => {
    it("should return an empty Uint8Array for an empty string", () => {
      const res = strUtils.strToUtf8("");
      expect(res).toBeInstanceOf(Uint8Array);
      expect(res).toHaveLength(0);
    });

    it("should return an Uint8Array of a regular ASCII string", () => {
      const input = "test";
      const res = strUtils.strToUtf8(input);
      expect(res).toHaveLength(input.length);

      input.split("").forEach((letter, index) => {
        expect(res[index]).toBe(letter.charCodeAt(0));
      });
    });

    /* tslint:disable max-line-length */
    it("should return an Uint8Array of the UTF-8 representation of a complex string", () => {
    /* tslint:enable max-line-length */
      const input = "t❁ლ";
      const res = strUtils.strToUtf8(input);
      expect(res).toEqual(new Uint8Array([116,
                                          226,
                                          157,
                                          129,
                                          225,
                                          131,
                                          154]));
    });
  });

  describe("strToLeUtf16", () => {
    it("should return an empty Uint8Array for an empty string", () => {
      expect(strUtils.strToLeUtf16("")).toEqual(new Uint8Array([]));
    });

    it("should convert a string to little-endian UTF-16 code unit", () => {
      const someLetters = "A❁ლewat";
      expect(strUtils.strToLeUtf16(someLetters))
        .toEqual(new Uint8Array([65,
                                 0, // 0x0041 (A)

                                 65,
                                 39, // 0x2741 (❁)

                                 218,
                                 16, // 0x10DA (ლ)

                                 101,
                                 0,  // 0x065 (e)

                                 119,
                                 0, // etc.

                                 97,
                                 0,

                                 116,
                                 0 ]));
    });
  });

  describe("leUtf16ToStr", () => {
    it("should return an empty string for an empty Uint8Array", () => {
      expect(strUtils.leUtf16ToStr(new Uint8Array([]))).toBe("");
    });

    it("should convert little-endian UTF-16 to its original string", () => {
     const utf16 = new Uint8Array([65,
                                   0, // 0x0041 (A)

                                   65,
                                   39, // 0x2741 (❁)

                                   218,
                                   16, // 0x10DA (ლ)

                                   101,
                                   0,  // 0x065 (e)

                                   119,
                                   0, // etc.

                                   97,
                                   0,

                                   116,
                                   0 ]);
      expect(strUtils.leUtf16ToStr(utf16)).toEqual("A❁ლewat");
    });
  });

  describe("bytesToHex", () => {
    it("should return an empty string for an empty typedArray", () => {
      expect(strUtils.bytesToHex(new Uint8Array([]))).toBe("");
    });

    it("should convert to hexadecimal Uint8Array instances", () => {
      const arr = new Uint8Array([255, 9, 254, 2]);
      expect(strUtils.bytesToHex(arr)).toBe("ff09fe02");
    });

    it("should allow to add a separator", () => {
      const arr = new Uint8Array([255, 9, 254, 2]);
      expect(strUtils.bytesToHex(arr, "--")).toBe("ff--09--fe--02");
    });
  });

  describe("hexToBytes", () => {
    it("should translate an empty string into an empty Uint8Array", () => {
      expect(strUtils.hexToBytes("")).toEqual(new Uint8Array([]));
    });
    it("should translate lower case hexa codes into its Uint8Array counterpart", () => {
      expect(strUtils.hexToBytes("ff87a59800000005"))
        .toEqual(new Uint8Array([255, 135, 165, 152, 0, 0, 0, 5]));
    });
    it("should translate higher case hexa codes into its Uint8Array counterpart", () => {
      expect(strUtils.hexToBytes("FECD87A59800000005"))
        .toEqual(new Uint8Array([254, 205, 135, 165, 152, 0, 0, 0, 5]));
    });

    /* tslint:disable:max-line-length */
    it("should translate a mix of higher case and lower case hexa codes into its Uint8Array counterpart", () => {
    /* tslint:enable:max-line-length */
      expect(strUtils.hexToBytes("FECD87A59800000005"))
        .toEqual(new Uint8Array([254, 205, 135, 165, 152, 0, 0, 0, 5]));
    });
  });

  describe("guidToUuid", () => {
    it("should throw if the length is different than 16 bytes", () => {
      expect(() => strUtils.guidToUuid(new Uint8Array(0))).toThrow();
      expect(() => strUtils.guidToUuid(new Uint8Array(4))).toThrow();
      expect(() => strUtils.guidToUuid(new Uint8Array(20))).toThrow();
    });
    it("should translate PlayReady GUID to universal UUID", () => {
      const uuid1 = new Uint8Array(
        [15, 27, 175, 76, 7, 184, 156, 73, 181, 133, 213, 230, 192, 48, 134, 31]);
      const uuid2 = new Uint8Array(
        [212, 72, 21, 77, 26, 220, 79, 95, 101, 86, 92, 99, 110, 189, 1, 111]);
      expect(strUtils.guidToUuid(uuid1))
        .toEqual(
          new Uint8Array(
            [76, 175, 27, 15, 184, 7, 73, 156, 181, 133, 213, 230, 192, 48, 134, 31])
        );
      expect(strUtils.guidToUuid(uuid2))
        .toEqual(
          new Uint8Array(
            [77, 21, 72, 212, 220, 26, 95, 79, 101, 86, 92, 99, 110, 189, 1, 111])
        );
    });
  });

  describe("utf8ToStr", () => {
    it ("should translate nothing by an empty string", () => {
      expect(strUtils.utf8ToStr(new Uint8Array([]))).toBe("");
    });

    /* tslint:disable max-line-length */
    it("should translate sequence of UTF-8 code units into the corresponding string", () => {
    /* tslint:enable max-line-length */
      expect(strUtils.utf8ToStr(new Uint8Array([
        0xF0, 0x9F, 0x98, 0x80,
        0xF0, 0x9F, 0x90, 0x80,
        0xE1, 0xBC, 0x80,
        0x65,
      ]))).toBe("😀🐀ἀe");
    });

    it("should throw at malformed UTF8 codes", () => {
      expect(() => {
        strUtils.utf8ToStr(new Uint8Array([0xA0, 0x9F, 0x98, 0x80]));
      }).toThrow();
    });

    it("should strip off the UTF8 BOM if present", () => {
      expect(strUtils.utf8ToStr(new Uint8Array([
        0xEF, 0xBB, 0xBF,
        0xF0, 0x9F, 0x98, 0x80,
        0xF0, 0x9F, 0x90, 0x80,
        0xE1, 0xBC, 0x80,
        0x65,
      ]))).toBe("😀🐀ἀe");
    });
  });
});
