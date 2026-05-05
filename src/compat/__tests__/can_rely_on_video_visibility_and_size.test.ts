import { describe, afterEach, it, expect, vi } from "vitest";
import canRelyOnVideoVisibilityAndSize from "../can_rely_on_video_visibility_and_size.ts";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector.ts";

let mockedFirefoxVersion: number | null = null;
vi.mock("../browser_version", () => {
  return {
    getFirefoxVersion: (): number | null => {
      return mockedFirefoxVersion;
    },
  };
});

describe("Compat - canRelyOnVideoVisibilityAndSize", () => {
  afterEach(() => {
    vi.resetModules();
    resetEnvironment();
  });

  it("should return true on any browser but Firefox", () => {
    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);
    expect(canRelyOnVideoVisibilityAndSize()).toBe(true);
  });

  it("should return true on Firefox but the version is unknown", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    mockedFirefoxVersion = -1;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(true);
    mockedFirefoxVersion = null;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(true);
  });

  it("should return true on Firefox < 67>", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    mockedFirefoxVersion = 60;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(true);
  });

  it("should return false on Firefox >= 67", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);
    mockedFirefoxVersion = 83;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(false);
  });
});
