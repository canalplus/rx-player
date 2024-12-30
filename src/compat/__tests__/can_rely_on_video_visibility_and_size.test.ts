import { describe, afterEach, it, expect, vi } from "vitest";
import type IEnvDetector from "../browser_detection";
import type ICanRelyOnVideoVisibilityAndSize from "../can_rely_on_video_visibility_and_size";

describe("Compat - canRelyOnVideoVisibilityAndSize", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should return true on any browser but Firefox", async () => {
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
    const canRelyOnVideoVisibilityAndSize = (
      await vi.importActual("../can_rely_on_video_visibility_and_size.ts")
    ).default as typeof ICanRelyOnVideoVisibilityAndSize;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(true);
  });

  it("should return true on Firefox but the version is unknown", async () => {
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
    vi.doMock("../browser_version", () => {
      return { getFirefoxVersion: () => -1 };
    });
    const canRelyOnVideoVisibilityAndSize = (
      await vi.importActual("../can_rely_on_video_visibility_and_size.ts")
    ).default as typeof ICanRelyOnVideoVisibilityAndSize;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(true);
  });

  it("should return true on Firefox < 67>", async () => {
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
    vi.doMock("../browser_version", () => {
      return { getFirefoxVersion: () => 60 };
    });
    const canRelyOnVideoVisibilityAndSize = (
      await vi.importActual("../can_rely_on_video_visibility_and_size.ts")
    ).default as typeof ICanRelyOnVideoVisibilityAndSize;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(true);
  });

  it("should return false on Firefox >= 67", async () => {
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
    vi.doMock("../browser_version", () => {
      return { getFirefoxVersion: () => 83 };
    });
    const canRelyOnVideoVisibilityAndSize = (
      await vi.importActual("../can_rely_on_video_visibility_and_size.ts")
    ).default as typeof ICanRelyOnVideoVisibilityAndSize;
    expect(canRelyOnVideoVisibilityAndSize()).toBe(false);
  });
});
