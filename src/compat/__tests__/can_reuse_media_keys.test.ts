import { describe, afterEach, it, expect, vi } from "vitest";
import canReuseMediaKeys from "../can_reuse_media_keys";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    vi.resetModules();
    resetEnvironment();
  });

  it("should return true on most browsers", () => {
    mockEnvironment(
      EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
      EnvDetector.DEVICES.Xbox,
    );
    expect(canReuseMediaKeys()).toBe(true);
  });

  it("should return false on WebOs2022", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.WebOs2022);
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on WebOs2021", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.WebOs2021);
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on other WebOS", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.WebOsOther);
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on Panasonic", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.Panasonic);
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on Philips' NETTV", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.PhilipsNetTv);
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on A1 KSTB 40xxx", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.A1KStb40xx);
    expect(canReuseMediaKeys()).toBe(false);
  });
});
