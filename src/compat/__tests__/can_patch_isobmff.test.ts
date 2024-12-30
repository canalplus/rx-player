import { describe, beforeEach, it, expect, vi } from "vitest";
import type ICanPatchISOBMFFSegment from "../can_patch_isobmff";
import type IEnvDetector from "../env_detector";

describe("compat - canPatchISOBMFFSegment", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return true if we are not on IE11 nor Edge", async () => {
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
    const canPatchISOBMFFSegment = (await vi.importActual("../can_patch_isobmff"))
      .default as typeof ICanPatchISOBMFFSegment;
    expect(canPatchISOBMFFSegment()).toBe(true);
  });

  it("should return false if we are on old IE or Edge", async () => {
    vi.doMock("../env_detector", async () => {
      const EnvDetector = (await vi.importActual("../env_detector"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
        },
      };
    });
    const canPatchISOBMFFSegment = (await vi.importActual("../can_patch_isobmff"))
      .default as typeof ICanPatchISOBMFFSegment;
    expect(canPatchISOBMFFSegment()).toBe(false);
  });

  it("should return false if we are on IE 11", async () => {
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
    const canPatchISOBMFFSegment = (await vi.importActual("../can_patch_isobmff"))
      .default as typeof ICanPatchISOBMFFSegment;
    expect(canPatchISOBMFFSegment()).toBe(false);
  });
});
