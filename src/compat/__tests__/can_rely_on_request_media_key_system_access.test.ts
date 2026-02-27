import { describe, it, expect, afterEach } from "vitest";
import { canRelyOnRequestMediaKeySystemAccess } from "../can_rely_on_request_media_key_system_access";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";

describe("canRelyOnRequestMediaKeySystemAccess", () => {
  afterEach(() => {
    resetEnvironment();
  });

  it("should return true when not playready, even on EdgeChromium", () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Other);
    expect(canRelyOnRequestMediaKeySystemAccess("com.widevine.alpha")).toBe(true);
  });

  it("should return true when not playready, even on Firefox", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    expect(canRelyOnRequestMediaKeySystemAccess("com.widevine.alpha")).toBe(true);
  });

  it("should return false when playready and browser is EdgeChromium", () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Other);
    expect(canRelyOnRequestMediaKeySystemAccess("com.microsoft.playready")).toBe(false);
  });

  it("should return false when playready and browser is Firefox", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    expect(canRelyOnRequestMediaKeySystemAccess("com.microsoft.playready")).toBe(false);
  });

  it("should return true when playready but browser is not EdgeChromium nor Firefox", () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(canRelyOnRequestMediaKeySystemAccess("com.microsoft.playready")).toBe(true);
  });
});
