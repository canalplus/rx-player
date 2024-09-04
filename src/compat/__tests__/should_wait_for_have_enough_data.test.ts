import { describe, beforeEach, it, expect, vi } from "vitest";
import type IShouldWaitForHaveEnoughData from "../should_wait_for_have_enough_data";

describe("compat - shouldWaitForHaveEnoughData", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if we are not on the Playstation 5", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isPlayStation5: false,
      };
    });
    const shouldWaitForHaveEnoughData = (
      await vi.importActual("../should_wait_for_have_enough_data")
    ).default as typeof IShouldWaitForHaveEnoughData;
    expect(shouldWaitForHaveEnoughData()).toBe(false);
  });

  it("should return true if we are on the Playstation 5", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isPlayStation5: true,
      };
    });
    const shouldWaitForHaveEnoughData = (
      await vi.importActual("../should_wait_for_have_enough_data")
    ).default as typeof IShouldWaitForHaveEnoughData;
    expect(shouldWaitForHaveEnoughData()).toBe(true);
  });
});
