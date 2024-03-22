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

import { getMissingKeyIds } from "../../content_decryptor";

describe("content_decryptor - blacklist missing key Ids", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("should return an empty array if actualKeyIds contains all expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([]);
  });

  it("should return expectedKeyIds if actualKeyIds does not contain them", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds: Uint8Array[] = []; // Empty array, none of the expectedKeyIds are present

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual(expectedKeyIds);
  });

  it("should return only the missing key IDs from expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
      new Uint8Array([4]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([3])]; // Missing [2] and [4]
    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([new Uint8Array([2]), new Uint8Array([4])]);
  });
});
