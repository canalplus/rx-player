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

import { expect } from "chai";
import EWMA from "../ewma";

describe("ABR - EWMA", () => {
  it("should return the last bitrate if half-life is at 0", () => {
    const ewma = new EWMA(0);
    ewma.addSample(8000, 1000000);
    expect(ewma.getEstimate()).to.equal(1000000);
    ewma.addSample(4000, 7000000);
    expect(ewma.getEstimate()).to.equal(7000000);
    ewma.addSample(1000, 6666600);
    expect(ewma.getEstimate()).to.equal(6666600);
  });

  it("should returns the correct value bitrate for a given positive half-life", () => {
    // "slow" evolution
    const ewma1 = new EWMA(15);
    ewma1.addSample(1, 50);
    expect(ewma1.getEstimate()).to.be.closeTo(50, 0.1);
    ewma1.addSample(5, 100);
    expect(ewma1.getEstimate()).to.be.closeTo(92, 1);
    ewma1.addSample(3, 1);
    expect(ewma1.getEstimate()).to.be.closeTo(58, 1);
    ewma1.addSample(8, 45);
    expect(ewma1.getEstimate()).to.be.closeTo(50, 1);
    ewma1.addSample(9, 45);
    expect(ewma1.getEstimate()).to.be.closeTo(48, 1);
    ewma1.addSample(200, 300);
    expect(ewma1.getEstimate()).to.be.closeTo(300, 0.1);
    ewma1.addSample(10, 1);
    expect(ewma1.getEstimate()).to.be.closeTo(189, 1);

    // fast evolution
    const ewma2 = new EWMA(2);
    ewma2.addSample(1, 50);
    expect(ewma2.getEstimate()).to.be.closeTo(50, 0.1);
    ewma2.addSample(5, 100);
    expect(ewma2.getEstimate()).to.be.closeTo(97, 0.1);
    ewma2.addSample(3, 1);
    expect(ewma2.getEstimate()).to.be.closeTo(32, 0.1);
    ewma2.addSample(8, 45);
    expect(ewma2.getEstimate()).to.be.closeTo(44, 1);
    ewma2.addSample(9, 45);
    expect(ewma2.getEstimate()).to.be.closeTo(45, 0.1);
    ewma2.addSample(200, 300);
    expect(ewma2.getEstimate()).to.be.closeTo(300, 0.1);
    ewma2.addSample(10, 1);
    expect(ewma2.getEstimate()).to.be.closeTo(10, 0.5);
  });
});
