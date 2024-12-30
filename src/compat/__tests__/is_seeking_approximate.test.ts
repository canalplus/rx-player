import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";
import isSeekingApproximate from "../is_seeking_approximate";

describe("isSeekingApproximate", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should be true if on Tizen", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.Tizen);
    expect(isSeekingApproximate()).toBe(true);
  });

  it("should be false if not on tizen", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.WebOsOther);
    expect(isSeekingApproximate()).toBe(false);
  });
});
