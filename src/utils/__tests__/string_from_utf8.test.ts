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

import stringFromUTF8 from "../string_from_utf8";

describe("utils - stringFromUTF8", () => {
  it ("should translate null by an empty string", () => {
    expect(stringFromUTF8(null)).toBe("");
  });

  it ("should translate nothing by an empty string", () => {
    expect(stringFromUTF8(new Uint8Array([]))).toBe("");
  });

  /* tslint:disable max-line-length */
  it("should translate sequence of UTF-8 code units into the corresponding string", () => {
  /* tslint:enable max-line-length */
    expect(stringFromUTF8(new Uint8Array([
      0xF0, 0x9F, 0x98, 0x80,
      0xF0, 0x9F, 0x90, 0x80,
      0xE1, 0xBC, 0x80,
      0x65,
    ]))).toBe("😀🐀ἀe");
  });

  it("should throw at malformed UTF8 codes", () => {
    expect(() => {
      stringFromUTF8(new Uint8Array([0xA0, 0x9F, 0x98, 0x80]));
    }).toThrow();
  });

  it("should strip off the UTF8 BOM if present", () => {
    expect(stringFromUTF8(new Uint8Array([
      0xEF, 0xBB, 0xBF,
      0xF0, 0x9F, 0x98, 0x80,
      0xF0, 0x9F, 0x90, 0x80,
      0xE1, 0xBC, 0x80,
      0x65,
    ]))).toBe("😀🐀ἀe");
  });
});
