import { describe, afterEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should return true on any browser but WebOS", async () => {
    vi.doMock("../browser_detection", () => {
      return { isWebOs: false, isPanasonic: false };
    });
    const canReuseMediaKeys = (await vi.importActual(
      "../can_reuse_media_keys.ts",
    )) as any;
    expect(canReuseMediaKeys.default()).toBe(true);
  });

  it("should return false on WebOs", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isWebOs: true,
        isWebOs2022: false,
        isPanasonic: false,
      };
    });
    const canReuseMediaKeys = (await vi.importActual(
      "../can_reuse_media_keys.ts",
    )) as any;
    expect(canReuseMediaKeys.default()).toBe(false);
  });
});
