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

import {
  getBackedoffDelay,
  getFuzzedDelay,
} from "../backoff_delay";

describe("utils - getFuzzedDelay", () => {
  it("should return the delay given multiplied by [0.3, 0.7]", () => {
    for (let i = 0; i < 1000; i++) {
      const fuzzed = getFuzzedDelay(1);
      expect(fuzzed).toBeGreaterThanOrEqual(0.7);
      expect(fuzzed).toBeLessThanOrEqual(1.3);
    }
    for (let i = 0; i < 1000; i++) {
      const fuzzed = getFuzzedDelay(98);
      expect(fuzzed).toBeGreaterThanOrEqual(98 * 0.7);
      expect(fuzzed).toBeLessThanOrEqual(98 * 1.3);
    }
  });
});

describe("utils - getBackedoffDelay", () => {
  it("should work like getFuzzedDelay without retryCount", () => {
    for (let i = 0; i < 1000; i++) {
      const delay = getBackedoffDelay(1);
      expect(delay).toBeGreaterThanOrEqual(0.7);
      expect(delay).toBeLessThanOrEqual(1.3);
    }
    for (let i = 0; i < 1000; i++) {
      const delay = getBackedoffDelay(98);
      expect(delay).toBeGreaterThanOrEqual(98 * 0.7);
      expect(delay).toBeLessThanOrEqual(98 * 1.3);
    }
  });
  it("should work like getFuzzedDelay with a retryCount of 1", () => {
    for (let i = 0; i < 1000; i++) {
      const delay = getBackedoffDelay(1, 1);
      expect(delay).toBeGreaterThanOrEqual(0.7);
      expect(delay).toBeLessThanOrEqual(1.3);
    }
    for (let i = 0; i < 1000; i++) {
      const delay = getBackedoffDelay(98, 1);
      expect(delay).toBeGreaterThanOrEqual(98 * 0.7);
      expect(delay).toBeLessThanOrEqual(98 * 1.3);
    }
  });
  it("should return the delay augmented exponentially based on retryCount", () => {
    const pow1 = getBackedoffDelay(2, 1);
    const pow2 = getBackedoffDelay(2, 2);
    const pow3 = getBackedoffDelay(2, 3);
    const pow4 = getBackedoffDelay(2, 4);
    expect(pow1).toBeGreaterThanOrEqual(0.7 * 2);
    expect(pow1).toBeLessThanOrEqual(1.3 * 2);
    expect(pow2).toBeGreaterThanOrEqual(0.7 * 4);
    expect(pow2).toBeLessThanOrEqual(1.3 * 4);
    expect(pow3).toBeGreaterThanOrEqual(0.7 * 8);
    expect(pow3).toBeLessThanOrEqual(1.3 * 8);
    expect(pow4).toBeGreaterThanOrEqual(0.7 * 16);
    expect(pow4).toBeLessThanOrEqual(1.3 * 16);
  });
});
