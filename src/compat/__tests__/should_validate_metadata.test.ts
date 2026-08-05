import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector.ts";
import shouldValidateMetadata from "../should_validate_metadata.ts";

describe("compat - shouldValidateMetadata", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should return false if we are not on the Samsung browser", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.Other, false);
    expect(shouldValidateMetadata()).toBe(false);
  });

  it("should return true if we are on the Samsung browser", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.Other, true);
    expect(shouldValidateMetadata()).toBe(true);
  });
});
