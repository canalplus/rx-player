import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("isSeekingApproximate", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should be true if on Tizen", async () => {
    vi.doMock("../browser_detection", () => {
      return { isTizen: true };
    });
    const shouldAppendBufferAfterPadding = (await vi.importActual(
      "../is_seeking_approximate",
    )) as any;
    expect(shouldAppendBufferAfterPadding.default).toBe(true);
  });

  it("should be false if not on tizen", async () => {
    vi.doMock("../browser_detection", () => {
      return { isTizen: false };
    });
    const shouldAppendBufferAfterPadding = (await vi.importActual(
      "../is_seeking_approximate",
    )) as any;
    expect(shouldAppendBufferAfterPadding.default).toBe(false);
  });
});
