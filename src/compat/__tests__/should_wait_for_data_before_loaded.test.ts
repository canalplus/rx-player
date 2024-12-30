import { describe, beforeEach, it, expect, vi } from "vitest";
import type IEnvDetector from "../env_detector";
import type IShouldWaitForDataBeforeLoaded from "../should_wait_for_data_before_loaded";

describe("compat - shouldWaitForDataBeforeLoaded", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return true if we are not on Safari browser nor in directfile mode", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Ie11,
        },
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  it("should return true if we are not on Safari browser but in directfile mode", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Ie11,
        },
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(true);
  });

  it("should return true if we are on the Safari mobile browser but not in directfile mode", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariMobile,
        },
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  it("should return true if we are on the Safari desktop browser but not in directfile mode", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariDesktop,
        },
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  it("should return false if we are on the Safari mobile browser and in directfile mode", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariMobile,
        },
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(false);
  });

  it("should return false if we are on the Safari desktop browser and in directfile mode", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.SafariDesktop,
        },
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(false);
  });
});
