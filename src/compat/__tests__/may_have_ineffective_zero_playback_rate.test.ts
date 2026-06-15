import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";
import mayHaveIneffectiveZeroPlaybackRate from "../may_have_ineffective_zero_playback_rate";

describe("compat - mayHaveIneffectiveZeroPlaybackRate", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should return true if on Tizen", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.Tizen);
    expect(mayHaveIneffectiveZeroPlaybackRate()).toBe(true);
  });

  it("should return false if not on Tizen", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.WebOsOther);
    expect(mayHaveIneffectiveZeroPlaybackRate()).toBe(false);
  });
});
