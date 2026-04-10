import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import canPatchOutPssh from "../../../../src/compat/can_patch_out_pssh.ts";
import EnvDetector, {
  mockEnvironment,
  resetEnvironment,
} from "../../../../src/compat/env_detector.ts";
import configHandler from "../../../../src/config.ts";

describe("compat - canPatchOutPssh", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.resetAllMocks();
    resetEnvironment();
  });

  it("should return true if we are not on the DSTV Streama MDP 1001s STB", () => {
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.Tizen, false);
    expect(canPatchOutPssh()).toBe(true);
  });

  it("should return false if we force it through the config", () => {
    const oldConfig = configHandler.getCurrent();
    vi.spyOn(configHandler, "getCurrent").mockImplementation(() => {
      return {
        ...oldConfig,
        PREVENT_PSSH_PATCHING: true,
      };
    });
    mockEnvironment(EnvDetector.BROWSERS.Other, EnvDetector.DEVICES.Tizen, false);
    expect(canPatchOutPssh()).toBe(false);
  });

  it("should return false if we are on the DSTV Streama MDP 1001s STB", () => {
    mockEnvironment(
      EnvDetector.BROWSERS.Other,
      EnvDetector.DEVICES.StreamaMdp1001S,
      false,
    );
    expect(canPatchOutPssh()).toBe(false);
  });
});
