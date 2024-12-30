import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import globalScope from "../../utils/global_scope";
import type IEnvDetector from "../browser_detection";
import type IShouldFavourCustomSafariEME from "../should_favour_custom_safari_EME";

describe("compat - shouldFavourSafariMediaKeys", () => {
  const gs = globalScope as unknown as typeof globalThis & {
    WebKitMediaKeys?: unknown;
    HTMLMediaElement: typeof HTMLMediaElement;
  };

  const originalWebKitMediaKeys = gs.WebKitMediaKeys;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    gs.WebKitMediaKeys = originalWebKitMediaKeys;
  });

  it("should return false if we are not on Safari", async () => {
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
    const shouldFavourCustomSafariEME = (
      await vi.importActual("../should_favour_custom_safari_EME")
    ).default as typeof IShouldFavourCustomSafariEME;
    expect(shouldFavourCustomSafariEME()).toBe(false);
  });

  it("should return false if we are on Safari Desktop but WekitMediaKeys is not available", async () => {
    gs.WebKitMediaKeys = undefined;
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariDesktop,
        },
      };
    });
    const shouldFavourCustomSafariEME = (
      await vi.importActual("../should_favour_custom_safari_EME")
    ).default as typeof IShouldFavourCustomSafariEME;
    expect(shouldFavourCustomSafariEME()).toBe(false);
  });

  it("should return false if we are on Safari Mobile but WekitMediaKeys is not available", async () => {
    gs.WebKitMediaKeys = undefined;
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariMobile,
        },
      };
    });
    const shouldFavourCustomSafariEME = (
      await vi.importActual("../should_favour_custom_safari_EME")
    ).default as typeof IShouldFavourCustomSafariEME;
    expect(shouldFavourCustomSafariEME()).toBe(false);
  });

  it("should return true if we are on Safari Desktop and a WebKitMediaKeys implementation is available", async () => {
    gs.WebKitMediaKeys = {
      isTypeSupported: () => ({}),
      prototype: {
        createSession: () => ({}),
      },
    };
    const proto = gs.HTMLMediaElement.prototype as unknown as {
      webkitSetMediaKeys: () => Record<string, never>;
    };
    proto.webkitSetMediaKeys = () => ({});
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariDesktop,
        },
      };
    });
    const shouldFavourCustomSafariEME = (
      await vi.importActual("../should_favour_custom_safari_EME")
    ).default as typeof IShouldFavourCustomSafariEME;
    expect(shouldFavourCustomSafariEME()).toBe(true);
  });

  it("should return true if we are on Safari Mobile and a WebKitMediaKeys implementation is available", async () => {
    gs.WebKitMediaKeys = {
      isTypeSupported: () => ({}),
      prototype: {
        createSession: () => ({}),
      },
    };
    const proto = gs.HTMLMediaElement.prototype as unknown as {
      webkitSetMediaKeys: () => Record<string, never>;
    };
    proto.webkitSetMediaKeys = () => ({});
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariMobile,
        },
      };
    });
    const shouldFavourCustomSafariEME = (
      await vi.importActual("../should_favour_custom_safari_EME")
    ).default as typeof IShouldFavourCustomSafariEME;
    expect(shouldFavourCustomSafariEME()).toBe(true);
  });
});
