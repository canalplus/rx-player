import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
    const shouldWaitForHaveEnoughData = (await vi.importActual(
      "../should_wait_for_have_enough_data",
    )) as any;
    expect(shouldWaitForHaveEnoughData.default()).toBe(false);
  });

  it("should return true if we are on the Playstation 5", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isPlayStation5: true,
      };
    }) as any;
    const shouldWaitForHaveEnoughData = (await vi.importActual(
      "../should_wait_for_have_enough_data",
    )) as any;
    expect(shouldWaitForHaveEnoughData.default()).toBe(true);
  });
});
