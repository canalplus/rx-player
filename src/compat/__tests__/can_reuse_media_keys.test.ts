import { describe, afterEach, it, expect, vi } from "vitest";
import type ICanReuseMediaKeys from "../can_reuse_media_keys";

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should return true on any browser but WebOS", async () => {
    vi.doMock("../browser_detection", () => {
      return { isWebOs: false, isPanasonic: false };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(true);
  });

  it("should return false on WebOs", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isWebOs: true,
        isWebOs2022: false,
        isPanasonic: false,
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(false);
  });
});
