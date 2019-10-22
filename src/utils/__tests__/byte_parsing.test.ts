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

import * as byteUtils from "../byte_parsing";

describe("utils - byte parsing", () => {
  describe("strToBytes", () => {
    it("should return an empty Uint8Array for an empty string", () => {
      const res = byteUtils.strToBytes("");
      expect(res).toBeInstanceOf(Uint8Array);
      expect(res).toHaveLength(0);
    });

    it("should return an Uint8Array of a regular ASCII string", () => {
      const input = "test";
      const res = byteUtils.strToBytes(input);
      expect(res).toHaveLength(input.length);

      input.split("").forEach((letter, index) => {
        expect(res[index]).toBe(letter.charCodeAt(0));
      });
    });

    it("should return an Uint8Array of the first 8 bits of a string", () => {
      const input = "t❁ლ";
      const res = byteUtils.strToBytes(input);
      expect(res).toHaveLength(input.length);

      input.split("").forEach((letter, index) => {
        expect(res[index]).toBe(letter.charCodeAt(0) & 0xFF);
      });
    });
  });

  describe("bytesToStr", () => {
    it("should return an empty string for an empty typedArray", () => {
      expect(byteUtils.bytesToStr(new Uint8Array(0))).toBe("");
    });

    it("should return the right string for any typedArray", () => {
      const someLetters = "A❁ლewatge";
      const arr = someLetters
        .split("")
        .map(l => l.charCodeAt(0));

      const arr8 = new Uint8Array(arr);
      expect(byteUtils.bytesToStr(arr8)).toBe(
        someLetters
          .split("")
          .map(l => String.fromCharCode(l.charCodeAt(0) & 0xFF))
          .join("")
      );
    });
  });

  describe("bytesToUTF16Str", () => {
    it("should return an empty string for an empty typedArray", () => {
      expect(byteUtils.bytesToUTF16Str(new Uint8Array([]))).toBe("");
    });

    it("should consider every other byte for any typedArray", () => {
      const someLetters = "A❁ლewat";
      const arr = someLetters
        .split("")
        .map(l => l.charCodeAt(0));

      const arr8 = new Uint8Array(arr);

      const skipOddLetters = someLetters
        .split("")
        .filter((_, i) => (i % 2) === 0)
        .join("");

      expect(byteUtils.bytesToUTF16Str(arr8)).toBe(
        skipOddLetters
          .split("")
          .map(l => String.fromCharCode(l.charCodeAt(0) & 0xFF))
          .join("")
      );
    });
  });

  describe("bytesToHex", () => {
    it("should return an empty string for an empty typedArray", () => {
      expect(byteUtils.bytesToHex(new Uint8Array([]))).toBe("");
    });

    it("should convert to hexadecimal Uint8Array instances", () => {
      const arr = new Uint8Array([255, 9, 254, 2]);
      expect(byteUtils.bytesToHex(arr)).toBe("ff09fe02");
    });

    it("should allow to add a separator", () => {
      const arr = new Uint8Array([255, 9, 254, 2]);
      expect(byteUtils.bytesToHex(arr, "--")).toBe("ff--09--fe--02");
    });
  });

  describe("concat", () => {
    it("should return an empty Uint8Array if no arguments are provided", () => {
      const res = byteUtils.concat();
      expect(res).toBeInstanceOf(Uint8Array);
      expect(res).toHaveLength(0);
    });

    it("should concatenate multiple TypedArray in a single Uint8Array", () => {
      const arr8 = new Uint8Array([54, 255]);
      const arr16 = new Uint16Array([258, 54]);
      const arr0 = new Uint8Array([]);
      const arr32 = new Uint32Array([11867, 87]);
      const expected = new Uint8Array(
        [54, 255, 258, 54, 11867, 87].map(e => e & 0xFF)
      );
      const res = byteUtils.concat(arr8, arr0, arr16, arr0, arr32);
      expect(res).toHaveLength(arr8.length + arr16.length + arr32.length);
      res.forEach((x, i) => expect(x).toBe(expected[i]));
    });

    it("should consider number arguments as 0-filled offests", () => {
      const arr8 = new Uint8Array([54, 255]);
      const arr16 = new Uint16Array([258, 54]);
      const arr32 = new Uint32Array([11867, 87]);
      const expected = new Uint8Array(
        [54, 255, 0, 0, 258, 54, 11867, 87, 0].map(e => e & 0xFF)
      );
      const res = byteUtils.concat(0, arr8, 2, arr16, arr32, 1);
      expect(res).toHaveLength(
        arr8.length + arr16.length + arr32.length + 0 + 2 + 1
      );
      res.forEach((x, i) => expect(x).toBe(expected[i]));
    });

    it("should return only 0-filled arrays if only numbers are provided", () => {
      const res = byteUtils.concat(0);
      expect(res).toHaveLength(0);

      const res2 = byteUtils.concat(10, 2);
      expect(res2).toHaveLength(10 + 2);
      res2.forEach(x => expect(x).toBe(0));
    });
  });

  describe("be2toi", () => {
    it("should return 0 for an empty TypedArray", () => {
      expect(byteUtils.be2toi(new Uint8Array(0), 0)).toBe(0);
    });

    it("should return 0 for an out-of-bound offset", () => {
      const arr = new Uint8Array([255, 255, 1, 8]);
      expect(byteUtils.be2toi(arr, -45)).toBe(0);
      expect(byteUtils.be2toi(arr, 45)).toBe(0);
    });

    /* tslint:disable:max-line-length */
    it("should return the number value for the 2 first elements of an Uint8Array from the offset", () => {
    /* tslint:enable:max-line-length */
      // as the test would be equivalent to re-implement the function, I
      // directly take the expected result (number to hex and hex to
      // number) and compare
      const arr = new Uint8Array([255, 255, 1, 8]);
      const expected = [65535, 65281, 264, 2048];
      expect(byteUtils.be2toi(arr, 0)).toBe(expected[0]);
      expect(byteUtils.be2toi(arr, 1)).toBe(expected[1]);
      expect(byteUtils.be2toi(arr, 2)).toBe(expected[2]);
      expect(byteUtils.be2toi(arr, 3)).toBe(expected[3]);
    });
  });

  describe("be3toi", () => {
    /* tslint:disable:max-line-length */
    it("should return the number value for the 2 first elements of an Uint8Array from the offset", () => {
    /* tslint:enable:max-line-length */
      // as the test would be equivalent to re-implement the function, I
      // directly take the expected result (number to hex and hex to
      // number) and compare
      const arr = new Uint8Array([255, 255, 255, 1, 8, 17]);
      const expected = [16777215, 16776961, 16711944, 67601];
      expect(byteUtils.be3toi(arr, 0)).toBe(expected[0]);
      expect(byteUtils.be3toi(arr, 1)).toBe(expected[1]);
      expect(byteUtils.be3toi(arr, 2)).toBe(expected[2]);
      expect(byteUtils.be3toi(arr, 3)).toBe(expected[3]);
    });
  });

  describe("be4toi", () => {
    /* tslint:disable:max-line-length */
    it("should return the number value for the 4 first elements of an Uint8Array from the offset", () => {
    /* tslint:enable:max-line-length */
      // as the test would be equivalent to re-implement the function, I
      // directly take the expected result (number to hex and hex to
      // number) and compare
      const arr = new Uint8Array([ 0, 0, 0, 1, 255, 3, 2 ]);
      const expected = [ 1, 511, 130819, 33489666 ];
      expect(byteUtils.be4toi(arr, 0)).toBe(expected[0]);
      expect(byteUtils.be4toi(arr, 1)).toBe(expected[1]);
      expect(byteUtils.be4toi(arr, 2)).toBe(expected[2]);
      expect(byteUtils.be4toi(arr, 3)).toBe(expected[3]);
    });
  });

  describe("be8toi", () => {
    /* tslint:disable:max-line-length */
    it("should return the number value for the 8 first elements of an Uint8Array from the offset", () => {
    /* tslint:enable:max-line-length */
      // as the test would be equivalent to re-implement the function, I
      // directly take the expected result (number to hex and hex to
      // number) and compare
      const arr = new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 255, 0, 255, 0, 255, 0 ]); // I can't set the top-most byte or I
                                         // go over MAX_SAFE_INTEGER
      const expected = [ 1, 280379743338240 ];
      expect(byteUtils.be8toi(arr, 0)).toBe(expected[0]);
      expect(byteUtils.be8toi(arr, 8)).toBe(expected[1]);
    });
  });

  describe("le2toi", () => {
    it("should return 0 for an empty TypedArray", () => {
      expect(byteUtils.le2toi(new Uint8Array(0), 0)).toBe(0);
    });

    it("should return 0 for an out-of-bound offset", () => {
      const arr = new Uint8Array([255, 255, 1, 8]);
      expect(byteUtils.le2toi(arr, -45)).toBe(0);
      expect(byteUtils.le2toi(arr, 45)).toBe(0);
    });

    it(
      /* tslint:disable:max-line-length */
      "should return the number value for the 2 first elements of an Uint8Array from the offset, little-endian style",
      /* tslint:enable:max-line-length */
      () => {
        // as the test would be equivalent to re-implement the function, I
        // directly take the expected result (number to hex and hex to
        // number) and compare
        const arr = new Uint8Array([8, 1, 255, 255]);
        const expected = [264, 65281, 65535, 255];
        expect(byteUtils.le2toi(arr, 0)).toBe(expected[0]);
        expect(byteUtils.le2toi(arr, 1)).toBe(expected[1]);
        expect(byteUtils.le2toi(arr, 2)).toBe(expected[2]);
        expect(byteUtils.le2toi(arr, 3)).toBe(expected[3]);
      });
  });

  describe("le4toi", () => {
    it(
      /* tslint:disable:max-line-length */
      "should return the number value for the 4 first elements of an Uint8Array from the offset, little-endian style",
      /* tslint:enable:max-line-length */
      () => {
        // as the test would be equivalent to re-implement the function, I
        // directly take the expected result (number to hex and hex to
        // number) and compare
        const arr = new Uint8Array([2, 3, 255, 1, 0, 0, 0]);
        const expected = [ 33489666, 130819, 511, 1 ];
        expect(byteUtils.le4toi(arr, 0)).toBe(expected[0]);
        expect(byteUtils.le4toi(arr, 1)).toBe(expected[1]);
        expect(byteUtils.le4toi(arr, 2)).toBe(expected[2]);
        expect(byteUtils.le4toi(arr, 3)).toBe(expected[3]);
      });
  });

  describe("le8toi", () => {
    it(
      /* tslint:disable:max-line-length */
      "should return the number value for the 8 first elements of an Uint8Array from the offset, little-endian style",
      /* tslint:enable:max-line-length */
      () => {
        // as the test would be equivalent to re-implement the function, I
        // directly take the expected result (number to hex and hex to
        // number) and compare
        const arr = new Uint8Array([
          1, 0, 0, 0, 0, 0, 0, 0,
          0, 255, 0, 255, 0, 255, 0, 0 ]); // I can't set the top-most byte or I
                                           // go over MAX_SAFE_INTEGER
        const expected = [ 1, 280379743338240 ];
        expect(byteUtils.le8toi(arr, 0)).toBe(expected[0]);
        expect(byteUtils.le8toi(arr, 8)).toBe(expected[1]);
      });
  });

  describe("itobe2", () => {
    /* tslint:disable:max-line-length */
    it("should convert the number given into two elements in a Uint8Array", () => {
    /* tslint:enable:max-line-length */
      expect(byteUtils.itobe2(65535))
        .toEqual(new Uint8Array([255, 255]));
      expect(byteUtils.itobe2(65281))
        .toEqual(new Uint8Array([255, 1]));
      expect(byteUtils.itobe2(264))
        .toEqual(new Uint8Array([1, 8]));
    });
  });

  describe("itobe4", () => {
    /* tslint:disable:max-line-length */
    it("should convert the number given into four elements in a Uint8Array", () => {
    /* tslint:enable:max-line-length */
      expect(byteUtils.itobe4(1))
        .toEqual(new Uint8Array([0, 0, 0, 1]));
      expect(byteUtils.itobe4(511))
        .toEqual(new Uint8Array([0, 0, 1, 255]));
      expect(byteUtils.itobe4(130819))
        .toEqual(new Uint8Array([0, 1, 255, 3]));
      expect(byteUtils.itobe4(33489666))
        .toEqual(new Uint8Array([1, 255, 3, 2]));
    });
  });

  describe("itobe8", () => {
    /* tslint:disable:max-line-length */
    it("should return the number value for the 8 first elements of an Uint8Array from the offset", () => {
    /* tslint:enable:max-line-length */
      expect(byteUtils.itobe8(1))
        .toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]));
      expect(byteUtils.itobe8(1237106686452549))
        .toEqual(new Uint8Array([0x00, 0x04, 0x65, 0x24, 0x58, 0x98, 0x63, 0x45]));
    });
  });

  describe("itole2", () => {
    /* tslint:disable:max-line-length */
    it("should return a little-endian style Uint8Array of length 2 translated from the number given", () => {
    /* tslint:enable:max-line-length */
      const values = [264, 65281, 65535, 255];
      expect(byteUtils.itole2(values[0])).toEqual(new Uint8Array([8, 1]));
      expect(byteUtils.itole2(values[1])).toEqual(new Uint8Array([1, 255]));
      expect(byteUtils.itole2(values[2])).toEqual(new Uint8Array([255, 255]));
    });
  });

  describe("itole4", () => {
    /* tslint:disable:max-line-length */
    it("should return a little-endian style Uint8Array of length 4 translated from the number given", () => {
    /* tslint:enable:max-line-length */
      const values = [ 33489666, 130819, 511, 1 ];
      expect(byteUtils.itole4(values[0]))
        .toEqual(new Uint8Array([2, 3, 255, 1]));
      expect(byteUtils.itole4(values[1]))
        .toEqual(new Uint8Array([3, 255, 1, 0]));
      expect(byteUtils.itole4(values[2]))
        .toEqual(new Uint8Array([255, 1, 0, 0]));
      expect(byteUtils.itole4(values[3]))
        .toEqual(new Uint8Array([1, 0, 0, 0]));
    });
  });

  describe("hexToBytes", () => {
    it("should translate an empty string into an empty Uint8Array", () => {
      expect(byteUtils.hexToBytes("")).toEqual(new Uint8Array([]));
    });
    it("should translate lower case hexa codes into its Uint8Array counterpart", () => {
      expect(byteUtils.hexToBytes("ff87a59800000005"))
        .toEqual(new Uint8Array([255, 135, 165, 152, 0, 0, 0, 5]));
    });
    it("should translate higher case hexa codes into its Uint8Array counterpart", () => {
      expect(byteUtils.hexToBytes("FECD87A59800000005"))
        .toEqual(new Uint8Array([254, 205, 135, 165, 152, 0, 0, 0, 5]));
    });

    /* tslint:disable:max-line-length */
    it("should translate a mix of higher case and lower case hexa codes into its Uint8Array counterpart", () => {
    /* tslint:enable:max-line-length */
      expect(byteUtils.hexToBytes("FECD87A59800000005"))
        .toEqual(new Uint8Array([254, 205, 135, 165, 152, 0, 0, 0, 5]));
    });
  });

  describe("guidToUuid", () => {
    it("should throw if the length is different than 16 bytes", () => {
      expect(() => byteUtils.guidToUuid("")).toThrow();
      expect(() => byteUtils.guidToUuid("abca")).toThrow();
      expect(() => byteUtils.guidToUuid("a;rokgr;oeo;reugporugpuwrhpwjtw")).toThrow();
    });
    it("should translate PlayReady GUID to universal UUID", () => {
      const uuid1 = String.fromCharCode(
        ...[15, 27, 175, 76, 7, 184, 156, 73, 181, 133, 213, 230, 192, 48, 134, 31]
      );
      const uuid2 = String.fromCharCode(
        ...[212, 72, 21, 77, 26, 220, 79, 95, 101, 86, 92, 99, 110, 189, 1, 111]
      );
      expect(byteUtils.guidToUuid(uuid1))
        .toBe("4caf1b0fb807499cb585d5e6c030861f");
      expect(byteUtils.guidToUuid(uuid2))
      .toBe("4d1548d4dc1a5f4f65565c636ebd016f");
    });
  });
});
