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

import { expect } from "chai";
import * as bytes from "../bytes";

describe("utils - bytes", () => {
  describe("strToBytes", () => {
    it("should return an empty Uint8Array for an empty string", () => {
      const res = bytes.strToBytes("");
      expect(res).to.be.an.instanceof(Uint8Array);
      expect(res).to.have.lengthOf(0);
    });

    it("should return an Uint8Array of a regular ASCII string", () => {
      const input = "test";
      const res = bytes.strToBytes(input);
      expect(res).to.have.lengthOf(input.length);

      input.split("").forEach((letter, index) => {
        expect(res[index]).to.equal(letter.charCodeAt(0));
      });
    });

    it("should return an Uint8Array of the first 8 bits of a string", () => {
      const input = "t❁ლ";
      const res = bytes.strToBytes(input);
      expect(res).to.have.lengthOf(input.length);

      input.split("").forEach((letter, index) => {
        expect(res[index]).to.equal(letter.charCodeAt(0) & 0xFF);
      });
    });
  });

  describe("bytesToStr", () => {
    it("should return an empty string for an empty typedArray", () => {
      expect(bytes.bytesToStr(new Uint8Array(0))).to.equal("");
    });

    it("should return the right string for any typedArray", () => {
      const someLetters = "A❁ლewatge";
      const arr = someLetters
        .split("")
        .map(l => l.charCodeAt(0));

      const arr8 = new Uint8Array(arr);
      expect(bytes.bytesToStr(arr8)).to.equal(
        someLetters
          .split("")
          .map(l => String.fromCharCode(l.charCodeAt(0) & 0xFF))
          .join("")
      );
    });
  });

  describe("bytesToUTF16Str", () => {
    it("should return an empty string for an empty typedArray", () => {
      expect(bytes.bytesToUTF16Str(new Uint8Array([]))).to.equal("");
    });

    it("should consider every other byte for any typedArray", () => {
      const someLetters = "A❁ლewat";
      const arr = someLetters
        .split("")
        .map(l => l.charCodeAt(0));

      const arr8 = new Uint8Array(arr);

      const skipOddLetters = someLetters
        .split("")
        .filter((_, i) => !(i % 2))
        .join("");

      expect(bytes.bytesToUTF16Str(arr8)).to.equal(
        skipOddLetters
          .split("")
          .map(l => String.fromCharCode(l.charCodeAt(0) & 0xFF))
          .join("")
      );
    });
  });

  describe("bytesToHex", () => {
    it("should return an empty string for an empty typedArray", () => {
      expect(bytes.bytesToHex(new Uint8Array([]))).to.equal("");
    });

    it("should convert to hexadecimal Uint8Array instances", () => {
      const arr = new Uint8Array([255, 9, 254, 2]);
      expect(bytes.bytesToHex(arr)).to.equal("ff09fe02");
    });

    it("should allow to add a separator", () => {
      const arr = new Uint8Array([255, 9, 254, 2]);
      expect(bytes.bytesToHex(arr, "--")).to.equal("ff--09--fe--02");
    });
  });

  describe("concat", () => {
    it("should return an empty Uint8Array if no arguments are provided", () => {
      const res = bytes.concat();
      expect(res).to.be.an.instanceof(Uint8Array);
      expect(res).to.have.lengthOf(0);
    });

    it("should concatenate multiple TypedArray in a single Uint8Array", () => {
      const arr8 = new Uint8Array([54, 255]);
      const arr16 = new Uint16Array([258, 54]);
      const arr32 = new Uint32Array([11867, 87]);
      const expected = new Uint8Array(
        [54, 255, 258, 54, 11867, 87].map(e => 0xFF && e)
      );
      const res = bytes.concat(arr8, arr16, arr32);
      expect(res).to.have.lengthOf(arr8.length + arr16.length + arr32.length);
      res.forEach((r, i) => expect(r).to.equal(expected[i]));
    });

    it("should consider number arguments as 0-filled offests", () => {
      const arr8 = new Uint8Array([54, 255]);
      const arr16 = new Uint16Array([258, 54]);
      const arr32 = new Uint32Array([11867, 87]);
      const expected = new Uint8Array(
        [54, 255, 0, 0, 258, 54, 11867, 87, 0].map(e => 0xFF && e)
      );
      const res = bytes.concat(0, arr8, 2, arr16, arr32, 1);
      expect(res).to.have.lengthOf(
        arr8.length + arr16.length + arr32.length + 0 + 2 + 1
      );
      res.forEach((r, i) => expect(r).to.equal(expected[i]));
    });

    it("should return only 0-filled arrays if only numbers are provided", () => {
      const res = bytes.concat(0);
      expect(res).to.have.lengthOf(0);

      const res2 = bytes.concat(10, 2);
      expect(res2).to.have.lengthOf(10 + 2);
      res2.forEach(r => expect(r).to.equal(0));
    });
  });

  describe("be2toi", () => {
    it("should return 0 for an empty TypedArray", () => {
      expect(bytes.be2toi(new Uint8Array(0), 0)).to.equal(0);
    });

    it("should return 0 for an out-of-bound offset", () => {
      const arr = new Uint8Array([255, 255, 1, 8]);
      expect(bytes.be2toi(arr, -45)).to.equal(0);
      expect(bytes.be2toi(arr, 45)).to.equal(0);
    });

    it("should return the number value for the 2 first elements of an Uint8Array from the offset", () => {
      // as the test would be equivalent to re-implement the function, I
      // directly take the expected result (number to hex and hex to
      // number) and compare
      const arr = new Uint8Array([255, 255, 1, 8]);
      const expected = [65535, 65281, 264, 2048];
      expect(bytes.be2toi(arr, 0)).to.equal(expected[0]);
      expect(bytes.be2toi(arr, 1)).to.equal(expected[1]);
      expect(bytes.be2toi(arr, 2)).to.equal(expected[2]);
      expect(bytes.be2toi(arr, 3)).to.equal(expected[3]);
    });
  });

  describe("be4toi", () => {
    it("should return the number value for the 4 first elements of an Uint8Array from the offset", () => {
      // as the test would be equivalent to re-implement the function, I
      // directly take the expected result (number to hex and hex to
      // number) and compare
      const arr = new Uint8Array([ 0, 0, 0, 1, 255, 3, 2 ]);
      const expected = [ 1, 511, 130819, 33489666 ];
      expect(bytes.be4toi(arr, 0)).to.equal(expected[0]);
      expect(bytes.be4toi(arr, 1)).to.equal(expected[1]);
      expect(bytes.be4toi(arr, 2)).to.equal(expected[2]);
      expect(bytes.be4toi(arr, 3)).to.equal(expected[3]);
    });
  });

  describe("be8toi", () => {
    it("should return the number value for the 8 first elements of an Uint8Array from the offset", () => {
      // as the test would be equivalent to re-implement the function, I
      // directly take the expected result (number to hex and hex to
      // number) and compare
      const arr = new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 255, 0, 255, 0, 255, 0 ]); // I can't set the top-most byte or I
                                         // go over MAX_SAFE_INTEGER
      const expected = [ 1, 280379743338240 ];
      expect(bytes.be8toi(arr, 0)).to.equal(expected[0]);
      expect(bytes.be8toi(arr, 8)).to.equal(expected[1]);
    });
  });

  describe("le2toi", () => {
    it("should return 0 for an empty TypedArray", () => {
      expect(bytes.le2toi(new Uint8Array(0), 0)).to.equal(0);
    });

    it("should return 0 for an out-of-bound offset", () => {
      const arr = new Uint8Array([255, 255, 1, 8]);
      expect(bytes.le2toi(arr, -45)).to.equal(0);
      expect(bytes.le2toi(arr, 45)).to.equal(0);
    });

    it(
      "should return the number value for the 2 first elements of an Uint8Array from the offset, little-endian style",
      () => {
        // as the test would be equivalent to re-implement the function, I
        // directly take the expected result (number to hex and hex to
        // number) and compare
        const arr = new Uint8Array([8, 1, 255, 255]);
        const expected = [264, 65281, 65535, 255];
        expect(bytes.le2toi(arr, 0)).to.equal(expected[0]);
        expect(bytes.le2toi(arr, 1)).to.equal(expected[1]);
        expect(bytes.le2toi(arr, 2)).to.equal(expected[2]);
        expect(bytes.le2toi(arr, 3)).to.equal(expected[3]);
      });
  });

  describe("le4toi", () => {
    it(
      "should return the number value for the 4 first elements of an Uint8Array from the offset, little-endian style",
      () => {
        // as the test would be equivalent to re-implement the function, I
        // directly take the expected result (number to hex and hex to
        // number) and compare
        const arr = new Uint8Array([2, 3, 255, 1, 0, 0, 0]);
        const expected = [ 33489666, 130819, 511, 1 ];
        expect(bytes.le4toi(arr, 0)).to.equal(expected[0]);
        expect(bytes.le4toi(arr, 1)).to.equal(expected[1]);
        expect(bytes.le4toi(arr, 2)).to.equal(expected[2]);
        expect(bytes.le4toi(arr, 3)).to.equal(expected[3]);
      });
  });

  describe("le8toi", () => {
    it(
      "should return the number value for the 8 first elements of an Uint8Array from the offset, little-endian style",
      () => {
        // as the test would be equivalent to re-implement the function, I
        // directly take the expected result (number to hex and hex to
        // number) and compare
        const arr = new Uint8Array([
          1, 0, 0, 0, 0, 0, 0, 0,
          0, 255, 0, 255, 0, 255, 0, 0 ]); // I can't set the top-most byte or I
                                           // go over MAX_SAFE_INTEGER
        const expected = [ 1, 280379743338240 ];
        expect(bytes.le8toi(arr, 0)).to.equal(expected[0]);
        expect(bytes.le8toi(arr, 8)).to.equal(expected[1]);
      });
  });

  describe("itole2", () => {
    it("should return a little-endian style Uint8Array of length 2 translated from the number given", () => {
      const values = [264, 65281, 65535, 255];
      expect(bytes.itole2(values[0])).to.deep.equal(new Uint8Array([8, 1]));
      expect(bytes.itole2(values[1])).to.deep.equal(new Uint8Array([1, 255]));
      expect(bytes.itole2(values[2])).to.deep.equal(new Uint8Array([255, 255]));
    });
  });

  describe("itole4", () => {
    it("should return a little-endian style Uint8Array of length 4 translated from the number given", () => {
      const values = [ 33489666, 130819, 511, 1 ];
      expect(bytes.itole4(values[0]))
        .to.deep.equal(new Uint8Array([2, 3, 255, 1]));
      expect(bytes.itole4(values[1]))
        .to.deep.equal(new Uint8Array([3, 255, 1, 0]));
      expect(bytes.itole4(values[2]))
        .to.deep.equal(new Uint8Array([255, 1, 0, 0]));
      expect(bytes.itole4(values[3]))
        .to.deep.equal(new Uint8Array([1, 0, 0, 0]));
    });
  });

  describe("itole8", () => {
    xit("should return a little-endian style Uint8Array of length 8 translated from the number given", () => {
      const values = [ 1, 280379743338240 ];
      expect(bytes.itole8(values[0])).to.deep.equal(new Uint8Array([
        1, 0, 0, 0, 0, 0, 0, 0 ]));
      expect(bytes.itole8(values[1])).to.deep.equal(new Uint8Array([
        0, 255, 0, 255, 0, 255, 0, 0 ]));
    });
  });
});
