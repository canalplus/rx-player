import { describe, beforeEach, it, expect, vi } from "vitest";
import type IEnvDetector from "../env_detector";
import type IIsSeekingApproximate from "../is_seeking_approximate";

describe("isSeekingApproximate", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should be true if on Tizen", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.Tizen,
        },
      };
    });
    const isSeekingApproximate = (await vi.importActual("../is_seeking_approximate"))
      .default as typeof IIsSeekingApproximate;
    expect(isSeekingApproximate()).toBe(true);
  });

  it("should be false if not on tizen", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.WebOsOther,
        },
      };
    });
    const isSeekingApproximate = (await vi.importActual("../is_seeking_approximate"))
      .default as typeof IIsSeekingApproximate;
    expect(isSeekingApproximate()).toBe(false);
  });
});
