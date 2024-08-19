import { describe, afterEach, it, expect, vi } from "vitest";
import type { getFirefoxVersion as IGetFirefoxVersion } from "../browser_version";

describe("Compat - Browser version", () => {
  const origUserAgent = navigator.userAgent;
  Object.defineProperty(
    navigator,
    "userAgent",
    ((initVal: string) => {
      let value = initVal;
      return {
        get() {
          return value;
        },
        set(v: string) {
          value = v;
        },
      };
    })(navigator.userAgent),
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
    const getFirefoxVersion = (await vi.importActual("../browser_version"))
      .getFirefoxVersion as typeof IGetFirefoxVersion;
    nav.userAgent = "Firefox/60.0";
    const version = getFirefoxVersion();
    expect(version).toBe(60);
  });

  it("Should return correct Firefox version (80)", async () => {
    vi.doMock("../browser_detection", () => {
      return { isFirefox: true };
    });
    const getFirefoxVersion = (await vi.importActual("../browser_version"))
      .getFirefoxVersion as typeof IGetFirefoxVersion;
    nav.userAgent = "Firefox/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(80);
  });

  it("Should return null when not on Firefox", async () => {
    vi.doMock("../browser_detection", () => {
      return { isFirefox: false };
    });
    const getFirefoxVersion = (await vi.importActual("../browser_version"))
      .getFirefoxVersion as typeof IGetFirefoxVersion;
    const version = getFirefoxVersion();
    expect(version).toBe(null);
  });

  it("Should return null when obscure Firefox user agent", async () => {
    vi.doMock("../browser_detection", () => {
      return { isFirefox: true };
    });
    const getFirefoxVersion = (await vi.importActual("../browser_version"))
      .getFirefoxVersion as typeof IGetFirefoxVersion;
    nav.userAgent = "FireFennec/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(-1);
  });
});
