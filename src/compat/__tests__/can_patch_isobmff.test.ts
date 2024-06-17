import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
    const canPatchISOBMFFSegment = (await vi.importActual("../can_patch_isobmff")) as any;
    expect(canPatchISOBMFFSegment.default()).toBe(true);
  });

  it("should return false if we are on IE11 or Edge", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIEOrEdge: true,
      };
    });
    const canPatchISOBMFFSegment = (await vi.importActual("../can_patch_isobmff")) as any;
    expect(canPatchISOBMFFSegment.default()).toBe(false);
  });
});
