import { describe, afterEach, it, expect, vi } from "vitest";
import { getFirefoxVersion } from "../browser_version";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";

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
    resetEnvironment();
  });

  it("Should return correct Firefox version (60)", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    nav.userAgent = "Firefox/60.0";
    const version = getFirefoxVersion();
    expect(version).toBe(60);
  });

  it("Should return correct Firefox version (80)", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    nav.userAgent = "Firefox/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(80);
  });

  it("Should return null when not on Firefox", () => {
    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    const version = getFirefoxVersion();
    expect(version).toBe(null);
  });

  it("Should return null when obscure Firefox user agent", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    nav.userAgent = "FireFennec/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(-1);
  });
});
