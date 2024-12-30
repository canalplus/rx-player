import { describe, beforeEach, it, expect, vi } from "vitest";
import type IEnvDetector from "../browser_detection";
import type IShouldRenewMediaKeySystemAccess from "../should_renew_media_key_system_access";

describe("compat - shouldRenewMediaKeySystemAccess", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if we are not on the concerned browsers with PlayReady", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
        },
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(false);
  });

  it("should return false if we are on IE11+Widevine", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Ie11,
        },
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess("com.widevine.alpha")).toBe(false);
  });

  it("should return true if we are on IE11+PlayReady", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Ie11,
        },
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(true);
  });

  it("should return false if we are on Firefox+Widevine", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Firefox,
        },
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess("com.widevine.alpha")).toBe(false);
  });

  it("should return true if we are on Firefox+PlayReady", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Firefox,
        },
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(true);
  });

  it("should return false if we are on Edge+Widevine", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.EdgeChromium,
        },
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess("com.widevine.alpha")).toBe(false);
  });

  it("should return true if we are on Edge+PlayReady", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.EdgeChromium,
        },
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess("com.microsoft.playready")).toBe(true);
  });
});
