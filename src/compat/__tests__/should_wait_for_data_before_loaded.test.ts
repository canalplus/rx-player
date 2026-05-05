import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector.ts";
import shouldWaitForDataBeforeLoaded from "../should_wait_for_data_before_loaded.ts";

describe("compat - shouldWaitForDataBeforeLoaded", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should return true if we are not on Safari Mobile browser nor in directfile mode", () => {
    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  it("should return true if we are not on Safari Mobile browser but in directfile mode", () => {
    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(true);
  });

  it("should return true if we are on the Safari mobile browser but not in directfile mode", async () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  it("should return true if we are on the Safari desktop browser but not in directfile mode", async () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariDesktop, EnvDetector.DEVICES.Other);
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  it("should return false if we are on the Safari mobile browser and in directfile mode", async () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(false);
  });

  it("should return false if we are on the Safari desktop browser and in directfile mode", async () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariDesktop, EnvDetector.DEVICES.Other);
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(false);
  });
});
