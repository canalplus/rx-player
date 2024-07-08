import { describe, afterEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Compat - Browser version", () => {
  const origUserAgent = navigator.userAgent;
  Object.defineProperty(
    navigator,
    "userAgent",
    ((value: string) => ({
      get() {
        return value;
      },
      /* eslint-disable no-param-reassign */
      set(v: string) {
        value = v;
      },
      /* eslint-enable no-param-reassign */
    }))(navigator.userAgent),
  );

  const nav = navigator as {
    userAgent: string;
  };

  afterEach(() => {
    nav.userAgent = origUserAgent;
    vi.resetModules();
  });

  it("Should return correct Firefox version (60)", async () => {
    vi.doMock("../browser_detection", () => {
      return { isFirefox: true };
    });
    const { getFirefoxVersion } = (await vi.importActual("../browser_version")) as any;
    nav.userAgent = "Firefox/60.0";
    const version = getFirefoxVersion();
    expect(version).toBe(60);
  });

  it("Should return correct Firefox version (80)", async () => {
    vi.doMock("../browser_detection", () => {
      return { isFirefox: true };
    });
    const { getFirefoxVersion } = (await vi.importActual("../browser_version")) as any;
    nav.userAgent = "Firefox/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(80);
  });

  it("Should return null when not on Firefox", async () => {
    vi.doMock("../browser_detection", () => {
      return { isFirefox: false };
    });
    const { getFirefoxVersion } = (await vi.importActual("../browser_version")) as any;
    const version = getFirefoxVersion();
    expect(version).toBe(null);
  });

  it("Should return null when obscure Firefox user agent", async () => {
    vi.doMock("../browser_detection", () => {
      return { isFirefox: true };
    });
    const { getFirefoxVersion } = (await vi.importActual("../browser_version")) as any;
    nav.userAgent = "FireFennec/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(-1);
  });
});
