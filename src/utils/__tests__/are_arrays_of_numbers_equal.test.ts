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

import areArraysOfNumbersEqual from "../are_arrays_of_numbers_equal";

describe("are_arrays_of_numbers_equal", () => {

  it("should return true for two empty arrays", () => {
    expect(areArraysOfNumbersEqual([], [])).toEqual(true);
    expect(areArraysOfNumbersEqual(new Uint8Array([]), [])).toEqual(true);
    expect(areArraysOfNumbersEqual(new Uint8Array([]), new Uint8Array([]))).toEqual(true);
    expect(areArraysOfNumbersEqual(new Uint8Array([]), [])).toEqual(true);
  });

  it("should return false when only one of the array is empty", () => {
    expect(areArraysOfNumbersEqual([0], [])).toEqual(false);
    expect(areArraysOfNumbersEqual([1], new Uint8Array([]))).toEqual(false);
    expect(areArraysOfNumbersEqual(new Uint8Array([1]),
                                   new Uint8Array([]))).toEqual(false);
    expect(areArraysOfNumbersEqual(new Uint8Array([]),
                                   new Uint8Array([0]))).toEqual(false);
    expect(areArraysOfNumbersEqual([], [0])).toEqual(false);
    expect(areArraysOfNumbersEqual([], [0, 1])).toEqual(false);
  });

  it("should return false if both arrays don't have the same length", () => {
    expect(areArraysOfNumbersEqual([0, 1],
                                   [1])).toEqual(false);
    expect(areArraysOfNumbersEqual([1, 2, 3],
                                   new Uint8Array([1, 2]))).toEqual(false);
    expect(areArraysOfNumbersEqual(new Uint8Array([1, 2, 3]),
                                   [1, 2])).toEqual(false);
    expect(areArraysOfNumbersEqual(new Uint8Array([1, 2, 3]),
                                   new Uint8Array([1, 2]))).toEqual(false);
  });

  /* tslint:disable max-line-length */
  it("should return false if both arrays have the same length with different values", () => {
  /* tslint:enable max-line-length */
    expect(areArraysOfNumbersEqual([0, 1],
                                   [0, 4])).toEqual(false);
    expect(areArraysOfNumbersEqual([1, 2, 3],
                                   new Uint8Array([8, 2, 3]))).toEqual(false);
    expect(areArraysOfNumbersEqual(new Uint8Array([2, 2, 3]),
                                   [1, 2, 3])).toEqual(false);
    expect(areArraysOfNumbersEqual(new Uint8Array([2, 3]),
                                   new Uint8Array([2, 4]))).toEqual(false);
  });

  it("should return true if both contain the same value in a different type", () => {
    expect(areArraysOfNumbersEqual([5, 4, 7],
                                   new Uint8Array([5, 4, 7]))).toEqual(true);
    expect(areArraysOfNumbersEqual(new Uint8Array([47, 68, 9]),
                                   [47, 68, 9])).toEqual(true);
  });

  it("should return true if both contain the same value in the same type", () => {
    expect(areArraysOfNumbersEqual([45, 6985, 866, 856],
                                   [45, 6985, 866, 856])).toEqual(true);
    expect(areArraysOfNumbersEqual([8],
                                   [8])).toEqual(true);
    expect(areArraysOfNumbersEqual(new Uint8Array([45, 6985, 866, 856]),
                                   new Uint8Array([45, 6985, 866, 856])))
      .toEqual(true);
  });

  it("should return true if both are the same reference", () => {
    const arr = [909, 432432, 124213];
    const uint8Arr = new Uint8Array([23244, 35452, 54326, 867 ]);
    expect(areArraysOfNumbersEqual(arr, arr)).toEqual(true);
    expect(areArraysOfNumbersEqual(uint8Arr, uint8Arr)).toEqual(true);
  });
});
