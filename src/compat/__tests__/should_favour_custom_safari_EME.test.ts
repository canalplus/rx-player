import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import globalScope from "../../utils/global_scope";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
    vi.doMock("../browser_detection", () => {
      return {
        isSafariDesktop: false,
        isSafariMobile: false,
      };
    });
    const shouldFavourCustomSafariEME = (await vi.importActual(
      "../should_favour_custom_safari_EME",
    )) as any;
    expect(shouldFavourCustomSafariEME.default()).toBe(false);
  });

  it("should return false if we are on Safari Desktop but WekitMediaKeys is not available", async () => {
    gs.WebKitMediaKeys = undefined;
    vi.doMock("../browser_detection", () => {
      return {
        isSafariDesktop: true,
        isSafariMobile: false,
      };
    });
    const shouldFavourCustomSafariEME = (await vi.importActual(
      "../should_favour_custom_safari_EME",
    )) as any;
    expect(shouldFavourCustomSafariEME.default()).toBe(false);
  });

  it("should return false if we are on Safari Mobile but WekitMediaKeys is not available", async () => {
    gs.WebKitMediaKeys = undefined;
    vi.doMock("../browser_detection", () => {
      return {
        isSafariDesktop: false,
        isSafariMobile: true,
      };
    });
    const shouldFavourCustomSafariEME = (await vi.importActual(
      "../should_favour_custom_safari_EME",
    )) as any;
    expect(shouldFavourCustomSafariEME.default()).toBe(false);
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
    vi.doMock("../browser_detection", () => {
      return {
        isSafariDesktop: true,
        isSafariMobile: false,
      };
    });
    const shouldFavourCustomSafariEME = (await vi.importActual(
      "../should_favour_custom_safari_EME",
    )) as any;
    expect(shouldFavourCustomSafariEME.default()).toBe(true);
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
    vi.doMock("../browser_detection", () => {
      return {
        isSafariDesktop: false,
        isSafariMobile: true,
      };
    });
    const shouldFavourCustomSafariEME = (await vi.importActual(
      "../should_favour_custom_safari_EME",
    )) as any;
    expect(shouldFavourCustomSafariEME.default()).toBe(true);
  });
});
