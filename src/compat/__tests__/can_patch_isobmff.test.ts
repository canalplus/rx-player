import { describe, beforeEach, it, expect, vi } from "vitest";
import type ICanPatchISOBMFFSegment from "../can_patch_isobmff";

describe("compat - canPatchISOBMFFSegment", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return true if we are not on IE11 nor Edge", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIEOrEdge: false,
      };
    });
    const canPatchISOBMFFSegment = (await vi.importActual("../can_patch_isobmff"))
      .default as typeof ICanPatchISOBMFFSegment;
    expect(canPatchISOBMFFSegment()).toBe(true);
  });

  it("should return false if we are on IE11 or Edge", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIEOrEdge: true,
      };
    });
    const canPatchISOBMFFSegment = (await vi.importActual("../can_patch_isobmff"))
      .default as typeof ICanPatchISOBMFFSegment;
    expect(canPatchISOBMFFSegment()).toBe(false);
  });
});
