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
import { reliableAdd, reliableMultiply } from "../reliable_math";

describe("utils - reliableAdd", () => {
  it("Should add two integers", () => {
    expect(reliableAdd(124154, 6366)).toBe(130520);
  });
  it("Should add two floating number", () => {
    // When JavaScript stores numbers in double-precision 64-bit binary format IEEE 754,
    // 0.1 + 0.2 = 0.30000000000000004
    expect(reliableAdd(0.1, 0.2)).toBe(0.3);
  });
  it("Should add one floating number and an integer (sens 1)", () => {
    expect(reliableAdd(12345, 0.2)).toBe(12345.2);
  });
  it("Should add one floating number and an integer (sens 2)", () => {
    expect(reliableAdd(0.2, 12345)).toBe(12345.2);
  });
});

describe("utils - reliableMutiply", () => {
  it("Should multiply two integers", () => {
    expect(reliableMultiply(3, 3)).toBe(9);
  });
  it("Should multiply two floating number", () => {
    // When JavaScript stores numbers in double-precision 64-bit binary format IEEE 754,
    // 192797480.641122 * 12.341 = 2379313708.592087
    expect(reliableMultiply(192797480.641122, 12.341)).toBe(2379313708.5920863);
  });
  it("Should multiply one floating number and an integer (sens 1)", () => {
    // When JavaScript stores numbers in double-precision 64-bit binary format IEEE 754,
    // 192797480.641122 * 10000000 = 1927974806411220.2
    expect(reliableMultiply(192797480.641122, 10000000)).toBe(1927974806411220);
  });
  it("Should multiply one floating number and an integer (sens 2)", () => {
    // When JavaScript stores numbers in double-precision 64-bit binary format IEEE 754,
    // 192797480.641122 * 10000000 = 1927974806411220.2
    expect(reliableMultiply(10000000, 192797480.641122)).toBe(1927974806411220);
  });
});
