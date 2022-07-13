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

import findCompleteBox from "../find_complete_box";

describe("transports utils - findCompleteBox", () => {
  it("should return -1 if the box is not found", () => {
    const byteArr = new Uint8Array([
      0,
      0,
      0,
      9,
      0x64,
      0x67,
      0x32,
      0x55,
      4,
      0,
      0,
      0,
      10,
      0x88,
      0x68,
      0x47,
      0x53,
      12,
      88,
    ]);

    expect(findCompleteBox(byteArr, 0x75757575)).toEqual(-1);
    expect(findCompleteBox(byteArr, 0x99999999)).toEqual(-1);
    expect(findCompleteBox(byteArr, 0x99999)).toEqual(-1);
  });

  it("should return its index if the box is found", () => {
    const byteArr = new Uint8Array([
      0,
      0,
      0,
      9,
      0x64,
      0x67,
      0x32,
      0x55,
      4,
      0,
      0,
      0,
      10,
      0x88,
      0x68,
      0x47,
      0x53,
      12,
      88,
    ]);

    expect(findCompleteBox(byteArr, 0x64673255)).toEqual(0);
    expect(findCompleteBox(byteArr, 0x88684753)).toEqual(9);
  });

  it("should not return a box if it is incomplete", () => {
    const byteArr = new Uint8Array([
      0,
      0,
      0,
      9,
      0x64,
      0x67,
      0x32,
      0x55,
      4,
      0,
      0,
      0,
      10,
      0x88,
      0x68,
      0x47,
      0x53,
      12,
    ]);

    expect(findCompleteBox(byteArr, 0x88684753)).toEqual(-1);
  });

  it("should return a box if a later one is incomplete", () => {
    const byteArr = new Uint8Array([
      0,
      0,
      0,
      9,
      0x64,
      0x67,
      0x32,
      0x55,
      4,
      0,
      0,
      0,
      12,
      0x58,
      0x58,
      0x57,
      0x53,
      15,
      99,
      87,
      77,
      0,
      0,
      0,
      10,
      0x88,
      0x68,
      0x47,
      0x53,
      12,
    ]);

    expect(findCompleteBox(byteArr, 0x64673255)).toEqual(0);
    expect(findCompleteBox(byteArr, 0x58585753)).toEqual(9);
    expect(findCompleteBox(byteArr, 0x88684753)).toEqual(-1);
  });
});
