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

import BandwidthEstimator from "../bandwidth_estimator";

describe("ABR - BandwidthEstimator", () => {
  it("should return undefined if no sample has been added yet", () => {
    const bwEstimator = new BandwidthEstimator();
    expect(bwEstimator.getEstimate()).toBe(undefined);
  });

  it("should return undefined if not enough bytes has been received", () => {
    const bwEstimator = new BandwidthEstimator();
    bwEstimator.addSample(800, 10);
    expect(bwEstimator.getEstimate()).toBe(undefined);
    bwEstimator.addSample(800, 10);
    expect(bwEstimator.getEstimate()).toBe(undefined);
    bwEstimator.addSample(800, 10);
    expect(bwEstimator.getEstimate()).toBe(undefined);
    bwEstimator.addSample(80000000, 1000000);
    expect(bwEstimator.getEstimate()).toBe(100);
  });

  /* eslint-disable max-len */
  it("should calculate bitrate in function of consecutive request' durations and size", () => {
  /* eslint-enable max-len */
    const bwEstimator = new BandwidthEstimator();
    bwEstimator.addSample(8000, 1000000);
    expect(bwEstimator.getEstimate()).toBe(1000000);
    bwEstimator.addSample(4000, 1000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(1500000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1400000);
    bwEstimator.addSample(1000, 1000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(3000000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(2000000);
  });

  it("should reset the estimation when reset is called", () => {
    const bwEstimator = new BandwidthEstimator();
    bwEstimator.addSample(8000, 1000000);
    bwEstimator.addSample(4000, 1000000);
    bwEstimator.addSample(1000, 1000000);

    bwEstimator.reset();
    expect(bwEstimator.getEstimate()).toBe(undefined);
    bwEstimator.addSample(8000, 1000000);
    expect(bwEstimator.getEstimate()).toBe(1000000);
  });

  it("should estimate a low bitrate quicker than a higher one", () => {
    const bwEstimator = new BandwidthEstimator();

    // 1st test:
    // we raise the bitrate from 1 mega to 2 mega
    // we should slowly go toward 2 megas as an estimate
    bwEstimator.addSample(8000, 1000000); // 1 mega
    bwEstimator.addSample(4000, 1000000); // 2 mega
    expect(bwEstimator.getEstimate()).toBeLessThan(1500000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1400000);
    bwEstimator.addSample(4000, 1000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(1700000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1600000);
    bwEstimator.addSample(4000, 1000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(1800000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1700000);
    bwEstimator.addSample(4000, 1000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(1900000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1800000);
    bwEstimator.addSample(4000, 1000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(1900000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1800000);
    bwEstimator.addSample(4000, 1000000); // 6 iterations for 1900000+
    expect(bwEstimator.getEstimate()).toBeLessThan(2000000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1900000);

    bwEstimator.reset();
    expect(bwEstimator.getEstimate()).toBe(undefined);

    // 2st test:
    // we decrease the bitrate from 2 mega to 1 mega
    // we should quickly go to 1 mega
    bwEstimator.addSample(4000, 1000000); // 2 mega
    bwEstimator.addSample(8000, 1000000); // 1 mega - only 1 iteration for sub 1100000!
    expect(bwEstimator.getEstimate()).toBeLessThan(1100000);
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1000000);

    bwEstimator.reset();
    expect(bwEstimator.getEstimate()).toBe(undefined);

    // 3rd test:
    // we both go up and down, from 5 mega to 10 then to 1 and come back to 10.
    // the 1 mega estimate should have a very perceptible influence, even when
    // going back to 10
    bwEstimator.addSample(2000, 1250000); // 5 mega
    expect(bwEstimator.getEstimate()).toBe(5000000);
    bwEstimator.addSample(2000, 1250100); // 5 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(5000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(5010000);
    bwEstimator.addSample(1000, 1250700); // 10 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(6000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(6500000);
    bwEstimator.addSample(1000, 1251000); // 10 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(6500000);
    expect(bwEstimator.getEstimate()).toBeLessThan(7000000);
    bwEstimator.addSample(10000, 1251000); // 1 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(1000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(1500000);
    bwEstimator.addSample(1000, 1250000); // 10 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(3000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(3500000);
    bwEstimator.addSample(1000, 1250100); // 10 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(3500000);
    expect(bwEstimator.getEstimate()).toBeLessThan(4000000);
    bwEstimator.addSample(1000, 1250100); // 10 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(4000000);
    expect(bwEstimator.getEstimate()).toBeLessThan(4500000);
    bwEstimator.addSample(1000, 1250100); // 10 mega
    expect(bwEstimator.getEstimate()).toBeGreaterThan(4500000);
    expect(bwEstimator.getEstimate()).toBeLessThan(5000000);
  });
});
