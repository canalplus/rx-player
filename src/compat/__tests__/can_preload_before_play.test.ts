import { describe, it, expect, afterEach } from "vitest";
import canPreloadBeforePlay from "../can_preload_before_play";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";

describe("canPreloadBeforePlay", () => {
  afterEach(() => {
    resetEnvironment();
  });

  it("should return true when not directfile, even on SafariMobile", () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(canPreloadBeforePlay(false)).toBe(true);
  });

  it("should return true when not directfile, even on SafariDesktop", () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariDesktop, EnvDetector.DEVICES.Other);
    expect(canPreloadBeforePlay(false)).toBe(true);
  });

  it("should return false when directfile and browser is SafariMobile", () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(canPreloadBeforePlay(true)).toBe(false);
  });

  it("should return false when directfile and browser is SafariDesktop", () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariDesktop, EnvDetector.DEVICES.Other);
    expect(canPreloadBeforePlay(true)).toBe(false);
  });

  it("should return true when directfile but browser is not Safari", () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Other);
    expect(canPreloadBeforePlay(true)).toBe(true);
  });
});
