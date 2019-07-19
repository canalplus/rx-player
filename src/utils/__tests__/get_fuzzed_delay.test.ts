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

import getFuzzedDelay from "../get_fuzzed_delay";

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
