import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import canPatchISOBMFFSegment from "../can_patch_isobmff.ts";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector.ts";

describe("compat - canPatchISOBMFFSegment", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should return true if we are not on IE11 nor Edge", () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(canPatchISOBMFFSegment()).toBe(true);
  });

  it("should return false if we are on old IE or Edge", () => {
    mockEnvironment(
      EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
      EnvDetector.DEVICES.Other,
    );
    expect(canPatchISOBMFFSegment()).toBe(false);
  });

  it("should return false if we are on IE 11", () => {
    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    expect(canPatchISOBMFFSegment()).toBe(false);
  });
});
