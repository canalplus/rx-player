import { describe, afterEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should return true on most browsers", async () => {
    vi.doMock("../browser_detection", () => {
      return { isWebOs: false, isPhilipsNetTv: false, isPanasonic: false };
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
        isPhilipsNetTv: false,
      };
    });
    const canReuseMediaKeys = (await vi.importActual(
      "../can_reuse_media_keys.ts",
    )) as any;
    expect(canReuseMediaKeys.default()).toBe(false);
  });

  it("should return false on Panasonic", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isWebOs: false,
        isWebOs2022: false,
        isPanasonic: true,
        isPhilipsNetTv: false,
      };
    });
    const canReuseMediaKeys = (await vi.importActual(
      "../can_reuse_media_keys.ts",
    )) as any;
    expect(canReuseMediaKeys.default()).toBe(false);
  });

  it("should return false on Philips' NETTV", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isWebOs: false,
        isWebOs2022: false,
        isPanasonic: false,
        isPhilipsNetTv: true,
      };
    });
    const canReuseMediaKeys = (await vi.importActual(
      "../can_reuse_media_keys.ts",
    )) as any;
    expect(canReuseMediaKeys.default()).toBe(false);
  });
});
