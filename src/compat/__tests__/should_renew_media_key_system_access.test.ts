import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector.ts";
import shouldRenewMediaKeySystemAccess from "../should_renew_media_key_system_access.ts";

describe("compat - shouldRenewMediaKeySystemAccess", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should return false if we are not on the concerned browsers with PlayReady", async () => {
    mockEnvironment(
      EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
      EnvDetector.DEVICES.Other,
    );
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(false);
  });

  it("should return false if we are on IE11+Widevine", async () => {
    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    expect(shouldRenewMediaKeySystemAccess("com.widevine.alpha")).toBe(false);
  });

  it("should return true if we are on IE11+PlayReady", async () => {
    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(true);
  });

  it("should return false if we are on Firefox+Widevine", async () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    expect(shouldRenewMediaKeySystemAccess("com.widevine.alpha")).toBe(false);
  });

  it("should return true if we are on Firefox+PlayReady", async () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(true);
  });

  it("should return false if we are on Edge+Widevine", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Other);
    expect(shouldRenewMediaKeySystemAccess("com.widevine.alpha")).toBe(false);
  });

  it("should return true if we are on Edge+PlayReady", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Other);
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(true);
  });
});
