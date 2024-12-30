import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";
import shouldUnsetMediaKeys from "../should_unset_media_keys";

describe("compat - shouldUnsetMediaKeys", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should return false if we are not on IE11", () => {
    mockEnvironment(
      EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
      EnvDetector.DEVICES.Other,
    );
    expect(shouldUnsetMediaKeys()).toBe(false);
  });

  it("should return true if we are on IE11", () => {
    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    expect(shouldUnsetMediaKeys()).toBe(true);
  });
});
