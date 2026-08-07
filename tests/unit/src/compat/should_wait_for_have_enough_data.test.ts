import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import EnvDetector, {
  mockEnvironment,
  resetEnvironment,
} from "../../../../src/compat/env_detector.ts";
import shouldWaitForHaveEnoughData from "../../../../src/compat/should_wait_for_have_enough_data.ts";

describe("compat - shouldWaitForHaveEnoughData", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should return false if we are not on the Playstation 5", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.WebOsOther);
    expect(shouldWaitForHaveEnoughData()).toBe(false);
  });

  it("should return true if we are on the Playstation 5", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.PlayStation5);
    expect(shouldWaitForHaveEnoughData()).toBe(true);
  });
});
