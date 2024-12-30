import { describe, beforeEach, it, expect, vi } from "vitest";
import type IEnvDetector from "../env_detector";
import type IShouldWaitForHaveEnoughData from "../should_wait_for_have_enough_data";

describe("compat - shouldWaitForHaveEnoughData", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if we are not on the Playstation 5", async () => {
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
    const shouldWaitForHaveEnoughData = (
      await vi.importActual("../should_wait_for_have_enough_data")
    ).default as typeof IShouldWaitForHaveEnoughData;
    expect(shouldWaitForHaveEnoughData()).toBe(false);
  });

  it("should return true if we are on the Playstation 5", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.PlayStation5,
        },
      };
    });
    const shouldWaitForHaveEnoughData = (
      await vi.importActual("../should_wait_for_have_enough_data")
    ).default as typeof IShouldWaitForHaveEnoughData;
    expect(shouldWaitForHaveEnoughData()).toBe(true);
  });
});
