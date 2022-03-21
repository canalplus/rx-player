/**
 * Copyright 2017 CANAL+ Group
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

import EWMA from "../ewma";

describe("ABR - EWMA", () => {
  it("should return the last bitrate if half-life is at 0", () => {
    const ewma = new EWMA(0);
    ewma.addSample(8000, 1000000);
    expect(ewma.getEstimate()).toBe(1000000);
    ewma.addSample(4000, 7000000);
    expect(ewma.getEstimate()).toBe(7000000);
    ewma.addSample(1000, 6666600);
    expect(ewma.getEstimate()).toBe(6666600);
  });

  it("should returns the correct value bitrate for a given positive half-life", () => {
    // "slow" evolution
    const ewma1 = new EWMA(15);
    ewma1.addSample(1, 50);
    expect(ewma1.getEstimate()).toBeLessThan(50 + 0.1);
    expect(ewma1.getEstimate()).toBeGreaterThan(50 - 0.1);
    ewma1.addSample(5, 100);
    expect(ewma1.getEstimate()).toBeLessThan(92 + 1);
    expect(ewma1.getEstimate()).toBeGreaterThan(92 - 1);
    ewma1.addSample(3, 1);
    expect(ewma1.getEstimate()).toBeLessThan(58 + 1);
    expect(ewma1.getEstimate()).toBeGreaterThan(58 - 1);
    ewma1.addSample(8, 45);
    expect(ewma1.getEstimate()).toBeLessThan(50 + 1);
    expect(ewma1.getEstimate()).toBeGreaterThan(50 - 1);
    ewma1.addSample(9, 45);
    expect(ewma1.getEstimate()).toBeLessThan(48 + 1);
    expect(ewma1.getEstimate()).toBeGreaterThan(48 - 1);
    ewma1.addSample(200, 300);
    expect(ewma1.getEstimate()).toBeLessThan(300 + 0.1);
    expect(ewma1.getEstimate()).toBeGreaterThan(300 - 0.1);
    ewma1.addSample(10, 1);
    expect(ewma1.getEstimate()).toBeLessThan(189 + 1);
    expect(ewma1.getEstimate()).toBeGreaterThan(189 - 1);

    // fast evolution
    const ewma2 = new EWMA(2);
    ewma2.addSample(1, +50);
    expect(ewma2.getEstimate()).toBeLessThan(50 + 0.1);
    expect(ewma2.getEstimate()).toBeGreaterThan(50 - 0.1);
    ewma2.addSample(5, 100);
    expect(ewma2.getEstimate()).toBeLessThan(97 + 0.1);
    expect(ewma2.getEstimate()).toBeGreaterThan(97 - 0.1);
    ewma2.addSample(3, 1);
    expect(ewma2.getEstimate()).toBeLessThan(32 + 0.1);
    expect(ewma2.getEstimate()).toBeGreaterThan(32 - 0.1);
    ewma2.addSample(8, 45);
    expect(ewma2.getEstimate()).toBeLessThan(44 + 1);
    expect(ewma2.getEstimate()).toBeGreaterThan(44 - 1);
    ewma2.addSample(9, 45);
    expect(ewma2.getEstimate()).toBeLessThan(45 + 0.1);
    expect(ewma2.getEstimate()).toBeGreaterThan(45 - 0.1);
    ewma2.addSample(200, 300);
    expect(ewma2.getEstimate()).toBeLessThan(300 + 0.1);
    expect(ewma2.getEstimate()).toBeGreaterThan(300 - 0.1);
    ewma2.addSample(10, 1);
    expect(ewma2.getEstimate()).toBeLessThan(10 + 0.5);
    expect(ewma2.getEstimate()).toBeGreaterThan(10 - 0.5);
  });
});
