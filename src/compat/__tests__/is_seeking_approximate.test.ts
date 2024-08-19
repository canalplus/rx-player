import { describe, beforeEach, it, expect, vi } from "vitest";

describe("isSeekingApproximate", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should be true if on Tizen", async () => {
    vi.doMock("../browser_detection", () => {
      return { isTizen: true };
    });
    const shouldAppendBufferAfterPadding = (
      await vi.importActual("../is_seeking_approximate")
    ).default;
    expect(shouldAppendBufferAfterPadding).toBe(true);
  });

  it("should be false if not on tizen", async () => {
    vi.doMock("../browser_detection", () => {
      return { isTizen: false };
    });
    const shouldAppendBufferAfterPadding = (
      await vi.importActual("../is_seeking_approximate")
    ).default;
    expect(shouldAppendBufferAfterPadding).toBe(false);
  });
});
