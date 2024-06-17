import { describe, it, expect } from "vitest";
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
