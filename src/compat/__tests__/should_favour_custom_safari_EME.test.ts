import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";
import shouldFavourCustomSafariEME from "../should_favour_custom_safari_EME";

const mocks = vi.hoisted(() => {
  return {
    getWebKitMediaKeysConstructor: vi.fn(),
  };
});
vi.mock("../eme/custom_media_keys/", () => ({
  getWebKitMediaKeysConstructor: mocks.getWebKitMediaKeysConstructor,
}));

describe("compat - shouldFavourSafariMediaKeys", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    mocks.getWebKitMediaKeysConstructor.mockReset();
    resetEnvironment();
  });

  it("should return false if we are not on Safari", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    expect(shouldFavourCustomSafariEME()).toBe(false);
  });

  it("should return false if we are on Safari Desktop but WekitMediaKeys is not available", () => {
    mocks.getWebKitMediaKeysConstructor.mockImplementation(() => undefined);
    mockEnvironment(EnvDetector.BROWSERS.SafariDesktop, EnvDetector.DEVICES.Other);
    expect(shouldFavourCustomSafariEME()).toBe(false);
  });

  it("should return false if we are on Safari Mobile but WekitMediaKeys is not available", () => {
    mocks.getWebKitMediaKeysConstructor.mockImplementation(() => undefined);
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(shouldFavourCustomSafariEME()).toBe(false);
  });

  it("should return true if we are on Safari Desktop and a WebKitMediaKeys implementation is available", () => {
    mocks.getWebKitMediaKeysConstructor.mockImplementation(() => ({
      isTypeSupported: () => ({}),
      prototype: {
        createSession: () => ({}),
      },
    }));
    mockEnvironment(EnvDetector.BROWSERS.SafariDesktop, EnvDetector.DEVICES.Other);
    expect(shouldFavourCustomSafariEME()).toBe(true);
  });

  it("should return true if we are on Safari Mobile and a WebKitMediaKeys implementation is available", () => {
    mocks.getWebKitMediaKeysConstructor.mockImplementation(() => ({
      isTypeSupported: () => ({}),
      prototype: {
        createSession: () => ({}),
      },
    }));
    mockEnvironment(EnvDetector.BROWSERS.SafariDesktop, EnvDetector.DEVICES.Other);
    expect(shouldFavourCustomSafariEME()).toBe(true);
  });
});
